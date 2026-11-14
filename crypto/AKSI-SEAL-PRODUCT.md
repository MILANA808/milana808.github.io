# AKSI Seal — product definition and first commercial plan

**Version:** MVP design, 2026-11-12  
**Status:** prototype source; not a hosted service, audit certification, trusted timestamp service, or legal signature provider.

## What it does

AKSI Seal creates a portable JSON receipt for an exact file:
- SHA-256 digest of the file bytes;
- Ed25519 signature over a domain-separated, deterministically serialized receipt body;
- public-key fingerprint;
- file name, byte length and producer timestamp;
- independent local verification with machine-readable failure codes.

The first implementation is a dependency-free Node.js CLI at `tools/aksi-seal.mjs`. It keeps private signing keys under customer control and never sends files or keys to a server.

## What makes the AKSI profile distinct

The cryptographic primitives are established standards, not a new cipher: SHA-256 and Ed25519. AKSI's contribution is the named receipt envelope, domain separation (`AKSI-SEAL:FILE:V1`), deterministic serialization, key fingerprint field, verification behavior and evidence-ledger integration.

Do not market this as a new cryptographic algorithm or claim it is stronger than Ed25519. A signature proves that a matching private key signed the receipt and that the signed content matches; it does not prove truth, identity, consent, trusted time, legal admissibility or completeness of the record. To trust a signer, a verifier must obtain the expected key fingerprint through a separate trusted channel.

## MVP workflow

1. Customer creates an Ed25519 key pair locally.
2. Customer signs a file locally; the private key never leaves their machine.
3. Customer sends the original file and receipt to a recipient.
4. Recipient independently verifies both and optionally pins the expected signer fingerprint.
5. The receipt can be added to an append-only AKSI evidence ledger.

## Intended first customers

- small software teams sharing release artifacts and build outputs;
- consultants and agencies delivering signed reports;
- businesses exchanging approved versions of contracts, specifications and operational documents;
- AI product teams that need integrity receipts for agent outputs and evaluation artifacts.

These are target segments to validate, not confirmed demand or customers.

## Revenue hypothesis

Start with a free local verifier and a paid business workflow, not token speculation:
- Free: local CLI and offline verification.
- Paid pilot: branded evidence workspace, team key registry, signed delivery history, exportable audit bundle and retention controls.
- Pricing hypothesis for customer interviews only: €29/month solo, €99/month small team, €299/month business pilot. These are unvalidated test prices, not announced offers.
- Optional implementation/onboarding fee only after a written scope and customer agreement.

No payment processing, subscription backend, account system or hosted workspace is implemented yet. Do not advertise the paid service as available until it exists and is tested.

## Validation before building paid infrastructure

- Interview 10 target teams about how they prove exact file versions and signer control.
- Ask for 3 design partners willing to test with non-sensitive files.
- Measure whether recipients can verify receipts without AKSI accounts.
- Test key loss, key rotation, tampered files, modified receipts, wrong signer fingerprints, malformed input and cross-platform Node.js support.
- Obtain independent cryptographic code review before relying on it for high-value or regulated workflows.

## Roadmap

### MVP 0 — local tool
- CLI key generation, file signing and verification.
- No server, custody, token, payment or wallet dependency.
- Test vectors and security review.

### MVP 1 — business delivery
- Web UI for file hash/sign/verify with user-controlled key storage.
- Team identity and key rotation workflow.
- Signed delivery packages and immutable exportable event history.

### MVP 2 — paid workspace
- Hosted team accounts, access control, billing and support.
- Privacy, retention, backup, incident and data processing policies.
- Audit logs and service-level commitments.

### Relationship to AKSI token
AKSI token is not required for file signing or verification. Do not force users to buy AKSI to use the core proof function. Token utility may be considered later only if a real, legally reviewed service requires on-chain settlement; never imply token ownership is needed to trust a cryptographic receipt.
