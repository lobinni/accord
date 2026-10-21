"use client";

/**
 * Mission control: live protocol counters and every frozen request, each in
 * words. Filters follow the wallet: all questions, or only yours.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Inbox, Plus } from "lucide-react";

import { useAccords, useNow, useProtocolInfo } from "@/lib/genlayer/hooks";
import { useAppConfig } from "@/lib/genlayer/app-config";
import { useWallet } from "@/lib/wallet/wallet";
import { formatDateTime, formatGen, relativeTo } from "@/lib/formatting/present";
import { Chip, StatusChip } from "@/components/accord/chips";
import { Pane } from "@/components/ui/pane";

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="pane px-5 py-4">
      <p className="label">{label}</p>
      <p className="display mt-2 text-3xl leading-none">{value}</p>
      {sub && <p className="mono mt-1.5 text-[10.5px] text-[var(--muted)]">{sub}</p>}
    </div>
  );
}

export function Dashboard() {
  const now = useNow();
  const config = useAppConfig();
  const { account } = useWallet();
  const [mineOnly, setMineOnly] = useState(false);
  const info = useProtocolInfo();
  const accords = useAccords(mineOnly && account ? account : null);

  const items = useMemo(() => accords.value?.items ?? [], [accords.value]);
  const live = items.filter((a) => ["SUBMITTED", "PROPOSED", "FINALIZED"].includes(a.status)).length;
  const unresolved = items.filter(
    (a) => a.current_state === "" && ["SUBMITTED", "PROPOSED"].includes(a.status),
  ).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Mission control · Task hub</p>
          <h1 className="display mt-3 text-4xl">The questions in play.</h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--ink-dim)]">
            Every request frozen on the contract. Open one to observe, finalize, close or refund —
            the panel lists only the acts the contract will accept at that moment, and says why the
            others must wait.
          </p>
        </div>
        <Link href="/create" className="btn btn--mint no-underline">
          <Plus size={14} /> New accord
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Questions frozen" value={info.value ? String(info.value.accord_count) : "—"} sub="all time" />
        <Stat label="Live right now" value={accords.ready ? String(live) : "—"} sub="window open or closing" />
        <Stat label="Awaiting first reading" value={accords.ready ? String(unresolved) : "—"} sub="observe to begin" />
        <Stat
          label="Bonds in custody"
          value={info.value ? formatGen(info.value.total_bonded) : "—"}
          sub="GEN · refunded in full"
        />
      </div>

      <Pane
        label="Requests"
        right={
          <div className="flex items-center gap-2">
            {account && (
              <button
                className={`chip ${mineOnly ? "chip--live" : ""}`}
                style={mineOnly ? {} : { cursor: "pointer" }}
                onClick={() => setMineOnly((v) => !v)}
              >
                <span className="dot" /> {mineOnly ? "Only mine" : "All questions"}
              </button>
            )}
            <Chip tone="live" text="StudioNet · live" />
          </div>
        }
      >
        {!accords.ready && !accords.failed && (
          <p className="py-6 text-sm text-[var(--muted)]">Listening to the network…</p>
        )}
        {accords.failed && !accords.value && (
          <div className="flex items-start gap-3 py-4">
            <Inbox size={18} className="mt-0.5 shrink-0 text-[var(--amber)]" />
            <p className="text-sm leading-relaxed text-[var(--ink-dim)]">
              The network has not answered this read yet — it keeps retrying on its own every few
              seconds. The configured contract is the one shown below; when it answers, every request
              appears here, read live and never cached.
            </p>
          </div>
        )}
        {accords.ready && items.length === 0 && (
          <div className="py-8 text-center">
            <p className="display text-xl">No questions yet.</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--ink-dim)]">
              The first accord is waiting to be frozen. Name the sources, fix the policy, attach the
              bond.
            </p>
            <Link href="/create" className="btn btn--mint mt-5 no-underline">
              <Plus size={14} /> Create the first
            </Link>
          </div>
        )}
        <ul className="divide-y divide-[var(--line)]">
          {items.map((a) => (
            <li key={a.accord_id}>
              <Link
                href={`/accord/${a.accord_id}`}
                className="group flex flex-wrap items-center gap-4 py-4 no-underline transition-colors hover:bg-[rgba(53,213,180,0.03)]"
              >
                <span className="mono w-10 text-center text-sm text-[var(--muted)]">#{a.accord_id}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-[var(--ink)]">{a.question}</p>
                  <p className="mono mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[10.5px] text-[var(--muted)]">
                    <span>{a.terms.sources.length} sources</span>
                    <span>window ends {relativeTo(a.observation_window_end, now)}</span>
                    <span>bond {formatGen(a.bond_deposited)} GEN</span>
                  </p>
                </div>
                {a.current_state ? <Chip tone="live" text={a.current_state} /> : <StatusChip status={a.status} />}
                <ArrowUpRight size={15} className="text-[var(--muted)] transition-colors group-hover:text-[var(--mint)]" />
              </Link>
            </li>
          ))}
        </ul>
      </Pane>

      <p className="label">
        {config && (
          <a
            href={`${config.explorer}/address/${config.contractAddress}`}
            target="_blank"
            rel="noreferrer"
            className="text-[var(--mint)] hover:underline"
            title={config.contractAddress}
          >
            open the live contract on the explorer
          </a>
        )}{" "}
        · every request shown lives on that contract · reads are never cached
        {items[0] ? ` · frozen ${formatDateTime(items[0].created_at)} onward` : ""}
      </p>
    </div>
  );
}
