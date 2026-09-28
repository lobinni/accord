"use client";

/**
 * Small labeled markers. Every one is words plus a hue — no raw protocol
 * tokens are shown; the text comes from the presentation layer.
 */

import {
  BOND_WORDS,
  EVIDENCE_WORDS,
  FRESHNESS_WORDS,
  KIND_WORDS,
  POLICY_WORDS,
  RECONCILIATION_WORDS,
  STATUS_WORDS,
} from "@/lib/formatting/present";

export function Chip({ tone, text }: { tone: "live" | "warn" | "danger" | "plain"; text: string }) {
  const cls = tone === "plain" ? "chip" : `chip chip--${tone}`;
  return (
    <span className={cls}>
      <span className="dot" />
      {text}
    </span>
  );
}

export function StatusChip({ status }: { status: string }) {
  const tone =
    status === "FINALIZED" ? "live" : status === "PROPOSED" || status === "SUBMITTED" ? "warn" : status === "CLOSED" ? "live" : "plain";
  return <Chip tone={tone === "live" && status === "CLOSED" ? "plain" : tone} text={STATUS_WORDS[status] ?? status} />;
}

export function ReconciliationChip({ status }: { status: string }) {
  const tone = status === "RESOLVED" ? "live" : status === "UNRESOLVED_CONFLICT" ? "danger" : "warn";
  return <Chip tone={tone} text={RECONCILIATION_WORDS[status] ?? status} />;
}

export function EvidenceChip({ status }: { status: string }) {
  const tone = status === "SUPPORTING" ? "live" : status === "CONFLICTING" ? "danger" : status === "EXCLUDED" || status === "UNAVAILABLE" ? "plain" : "warn";
  return <Chip tone={tone} text={EVIDENCE_WORDS[status] ?? status} />;
}

export function FreshnessChip({ freshness }: { freshness: string }) {
  const tone = freshness === "CURRENT" ? "live" : freshness === "STALE" ? "warn" : freshness === "CONFLICTING" ? "danger" : "plain";
  return <Chip tone={tone} text={FRESHNESS_WORDS[freshness] ?? freshness} />;
}

export function BondChip({ status }: { status: string }) {
  const tone = status === "REFUNDED" ? "live" : status === "REFUNDABLE" ? "warn" : "plain";
  return <Chip tone={tone} text={BOND_WORDS[status] ?? status} />;
}

export function PolicyChip({ kind }: { kind: string }) {
  return <Chip tone="plain" text={POLICY_WORDS[kind] ?? kind} />;
}

export function KindChip({ kind }: { kind: string }) {
  return <Chip tone="plain" text={KIND_WORDS[kind] ?? kind} />;
}
