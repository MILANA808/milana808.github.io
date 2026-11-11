export interface Env {
  ZEROX_API_KEY: string;
  AKSI_TOKEN_ADDRESS: string;
  SITE_ORIGIN: string;
}

const BTC_NATIVE = "bc1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqmql8k8";
const ZEROX = "https://api.0x.org/cross-chain";

function json(data: unknown, status = 200, origin = "*"): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type",
      "vary": "Origin",
    },
  });
}

function validEvmAddress(value: unknown): value is string {
  return typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value);
}

function validBtcAddress(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^(1[1-9A-HJ-NP-Za-km-z]{25,34}|3[1-9A-HJ-NP-Za-km-z]{25,34}|bc1q[0-9ac-hj-np-z]{38,58}|bc1p[0-9ac-hj-np-z]{58})$/.test(value);
}

function validIntegerAmount(value: unknown): value is string {
  return typeof value === "string" && /^[1-9][0-9]{0,77}$/.test(value);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigin = env.SITE_ORIGIN;
    if (!allowedOrigin || origin !== allowedOrigin) {
      return json({ error: "Origin not allowed" }, 403, allowedOrigin || "null");
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": allowedOrigin,
          "access-control-allow-methods": "GET, POST, OPTIONS",
          "access-control-allow-headers": "content-type",
          "access-control-max-age": "86400",
          "vary": "Origin",
        },
      });
    }

    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ service: "aksi-swap-worker", status: "ok", liveTrading: false }, 200, allowedOrigin);
    }

    if (!env.ZEROX_API_KEY || !/^0x[0-9a-fA-F]{40}$/.test(env.AKSI_TOKEN_ADDRESS || "")) {
      return json({ error: "Swap service is not configured: API key or deployed AKSI token address is missing." }, 503, allowedOrigin);
    }

    if (request.method === "POST" && url.pathname === "/quote") {
      const raw = await request.text();
      if (raw.length > 8192) return json({ error: "Request too large" }, 413, allowedOrigin);

      let body: Record<string, unknown>;
      try { body = JSON.parse(raw) as Record<string, unknown>; }
      catch { return json({ error: "Invalid JSON" }, 400, allowedOrigin); }

      const direction = body.direction;
      const amount = body.amount;
      const evmAddress = body.evmAddress;
      const bitcoinAddress = body.bitcoinAddress;

      if (!validIntegerAmount(amount) || !validEvmAddress(evmAddress) || !validBtcAddress(bitcoinAddress)) {
        return json({ error: "Provide integer base-unit amount, EVM address and Bitcoin mainnet address." }, 400, allowedOrigin);
      }

      const params = new URLSearchParams({
        sortQuotesBy: "price",
        maxNumQuotes: "3",
      });

      if (direction === "aksi-to-btc") {
        params.set("originChain", "base");
        params.set("destinationChain", "bitcoin");
        params.set("sellToken", env.AKSI_TOKEN_ADDRESS);
        params.set("buyToken", BTC_NATIVE);
        params.set("sellAmount", amount);
        params.set("originAddress", evmAddress);
        params.set("destinationAddress", bitcoinAddress);
      } else if (direction === "btc-to-aksi") {
        params.set("originChain", "bitcoin");
        params.set("destinationChain", "base");
        params.set("sellToken", BTC_NATIVE);
        params.set("buyToken", env.AKSI_TOKEN_ADDRESS);
        params.set("sellAmount", amount);
        params.set("originAddress", bitcoinAddress);
        params.set("destinationAddress", evmAddress);
      } else {
        return json({ error: "Unsupported swap direction" }, 400, allowedOrigin);
      }

      const upstream = await fetch(`${ZEROX}/quotes?${params.toString()}`, {
        headers: { "0x-api-key": env.ZEROX_API_KEY },
      });
      const data = await upstream.json().catch(() => ({ error: "Invalid upstream response" }));
      return json(data, upstream.status, allowedOrigin);
    }

    if (request.method === "GET" && url.pathname === "/status") {
      const direction = url.searchParams.get("direction");
      const originTxHash = url.searchParams.get("originTxHash") || "";
      const quoteId = url.searchParams.get("quoteId") || "";
      const validTx = direction === "btc-to-aksi"
        ? /^[0-9a-fA-F]{64}$/.test(originTxHash)
        : /^0x[0-9a-fA-F]{64}$/.test(originTxHash);
      if (!validTx || !quoteId || quoteId.length > 200) {
        return json({ error: "Invalid transaction hash, direction or quote ID" }, 400, allowedOrigin);
      }
      const params = new URLSearchParams({
        originChain: direction === "btc-to-aksi" ? "bitcoin" : "base",
        originTxHash,
        quoteId,
      });
      const upstream = await fetch(`${ZEROX}/status?${params.toString()}`, {
        headers: { "0x-api-key": env.ZEROX_API_KEY },
      });
      const data = await upstream.json().catch(() => ({ error: "Invalid upstream response" }));
      return json(data, upstream.status, allowedOrigin);
    }

    return json({ error: "Not found" }, 404, allowedOrigin);
  },
};
