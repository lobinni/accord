"use client";

/**
 * The GenLayer lifecycle of the transaction that recorded a result or a
 * refund: its consensus outcome and the validators' recorded votes, read from
 * the chain's own consensus data and rendered as words and marks.
 */

import { Check, X } from "lucide-react";

import type { ChainTx } from "@/lib/genlayer/contract";
import { Chip } from "@/components/accord/chips";

const VOTE_WORDS: Record<string, string> = {
  AGREE: "agrees",
  DISAGREE: "disagrees",
};

export function LifecyclePanel({ tx, title }: { tx: ChainTx; title?: string }) {
  const agrees = tx.votes["AGREE"] ?? 0;
  const disagrees = Object.entries(tx.votes)
    .filter(([v]) => v !== "AGREE")
    .reduce((n, [, c]) => n + c, 0);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="label">{title ?? "The transaction that recorded this"}</span>
        <Chip tone="live" text={tx.consensus.replace(/_/g, " ").toLowerCase() || "consensus"} />
        <Chip tone={tx.execution === "SUCCESS" ? "live" : "danger"} text={tx.execution === "SUCCESS" ? "executed" : "execution error"} />
      </div>
      <p className="mono text-[10.5px] text-[var(--muted)]">network status: {tx.status.toLowerCase()}</p>
      <div>
        <p className="label mb-2">Validator votes</p>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: agrees }).map((_, i) => (
            <span key={`a${i}`} className="flex items-center gap-1.5 border border-[rgba(53,213,180,0.4)] bg-[rgba(53,213,180,0.08)] px-2.5 py-1.5">
              <Check size={11} className="text-[var(--mint)]" />
              <span className="mono text-[10px] text-[var(--mint)]">validator {i + 1} agrees</span>
            </span>
          ))}
          {Array.from({ length: disagrees }).map((_, i) => (
            <span key={`d${i}`} className="flex items-center gap-1.5 border border-[rgba(255,77,79,0.4)] bg-[rgba(255,77,79,0.07)] px-2.5 py-1.5">
              <X size={11} className="text-[var(--danger)]" />
              <span className="mono text-[10px] text-[var(--danger)]">validator {i + 1} {VOTE_WORDS["DISAGREE"] ?? "disagrees"}</span>
            </span>
          ))}
          {agrees + disagrees === 0 && (
            <span className="text-[12px] text-[var(--muted)]">The votes for this round are not exposed by the listing.</span>
          )}
        </div>
      </div>
    </div>
  );
}
