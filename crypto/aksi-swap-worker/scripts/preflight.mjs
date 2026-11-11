const apiKey = process.env.ZEROX_API_KEY || "";
const tokenAddress = process.env.AKSI_TOKEN_ADDRESS || "";

if (!apiKey) throw new Error("Missing GitHub secret ZEROX_API_KEY.");
if (!/^0x[0-9a-fA-F]{40}$/.test(tokenAddress)) throw new Error("AKSI_TOKEN_ADDRESS must be a 20-byte EVM address.");

async function rpc(method, params = []) {
  const response = await fetch("https://mainnet.base.org", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!response.ok) throw new Error("Base RPC request failed.");
  const payload = await response.json();
  if (payload.error || typeof payload.result !== "string") throw new Error("Base RPC returned an invalid result for " + method + ".");
  return payload.result;
}

function decodeAbiString(hex) {
  const raw = hex.replace(/^0x/, "");
  if (raw.length < 128) throw new Error("Token metadata response is too short.");
  const offset = Number(BigInt("0x" + raw.slice(0, 64))) * 2;
  const length = Number(BigInt("0x" + raw.slice(offset, offset + 64)));
  const data = raw.slice(offset + 64, offset + 64 + length * 2);
  if (!Number.isSafeInteger(length) || length < 0 || data.length !== length * 2) {
    throw new Error("Token metadata ABI response is malformed.");
  }
  return new TextDecoder().decode(Uint8Array.from(data.match(/.{2}/g) || [], byte => parseInt(byte, 16)));
}

const chainId = await rpc("eth_chainId");
if (chainId !== "0x2105") throw new Error("RPC is not Base mainnet (chain ID 8453).");

const code = await rpc("eth_getCode", [tokenAddress, "latest"]);
if (!/^0x[0-9a-fA-F]+$/.test(code) || code === "0x") throw new Error("AKSI_TOKEN_ADDRESS has no contract bytecode on Base mainnet.");

const [nameHex, symbolHex, decimalsHex] = await Promise.all([
  rpc("eth_call", [{ to: tokenAddress, data: "0x06fdde03" }, "latest"]),
  rpc("eth_call", [{ to: tokenAddress, data: "0x95d89b41" }, "latest"]),
  rpc("eth_call", [{ to: tokenAddress, data: "0x313ce567" }, "latest"]),
]);
const name = decodeAbiString(nameHex);
const symbol = decodeAbiString(symbolHex);
const decimals = Number(BigInt(decimalsHex));
if (name !== "AKSI" || symbol !== "AKSI" || decimals !== 18) {
  throw new Error("Contract metadata mismatch. Expected name AKSI, symbol AKSI and 18 decimals.");
}
console.log("Base mainnet contract verified: AKSI / AKSI / 18 decimals. Worker deployment preflight passed.");
