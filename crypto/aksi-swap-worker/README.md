# AKSI Bitcoin Swap Worker

Cloudflare Worker backend for requesting and tracking 0x Cross-Chain API quotes between AKSI on Base and **native BTC** on Bitcoin mainnet.

## Current status

- Source and automated test suite are committed; deployment has **not** been performed.
- The AKSI ERC-20 contract must be deployed to Base and its address configured as a Worker secret.
- A 0x API key is required and must remain in an encrypted Worker secret.
- A quote is not proof of final settlement. The app must show the provider's minimum output, fees, route and estimated time, and must stop if `liquidityAvailable` is not true.
- This Worker never receives wallet private keys and never signs transactions.
- For BTC-origin swaps, the provider returns a PSBT. The user signs and broadcasts it with their own Bitcoin wallet.
- For Base-origin swaps, the user checks ERC-20 allowance and signs the approval/swap in their own EVM wallet.
- No swap can work without actual AKSI liquidity accessible to the provider.

## Configuration

1. Create a Cloudflare account and authenticate Wrangler.
2. Set encrypted secrets (never commit them):
   ```sh
   npx wrangler secret put ZEROX_API_KEY
   npx wrangler secret put AKSI_TOKEN_ADDRESS
   ```
3. Confirm `SITE_ORIGIN` in `wrangler.toml` matches the public website origin exactly.
4. Run local checks:
   ```sh
   npm install
   npm run typecheck
   npm test
   ```
5. Deploy only after the contract address and tokenomics are reviewed:
   ```sh
   npx wrangler deploy
   ```

## Endpoints

- `GET /health` — service health and non-secret configuration state; does not imply trading is live.
- `GET /config` — public chain/token configuration. Never returns secrets.
- `POST /quote` — JSON body:
  `{ "direction": "aksi-to-btc" | "btc-to-aksi", "amount": "integer base units", "evmAddress": "0x…", "bitcoinAddress": "bc1… / 1… / 3…" }`.
- `GET /status?direction=aksi-to-btc|btc-to-aksi&originTxHash=…&quoteId=…` — tracks a submitted origin transaction.

## Security notes

- The Worker pins the supported pair to AKSI on Base and native BTC on Bitcoin mainnet. It does not accept arbitrary tokens or chains.
- Requests are limited to the configured website origin via CORS. **CORS is not authentication or abuse protection.** Configure Cloudflare rate limiting / bot controls before public launch.
- Amounts are integer base units: AKSI uses 18 decimals; BTC uses 8 decimals (satoshis).
- BTC address validation here is only a shape check. The provider and wallet must perform authoritative validation.
- The Worker adds `0x-version: v2` and keeps the API key server-side.
- Upstream requests have a timeout; malformed quote payloads are rejected.
- The front end checks the returned token against `/config`, checks minimum output and liquidity, and requests a fresh quote immediately before wallet signing.
- Review quote expiry, route, fees, allowance, simulation status and transaction details in the wallet before signing.
- No seed phrase, private key, WIF or raw signing secret may be entered into this site or Worker.

## Official references

- 0x Bitcoin cross-chain guide: https://docs.0x.org/cross-chain/cross-chain-api/guides/cross-chain-swaps-with-bitcoin
- 0x API overview and required version header: https://docs.0x.org/api-reference/api-overview
- UniSat wallet PSBT signing and broadcasting: https://github.com/unisat-wallet/unisat-dev-docs/blob/master/wallet-api/api-docs/sign-transaction.md
