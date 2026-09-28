/**
 * The one place the app learns which network and which contract it serves.
 * Every value comes from the deployment configuration (environment variables
 * read at runtime); nothing here is a second copy of an address. To point the
 * whole application at a different deployment, change ACCORD_CONTRACT (plus
 * the network pair) — one line, no code edits. A missing or malformed value
 * is reported in words on every page rather than letting the app talk to the
 * wrong contract.
 *
 * This module is pure: it takes the environment as an argument, so it is safe
 * in both server and client bundles. Server components read process.env once
 * (see server-config.ts) and hand the result down through AppConfigProvider;
 * nothing is ever inlined into the browser bundle.
 */

export type AppConfig = {
  network: "studionet";
  chainId: number;
  rpcUrl: string;
  explorer: string;
  contractAddress: `0x${string}`;
};

export type ConfigResult = { ok: true; config: AppConfig } | { ok: false; problems: string[] };

export const ENV_KEYS = {
  network: "GENLAYER_NETWORK",
  chain: "GENLAYER_CHAIN",
  contract: "ACCORD_CONTRACT",
  rpc: "GENLAYER_RPC_URL",
} as const;

/**
 * The deployment of record, built in. With no ACCORD_CONTRACT in the
 * environment at all the app still serves the live deployment; the
 * environment value overrides it for a new deployment. Never a second copy
 * anywhere else — every reader funnels through readConfig.
 */
export const DEFAULT_CONTRACT_ADDRESS = "0xF6cbD783355B209b9B37bc977Fc7DC14C86a2a56" as const;

const NETWORKS = {
  studionet: {
    chainId: 61999,
    rpcUrl: "https://studio.genlayer.com/api",
    explorer: "https://explorer-studio.genlayer.com",
    chainName: "GenLayer StudioNet",
    currency: { name: "GEN", symbol: "GEN", decimals: 18 },
  },
} as const;

export function readConfig(env: Record<string, string | undefined>): ConfigResult {
  const problems: string[] = [];
  const network = (env.GENLAYER_NETWORK ?? "").trim();
  const chain = (env.GENLAYER_CHAIN ?? "").trim();
  // blank means "the deployment of record"; an explicit value overrides it
  const address = (env.ACCORD_CONTRACT ?? "").trim() || DEFAULT_CONTRACT_ADDRESS;
  const rpc = (env.GENLAYER_RPC_URL ?? "").trim();

  if (network !== "" && network !== "studionet") problems.push("GENLAYER_NETWORK must be studionet when set.");
  const known = NETWORKS.studionet;
  if (chain !== "" && chain !== String(known.chainId))
    problems.push(`GENLAYER_CHAIN must be ${known.chainId} for StudioNet when set.`);
  if (!/^0x[0-9a-fA-F]{40}$/.test(address) || /^0x0{40}$/i.test(address))
    problems.push("ACCORD_CONTRACT, when set, must be the deployed contract's 0x address.");
  if (rpc && !/^https:\/\//.test(rpc)) problems.push("GENLAYER_RPC_URL must be an https address when set.");

  if (problems.length) return { ok: false, problems };
  return {
    ok: true,
    config: {
      network: "studionet",
      chainId: known.chainId,
      rpcUrl: rpc || known.rpcUrl,
      explorer: known.explorer,
      contractAddress: address as `0x${string}`,
    },
  };
}

/** StudioNet parameters used when the wallet has never seen the network. */
export function studionetChainParams(config: AppConfig) {
  const known = NETWORKS.studionet;
  return {
    chainId: hexChain(config.chainId),
    chainName: known.chainName,
    nativeCurrency: known.currency,
    rpcUrls: [config.rpcUrl],
    blockExplorerUrls: [config.explorer],
  };
}

export const hexChain = (id: number) => `0x${id.toString(16)}`;
