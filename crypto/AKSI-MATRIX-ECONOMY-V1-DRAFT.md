# AKSI MATRIX Economy — architecture and tokenomics proposal v1

**Status: working proposal only. Not approved for deployment, sale, fundraising or public financial promotion.**  
**Network direction:** AKSI ERC-20 on Base; cross-chain access through independent liquidity providers and user-controlled wallets.  
**Production token supply:** undecided. The 100,000,000 AKSI figure below is a modelling scenario, not an approved supply.

## 1. Product objective

AKSI MATRIX is an ecosystem with one primary transferable token (AKSI), wallet-to-wallet payments, merchant payment tools, and an exchange interface that searches available routes to other cryptoassets.

The product must not promise that AKSI is redeemable for a fixed amount, that every asset is always swappable, or that its market price will rise. A route exists only when a provider supports the asset/network pair and executable liquidity is available.

## 2. Recommended technical model

- **Token:** ERC-20 AKSI on Base. Use the existing fixed-supply, non-upgradeable contract; no hidden minting, blacklist, transfer tax or privileged pause.
- **Wallets:** users retain control of their own EVM/Bitcoin wallets and approve every transaction. Never collect seed phrases, private keys or WIFs.
- **Exchange:** aggregator/provider quotes, route and fee disclosure, quote expiry, minimum received, simulation where supported, wallet signature, transaction tracking and clear failure states.
- **Native BTC:** use a provider's Bitcoin cross-chain flow (e.g. PSBT-based origin transaction); do not describe wrapped BTC as native BTC.
- **Payments:** direct AKSI transfers on Base first. Merchant tools generate payment requests and verify on-chain settlement; a displayed payment request is not proof of payment.
- **Multi-chain expansion:** add networks only after wallet support, route availability, security review and operational monitoring are verified. Do not claim universal token coverage.

The exchange aggregator is infrastructure, not the source of AKSI liquidity. AKSI needs independently funded liquidity accessible to the provider/DEX route.

## 3. Token supply scenario — for modelling only

A round-number scenario of **100,000,000 AKSI** is used below solely to make allocation arithmetic concrete. The supply remains unapproved. The current contract mints the entire chosen supply once at deployment, so the amount cannot be changed later.

| Allocation bucket | Share | AKSI at 100m scenario | Proposed release rule |
|---|---:|---:|---|
| Ecosystem development and grants | 25% | 25,000,000 | 8-year budget; quarterly disclosures; grants tied to delivered work |
| Treasury reserve | 20% | 20,000,000 | Multisig custody; no discretionary market-support promises; published spending policy |
| Liquidity inventory | 20% | 20,000,000 | Staged deployment; only a portion initially paired; publish pool addresses and changes |
| Founder and core contributors | 15% | 15,000,000 | 4-year vesting with 12-month cliff, then monthly vesting |
| Community distribution | 10% | 10,000,000 | Transparent eligibility, caps and anti-sybil rules; no guaranteed rewards |
| Strategic integrations | 5% | 5,000,000 | 2-year vesting or milestone-based release |
| User adoption and payment incentives | 5% | 5,000,000 | Published campaigns, fixed budgets and end dates |
| **Total** | **100%** | **100,000,000** | |

### Allocation safeguards

1. Publish every allocation wallet and vesting contract before public distribution.
2. Keep treasury and liquidity inventory in a multisig, ideally 3-of-5 independent signers for a five-signer setup.
3. Use timelocks for material treasury movements where technically practical.
4. Publish monthly balances, grants, vesting unlocks and liquidity changes.
5. Never count tokens reserved for liquidity as cash or guaranteed market depth.
6. Do not distribute rewards until the reward budget, eligibility, tax/accounting treatment and abuse controls are documented.
7. Do not promise yield, dividends, buybacks, price floors or guaranteed redemption.

## 4. Liquidity and market access

### Initial market

Recommended first pair to evaluate: **AKSI/USDC on Base** on a reputable DEX with transparent pool parameters. This is a proposal, not a pool that exists today.

Before funding:
- compare available DEX venues, fee tiers, concentrated-liquidity ranges and operational risks;
- calculate the amount of USDC and AKSI the owner is genuinely willing to put at risk;
- disclose that liquidity providers can suffer impermanent loss and that pool depth can be withdrawn;
- record pool address, initial deposits, transaction hashes and ownership/custody;
- test small trades and price impact before opening access to a wider audience.

A token allocation to “liquidity” is not itself liquidity. A two-sided pool requires both assets, and its usable depth depends on actual deposits and price range.

### Exchange routing

For every quote, show:
- exact input and output assets and networks;
- estimated and minimum output;
- provider, route, network fees and provider fees when supplied;
- quote expiry and price impact when supplied;
- whether liquidity is available;
- the wallet action required and the transaction status.

If no executable route or sufficient liquidity is available, block the swap and say so. Never manufacture a price or quote. Cross-chain execution may involve separate origin and destination transactions and can fail or take time.

## 5. Revenue model for AKSI MATRIX

Do not add a transfer tax to the AKSI token. Start with transparent service revenue separate from token ownership:

| Revenue stream | Initial policy | Later option |
|---|---|---|
| Basic wallet-to-wallet AKSI transfer | No AKSI protocol surcharge; user pays Base gas | Keep this policy unless there is a clear reason to change |
| Swap interface | Pass through provider/network costs transparently; initially no extra platform fee | Consider a disclosed service fee only after legal review and user testing |
| Merchant tools | Free pilot with clear limits | Subscription or disclosed merchant service fee |
| Business integrations / API | Limited pilot | Contracted usage pricing |
| Optional ecosystem services | No token-gated promise before service exists | Publish prices in a stable unit; accept AKSI only where operationally supported |

If a platform fee is later considered, it must be disclosed before the user signs, shown separately from network/provider fees, and never hidden in a smart-contract transfer tax.

## 6. Treasury, controls and governance

- Use a multisig controlled by distinct trusted signers; no single hot wallet should control all treasury funds.
- Separate deployer, treasury, liquidity-provider and operational wallets.
- Publish a treasury policy, signer replacement process, incident response and transaction log.
- Do not claim decentralized governance at launch. Start with a published change process and documented decision records.
- The current token contract has no admin or mint function. Any future migration or additional token issuance would require a separately reviewed contract and explicit disclosure; it must not be silently added.

## 7. Phased launch plan and acceptance criteria

### Phase 0 — design freeze
- [ ] Choose final supply and allocations; record explicit approval.
- [ ] Obtain legal advice for intended issuer, jurisdictions, distribution, marketing, AML/KYC and consumer obligations.
- [ ] Publish risk disclosure and treasury policy.
- [ ] Select multisig signers and custody design.
- [ ] Decide whether the proposed allocation and vesting are acceptable.

### Phase 1 — testnet
- [ ] Deploy the existing token contract to Base Sepolia using a dedicated test wallet.
- [ ] Verify source, constructor supply, decimals and recipient on the explorer.
- [ ] Test transfers, payment-request verification and UI states.
- [ ] Test exchange backend with mocks; do not infer mainnet liquidity from testnet tests.

### Phase 2 — mainnet token and liquidity
- [ ] Independent smart-contract and application security review; remediate findings.
- [ ] Separate explicit approval for mainnet deployment.
- [ ] Deploy and verify the fixed-supply token.
- [ ] Publish contract address, supply, allocations and vesting wallets.
- [ ] Separately approve and fund the initial two-sided liquidity pool; publish exact deposits and pool address.

### Phase 3 — exchange beta
- [ ] Configure provider credentials only in encrypted server-side secrets.
- [ ] Verify live quotes and executable small-value swaps in both directions.
- [ ] Test timeouts, failed origin transactions, destination delays, refunds/recovery and status tracking.
- [ ] Run an independently reviewed end-to-end native-BTC test with real wallets and a deliberately small amount.
- [ ] Publish supported assets/networks and known limitations.

### Phase 4 — payments and ecosystem
- [ ] Pilot merchant payment requests and independent on-chain settlement verification.
- [ ] Publish merchant terms, fees, refunds and dispute handling.
- [ ] Enable incentives only against a published, funded budget.
- [ ] Report usage, treasury and liquidity metrics without implying guaranteed returns.

## 8. Current known project state

As recorded in the repository's existing release gates:
- AKSI ERC-20 contract source and tests exist; token has not been deployed.
- Exchange UI and Cloudflare Worker source exist; Worker has not been deployed.
- No production supply or allocation has been approved.
- No 0x API key, deployed contract address or live AKSI liquidity pool has been configured.
- No real swap or merchant payment has been verified.

This document is a design proposal and does not change those facts.

## 9. Decisions that must remain explicit

The following are not silently decided by this proposal:
1. Final token supply.
2. Final allocation percentages and vesting.
3. Initial liquidity capital and acceptable loss exposure.
4. Multisig signers and custody arrangements.
5. Legal entity/issuer, target jurisdictions and distribution method.
6. Whether any platform fee will ever be charged.

**No mainnet deployment, public sale, liquidity funding or financial transaction is authorized by this document.**
