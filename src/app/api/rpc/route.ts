import { readServerConfig } from "@/lib/genlayer/server-config";

export const dynamic = "force-dynamic";

const TIMEOUT_MS = 25_000;

/**
 * Same-origin JSON-RPC proxy. Every browser read flows through here instead
 * of cross-origin to the network RPC, which removes CORS, ad-blocker and
 * network-visibility classes of failure entirely, and lets the server take
 * one retry on transient rate limits instead of surfacing them to the UI.
 */
export async function POST(request: Request) {
  const result = readServerConfig();
  if (!result.ok) {
    return Response.json(
      { jsonrpc: "2.0", id: null, error: { code: -32000, message: "The deployment configuration is not readable on this server." } },
      { status: 200 },
    );
  }
  let body: string;
  try {
    body = await request.text();
  } catch {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Unreadable request body" } }, { status: 400 });
  }

  const upstream = await forward(result.config.rpcUrl, body);
  return upstream;
}

async function forward(rpcUrl: string, body: string): Promise<Response> {
  const attempts = 2;
  let lastStatus = 502;
  let lastText = "";
  for (let i = 0; i < attempts; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        signal: ctrl.signal,
        cache: "no-store",
      });
      lastStatus = res.status;
      if (res.status === 429 && i + 1 < attempts) {
        const wait = Number(res.headers.get("retry-after") ?? "2");
        await sleep(Math.min(wait, 5) * 1000 + 500);
        continue;
      }
      const text = await res.text();
      return new Response(text, {
        status: res.status,
        headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
      });
    } catch {
      lastText = "upstream unreachable";
      if (i + 1 < attempts) await sleep(800);
    } finally {
      clearTimeout(timer);
    }
  }
  return Response.json(
    { jsonrpc: "2.0", id: null, error: { code: -32005, message: `The network RPC did not answer (${lastText || lastStatus}).` } },
    { status: 200 },
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
