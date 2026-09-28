"use client";

/**
 * The bond panel: amount held, custody state, and the refund ledger — in
 * words. The bond never enters the reconciliation; this panel exists so its
 * custody is always visible.
 */

import { Landmark } from "lucide-react";

import type { AccordRequest } from "@/lib/genlayer/contract";
import { formatDateTime, formatGen } from "@/lib/formatting/present";
import { BondChip } from "@/components/accord/chips";

export function BondPanel({ accord }: { accord: AccordRequest }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="label">Deposit held</span>
        <span className="display text-2xl">{formatGen(accord.bond_deposited)}<span className="mono ml-1 text-[11px] text-[var(--muted)]">GEN</span></span>
      </div>
      <div className="flex items-center justify-between">
        <span className="label">Custody</span>
        <BondChip status={accord.bond_status} />
      </div>
      <div className="flex items-center justify-between">
        <span className="label">Required at creation</span>
        <span className="mono text-xs text-[var(--ink-dim)]">{formatGen(accord.bond_required)} GEN</span>
      </div>
      {accord.bond_status === "REFUNDED" && (
        <div className="flex items-center justify-between border-t border-[var(--line)] pt-3">
          <span className="label">Returned to creator</span>
          <span className="mono text-xs text-[var(--mint)]">
            {formatGen(accord.refunded_amount)} GEN · {formatDateTime(accord.refunded_at)}
          </span>
        </div>
      )}
      <p className="flex gap-2 border-t border-[var(--line)] pt-3 text-[12px] leading-relaxed text-[var(--muted)]">
        <Landmark size={13} className="mt-0.5 shrink-0" />
        The bond discourages spam. It is not a stake on the answer and the reconciliation never
        reads it; it returns whole to the recorded creator.
      </p>
    </div>
  );
}
