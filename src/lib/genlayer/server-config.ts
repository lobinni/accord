/**
 * Server-side deployment configuration. Server components call this once;
 * the result flows to the browser through AppConfigProvider. Client bundles
 * never import this module, so no secret-adjacent value is ever shipped.
 */

import { readConfig, type ConfigResult } from "@/lib/genlayer/config";

export function readServerConfig(): ConfigResult {
  return readConfig({
    GENLAYER_NETWORK: process.env.GENLAYER_NETWORK,
    GENLAYER_CHAIN: process.env.GENLAYER_CHAIN,
    ACCORD_CONTRACT: process.env.ACCORD_CONTRACT,
    GENLAYER_RPC_URL: process.env.GENLAYER_RPC_URL,
  });
}
