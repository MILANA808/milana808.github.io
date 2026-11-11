# AKSI Bitcoin Swap Worker

Cloudflare Worker backend scaffold for requesting and tracking 0x Cross-Chain API quotes between AKSI on Base and **native BTC** on Bitcoin mainnet.

## Current state

- Source scaffold only; **not deployed to Cloudflare**.
- Requires a deployed AKSI ERC-20 contract address on Base.
- Requires a 0x API key stored as a Cloudflare Worker secret.
- A quote is not proof of executable liquidity. The UI must check `liquidityAvailable`, quote expiry, minimum received amount, fees and route details before enabling wallet signing.
- This service never receives wallet private keys and never signs transactions.
- The reverse BTC-to-AKSI route returns a PSBT. Signing and broadcasting must happen in the user's Bitcoin wallet/client, never in this Worker.
- Mainnet swaps must remain disabled until contract deployment, liquidity, security review and legal checks are complete.

## Configure

1. Create a Cloudflare account and authenticate Wrangler.
2. Set encrypted secrets:
   ```sh
   npx wrangler secret put ZEROX_API_KEY
   npx wrangler secret put AKSI_TOKEN_ADDRESS
   ```
3. Confirm `SITE_ORIGIN` exactly matches the public AKSI MATRIX origin.
4. Deploy only after the AKSI Base mainnet token address is verified:
   ```sh
   npx wrangler deploy
   ```

## Endpoints

- `GET /health` — service health only; does not imply trading is enabled.
- `POST /quote` — JSON: `{ "direction": "aksi-to-btc" | "btc-to-aksi", "amount": "integer base units", "evmAddress": "0x…", "bitcoinAddress": "bc1… / 1… / 3…" }`.
- `GET /status?direction=aksi-to-btc|btc-to-aksi&originTxHash=…&quoteId=…` — tracks a submitted origin transaction.

## Important implementation notes

- For AKSI → BTC, `amount` is AKSI's 18-decimal base-unit integer.
- For BTC → AKSI, `amount` is satoshis (8 decimals).
- The Worker fixes chain direction and token addresses; it does not accept arbitrary token/chain parameters, so it is not an open proxy.
- CORS is an origin policy, not authentication or abuse protection. Before public launch add Cloudflare rate limiting/Turnstile or equivalent abuse controls.
- Add request schema tests, quote response validation, quote freshness checks, transaction simulation, wallet-signing UI, Bitcoin PSBT wallet support and end-to-end test coverage before enabling swaps.
- Do not expose API keys in browser code, GitHub Pages, logs or client error messages.

## Official integration reference

0x Cross Chain API's Bitcoin guide documents native BTC quotes in both directions, Base as the EVM side, PSBT signing for BTC-origin swaps, and status polling:
https://docs.0x.org/cross-chain/cross-chain-api/guides/cross-chain-swaps-with-bitcoin
