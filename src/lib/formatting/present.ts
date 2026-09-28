/**
 * Presentation helpers. The interface speaks in words, dates and figures —
 * never in raw protocol payloads. Every contract value that can reach the
 * screen passes through one of these formatters first.
 */

const ATTO = 10n ** 18n;

/** An atto amount as a trimmed GEN figure, e.g. "0.02" or "1.5". */
export function formatGen(atto: string | bigint | number): string {
  try {
    const v = BigInt(atto);
    const whole = v / ATTO;
    const frac = (v % ATTO).toString().padStart(18, "0").replace(/0+$/, "");
    return frac ? `${whole}.${frac.slice(0, 6)}` : `${whole}`;
  } catch {
    return "0";
  }
}

export function toAtto(gen: string): bigint {
  const cleaned = gen.trim();
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return 0n;
  const [w, f = ""] = cleaned.split(".");
  return BigInt(w) * ATTO + BigInt((f + "000000000000000000").slice(0, 18));
}

export function shortAddr(addr: string): string {
  if (!addr || addr.length < 12) return addr || "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** A Unix timestamp as "12 Oct 2026 · 14:32 UTC". */
export function formatDateTime(unix: number): string {
  if (!unix) return "—";
  const d = new Date(unix * 1000);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} · ${hh}:${mm} UTC`;
}

/** A relative, human duration: "in 4 hours", "2 days ago". */
export function relativeTo(unix: number, now: number): string {
  if (!unix) return "—";
  const delta = unix - now;
  const abs = Math.abs(delta);
  const unit: [number, string] =
    abs >= 86400 ? [Math.round(abs / 86400), "day"]
    : abs >= 3600 ? [Math.round(abs / 3600), "hour"]
    : abs >= 90 ? [Math.round(abs / 60), "minute"]
    : [Math.round(abs), "second"];
  const words = `${unit[0]} ${unit[1]}${unit[0] === 1 ? "" : "s"}`;
  return delta >= 0 ? `in ${words}` : `${words} ago`;
}

export function durationWords(seconds: number): string {
  if (seconds <= 0) return "no limit";
  if (seconds % 86400 === 0) return `${seconds / 86400} day${seconds === 86400 ? "" : "s"}`;
  if (seconds % 3600 === 0) return `${seconds / 3600} hour${seconds === 3600 ? "" : "s"}`;
  if (seconds % 60 === 0) return `${seconds / 60} minute${seconds === 60 ? "" : "s"}`;
  return `${seconds} seconds`;
}

/** Request statuses in prose. */
export const STATUS_WORDS: Record<string, string> = {
  SUBMITTED: "Waiting for its first observation",
  PROPOSED: "Consensus reached — finality pending",
  FINALIZED: "State established",
  CLOSED: "Closed with a final state",
  FAILED: "Closed without a result",
  CANCELLED: "Withdrawn by its creator",
};

export const RECONCILIATION_WORDS: Record<string, string> = {
  RESOLVED: "Resolved",
  UNRESOLVED_CONFLICT: "Unresolved — sources conflict",
  UNRESOLVED_INSUFFICIENT: "Unresolved — not enough independent evidence",
};

export const EVIDENCE_WORDS: Record<string, string> = {
  SUPPORTING: "Supports the state",
  CONFLICTING: "Contradicts the state",
  UNCONTESTED: "Agrees, but too few voices",
  NO_CLAIM: "Does not answer the question",
  EXCLUDED: "Excluded — outside the freshness requirement",
  UNAVAILABLE: "Could not be read",
};

export const FRESHNESS_WORDS: Record<string, string> = {
  CURRENT: "Current",
  STALE: "Older than the freshness requirement",
  UNAVAILABLE: "No reliable date",
  CONFLICTING: "Dates itself after the observation",
};

export const POLICY_WORDS: Record<string, string> = {
  MAJORITY: "Majority",
  THRESHOLD: "Threshold",
  AUTHORITY_CONFIRMATION: "Authority confirmation",
  STRICT: "Strict",
};

export const BOND_WORDS: Record<string, string> = {
  LOCKED: "Locked until the window closes",
  REFUNDABLE: "Ready to be refunded",
  REFUNDED: "Returned to the creator",
};

export const KIND_WORDS: Record<string, string> = {
  CATEGORICAL: "One of a fixed set of values",
  BOOLEAN: "True or false",
  NUMERIC: "A number",
  TEMPORAL: "A date",
};

/** The tx lifecycle in words, for the tracker. */
export const STAGE_WORDS: Record<string, string> = {
  PENDING: "Sent to the network",
  PROPOSING: "Leader is composing a result",
  COMMITTING: "Validators are committing votes",
  REVEALING: "Validators are revealing votes",
  ACCEPTED: "Accepted by consensus",
  FINALIZED: "Final — cannot be appealed",
};
