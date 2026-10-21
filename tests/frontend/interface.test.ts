/**
 * The interface never shows raw protocol payloads: every contract value is
 * mapped to words before rendering. These tests pin the display contract
 * and the deployed-schema vocabulary the UI expects.
 */

import { describe, expect, it } from "vitest";

import {
  BOND_WORDS,
  EVIDENCE_WORDS,
  FRESHNESS_WORDS,
  POLICY_WORDS,
  RECONCILIATION_WORDS,
  STATUS_WORDS,
  durationWords,
  formatGen,
  relativeTo,
  shortAddr,
  toAtto,
} from "@/lib/formatting/present";
import schema from "@/lib/genlayer/schema.json";

describe("GEN figures", () => {
  it("renders atto amounts as trimmed GEN", () => {
    expect(formatGen("20000000000000000")).toBe("0.02");
    expect(formatGen(10n ** 18n)).toBe("1");
    expect(formatGen("1500000000000000000")).toBe("1.5");
  });

  it("round-trips user input", () => {
    expect(toAtto("0.02")).toBe(20n * 10n ** 15n);
    expect(toAtto("1.005")).toBe(1005000000000000000n);
    expect(toAtto("abc")).toBe(0n);
  });
});

describe("words for time and addresses", () => {
  it("speaks in durations, not epochs", () => {
    expect(durationWords(86_400)).toBe("1 day");
    expect(durationWords(900)).toBe("15 minutes");
    expect(durationWords(0)).toBe("no limit");
  });
  it("relative times read naturally", () => {
    const now = 1_800_000_000;
    expect(relativeTo(now + 3600, now)).toBe("in 1 hour");
    expect(relativeTo(now - 120, now)).toBe("2 minutes ago");
  });
  it("addresses are shortened, never truncated mid-word", () => {
    const a = "0x1000000000000000000000000000000000000001";
    expect(shortAddr(a)).toBe("0x1000…0001");
  });
});

describe("vocabulary pinned to the deployed schema", () => {
  it("every contract status has human words", () => {
    for (const s of schema.request_statuses) expect(STATUS_WORDS[s]).toBeTruthy();
    for (const s of schema.reconciliation_statuses) expect(RECONCILIATION_WORDS[s]).toBeTruthy();
    for (const s of schema.evidence_statuses) expect(EVIDENCE_WORDS[s]).toBeTruthy();
    for (const s of schema.policies) expect(POLICY_WORDS[s]).toBeTruthy();
    for (const s of ["LOCKED", "REFUNDABLE", "REFUNDED"]) expect(BOND_WORDS[s]).toBeTruthy();
    for (const s of ["CURRENT", "STALE", "UNAVAILABLE", "CONFLICTING"]) expect(FRESHNESS_WORDS[s]).toBeTruthy();
  });

  it("write and view methods match the contract", () => {
    expect(schema.write_methods.map((m) => m.name)).toEqual([
      "create_accord", "cancel_accord", "observe_accord", "finalize_result",
      "expire_result", "close_accord", "refund_bond",
    ]);
    expect(schema.chain_id).toBe(61999);
    expect(schema.protocol_version).toBe("ACCORD-1.0.0");
  });
});
