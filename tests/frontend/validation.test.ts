/**
 * Creation-form rules must stay in lockstep with the contract: every refusal
 * the flow can show must be one the contract itself would give.
 */

import { describe, expect, it } from "vitest";

import { normalizeUrl, publisherOf, validateDraft, type DraftPolicy } from "@/lib/validation/request";
import schema from "@/lib/genlayer/schema.json";

const NOW = 1_800_000_000;
const basePolicy: DraftPolicy = {
  kind: "MAJORITY",
  stale_contributes: false,
  min_groups: 2,
  min_confirmations: 1,
  threshold_bps: 6000,
};

function draft(over: Record<string, unknown> = {}) {
  return {
    question: "Is the Meridian Relay operational?",
    sources: [
      { url: "https://status.meridian-relay.example/", label: "Status page", declared_class: "OFFICIAL" },
      { url: "https://relaywatch.example.net/bulletin", label: "Watch bulletin", declared_class: "INDEPENDENT" },
    ],
    resultType: { kind: "CATEGORICAL" as const, values: ["OPERATIONAL", "DEGRADED", "DOWN"] as string[] },
    policy: basePolicy,
    windowStart: NOW + 600,
    windowEnd: NOW + 600 + 86_400,
    freshnessSeconds: 86_400,
    validitySeconds: 86_400,
    bondAtto: 20n * 10n ** 15n,
    now: NOW,
    ...over,
  };
}

describe("url normalization (mirrors contract)", () => {
  it("folds case, www, default port, fragment, trailing slash and utm params", () => {
    expect(normalizeUrl("HTTPS://WWW.Example.COM:443/path/?utm_source=x&b=2#top")).toBe(
      "https://example.com/path?b=2",
    );
  });
});

describe("publisher grouping (mirrors contract)", () => {
  it("groups registrable domains", () => {
    expect(publisherOf("https://news.example.co.uk/a")).toBe("example.co.uk");
    expect(publisherOf("https://status.meridian-relay.example/")).toBe("meridian-relay.example");
  });
  it("groups platform owners by account, not URL", () => {
    expect(publisherOf("https://github.com/ohio/releases")).toBe("github:ohio");
    expect(publisherOf("https://raw.githubusercontent.com/ohio/x/main/a.md")).toBe("github:ohio");
    expect(publisherOf("https://registry.npmjs.org/react")).toBe("npm:react");
    expect(publisherOf("https://team.github.io/page")).toBe("github:team");
  });
});

describe("draft validation", () => {
  it("accepts a well-formed draft and produces terms the contract accepts", () => {
    const v = validateDraft(draft());
    expect(v.ok).toBe(true);
    expect(v.problems).toHaveLength(0);
    expect(v.termsJson).toBeTruthy();
    expect(v.origins.length).toBe(2);
  });

  it("refuses fewer than the minimum sources", () => {
    const v = validateDraft(draft({ sources: [draft().sources[0]] }));
    expect(v.ok).toBe(false);
    expect(v.problems.join(" ")).toMatch(/between 2 and 6 sources/i);
  });

  it("refuses an IP host, like the contract", () => {
    const v = validateDraft(
      draft({ sources: [{ url: "https://93.184.216.34/x", label: "", declared_class: "UNKNOWN" }, ...draft().sources] }),
    );
    expect(v.ok).toBe(false);
    expect(v.problems.join(" ")).toMatch(/host, not an IP/i);
  });

  it("refuses duplicated sources after normalization", () => {
    const v = validateDraft(
      draft({
        sources: [
          { url: "https://example.com/a#one", label: "", declared_class: "UNKNOWN" },
          { url: "https://www.example.com/a?utm_medium=email", label: "", declared_class: "UNKNOWN" },
        ],
      }),
    );
    expect(v.ok).toBe(false);
    expect(v.problems.join(" ")).toMatch(/repeats an earlier source/i);
  });

  it("refuses reserved categorical values", () => {
    const v = validateDraft(draft({ resultType: { kind: "CATEGORICAL", values: ["YES", "NONE"] } }));
    expect(v.ok).toBe(false);
    expect(v.problems.join(" ")).toMatch(/reserved/i);
  });

  it("refuses a policy needing more publishers than exist", () => {
    const v = validateDraft(draft({ policy: { ...basePolicy, min_groups: 3 } }));
    expect(v.ok).toBe(false);
    expect(v.problems.join(" ")).toMatch(/independent publishers/i);
  });

  it("refuses authority confirmation without an official source", () => {
    const v = validateDraft(
      draft({
        sources: [
          { url: "https://a.example.com/", label: "", declared_class: "UNKNOWN" },
          { url: "https://b.example.net/", label: "", declared_class: "INDEPENDENT" },
        ],
        policy: { ...basePolicy, kind: "AUTHORITY_CONFIRMATION", min_confirmations: 1 },
      }),
    );
    expect(v.ok).toBe(false);
    expect(v.problems.join(" ")).toMatch(/OFFICIAL/i);
  });

  it("enforces the contract's bond bounds", () => {
    expect(validateDraft(draft({ bondAtto: 10n ** 14n })).ok).toBe(false);
    expect(validateDraft(draft({ bondAtto: 10n ** 15n })).ok).toBe(true);
  });

  it("stays pinned to the deployed schema's bounds", () => {
    expect(schema.min_bond_atto).toBe((10n ** 15n).toString());
    expect(schema.max_bond_atto).toBe((10n ** 24n).toString());
    expect(schema.finality_delay_seconds).toBe(300);
    expect(schema.min_observation_interval).toBe(900);
  });
});
