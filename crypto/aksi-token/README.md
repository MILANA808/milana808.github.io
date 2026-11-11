# AKSI Token — technical foundation

Status: **development / not deployed**. This directory contains the first contract implementation and a reproducible test/deployment scaffold. It does not represent a live token, a financial offer, or a promise of value.

## Contract decisions

- Name and symbol: `AKSI`
- Standard: ERC-20
- Solidity: 0.8.24
- Implementation: OpenZeppelin Contracts ERC20
- Decimals: 18 (ERC-20 default)
- Supply: fixed at deployment; constructor parameter is a whole-token amount
- Initial recipient: deployer address
- Admin controls: none
- Post-deployment minting: impossible
- Upgradeability, blacklist, transfer tax and pause switch: none

The suggested 100,000,000 AKSI supply is only a test fixture in the unit tests. **It is not an approved production supply.** The production quantity, allocation, vesting and distribution must be decided before deployment.

## Local setup

Install Foundry, then from this directory:

```sh
forge install OpenZeppelin/openzeppelin-contracts --no-commit
forge install foundry-rs/forge-std --no-commit
forge test -vv
```

## Testnet deployment

Use **Base Sepolia** first (chain ID `84532`), then Base mainnet (chain ID `8453`) only after the testnet release, security review and separate approval. Never use a wallet holding meaningful funds for initial experiments.

1. Create a dedicated deployer wallet and fund it with Sepolia test ETH.
2. Keep the private key outside the repository and shell history; use a local ignored `.env` file or a secrets manager.
3. Set `DEPLOYER_PRIVATE_KEY`, `AKSI_INITIAL_SUPPLY`, `EXPECTED_CHAIN_ID=84532`, and `BASE_SEPOLIA_RPC_URL` in the local environment.
4. Review the exact constructor supply and deployment transaction in your wallet.
5. Deploy with Foundry using the Sepolia chain ID and verify the source on the block explorer.
6. Publish the contract address only after checking bytecode, constructor arguments, total supply and deployer allocation.

Example (after setting a private RPC endpoint in the environment):

```sh
forge script script/DeployAKSI.s.sol:DeployAKSI \
  --rpc-url "$SEPOLIA_RPC_URL" \
  --broadcast
```

Do not commit `.env`, private keys, seed phrases, RPC credentials or wallet exports.

## Before mainnet

- Independent smart-contract security review and remediation of all findings.
- Written tokenomics: allocation, treasury controls, vesting, rewards and accounting.
- Threat model for compromised deployer and treasury wallets.
- Legal review in every intended market, including classification, offering/marketing, AML/KYC and consumer-protection obligations.
- Public disclosure of supply, allocations, risks, governance and any conflicts of interest.
- Separate, explicit owner approval for mainnet deployment.

## Scope boundary

This is an ERC-20 token on an existing chain, **not a new blockchain**. The token does not create market value, revenue, liquidity, exchange listing or legal compliance by itself. Ecosystem rewards and payments must be implemented as separate, tested application logic; do not imply that an off-chain point balance is an on-chain token balance.
