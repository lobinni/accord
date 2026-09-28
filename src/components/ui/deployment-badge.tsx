"use client";

/**
 * Which contract this interface serves, verified against the chain itself —
 * shown in plain words, never as an address fragment. Full material lives in
 * the tooltip and opens on the explorer from a click.
 */

import Link from "next/link";
import { CheckCircle2, Radio, ShieldAlert } from "lucide-react";

import { useAppConfig } from "@/lib/genlayer/app-config";
import { useDeployment } from "@/lib/genlayer/hooks";

export function DeploymentBadge() {
  const config = useAppConfig();
  const deployment = useDeployment();
  if (!config) return null;

  const verified = deployment.value?.ok === true;
  const provenMismatch = deployment.value?.ok === false;
  const label = verified
    ? "Live contract · verified"
    : provenMismatch
      ? "Contract not verified"
      : "Checking the contract…";

  return (
    <Link
      href={`${config.explorer}/address/${config.contractAddress}`}
      target="_blank"
      rel="noreferrer"
      className="chip no-underline hidden md:inline-flex"
      style={
        verified
          ? { borderColor: "rgba(53,213,180,0.4)", color: "#b9f5e4", background: "rgba(53,213,180,0.08)" }
          : provenMismatch
            ? { borderColor: "rgba(255,77,79,0.45)", color: "#ffc6c7", background: "rgba(255,77,79,0.08)" }
            : {}
      }
      title={
        provenMismatch && deployment.value && !deployment.value.ok
          ? `${deployment.value.reason} (explore the configured address)`
          : `Serving the verified ACCORD deployment at ${config.contractAddress} — open on the explorer`
      }
    >
      {verified ? (
        <CheckCircle2 size={12} className="text-[var(--mint)]" />
      ) : provenMismatch ? (
        <ShieldAlert size={12} className="text-[var(--danger)]" />
      ) : (
        <Radio size={12} className="text-[var(--muted)]" />
      )}
      {label}
    </Link>
  );
}
