"use client";

/**
 * A full-page configuration notice, in words, for surfaces that cannot do
 * anything truthful without a deployment (for example, submitting a request).
 */

import { ShieldAlert } from "lucide-react";

import { useConfigResult } from "@/lib/genlayer/app-config";
import { Pane } from "@/components/ui/pane";

export function ConfigProblem({ action }: { action: string }) {
  const result = useConfigResult();
  if (result.ok) return null;
  return (
    <div className="mx-auto max-w-2xl py-10">
      <Pane label="Deployment pending" raised>
        <div className="flex items-start gap-4">
          <ShieldAlert size={26} className="mt-1 shrink-0 text-[var(--amber)]" />
          <div className="space-y-3">
            <p className="display text-xl">{action} is waiting for a deployment.</p>
            <p className="text-sm leading-relaxed text-[var(--ink-dim)]">
              Deploy the intelligent contract to StudioNet, set one environment value — ACCORD_CONTRACT —
              and restart. Nothing is guessed: this page refuses to point at an address it was not given.
            </p>
            <ul className="space-y-1">
              {result.problems.map((p: string) => (
                <li key={p} className="mono text-[11px] leading-relaxed text-[var(--amber)]">
                  · {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Pane>
    </div>
  );
}
