"use client";

/**
 * Wallet integration. Discovers injected wallets through EIP-6963 (MetaMask,
 * Rabby, …), with a plain window.ethereum fallback. The app only ever talks
 * to the chosen wallet's EIP-1193 provider: it never asks for, sees or
 * stores a key. Network safety: every write is preceded by a chain check,
 * and the user is offered a one-click switch to StudioNet (chain 61999).
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useAppConfig } from "@/lib/genlayer/app-config";
import { studionetChainParams, hexChain, type AppConfig } from "@/lib/genlayer/config";

export type InjectedWallet = { uuid: string; name: string; icon: string; provider: EIP1193 };

export type EIP1193 = {
  request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

export type WalletStatus = "disconnected" | "connecting" | "connected";

type WalletState = {
  config: AppConfig | null;
  wallets: InjectedWallet[];
  account: `0x${string}` | null;
  chainId: number | null;
  status: WalletStatus;
  wrongNetwork: boolean;
  connecting: boolean;
  error: string | null;
  connect: (w?: InjectedWallet) => Promise<void>;
  disconnect: () => void;
  switchToStudionet: () => Promise<void>;
  provider: EIP1193 | null;
};

const WalletContext = createContext<WalletState | null>(null);

declare global {
  interface Window {
    ethereum?: EIP1193 & { providers?: EIP1193[]; isMetaMask?: boolean };
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const config = useAppConfig();
  const [wallets, setWallets] = useState<InjectedWallet[]>([]);
  const [provider, setProvider] = useState<EIP1193 | null>(null);
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // EIP-6963 discovery
  useEffect(() => {
    if (typeof window === "undefined") return;
    const found = new Map<string, InjectedWallet>();
    const onAnnounce = (event: Event) => {
      const detail = (event as CustomEvent).detail as {
        info?: { uuid?: string; name?: string; icon?: string };
        provider?: EIP1193;
      };
      if (detail?.info?.uuid && detail.provider) {
        found.set(detail.info.uuid, {
          uuid: detail.info.uuid,
          name: detail.info.name || "Injected wallet",
          icon: detail.info.icon || "",
          provider: detail.provider,
        });
        setWallets([...found.values()]);
      }
    };
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    const fallback = window.setTimeout(() => {
      if (found.size === 0 && window.ethereum) {
        found.set("window.ethereum", {
          uuid: "window.ethereum",
          name: window.ethereum.isMetaMask ? "MetaMask" : "Browser wallet",
          icon: "",
          provider: window.ethereum,
        });
        setWallets([...found.values()]);
      }
    }, 600);
    return () => {
      window.removeEventListener("eip6963:announceProvider", onAnnounce);
      window.clearTimeout(fallback);
    };
  }, []);

  const readState = useCallback(async (p: EIP1193) => {
    try {
      const accounts = (await p.request({ method: "eth_accounts" })) as string[];
      const chain = (await p.request({ method: "eth_chainId" })) as string;
      setAccount((accounts?.[0] as `0x${string}`) ?? null);
      setChainId(parseInt(chain, 16));
    } catch {
      /* read failures are non-fatal */
    }
  }, []);

  const connect = useCallback(
    async (w?: InjectedWallet) => {
      setConnecting(true);
      setError(null);
      try {
        const target = w ?? wallets[0];
        if (!target) throw new Error("No injected wallet was found. Install MetaMask, then retry.");
        const accounts = (await target.provider.request({ method: "eth_requestAccounts" })) as string[];
        if (!accounts?.length) throw new Error("The wallet approved no account.");
        setProvider(target.provider);
        await readState(target.provider);
        target.provider.on?.("accountsChanged", (...args) => setAccount((args[0] as string[])?.[0] as `0x${string}` ?? null));
        target.provider.on?.("chainChanged", (...args) => setChainId(parseInt(args[0] as string, 16)));
      } catch (e) {
        setError(e instanceof Error ? e.message : "The connection was refused.");
      } finally {
        setConnecting(false);
      }
    },
    [wallets, readState],
  );

  const disconnect = useCallback(() => {
    setProvider(null);
    setAccount(null);
    setChainId(null);
  }, []);

  const switchToStudionet = useCallback(async () => {
    if (!provider || !config) return;
    setError(null);
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexChain(config.chainId) }] });
    } catch (e) {
      const code = (e as { code?: number })?.code;
      if (code === 4902) {
        try {
          await provider.request({ method: "wallet_addEthereumChain", params: [studionetChainParams(config)] });
        } catch (addErr) {
          setError(addErr instanceof Error ? addErr.message : "Adding StudioNet was refused in the wallet.");
          return;
        }
      } else {
        setError(e instanceof Error ? e.message : "Switching networks was refused in the wallet.");
        return;
      }
    }
    await readState(provider);
  }, [provider, config, readState]);

  const status: WalletStatus = connecting ? "connecting" : account ? "connected" : "disconnected";
  const wrongNetwork = Boolean(account && config && chainId !== null && chainId !== config.chainId);

  const value = useMemo<WalletState>(
    () => ({
      config,
      wallets,
      account,
      chainId,
      status,
      wrongNetwork,
      connecting,
      error,
      connect,
      disconnect,
      switchToStudionet,
      provider,
    }),
    [config, wallets, account, chainId, status, wrongNetwork, connecting, error, connect, disconnect, switchToStudionet, provider],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
}
