import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import { AppFrame } from "@/components/ui/app-frame";
import { AppConfigProvider } from "@/lib/genlayer/app-config";
import { WalletProvider } from "@/lib/wallet/wallet";
import { readServerConfig } from "@/lib/genlayer/server-config";

// Typefaces are vendored under public/fonts and declared via @font-face in
// globals.css — zero build-time font resolution, deploys anywhere.

/**
 * Render on every request, never prerendered. The deployment configuration is
 * read from the environment at request time, so changing it on the host
 * (Vercel env vars, .env) takes effect immediately — no rebuild, no stale
 * baked-in address.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ACCORD — Consensus establishes the record",
  description:
    "Decentralized reconciliation of conflicting external information on GenLayer StudioNet. Fix a question, the sources allowed to answer it, and a policy; let independent validators read and agree.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // The deployment configuration is read once, server-side, and carried to
  // the browser through a provider. Nothing deployment-related is inlined.
  const result = readServerConfig();
  return (
    <html lang="en">
      <body>
        <AppConfigProvider result={result}>
          <WalletProvider>
            <AppFrame>{children}</AppFrame>
          </WalletProvider>
        </AppConfigProvider>
      </body>
    </html>
  );
}
