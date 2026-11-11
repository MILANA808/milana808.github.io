export interface Env {
  ZEROX_API_KEY: string;
  AKSI_TOKEN_ADDRESS: string;
  SITE_ORIGIN: string;
}

const BTC_NATIVE = "bc1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqmql8k8";
const ZEROX = "https://api.0x.org/cross-chain";
const MAX_BODY_BYTES = 8192;
const UPSTREAM_TIMEOUT_MS = 15_000;

type Direction = "aksi-to-btc" | "btc-to-aksi";

function json(data: unknown, status = 200, origin = "null"): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "access-control-allow-origin": origin,
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type",
      "access-control-max-age": "86400",
      "vary": "Origin",
      "x-content-type-options": "nosniff",
    },
  });
}

function validEvmAddress(value: unknown): value is string {
  return typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value);
}

function validBtcAddress(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 90) return false;
  // Shape validation only. The upstream provider performs authoritative validation.
  return /^(1[1-9A-HJ-NP-Za-km-z]{25,34}|3[1-9A-HJ-NP-Za-km-z]{25,34}|bc1q[0-9ac-hj-np-z]{38,58}|bc1p[0-9ac-hj-np-z]{58})$/.test(value);
}

function validIntegerAmount(value: unknown): value is string {
  return typeof value === "string" && /^[1-9][0-9]{0,77}$/.test(value);
}

function validDirection(value: unknown): value is Direction {
  return value === "aksi-to-btc" || value === "btc-to-aksi";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validQuoteEnvelope(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (typeof value.liquidityAvailable !== "boolean") return false;
  if (!Array.isArray(value.quotes)) return false;
  if (value.quotes.length === 0) return value.liquidityAvailable === false;
  return value.quotes.every((quote) =>
    isRecord(quote) &&
    typeof quote.quoteId === "string" &&
    quote.quoteId.length > 0 &&
    typeof quote.sellAmount === "string" &&
    typeof quote.buyAmount === "string" &&
    typeof quote.minBuyAmount === "string" &&
    isRecord(quote.transaction) &&
    isRecord(quote.transaction.details)
  );
}

async function callZeroEx(url: URL, env: Env): Promise<Response> {
  try {
    const upstream = await fetch(url, {
      headers: {
        "0x-api-key": env.ZEROX_API_KEY,
        "0x-version": "v2",
        "accept": "application/json",
      },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    const payload: unknown = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      // Keep provider status and useful error code/message, but never echo request headers.
      const safePayload = isRecord(payload)
        ? { code: payload.code, message: payload.message, name: payload.name }
        : { message: "The quote provider returned an unreadable response." };
      return json({ error: "Quote provider rejected the request.", provider: safePayload }, upstream.status);
    }
    return json(payload);
  } catch (error) {
    const message = error instanceof Error && error.name === "TimeoutError"
      ? "Quote provider timed out. Please request a fresh quote."
      : "Quote provider is temporarily unavailable.";
    return json({ error: message }, 502);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const allowedOrigin = env.SITE_ORIGIN;
    const origin = request.headers.get("Origin") || "";
    if (!allowedOrigin || origin !== allowedOrigin) {
      return json({ error: "Origin not allowed" }, 403, "null");
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
      return json({
        service: "aksi-bitcoin-swap",
        status: "ok",
        configured: Boolean(env.ZEROX_API_KEY && validEvmAddress(env.AKSI_TOKEN_ADDRESS)),
        liveTrading: false,
        note: "Health confirms service availability only; it does not confirm token liquidity or executable swaps.",
      }, 200, allowedOrigin);
    }

    if (request.method === "POST" && url.pathname === "/quote") {
      if (!env.ZEROX_API_KEY || !validEvmAddress(env.AKSI_TOKEN_ADDRESS)) {
        return json({ error: "Swap service is not configured with a 0x API key and verified AKSI Base token address." }, 503, allowedOrigin);
      }

      const raw = await request.text();
      if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
        return json({ error: "Request too large" }, 413, allowedOrigin);
      }

      let body: unknown;
      try { body = JSON.parse(raw); }
      catch { return json({ error: "Invalid JSON" }, 400, allowedOrigin); }
      if (!isRecord(body)) return json({ error: "Request body must be a JSON object." }, 400, allowedOrigin);

      const { direction, amount, evmAddress, bitcoinAddress } = body;
      if (!validDirection(direction)) return json({ error: "Unsupported swap direction." }, 400, allowedOrigin);
      if (!validIntegerAmount(amount)) return json({ error: "Amount must be a positive integer in token base units." }, 400, allowedOrigin);
      if (!validEvmAddress(evmAddress)) return json({ error: "Invalid Base EVM address." }, 400, allowedOrigin);
      if (!validBtcAddress(bitcoinAddress)) return json({ error: "Bitcoin mainnet address format is not recognized." }, 400, allowedOrigin);

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
      } else {
        params.set("originChain", "bitcoin");
        params.set("destinationChain", "base");
        params.set("sellToken", BTC_NATIVE);
        params.set("buyToken", env.AKSI_TOKEN_ADDRESS);
        params.set("sellAmount", amount);
        params.set("originAddress", bitcoinAddress);
        params.set("destinationAddress", evmAddress);
      }
      const response = await callZeroEx(new URL(`${ZEROX}/quotes?${params.toString()}`), env);
      if (!response.ok) return json(await response.json(), response.status, allowedOrigin);
      const payload: unknown = await response.json();
      if (!validQuoteEnvelope(payload)) {
        return json({ error: "Quote provider returned an unexpected response. No transaction should be signed." }, 502, allowedOrigin);
      }
      return json(payload, 200, allowedOrigin);
    }

    if (request.method === "GET" && url.pathname === "/status") {
      if (!env.ZEROX_API_KEY) return json({ error: "Swap service is not configured with a 0x API key." }, 503, allowedOrigin);
      const direction = url.searchParams.get("direction");
      const originTxHash = url.searchParams.get("originTxHash") || "";
      const quoteId = url.searchParams.get("quoteId") || "";
      if (!validDirection(direction) || !quoteId || quoteId.length > 200) {
        return json({ error: "Invalid transaction direction or quote ID." }, 400, allowedOrigin);
      }
      const validTx = direction === "btc-to-aksi"
        ? /^(?:0x)?[0-9a-fA-F]{64}$/.test(originTxHash)
        : /^0x[0-9a-fA-F]{64}$/.test(originTxHash);
      if (!validTx) return json({ error: "Invalid origin transaction hash." }, 400, allowedOrigin);

      const params = new URLSearchParams({
        originChain: direction === "btc-to-aksi" ? "bitcoin" : "base",
        originTxHash,
        quoteId,
      });
      return callZeroEx(new URL(`${ZEROX}/status?${params.toString()}`), env);
    }

    return json({ error: "Not found" }, 404, allowedOrigin);
  },
};
