"use client";

import type { ReactNode } from "react";

import { NetworkBackground } from "@/components/ui/network-bg";
import { Logo } from "@/components/ui/logo";
import { NavLinks } from "@/components/ui/nav-links";
import { DeploymentBanner } from "@/components/ui/deployment-banner";
import { DeploymentBadge } from "@/components/ui/deployment-badge";
import { WalletButton } from "@/components/wallet/wallet-button";

export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <NetworkBackground />
      <DeploymentBanner />
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[rgba(7,17,14,0.82)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Logo />
          <div className="flex items-center gap-5">
            <NavLinks />
            <DeploymentBadge />
            <WalletButton />
          </div>
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-24 pt-10">{children}</main>
      <footer className="relative z-10 border-t border-[var(--line)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6">
          <span className="label">ACCORD · reconciliation protocol</span>
          <span className="label">
            Consensus over pages · publishers over URLs · code over judgement · bonds never vote
          </span>
        </div>
      </footer>
    </div>
  );
}
