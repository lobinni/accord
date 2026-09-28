/**
 * "What can be done now" must mirror the contract's own gates: an act the
 * panel shows as available must be one the contract would accept at that
 * moment.
 */

import { describe, expect, it } from "vitest";

import { actsFor, FINALITY_DELAY, MIN_OBSERVATION_INTERVAL } from "@/lib/genlayer/acts";
import { expectedAfter, type AccordRequest, type ResultRecord, type VerbMethod } from "@/lib/genlayer/contract";
import schema from "@/lib/genlayer/schema.json";

const NOW = 1_800_000_000;
const CREATOR = "0x1000000000000000000000000000000000000001";

function request(over: Partial<AccordRequest> = {}): AccordRequest {
  return {
    accord_id: "7",
    creator: CREATOR,
    question: "Is the relay operational?",
    terms: {
      question: "Is the relay operational?",
      sources: [],
      result_type: { kind: "BOOLEAN" },
      policy: { kind: "MAJORITY", stale_contributes: false, min_groups: 2 },
      observation_window_start: NOW - 3600,
      observation_window_end: NOW + 86_400,
      freshness_requirement: 86_400,
      validity_seconds: 43_200,
    },
    observation_window_start: NOW - 3600,
    observation_window_end: NOW + 86_400,
    freshness_requirement: 86_400,
    validity_seconds: 43_200,
    bond_required: (20n * 10n ** 15n).toString(),
    bond_deposited: (20n * 10n ** 15n).toString(),
    bond_status: "LOCKED",
    status: "SUBMITTED",
    created_at: NOW - 7200,
    updated_at: NOW - 3600,
    current_state: "",
    latest_result_id: "",
    result_count: 0,
    last_observed_at: 0,
    refunded_amount: "0",
    refunded_at: 0,
    ...over,
  };
}

function result(over: Partial<ResultRecord> = {}): ResultRecord {
  return {
    result_id: "7-R1",
    accord_id: "7",
    round: 1,
    status: "PROPOSED",
    state: "TRUE",
    reconciliation_status: "RESOLVED",
    evidence_sufficient: true,
    supporting_sources: ["S1"],
    conflicting_sources: [],
    groups: [],
    summary: "",
    evidence: [],
    observation_time: NOW - 400,
    valid_until: NOW + 43_200,
    finalized_at: 0,
    ...over,
  };
}

const find = (acts: ReturnType<typeof actsFor>, id: string) => acts.find((a) => a.id === id)!;

describe("acts panel gates", () => {
  it("a fresh submitted request can be observed, and only its creator may cancel", () => {
    const acts = actsFor(request(), null, NOW);
    expect(find(acts, "observe").available).toBe(true);
    expect(find(acts, "cancel").available).toBe(false);
    expect(find(actsFor(request(), null, NOW, CREATOR), "cancel").available).toBe(true);
    expect(find(acts, "refund").available).toBe(false);
  });

  it("observation reloads only after the contract interval", () => {
    const r = request({ status: "FINALIZED", last_observed_at: NOW - 100, result_count: 1 });
    expect(find(actsFor(r, result({ status: "FINALIZED" }), NOW), "observe").available).toBe(false);
    const later = NOW + MIN_OBSERVATION_INTERVAL;
    expect(find(actsFor(r, result({ status: "FINALIZED" }), later), "observe").available).toBe(true);
  });

  it("finality waits for the contract delay", () => {
    const r = request({ status: "PROPOSED", result_count: 1, latest_result_id: "7-R1" });
    const res = result({ observation_time: NOW - 60 });
    expect(find(actsFor(r, res, NOW), "finalize").available).toBe(false);
    const after = NOW - 60 + FINALITY_DELAY + 1;
    expect(find(actsFor(r, res, after), "finalize").available).toBe(true);
    expect(schema.finality_delay_seconds).toBe(FINALITY_DELAY);
  });

  it("closing waits for the window, and the refund follows the close", () => {
    const openReq = request({ status: "FINALIZED" });
    expect(find(actsFor(openReq, result({ status: "FINALIZED" }), NOW), "close").available).toBe(false);
    const closed = request({ status: "CLOSED", bond_status: "REFUNDABLE" });
    const acts = actsFor(closed, result({ status: "FINALIZED" }), NOW + 200_000);
    expect(find(acts, "refund").available).toBe(true);
  });

  it("a refunded bond cannot be refunded again (no refund act is offered)", () => {
    const refunded = request({ status: "CLOSED", bond_status: "REFUNDED", refunded_amount: "20000000000000000" });
    expect(actsFor(refunded, null, NOW).find((a) => a.id === "refund")).toBeUndefined();
  });
});

describe("verbs map to deployed methods and reflect in the request view", () => {
  const names = schema.write_methods.map((m) => m.name);
  it("every verb method exists on the deployment", () => {
    const verbs: VerbMethod[] = ["observe_accord", "finalize_result", "expire_result", "close_accord", "refund_bond", "cancel_accord"];
    for (const v of verbs) expect(names).toContain(v);
  });

  it("the reflected checks match each verb's effect", () => {
    const prev = request();
    expect(expectedAfter("observe_accord", prev)(request({ result_count: 1 }))).toBe(true);
    expect(expectedAfter("finalize_result", request({ status: "PROPOSED" }))(request({ status: "FINALIZED" }))).toBe(true);
    expect(expectedAfter("close_accord", prev)(request({ status: "CLOSED" }))).toBe(true);
    expect(expectedAfter("refund_bond", prev)(request({ bond_status: "REFUNDED" }))).toBe(true);
    expect(expectedAfter("cancel_accord", prev)(request({ status: "CANCELLED" }))).toBe(true);
    expect(expectedAfter("expire_result", prev)(request({ current_state: "EXPIRED" }))).toBe(true);
  });
});
