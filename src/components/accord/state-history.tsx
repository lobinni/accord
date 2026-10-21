"use client";

/**
 * The state history of one request: each finalized transition, oldest first,
 * in words — what the state was, what it became, when.
 */

import { ArrowRight } from "lucide-react";

import type { HistoryEntry } from "@/lib/genlayer/contract";
import { formatDateTime } from "@/lib/formatting/present";

export function StateHistory({ history }: { history: HistoryEntry[] }) {
  if (!history.length) {
    return <p className="py-3 text-sm text-[var(--muted)]">No finalized state yet. The first finalized result opens this history.</p>;
  }
  return (
    <ol className="space-y-0">
      {history.map((h, i) => (
        <li key={i} className="relative border-l border-[var(--line-strong)] py-2.5 pl-5">
          <span className="absolute -left-[4.5px] top-4 h-2 w-2 bg-[var(--mint)]" />
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-[var(--muted)]">{h.previous_state || "nothing"}</span>
            <ArrowRight size={13} className="text-[var(--muted)]" />
            <span className="font-semibold text-[var(--ink)]">{h.new_state}</span>
            {h.kind === "EXPIRED" && <span className="mono text-[10px] text-[var(--amber)]">past validity</span>}
          </p>
          <p className="mono mt-0.5 text-[10.5px] text-[var(--muted)]">
            {h.result_id} · finalized {formatDateTime(h.finalized_at)}
          </p>
        </li>
      ))}
    </ol>
  );
}
