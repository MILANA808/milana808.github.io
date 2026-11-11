import { afterEach, describe, expect, it, vi } from "vitest";
import worker, { type Env } from "../src/index";

const ORIGIN = "https://milana808.github.io";
const EVM = "0x1111111111111111111111111111111111111111";
const BTC = "bc1q" + "a".repeat(38);
const env: Env = {
  ZEROX_API_KEY: "test-api-key",
  AKSI_TOKEN_ADDRESS: EVM,
  SITE_ORIGIN: ORIGIN,
  QUOTE_LIMITER: { limit: async () => ({ success: true }) },
  STATUS_LIMITER: { limit: async () => ({ success: true }) },
};

function req(path: string, init: RequestInit = {}) {
  return new Request("https://worker.example" + path, {
    ...init,
    headers: { Origin: ORIGIN, ...(init.headers || {}) },
  });
}
function quoteResponse() {
  return {
    liquidityAvailable: true,
    quotes: [{
      quoteId: "0xquote123",
      sellAmount: "1000000000000000000",
      buyAmount: "123456",
      minBuyAmount: "120000",
      transaction: { details: { to: EVM, data: "0x1234", value: "0" } },
    }],
  };
}
afterEach(() => vi.unstubAllGlobals());

describe("AKSI swap Worker", () => {
  it("rejects requests from an unapproved origin", async () => {
    const response = await worker.fetch(new Request("https://worker.example/health", { headers: { Origin: "https://evil.example" } }), env);
    expect(response.status).toBe(403);
  });

  it("answers preflight for the configured site", async () => {
    const response = await worker.fetch(req("/quote", { method: "OPTIONS" }), env);
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(ORIGIN);
  });

  it("reports health without claiming that trading is live", async () => {
    const response = await worker.fetch(req("/health"), env);
    const body = await response.json() as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(body.liveTrading).toBe(false);
    expect(body.configured).toBe(true);
  });

  it("exposes token/network configuration without exposing secrets", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ result: "0x6000" }), { status: 200 })));
    const response = await worker.fetch(req("/config"), env);
    const body = await response.json() as Record<string, unknown>;
    expect(body.chainId).toBe(8453);
    expect(body.tokenAddress).toBe(EVM);
    expect(body.configured).toBe(true);
    expect(JSON.stringify(body)).not.toContain("test-api-key");
  });

  it("does not call 0x when configuration is missing", async () => {
    const response = await worker.fetch(req("/quote", {
      method: "POST", body: JSON.stringify({ direction: "aksi-to-btc", amount: "1", evmAddress: EVM, bitcoinAddress: BTC }),
    }), { ...env, ZEROX_API_KEY: "" });
    expect(response.status).toBe(503);
  });

  it("rejects malformed amounts and addresses before upstream call", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const response = await worker.fetch(req("/quote", {
      method: "POST", body: JSON.stringify({ direction: "aksi-to-btc", amount: "1.5", evmAddress: "bad", bitcoinAddress: BTC }),
    }), env);
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rate limits quote requests before calling upstream services", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const limitedEnv = { ...env, QUOTE_LIMITER: { limit: async () => ({ success: false }) } };
    const response = await worker.fetch(req("/quote", {
      method: "POST",
      body: JSON.stringify({ direction: "aksi-to-btc", amount: "1", evmAddress: EVM, bitcoinAddress: BTC }),
    }), limitedEnv);
    expect(response.status).toBe(429);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rate limits status polling before calling the provider", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const limitedEnv = { ...env, STATUS_LIMITER: { limit: async () => ({ success: false }) } };
    const hash = "0x" + "a".repeat(64);
    const response = await worker.fetch(req("/status?direction=aksi-to-btc&originTxHash=" + hash + "&quoteId=q-1"), limitedEnv);
    expect(response.status).toBe(429);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requests AKSI to native BTC with the required API version header", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ result: "0x6000" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(quoteResponse()), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await worker.fetch(req("/quote", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ direction: "aksi-to-btc", amount: "1000000000000000000", evmAddress: EVM, bitcoinAddress: BTC }),
    }), env);
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe(ORIGIN);
    const [url, init] = fetchMock.mock.calls[1] as [URL, RequestInit];
    const parsed = new URL(String(url));
    expect(parsed.searchParams.get("originChain")).toBe("base");
    expect(parsed.searchParams.get("destinationChain")).toBe("bitcoin");
    expect(parsed.searchParams.get("sellToken")).toBe(EVM);
    expect(parsed.searchParams.get("destinationAddress")).toBe(BTC);
    expect((init.headers as Record<string, string>)["0x-version"]).toBe("v2");
  });

  it("requests native BTC to AKSI in the reverse direction", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ result: "0x6000" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(quoteResponse()), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const response = await worker.fetch(req("/quote", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ direction: "btc-to-aksi", amount: "100000000", evmAddress: EVM, bitcoinAddress: BTC }),
    }), env);
    expect(response.status).toBe(200);
    const parsed = new URL(String((fetchMock.mock.calls[1] as [URL])[0]));
    expect(parsed.searchParams.get("originChain")).toBe("bitcoin");
    expect(parsed.searchParams.get("destinationChain")).toBe("base");
    expect(parsed.searchParams.get("originAddress")).toBe(BTC);
  });

  it("rejects malformed upstream quote data instead of returning an executable-looking response", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ result: "0x6000" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ liquidityAvailable: true, quotes: [{}] }), { status: 200 })));
    const response = await worker.fetch(req("/quote", {
      method: "POST", body: JSON.stringify({ direction: "aksi-to-btc", amount: "1", evmAddress: EVM, bitcoinAddress: BTC }),
    }), env);
    expect(response.status).toBe(502);
  });

  it("validates and proxies transaction status queries", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "bridge_pending" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const hash = "0x" + "a".repeat(64);
    const response = await worker.fetch(req("/status?direction=aksi-to-btc&originTxHash=" + hash + "&quoteId=q-1"), env);
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe(ORIGIN);
    const parsed = new URL(String((fetchMock.mock.calls[0] as [URL])[0]));
    expect(parsed.pathname).toBe("/cross-chain/status");
    expect(parsed.searchParams.get("originChain")).toBe("base");
  });
});
