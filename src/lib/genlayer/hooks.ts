"use client";

/**
 * Data and write hooks for the interface. Reads go through the checked
 * adapter (lib/genlayer/contract.ts) against the one configured address,
 * polled lightly. Writes go through useSend, which runs the evidence-based
 * transaction lifecycle of tx.ts. No hook stores state of its own — the
 * chain does.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useConfigResult } from "@/lib/genlayer/app-config";
import type { AppConfig } from "@/lib/genlayer/config";
import { readClient, writeClient, type GenLayerClient } from "@/lib/genlayer/client";
import {
  accordCreated,
  contractTransactions,
  reads,
  validateDeployment,
  type AccordRequest,
  type Call,
  type ChainTx,
  type DeploymentCheck,
  type HistoryEntry,
  type Page,
  type ProtocolInfo,
  type ResultRecord,
  type ReturnedDeposit,
} from "@/lib/genlayer/contract";
import { preflight } from "@/lib/genlayer/preflight";
import { initialTx, runWrite, type TxState } from "@/lib/genlayer/tx";
import { useWallet } from "@/lib/wallet/wallet";

export type LoadState<T> = { ready: boolean; failed: boolean; value: T | null };

const idle = { ready: false, failed: false, value: null } as const;

/** The reader every hook shares: the checked client for the configured deployment. */
export function useBase(): { config: AppConfig; client: GenLayerClient } | null {
  const result = useConfigResult();
  const key = result.ok ? result.config.contractAddress + result.config.rpcUrl : "none";
  return useMemo(() => {
    if (!result.ok) return null;
    try {
      return { config: result.config, client: readClient(result.config) };
    } catch {
      return null;
    }
    // key pins the identity of the result; base is rebuilt only when it changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

function usePolled<T>(fetcher: (() => Promise<T>) | null, intervalMs = 5000): LoadState<T> {
  const [state, setState] = useState<LoadState<T>>(idle as LoadState<T>);
  const box = useRef(fetcher);
  box.current = fetcher;
  const fetcherKey = fetcher ? "on" : "off";

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setState(idle as LoadState<T>);
    if (!fetcher) return;
    const tick = async () => {
      try {
        const value = await box.current!();
        if (!stop) setState({ ready: true, failed: false, value });
      } catch {
        if (!stop) setState((s) => ({ ready: s.ready, failed: true, value: s.value }));
      } finally {
        if (!stop) timer = setTimeout(tick, intervalMs);
      }
    };
    tick();
    return () => {
      stop = true;
      if (timer) clearTimeout(timer);
    };
    // fetcherKey flips with availability; the live fetcher always comes from box.current
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, fetcherKey]);
  return state;
}

export function useProtocolInfo(): LoadState<ProtocolInfo> {
  const base = useBase();
  return usePolled(base ? () => reads.protocol(base.client, base.config) : null, 30000);
}

/** Is the configured contract verifiably ACCORD? Every send checks this. */
export function useDeployment(): LoadState<DeploymentCheck> {
  const base = useBase();
  return usePolled(base ? () => validateDeployment(base.client, base.config) : null, 300000);
}

export function useAccords(creator?: string | null): LoadState<Page<AccordRequest>> {
  const base = useBase();
  return usePolled(
    base
      ? () => {
          if (!creator) return reads.list(base.client, base.config);
          // per-creator listing, with a global-list fallback for deployments
          // whose per-sender index answers differently
          return reads.byCreator(base.client, base.config, creator).catch(async () => {
            const page = await reads.list(base.client, base.config, 0, 50);
            const mine = page.items.filter((a) => a.creator.toLowerCase() === creator.toLowerCase());
            return { ...page, items: mine, total: mine.length };
          });
        }
      : null,
    20000,
  );
}

/** Every finalized state transition across the protocol, newest last from the contract. */
export function useTransitions(limit = 50): LoadState<Page<HistoryEntry>> {
  const base = useBase();
  return usePolled(base ? () => reads.transitions(base.client, base.config, 0, limit) : null, 45000);
}

/** Every deposit a refused creation sent straight back, with the reason. */
export function useReturnedDeposits(limit = 50): LoadState<Page<ReturnedDeposit>> {
  const base = useBase();
  return usePolled(base ? () => reads.returned(base.client, base.config, 0, limit) : null, 60000);
}

export function useAccord(id: string | null): LoadState<AccordRequest> {
  const base = useBase();
  return usePolled(base && id ? () => reads.accord(base.client, base.config, id) : null, 8000);
}

export function useResult(id: string | null): LoadState<ResultRecord> {
  const base = useBase();
  return usePolled(base && id ? () => reads.result(base.client, base.config, id) : null, 8000);
}

export function useResults(accordId: string | null): LoadState<Page<ResultRecord>> {
  const base = useBase();
  return usePolled(base && accordId ? () => reads.results(base.client, base.config, accordId) : null, 12000);
}

export function useHistory(accordId: string | null): LoadState<Page<HistoryEntry>> {
  const base = useBase();
  return usePolled(base && accordId ? () => reads.history(base.client, base.config, accordId) : null, 15000);
}

export type AccordBundle = {
  accord: AccordRequest;
  latest: ResultRecord | null;
  results: ResultRecord[];
  history: HistoryEntry[];
};

/** One accord in full: the request, its newest result, all results, history. */
export function useAccordBundle(id: string | null): LoadState<AccordBundle> {
  const base = useBase();
  const hasBase = base !== null;
  const baseRef = useRef(base);
  baseRef.current = base;
  const fetcher = useCallback(async (): Promise<AccordBundle> => {
    const b = baseRef.current!;
    const accord = await reads.accord(b.client, b.config, id!);
    const results = await reads.results(b.client, b.config, id!, 0, 50).catch(() => null);
    const latest = accord.latest_result_id
      ? await reads.result(b.client, b.config, accord.latest_result_id).catch(() => null)
      : null;
    const history = await reads.history(b.client, b.config, id!, 0, 50).catch(() => null);
    return { accord, latest, results: results?.items ?? [], history: history?.items ?? [] };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, hasBase]);
  return usePolled(hasBase && id ? fetcher : null, 8000);
}

/** The chain's own transactions for the configured contract (StudioNet listing). */
export function useChainTxs(pollMs = 60000): LoadState<ChainTx[]> {
  const base = useBase();
  return usePolled(base ? () => contractTransactions(base.config) : null, pollMs);
}

export function useNow(stepMs = 1000): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), stepMs);
    return () => clearInterval(t);
  }, [stepMs]);
  return now;
}

// ── writes ──────────────────────────────────────────────────────────────────

export type SendOptions = {
  call: Call;
  reconciled: () => Promise<boolean | string>;
  onRecorded?: () => void;
  onSettled?: (final: TxState) => void;
};

export type Sender = {
  state: TxState;
  busy: boolean;
  send: (o: SendOptions) => Promise<TxState>;
  reset: () => void;
};

/** One write at a time, with the transaction's own lifecycle. */
export function useSend(): Sender {
  const base = useBase();
  const wallet = useWallet();
  const deployment = useDeployment();
  const [state, setState] = useState<TxState>(initialTx);

  const send = useCallback(
    async ({ call, reconciled, onRecorded, onSettled }: SendOptions) => {
      const refuse = (message: string, failure: TxState["failure"]): TxState => {
        const next: TxState = { ...initialTx, phase: "FAILED", message, failure };
        setState(next);
        return next;
      };
      if (!base) return refuse("This interface has no deployment configured yet.", "INVALID_REQUEST");
      const blocked = preflight(
        {
          status: wallet.status,
          account: wallet.account ?? undefined,
          chainId: wallet.chainId ?? undefined,
          hasProvider: !!wallet.provider,
        },
        base.config.chainId,
        deployment.value ?? undefined,
      );
      if (blocked) {
        if (blocked.kind === "NETWORK_MISMATCH") await wallet.switchToStudionet();
        return refuse(blocked.message, blocked.kind);
      }
      if (!wallet.account || !wallet.provider) return refuse("Connect a wallet first.", "TRANSACTION_FAILED");
      const final = await runWrite({
        config: base.config,
        client: writeClient(base.config, wallet.account, wallet.provider),
        functionName: call.functionName,
        args: call.args,
        value: call.value,
        reconciled,
        onRecorded,
        poller: base.client,
        onUpdate: setState,
      });
      onSettled?.(final);
      return final;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [base, deployment.value, wallet.account, wallet.chainId, wallet.provider, wallet.status],
  );

  // busy until the contract's own state shows the write (or it failed); finality is tracked after
  const busy = state.phase === "RUNNING" && state.happened < 6;
  return { state, busy, send, reset: useCallback(() => setState(initialTx), []) };
}

export { accordCreated };
