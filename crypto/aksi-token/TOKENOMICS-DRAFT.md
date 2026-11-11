# AKSI tokenomics — decision draft

> The broader ecosystem design and illustrative allocation model are in [AKSI MATRIX Economy v1 (draft)](../AKSI-MATRIX-ECONOMY-V1-DRAFT.md). That proposal does not approve a production supply or authorize deployment.

Status: **not approved; no production deployment**.

## Proposed utility

AKSI is intended to be the settlement and reward asset for AKSI MATRIX, subject to legal review and real demand validation.

Potential utility, to be enabled only when the relevant product modules exist:
- pay for clearly priced digital services;
- reward verified contributions under published rules;
- access optional ecosystem features;
- settle transfers between participating users.

A utility description is not a guarantee of demand, profit, price appreciation or redemption.

## Decisions still required

| Decision | Current status |
|---|---|
| Token name / ticker | AKSI / AKSI |
| Chain | Base selected for production architecture; Base Sepolia (84532) testnet first; Base mainnet (8453) not deployed |
| Standard | ERC-20 |
| Production supply | Not approved |
| Founder / treasury / user allocation | Not approved |
| Vesting and unlock schedule | Not approved |
| Reward issuance rules | Not approved |
| Treasury custody and multisig | Not approved |
| Governance | Not approved |
| Sale, public distribution or exchange listing | Not approved |
| Legal classification and jurisdictions | Requires qualified counsel |

## Supply design

The contract mints the entire chosen supply once at deployment. There is no later mint function. This makes the production supply an irreversible deployment decision. Do not deploy until the final number and distribution plan are approved.

The 100,000,000 value in the tests is solely a test fixture and must not be treated as a production decision.

## Principles

1. No promised yield, guaranteed return or artificial price target.
2. No hidden minting, privileged transfer restrictions or undisclosed allocations.
3. Public, independently verifiable contract and transaction history.
4. Separate operating funds from user funds; use multisig custody for any treasury.
5. Publish reward criteria and accounting before enabling rewards.
6. Testnet first; mainnet only after security and legal gates pass.
