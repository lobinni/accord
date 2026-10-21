"use client";

/**
 * The write tracker: the seven things that must happen for a write, each
 * marked done only on evidence — observed directly, passed (implied by a
 * later status), running, or failed. Statuses actually read from GenLayer are
 * kept and shown. Words only; nothing raw.
 */

import { Check, Circle, Loader2, X } from "lucide-react";

import { rungsFor, type TxState } from "@/lib/genlayer/tx";

const STEP_WORDS: Record<string, string> = {
  WALLET_CONFIRMATION: "Signed in your wallet",
  SUBMITTED: "Read back by the network",
  PENDING: "Queued for consensus",
  LEADER_PROPOSED: "Leader proposed a result",
  VALIDATING: "Validators voted",
  CONSENSUS: "The contract shows the write",
  FINALIZED: "Final — cannot be appealed",
};

export function TxRungs({ state }: { state: TxState }) {
  const rungs = rungsFor(state);
  if (state.phase === "READY") return null;
  return (
    <div className="space-y-2.5">
      {rungs.map((r) => (
        <div key={r.step} className="flex items-center gap-3">
          <RungMark state={r.state} />
          <span
            className={`text-[13px] ${
              r.state === "observed" || r.state === "passed"
                ? "text-[var(--ink)]"
                : r.state === "failed"
                  ? "text-[var(--danger)]"
                  : "text-[var(--muted)]"
            }`}
          >
            {STEP_WORDS[r.step] ?? r.step}
            {r.state === "passed" && <span className="mono ml-2 text-[9px] text-[var(--muted)]">implied</span>}
          </span>
        </div>
      ))}
      {state.phase === "FAILED" && state.message && (
        <p className="mono pt-1 text-[11px] leading-relaxed text-[var(--danger)]">{state.message}</p>
      )}
      {state.phase === "DONE" && (
        <p className="mono flex items-center gap-2 pt-1 text-[11px] text-[var(--mint)]">
          <Check size={12} /> {state.happened >= 7 ? "Recorded and final." : "Recorded by the contract; finality is being tracked."}
        </p>
      )}
      {state.statuses.length > 0 && state.phase === "RUNNING" && (
        <p className="mono text-[10px] text-[var(--muted)]">network status: {state.statuses.at(-1)}</p>
      )}
    </div>
  );
}

function RungMark({ state }: { state: "observed" | "passed" | "current" | "todo" | "failed" }) {
  if (state === "observed") return <Check size={13} className="shrink-0 text-[var(--mint)]" />;
  if (state === "passed") return <Check size={13} className="shrink-0 text-[var(--mint)] opacity-45" />;
  if (state === "current") return <Loader2 size={13} className="spin shrink-0 text-[var(--amber)]" />;
  if (state === "failed") return <X size={13} className="shrink-0 text-[var(--danger)]" />;
  return <Circle size={11} className="shrink-0 text-[var(--muted)] opacity-40" />;
}
