/**
 * Creation-form validation, mirroring the contract's own rules. The contract
 * is the authority; this module exists so the eight-step flow can show a
 * refusal in words before a wallet ever opens, and so the review step can
 * preview exactly how sources group by publisher.
 */

export type DraftSource = { url: string; label: string; declared_class: string };
export type DraftResultType =
  | { kind: "CATEGORICAL"; values: string[] }
  | { kind: "BOOLEAN" }
  | { kind: "NUMERIC"; unit: string; decimals: number; tolerance_bps: number }
  | { kind: "TEMPORAL" };
export type DraftPolicy = {
  kind: "MAJORITY" | "THRESHOLD" | "AUTHORITY_CONFIRMATION" | "STRICT";
  stale_contributes: boolean;
  min_groups: number;
  min_confirmations: number;
  threshold_bps: number;
};

export type Validation = {
  ok: boolean;
  problems: string[];
  termsJson: string | null;
  origins: { origin: string; source_ids: string[] }[];
};

const MAX_QUESTION = 300;
const MAX_LABEL = 80;
const MAX_URL = 400;
const MIN_SOURCES = 2;
const MAX_SOURCES = 6;
const MIN_VALUES = 2;
const MAX_VALUES = 8;
const RESERVED = ["UNRESOLVED", "EXPIRED", "NONE"];
const TOKEN = /^[A-Z][A-Z0-9_]{0,31}$/;
const SECOND_LEVEL = ["co", "com", "org", "net", "gov", "ac", "edu"];
const PLATFORM_OWNER: Record<string, [string, number]> = {
  "github.com": ["github", 0],
  "raw.githubusercontent.com": ["github", 0],
  "gist.github.com": ["github", 0],
  "gist.githubusercontent.com": ["github", 0],
  "api.github.com": ["github", 1],
  "registry.npmjs.org": ["npm", 0],
  "unpkg.com": ["npm", 0],
};

export function hostOf(url: string): string {
  const rest = url.includes("://") ? url.split("://")[1] : url;
  return rest.split(/[/?#]/)[0].split(":")[0].toLowerCase();
}

export function normalizeUrl(url: string): string {
  const [scheme, rest0] = url.trim().split("://");
  const rest = rest0 ?? "";
  let netloc = rest.split("/")[0].toLowerCase();
  const path0 = rest.slice(netloc.length);
  if (netloc.endsWith(":443")) netloc = netloc.slice(0, -4);
  if (netloc.startsWith("www.")) netloc = netloc.slice(4);
  const [noFrag] = path0.split("#");
  const [base0, query = ""] = noFrag.split("?");
  const kept = query.split("&").filter((p) => p && !p.toLowerCase().startsWith("utm_"));
  const base = base0.replace(/\/+$/, "");
  return `${scheme.toLowerCase()}://${netloc}${base}` + (kept.length ? `?${kept.join("&")}` : "");
}

/** The publisher a location belongs to — the same rule the contract applies. */
export function publisherOf(url: string): string {
  let host = hostOf(url);
  if (host.startsWith("www.")) host = host.slice(4);
  const rest = url.split("://").pop() ?? "";
  const tail = rest.includes("/") ? rest.split("/").slice(1).join("/") : "";
  const path = tail.split(/[?#]/)[0].split("/").filter(Boolean);
  if (host.endsWith(".github.io")) return `github:${host.slice(0, -10)}`;
  if (host === "cdn.jsdelivr.net" && path.length >= 2) {
    if (path[0] === "gh") return `github:${path[1].toLowerCase()}`;
    if (path[0] === "npm") return `npm:${path[1].split("@")[0].toLowerCase()}`;
  }
  if (host === "npmjs.com" && path.length >= 2 && path[0] === "package") return `npm:${path[1].toLowerCase()}`;
  if (host in PLATFORM_OWNER) {
    const [family, index] = PLATFORM_OWNER[host];
    if (path.length > index) return `${family}:${path[index].split("@")[0].toLowerCase()}`;
    return family;
  }
  const labels = host.split(".");
  if (labels.length >= 3 && SECOND_LEVEL.includes(labels[labels.length - 2]) && labels[labels.length - 1].length === 2)
    return labels.slice(-3).join(".");
  return labels.slice(-2).join(".");
}

const MINUTE = 60;
const DAY = 86400;

export function validateDraft(input: {
  question: string;
  sources: DraftSource[];
  resultType: DraftResultType;
  policy: DraftPolicy;
  windowStart: number;
  windowEnd: number;
  freshnessSeconds: number;
  validitySeconds: number;
  bondAtto: bigint;
  now: number;
}): Validation {
  const p: string[] = [];
  const question = input.question.replace(/\s+/g, " ").trim();
  if (!question) p.push("A question is required.");
  if (question.length > MAX_QUESTION) p.push(`The question must be at most ${MAX_QUESTION} characters.`);

  if (input.sources.length < MIN_SOURCES || input.sources.length > MAX_SOURCES)
    p.push(`Name between ${MIN_SOURCES} and ${MAX_SOURCES} sources.`);
  const seen = new Set<string>();
  const sources = input.sources.map((s, i) => {
    const sid = `S${i + 1}`;
    const url = (s.url ?? "").trim();
    if (!url.toLowerCase().startsWith("https://")) p.push(`Source ${sid} must be an https address.`);
    const host = hostOf(url);
    if (!host || !host.includes(".") || url.includes(" ")) p.push(`Source ${sid} is not a valid address.`);
    if (host.endsWith(".") || host.includes("..") || host.startsWith("."))
      p.push(`Source ${sid} must name its host without a trailing or doubled dot.`);
    if (/^[0-9.]+$/.test(host) || host.startsWith("[")) p.push(`Source ${sid} must name a host, not an IP address.`);
    if (url.length > MAX_URL) p.push(`Source ${sid} address is too long.`);
    if (url.toLowerCase().startsWith("https://") && host.includes(".")) {
      const norm = normalizeUrl(url);
      if (seen.has(norm)) p.push(`Source ${sid} repeats an earlier source.`);
      seen.add(norm);
    }
    const label = (s.label ?? "").replace(/\s+/g, " ").trim();
    if (label.length > MAX_LABEL) p.push(`Source ${sid} label must be at most ${MAX_LABEL} characters.`);
    if (!["OFFICIAL", "INDEPENDENT", "UNKNOWN"].includes(s.declared_class))
      p.push(`Source ${sid} class must be OFFICIAL, INDEPENDENT or UNKNOWN.`);
    return { source_id: sid, url, label, declared_class: s.declared_class, origin: publisherOf(url) };
  });
  const origins = [...new Set(sources.map((s) => s.origin))];

  const rt = input.resultType;
  if (rt.kind === "CATEGORICAL") {
    const values = rt.values.map((v) => v.trim()).filter(Boolean);
    if (values.length < MIN_VALUES || values.length > MAX_VALUES) p.push("A categorical answer names 2 to 8 values.");
    for (const v of values) {
      if (!TOKEN.test(v)) p.push(`"${v}" must be an uppercase word such as OPERATIONAL.`);
      if (RESERVED.includes(v)) p.push(`${v} is reserved and cannot be an answer value.`);
    }
    if (new Set(values).size !== values.length) p.push("Answer values may not repeat.");
  } else if (rt.kind === "NUMERIC") {
    if (!rt.unit.trim() || rt.unit.trim().length > 24) p.push("A numeric answer needs a unit of at most 24 characters.");
    if (rt.decimals < 0 || rt.decimals > 6) p.push("Decimals must be between 0 and 6.");
    if (rt.tolerance_bps < 0 || rt.tolerance_bps > 2000) p.push("Tolerance must be between 0 and 2000 basis points.");
  }

  const pol = input.policy;
  if (pol.kind === "AUTHORITY_CONFIRMATION") {
    if (pol.min_confirmations < 1 || pol.min_confirmations > MAX_SOURCES - 1)
      p.push("Confirmations must be between 1 and 5.");
    const officials = sources.filter((s) => s.declared_class === "OFFICIAL");
    if (!officials.length) p.push("Authority confirmation needs a source declared OFFICIAL.");
    const other = origins.length - new Set(officials.map((s) => s.origin)).size;
    if (other < pol.min_confirmations)
      p.push(`Authority confirmation needs ${pol.min_confirmations} confirming publisher(s) besides the official one.`);
  } else {
    if (pol.min_groups < MIN_SOURCES || pol.min_groups > MAX_SOURCES) p.push("The minimum group count must be between 2 and 6.");
    if (pol.min_groups > origins.length)
      p.push(`The policy needs ${pol.min_groups} independent publishers but the sources come from ${origins.length}.`);
    if (pol.kind === "THRESHOLD" && (pol.threshold_bps <= 5000 || pol.threshold_bps > 10000))
      p.push("The threshold must be above 5000 and at most 10000 basis points.");
  }

  if (input.windowStart < input.now - 5 * MINUTE) p.push("The observation window cannot open in the past.");
  if (input.windowEnd - input.windowStart < 10 * MINUTE) p.push("The window must last at least 10 minutes.");
  if (input.windowEnd - input.windowStart > 366 * DAY) p.push("The window must be at most 366 days.");
  if (input.validitySeconds < MINUTE || input.validitySeconds > 366 * DAY)
    p.push("Result validity must be between 1 minute and 366 days.");
  if (input.freshnessSeconds < 0 || input.freshnessSeconds > 3650 * DAY)
    p.push("Freshness must be between 0 and 3650 days.");
  if (input.bondAtto < 10n ** 15n || input.bondAtto > 10n ** 24n)
    p.push("The bond must be between 0.001 and 10000 GEN.");

  const ok = p.length === 0;
  const terms = {
    sources: sources.map(({ source_id, url, label, declared_class, origin }) => ({
      source_id, url, label, declared_class, origin,
    })),
    result_type:
      rt.kind === "CATEGORICAL"
        ? { kind: rt.kind, values: rt.values.map((v) => v.trim()).filter(Boolean) }
        : rt.kind === "NUMERIC"
          ? { kind: rt.kind, unit: rt.unit.trim(), decimals: rt.decimals, tolerance_bps: rt.tolerance_bps }
          : { kind: rt.kind },
    policy: { kind: pol.kind, stale_contributes: pol.stale_contributes,
      ...(pol.kind === "AUTHORITY_CONFIRMATION" ? { min_confirmations: pol.min_confirmations } : { min_groups: pol.min_groups }),
      ...(pol.kind === "THRESHOLD" ? { threshold_bps: pol.threshold_bps } : {}) },
    observation_window_start: input.windowStart,
    observation_window_end: input.windowEnd,
    freshness_requirement: input.freshnessSeconds,
    validity_seconds: input.validitySeconds,
  };
  return {
    ok,
    problems: p,
    termsJson: ok ? JSON.stringify(terms) : null,
    origins: origins.map((origin) => ({
      origin,
      source_ids: sources.filter((s) => s.origin === origin).map((s) => s.source_id),
    })),
  };
}
