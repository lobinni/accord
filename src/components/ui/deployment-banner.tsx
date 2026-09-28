"use client";

/**
 * Slim top banner shown when the deployment configuration is unset or
 * malformed: the app fails closed, in words, instead of talking to a guessed
 * contract. Deploying and setting one environment value clears it.
 */

import { AlertTriangle } from "lucide-react";

import { useConfigResult } from "@/lib/genlayer/app-config";

export function DeploymentBanner() {
  const result = useConfigResult();
  if (result.ok) return null;
  return (
    <div className="relative z-40 border-b border-[rgba(240,167,75,0.35)] bg-[rgba(240,167,75,0.07)] px-4 py-2.5">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1">
        <span className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-[var(--amber)]" />
          <span className="label" style={{ color: "var(--amber)" }}>
            Deployment pending
          </span>
        </span>
        <span className="text-xs leading-relaxed text-[var(--ink-dim)]">
          This interface is ready. Deploy the contract, then set ACCORD_CONTRACT in the environment and
          restart. {result.problems[0]}
        </span>
      </div>
    </div>
  );
}
