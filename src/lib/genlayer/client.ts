import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

import type { AppConfig } from "@/lib/genlayer/config";

/**
 * GenLayer clients. Reads go straight to the configured RPC. Writes are signed
 * by the user's own injected wallet: the client is given the connected ADDRESS
 * and that wallet's EIP-1193 provider, so genlayer-js hands the transaction to
 * the wallet with `eth_sendTransaction`. No private key exists anywhere in this
 * application, and there is no server-side signer.
 */

export type GenLayerClient = ReturnType<typeof createClient>;

/**
 * The endpoint browser clients actually use: our own same-origin proxy, so
 * reads never cross origins, never trip ad-blockers or CORS, and transient
 * upstream rate limits are retried server-side. Outside the browser (tests,
 * scripts) the configured RPC is used directly.
 */
export function clientRpcUrl(config: AppConfig): string {
  return typeof window === "undefined" ? config.rpcUrl : "/api/rpc";
}

/** genlayer-js's StudioNet definition with the configured endpoint — cloned, never mutated. */
export function genlayerChain(config: AppConfig) {
  return {
    ...studionet,
    id: config.chainId,
    rpcUrls: { default: { http: [clientRpcUrl(config)] } },
  } as typeof studionet;
}

export function readClient(config: AppConfig): GenLayerClient {
  return createClient({ chain: genlayerChain(config) });
}

type ProviderArg = NonNullable<Parameters<typeof createClient>[0]>["provider"];

export function writeClient(
  config: AppConfig,
  account: `0x${string}`,
  provider: unknown,
): GenLayerClient {
  return createClient({
    chain: genlayerChain(config),
    account,
    provider: provider as ProviderArg,
  });
}
