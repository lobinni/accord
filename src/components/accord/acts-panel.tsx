"use client";

/**
 * "What can be done now." Renders exactly the acts the contract will accept
 * at this moment (mirrored from the contract's gates) and explains, in
 * words, why the others must wait. Sending goes through useSend: preflight,
 * wallet signature on StudioNet chain 61999, then the evidence-based
 * lifecycle until the contract's own views show the write.
 */

import { useEffect, useState } from "react";
import { Lock, Send } from "lucide-react";

import { actsFor, type Act } from "@/lib/genlayer/acts";
import { actCall, accordReflected, expectedAfter, type AccordRequest, type ResultRecord } from "@/lib/genlayer/contract";
import { useBase, useSend, useNow } from "@/lib/genlayer/hooks";
import { useWallet } from "@/lib/wallet/wallet";
import { TxRungs } from "@/components/consensus/tx-tracker";

export function ActsPanel({
  accord,
  latest,
  onSent,
}: {
  accord: AccordRequest;
  latest: ResultRecord | null;
  onSent?: () => void;
}) {
  const now = useNow();
  const wallet = useWallet();
  const base = useBase();
  const sender = useSend();
  const [activeAct, setActiveAct] = useState<string | null>(null);

  // a fresh request means a fresh sender state
  useEffect(() => {
    sender.reset();
    setActiveAct(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accord.accord_id, accord.updated_at]);

  const acts = actsFor(accord, latest, now, wallet.account ?? undefined);

  const send = (act: Act) => {
    if (!base) return;
    setActiveAct(act.id);
    void sender.send({
      call: actCall(act.method, accord.accord_id),
      // the request's own view must reflect the act before the tracker marks consensus
      reconciled: accordReflected(base.client, base.config, accord.accord_id, expectedAfter(act.method, accord)),
      onRecorded: onSent,
    });
  };

  return (
    <div className="space-y-3">
      {acts.map((a) => (
        <div key={a.id} className="flex items-start gap-3 border border-[var(--line)] px-4 py-3">
          <span className="mt-1.5 h-2 w-2 shrink-0" style={{ background: a.available ? "var(--mint)" : "var(--muted)" }} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--ink)]">
              {a.label}
              {!a.permissionless && <Lock size={11} className="ml-2 inline text-[var(--muted)]" />}
            </p>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-[var(--ink-dim)]">{a.explains}</p>
            {a.reason && <p className="mono mt-1 text-[10.5px] leading-relaxed text-[var(--amber)]">{a.reason}</p>}
          </div>
          <button
            className="btn btn--mint shrink-0 !px-4 !py-2"
            disabled={!a.available || sender.busy}
            onClick={() => send(a)}
          >
            <Send size={12} />
            {sender.busy && activeAct === a.id ? "Sending…" : "Send"}
          </button>
        </div>
      ))}
      {acts.length === 0 && (
        <p className="py-2 text-[13px] text-[var(--muted)]">Nothing can be done with this request in its current state.</p>
      )}
      <div className="pt-2">
        <TxRungs state={sender.state} />
      </div>
      {!wallet.account && (
        <p className="text-[12px] text-[var(--muted)]">
          Connect a wallet on StudioNet (chain 61999) to send any of these acts.
        </p>
      )}
    </div>
  );
}
