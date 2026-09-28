"use client";

/**
 * One accord, in full: its frozen terms, what can be done now, the evidence
 * map and conflict graph of the latest observation, the state history, the
 * GenLayer lifecycle of the latest writes, and the bond.
 */

import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { ArrowLeft, Hourglass, Loader2, ShieldX } from "lucide-react";

import { useAccordBundle, useChainTxs, useNow } from "@/lib/genlayer/hooks";
import { useWallet } from "@/lib/wallet/wallet";
import { observationFor, transactionsFor } from "@/lib/genlayer/contract";
import { pastValidity } from "@/lib/genlayer/acts";
import { formatDateTime, relativeTo, durationWords } from "@/lib/formatting/present";
import { Pane } from "@/components/ui/pane";
import { Chip, KindChip, PolicyChip, ReconciliationChip, StatusChip } from "@/components/accord/chips";
import { ActsPanel } from "@/components/accord/acts-panel";
import { EvidenceMap } from "@/components/evidence/evidence-map";
import { ConflictGraph } from "@/components/conflict-graph/conflict-graph";
import { StateHistory } from "@/components/accord/state-history";
import { BondPanel } from "@/components/bond/bond-panel";
import { LifecyclePanel } from "@/components/consensus/lifecycle-panel";

export function AccordDetail({ id }: { id: string }) {
  const router = useRouter();
  const now = useNow();
  const wallet = useWallet();
  const bundle = useAccordBundle(id);
  const chainTxs = useChainTxs();
  const refresh = useCallback(() => {
    /* the poller re-reads within seconds after a write lands */
    router.refresh?.();
  }, [router]);

  // the real transactions behind this request, decoded from the chain's own listing
  const txBehind = useMemo(() => {
    if (!chainTxs.value || !bundle.value) return null;
    const mine = transactionsFor(chainTxs.value, id);
    const observation = bundle.value.latest
      ? observationFor(mine.observations, bundle.value.latest.observation_time)
      : undefined;
    return { mine, observation, refund: mine.refund };
  }, [chainTxs.value, bundle.value, id]);

  if (!bundle.ready && !bundle.failed) {
    return (
      <div className="flex items-center gap-3 py-20 text-[var(--muted)]">
        <Loader2 className="spin" size={16} /> Reading the contract…
      </div>
    );
  }
  if (!bundle.value) {
    return (
      <Pane label="Request unavailable">
        <div className="flex items-start gap-3">
          <ShieldX size={18} className="mt-0.5 shrink-0 text-[var(--amber)]" />
          <p className="text-sm leading-relaxed text-[var(--ink-dim)]">
            Request #{id} cannot be read from the configured contract. Either it does not exist yet,
            or the deployment is not configured — see the banner above, set ACCORD_CONTRACT in the
            environment, and restart.
          </p>
        </div>
      </Pane>
    );
  }

  const { accord, latest, results, history } = bundle.value;
  const terms = accord.terms;
  const windowOpen = now >= accord.observation_window_start && now <= accord.observation_window_end;
  const walletIsCreator = Boolean(wallet.account && wallet.account.toLowerCase() === accord.creator.toLowerCase());

  return (
    <div className="space-y-6">
      <button className="btn btn--ghost" onClick={() => router.push("/dashboard")}>
        <ArrowLeft size={13} /> All questions
      </button>

      {/* header */}
      <div className="pane pane--raised p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="label">Accord #{accord.accord_id}</span>
          <StatusChip status={accord.status} />
          {accord.current_state && <Chip tone={accord.current_state === "EXPIRED" ? "warn" : "live"} text={accord.current_state} />}
          <span className="mono ml-auto text-[10.5px] text-[var(--muted)]" title={accord.creator}>
            frozen {formatDateTime(accord.created_at)}
            {walletIsCreator ? " · you created this request" : ""}
          </span>
        </div>
        <h1 className="display mt-4 max-w-3xl text-3xl leading-tight">{accord.question}</h1>
        <div className="mt-5 flex flex-wrap gap-2">
          <KindChip kind={terms.result_type.kind} />
          <PolicyChip kind={terms.policy.kind} />
          <Chip tone="plain" text={`${terms.sources.length} sources`} />
          <Chip tone="plain" text={`freshness ${durationWords(terms.freshness_requirement)}`} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          {/* latest result */}
          {latest ? (
            <Pane
              label={`Latest observation · round ${latest.round}`}
              right={<ReconciliationChip status={latest.reconciliation_status} />}
              raised
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="display text-3xl">{latest.state === "" ? "—" : latest.state}</p>
                  <Chip tone={latest.status === "FINALIZED" ? "live" : "warn"} text={latest.status === "FINALIZED" ? "Final" : "Awaiting finality"} />
                </div>
                <p className="text-sm leading-relaxed text-[var(--ink-dim)]">{latest.summary}</p>
                <p className="mono text-[10.5px] text-[var(--muted)]">
                  observed {formatDateTime(latest.observation_time)} · valid until {formatDateTime(latest.valid_until)}
                  {latest.finalized_at ? ` · finalized ${formatDateTime(latest.finalized_at)}` : ""}
                </p>
                {pastValidity(accord, latest, now) && (
                  <p className="mono border border-[rgba(240,167,75,0.35)] bg-[rgba(240,167,75,0.06)] px-3 py-2 text-[10.5px] leading-relaxed text-[var(--amber)]">
                    This result is past its validity — it is not shown as current. Record it as expired to keep the
                    record honest.
                  </p>
                )}
                <hr className="hr" />
                <p className="label">Conflict graph — each group speaks once</p>
                <ConflictGraph result={latest} />
              </div>
            </Pane>
          ) : (
            <Pane label="No observation yet">
              <div className="flex items-start gap-3 py-2">
                <Hourglass size={18} className="mt-0.5 shrink-0 text-[var(--mint)]" />
                <p className="text-sm leading-relaxed text-[var(--ink-dim)]">
                  {windowOpen
                    ? "The window is open. Send Observe now and every validator will fetch every source itself."
                    : now < accord.observation_window_start
                      ? `The observation window opens ${relativeTo(accord.observation_window_start, now)}.`
                      : "The observation window has ended without a first observation."}
                </p>
              </div>
            </Pane>
          )}

          {/* evidence */}
          {latest && latest.evidence.length > 0 && (
            <Pane label="Evidence map — what each source stated" right={<Chip tone="plain" text={`${latest.evidence.length} sources`} />}>
              <EvidenceMap evidence={latest.evidence} />
            </Pane>
          )}

          {/* past rounds */}
          {results.length > 1 && (
            <Pane label="Earlier observations">
              <ul className="divide-y divide-[var(--line)]">
                {results
                  .filter((r) => r.result_id !== latest?.result_id)
                  .map((r) => (
                    <li key={r.result_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--ink)]">Round {r.round} — {r.state}</p>
                        <p className="mono mt-0.5 text-[10.5px] text-[var(--muted)]">{formatDateTime(r.observation_time)}</p>
                      </div>
                      <ReconciliationChip status={r.reconciliation_status} />
                    </li>
                  ))}
              </ul>
            </Pane>
          )}

          {/* the chain behind the record */}
          {txBehind?.observation && (
            <Pane label="GenLayer lifecycle" right={<Chip tone={txBehind.observation.status === "FINALIZED" ? "live" : "warn"} text={txBehind.observation.status.toLowerCase()} />}>
              <LifecyclePanel tx={txBehind.observation} title="The observation that recorded the latest result" />
            </Pane>
          )}
          {txBehind?.refund && (
            <Pane label="The refund transaction">
              <LifecyclePanel tx={txBehind.refund} title="The transaction that returned the bond" />
            </Pane>
          )}

          {/* state history */}
          <Pane label="State history">
            <StateHistory history={history} />
          </Pane>
        </div>

        <div className="space-y-6">
          <Pane label="What can be done now" raised>
            <ActsPanel accord={accord} latest={latest} onSent={refresh} />
          </Pane>

          <Pane label="The bond">
            <BondPanel accord={accord} />
          </Pane>

          <Pane label="Frozen terms">
            <ul className="space-y-2.5 text-[13px]">
              <Term label="Window">{formatDateTime(accord.observation_window_start)} → {formatDateTime(accord.observation_window_end)}</Term>
              <Term label="Result validity">{durationWords(accord.validity_seconds)}</Term>
              <Term label="Freshness required">{durationWords(accord.freshness_requirement)}</Term>
              <Term label="Stale evidence">{terms.policy.stale_contributes ? "still counts" : "does not count"}</Term>
              {terms.result_type.kind === "CATEGORICAL" && (
                <Term label="Allowed answers">{terms.result_type.values.join(" · ")}</Term>
              )}
              {terms.result_type.kind === "NUMERIC" && (
                <Term label="Number">
                  unit {terms.result_type.unit} · {terms.result_type.decimals} decimals · tolerance {(terms.result_type.tolerance_bps / 100).toFixed(2)}%
                </Term>
              )}
              <Term label="Publishers">
                {[...new Set(terms.sources.map((s) => s.origin))].length} independent of {terms.sources.length} sources
              </Term>
            </ul>
          </Pane>
        </div>
      </div>
    </div>
  );
}

function Term({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li className="flex items-start justify-between gap-4">
      <span className="label shrink-0">{label}</span>
      <span className="text-right text-[var(--ink-dim)]">{children}</span>
    </li>
  );
}
