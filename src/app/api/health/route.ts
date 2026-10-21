import { readServerConfig } from "@/lib/genlayer/server-config";

export const dynamic = "force-dynamic";

/**
 * No database, no local state: health means the interface is configured for
 * the network it serves. The contract itself is the only state this app has.
 */
export async function GET() {
  const result = readServerConfig();
  return Response.json({
    ok: true,
    service: "accord-interface",
    network: "studionet",
    chainId: 61999,
    deploymentConfigured: result.ok,
    contract: result.ok ? result.config.contractAddress : null,
  });
}
