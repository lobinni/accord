"use client";

/**
 * The wallet control. Connect discovers injected wallets (MetaMask first),
 * shows the connected account, and offers a one-click switch to StudioNet
 * chain 61999 whenever the wallet is elsewhere.
 */

import { useState } from "react";
import { Check, ChevronDown, Link2, LogOut, RefreshCw, Wallet } from "lucide-react";

import { useWallet } from "@/lib/wallet/wallet";
import { shortAddr } from "@/lib/formatting/present";

export function WalletButton() {
  const { wallets, account, wrongNetwork, connecting, error, connect, disconnect, switchToStudionet, chainId } =
    useWallet();
  const [open, setOpen] = useState(false);

  if (!account) {
    return (
      <div className="relative">
        <button className="btn btn--mint" onClick={() => setOpen((v) => !v)} disabled={connecting}>
          <Wallet size={14} />
          {connecting ? "Connecting…" : "Connect wallet"}
        </button>
        {open && (
          <div className="pane absolute right-0 top-[110%] z-50 w-72" onMouseLeave={() => setOpen(false)}>
            <div className="pane-head">
              <span className="label">Choose a wallet</span>
            </div>
            <div className="p-2">
              {wallets.length === 0 && (
                <p className="p-3 text-xs leading-relaxed text-[var(--ink-dim)]">
                  No injected wallet is available in this browser. Install MetaMask, reload, and connect on
                  StudioNet — chain 61999.
                </p>
              )}
              {wallets.map((w) => (
                <button
                  key={w.uuid}
                  onClick={() => {
                    setOpen(false);
                    connect(w);
                  }}
                  className="flex w-full items-center gap-3 border-none bg-transparent px-3 py-2.5 text-left text-sm text-[var(--ink)] hover:bg-[rgba(53,213,180,0.08)]"
                >
                  {w.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={w.icon} alt="" width={20} height={20} />
                  ) : (
                    <Link2 size={16} className="text-[var(--mint)]" />
                  )}
                  {w.name}
                </button>
              ))}
            </div>
          </div>
        )}
        {error && <p className="mono mt-2 text-[10.5px] text-[var(--danger)]">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {wrongNetwork && (
        <button className="btn" style={{ borderColor: "rgba(240,167,75,0.5)", color: "var(--amber)" }} onClick={switchToStudionet}>
          <RefreshCw size={13} />
          Switch to StudioNet · 61999
        </button>
      )}
      <div className="relative">
        <button className="btn btn--ghost" onClick={() => setOpen((v) => !v)} title={account}>
          <span
            className="inline-block h-2 w-2"
            style={{ background: wrongNetwork ? "var(--amber)" : "var(--mint)" }}
          />
          {shortAddr(account)}
          <ChevronDown size={13} />
        </button>
        {open && (
          <div className="pane absolute right-0 top-[110%] z-50 w-64" onMouseLeave={() => setOpen(false)}>
            <div className="p-4">
              <p className="label mb-2">Session</p>
              <p className="mono text-xs text-[var(--ink)]">{account}</p>
              <p className="mono mt-1 text-[10.5px] text-[var(--muted)]">
                {wrongNetwork ? "The wallet is on another network and must switch." : "On StudioNet — ready to sign."}
              </p>
              {wrongNetwork ? (
                <button className="btn btn--mint mt-3 w-full" onClick={switchToStudionet}>
                  <RefreshCw size={13} /> Switch to StudioNet
                </button>
              ) : (
                <p className="mono mt-3 flex items-center gap-2 text-[10.5px] text-[var(--mint)]">
                  <Check size={12} /> On StudioNet · ready to sign
                </p>
              )}
              <button
                className="btn btn--ghost mt-2 w-full"
                onClick={() => {
                  setOpen(false);
                  disconnect();
                }}
              >
                <LogOut size={13} /> Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
