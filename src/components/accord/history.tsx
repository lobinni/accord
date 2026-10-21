"use client";

/**
 * The record: every finalized change of state across every request, plus the
 * deposits the contract sent straight back with their reasons. States and
 * refunds are written by the contract itself; this page only reads them.
 */

import Link from "next/link";
import { ArrowRight as ArrowIcon, ArrowUpRight, History as HistoryIcon, Undo2 } from "lucide-react";

import { useAccords, useReturnedDeposits, useTransitions } from "@/lib/genlayer/hooks";
import { formatDateTime, formatGen } from "@/lib/formatting/present";
import { Chip } from "@/components/accord/chips";
import { Pane } from "@/components/ui/pane";

export function RecordHall() {
  const transitions = useTransitions();
  const returned = useReturnedDeposits();
  const accords = useAccords(null);
  const withState = (accords.value?.items ?? []).filter((a) => a.current_state);
  const entries = [...(transitions.value?.items ?? [])].sort((a, b) => b.finalized_at - a.finalized_at);
  const deposits = [...(returned.value?.items ?? [])].sort((a, b) => b.at - a.at);

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">The record</p>
        <h1 className="display mt-3 text-4xl">What the record states.</h1>
        <p className="mt-2 max-w-xl text-sm text-[var(--ink-dim)]">
          Final states, immutable once recorded. A value past its validity is never shown as
          current — it is recorded as expired, and the observation can run again.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Pane label="Finalized transitions" right={<Chip tone="live" text="written by the contract" />}>
          {!transitions.ready && <p className="py-6 text-sm text-[var(--muted)]">Listening to the network…</p>}
          {transitions.ready && entries.length === 0 && (
            <p className="py-6 text-sm leading-relaxed text-[var(--ink-dim)]">
              Nothing has been finalized yet. States appear here the moment a proposed result passes
              the contract&apos;s five-minute finality delay and someone sends the finalize act.
            </p>
          )}
          <ol className="divide-y divide-[var(--line)]">
            {entries.map((t, i) => (
              <li key={i} className="py-3.5">
                <Link href={`/accord/${t.accord_id}`} className="group flex items-center gap-3 no-underline">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-[var(--muted)]">{t.previous_state || "nothing"}</span>
                      <ArrowIcon size={13} className="text-[var(--muted)]" />
                      <span className="font-semibold text-[var(--ink)]">{t.new_state}</span>
                      {t.kind === "EXPIRED" && <Chip tone="warn" text="past validity" />}
                    </p>
                    <p className="mono mt-1 text-[10.5px] text-[var(--muted)]">
                      accord #{t.accord_id} · {t.result_id} · finalized {formatDateTime(t.finalized_at)}
                    </p>
                  </div>
                  <ArrowUpRight size={14} className="shrink-0 text-[var(--muted)] group-hover:text-[var(--mint)]" />
                </Link>
              </li>
            ))}
          </ol>
        </Pane>

        <div className="space-y-6">
          <Pane label="Established states" right={<Chip tone="plain" text={`${withState.length} requests`} />}>
            {withState.length === 0 && (
              <p className="py-4 text-sm text-[var(--ink-dim)]">No request holds a finalized state yet.</p>
            )}
            <ul className="divide-y divide-[var(--line)]">
              {withState.map((a) => (
                <li key={a.accord_id}>
                  <Link href={`/accord/${a.accord_id}`} className="group flex items-center gap-3 py-3 no-underline">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-[var(--ink)]">{a.question}</p>
                      <p className="mono mt-0.5 text-[10.5px] text-[var(--muted)]">#{a.accord_id}</p>
                    </div>
                    <Chip tone={a.current_state === "EXPIRED" ? "warn" : "live"} text={a.current_state} />
                  </Link>
                </li>
              ))}
            </ul>
          </Pane>

          <Pane label="Deposits sent straight back" right={<Undo2 size={13} className="text-[var(--amber)]" />}>
            {deposits.length === 0 ? (
              <p className="py-4 text-sm leading-relaxed text-[var(--ink-dim)]">
                No creation has been refused. When one is, the bond returns in the same transaction,
                with the contract&apos;s reason on record here.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--line)]">
                {deposits.map((d, i) => (
                  <li key={i} className="py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[var(--ink)]">{formatGen(d.amount)} GEN</p>
                      <span className="mono text-[10px] text-[var(--muted)]">{formatDateTime(d.at)}</span>
                    </div>
                    <p className="mono mt-0.5 text-[10.5px] text-[var(--muted)]">returned to the requester who sent it</p>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--ink-dim)]">{d.reason}</p>
                  </li>
                ))}
              </ul>
            )}
          </Pane>

          <Pane label="How a state is earned" raised>
            <ul className="space-y-3 text-[13px] leading-relaxed text-[var(--ink-dim)]">
              {[
                "Every validator fetched every source itself.",
                "Each claim is grounded in a passage the validator read.",
                "Publishers count once; republishers add no voice.",
                "The policy ran in contract code — identical on every node.",
                "Five quiet minutes of finality, then the state.",
              ].map((s, i) => (
                <li key={i} className="flex gap-3">
                  <HistoryIcon size={13} className="mt-1 shrink-0 text-[var(--mint)]" />
                  {s}
                </li>
              ))}
            </ul>
          </Pane>
        </div>
      </div>
    </div>
  );
}
