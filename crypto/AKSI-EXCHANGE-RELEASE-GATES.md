# AKSI token and native-BTC exchange — release gates

This checklist separates code completion from a live financial service. A green CI run does not mean a token is deployed, liquid, audited or ready for public use.

## Gate 1 — token design (human decision required)

- [ ] Approve total AKSI supply. The 100,000,000 value in tests is not an approved choice.
- [ ] Approve initial allocation: deployer/treasury, ecosystem, contributors and public distribution.
- [ ] Define vesting and unlocks; identify any treasury multisig.
- [ ] Decide whether transfers are unrestricted at launch.
- [ ] Complete legal review for each market where the token will be offered or promoted.

## Gate 2 — Base Sepolia

- [ ] Deploy the contract to Base Sepolia (chain ID 84532) using a dedicated test wallet.
- [ ] Verify source and constructor arguments on BaseScan Sepolia.
- [ ] Confirm token name, symbol, 18 decimals, total supply and deployer balance.
- [ ] Test wallet-to-wallet transfers and import the token into a standard EVM wallet.
- [ ] Run the full Worker quote/status flow with test assets where the provider supports the route.
- [ ] Exercise both EVM and Bitcoin PSBT wallet paths; record transaction hashes and outcomes.

## Gate 3 — Worker operations

- [ ] Create the 0x API key in the official dashboard.
- [ ] Deploy the Worker only after the Base contract address is verified.
- [ ] Store `ZEROX_API_KEY` and `AKSI_TOKEN_ADDRESS` as encrypted Cloudflare secrets.
- [ ] Confirm `SITE_ORIGIN` is exactly `https://milana808.github.io`.
- [ ] Confirm the Worker rate-limit namespace IDs are unique in the Cloudflare account and tune thresholds for expected traffic.
- [ ] Add Cloudflare WAF/bot controls and monitor 429s. Built-in Worker limits are approximate and per location; CORS is not abuse protection.
- [ ] Verify `/health`, `/config`, `/quote` and `/status` from the public site.
- [ ] Confirm API key never appears in browser assets, logs or Git history.

## Gate 4 — liquidity and exchange

- [ ] Choose the Base DEX/pool and quote asset; document the pool address and fee tier.
- [ ] Decide and fund initial liquidity. This is capital at risk and requires a separate user decision.
- [ ] Confirm 0x returns a firm, executable AKSI/native-BTC quote for realistic small amounts in both directions.
- [ ] Verify minimum output, provider fees, network fees, quote freshness, simulation and status lifecycle.
- [ ] Test failure, timeout, refund and stuck-transaction recovery paths.
- [ ] Publish risk disclosure and explain that token price and liquidity are not guaranteed.

## Gate 5 — production release

- [ ] Independent smart-contract and application security review.
- [ ] End-to-end test on Base Sepolia with a real EVM wallet and UniSat-compatible Bitcoin wallet.
- [ ] Re-check npm dependency audit and all GitHub Actions checks.
- [ ] Confirm token supply, allocation, legal review and liquidity plan in writing.
- [ ] Obtain separate explicit approval for Base mainnet deployment and liquidity funding.
- [ ] Deploy, verify contract bytecode/source, configure Worker secrets and publish the UI only after all checks pass.

## Current verified state

- ERC-20 contract source and Foundry tests exist; token is not deployed.
- Worker source, TypeScript checks and Vitest tests exist; Worker is not deployed.
- Exchange UI source and static safety checks exist; it is not yet on the public Pages site.
- No 0x API key, AKSI contract address, liquidity pool or live quote has been configured in this project.
