# AKSI Proof v1

AKSI Proof is the first concrete implementation of the project's human–AI trust layer.

## What it proves

- The canonical proof record has not changed since it was hashed.
- When an Ed25519 server key is configured, the signature can verify the record against the published public key.
- The record identifies provider/model/time and can carry claims, evidence and verification status.

## What it does not prove

A valid hash or signature does **not** prove that an AI claim is true. Truth requires evidence and an explicit verification process. AKSI therefore keeps `claims`, `evidence` and `verification` separate from `integrity`.

## API

`POST /api/proof` creates a proof record.

`POST /api/proof/verify` verifies its SHA-256 integrity and, when present, Ed25519 signature.

Chat endpoints now include a `proof` object in their response.

## OpenAI

The backend already supports an OpenAI-compatible provider. Enable it only on the server:

```bash
AKSI_ALLOW_REMOTE=1
AKSI_LLM_PROVIDER=openai
OPENAI_API_KEY=<server-secret>
OPENAI_MODEL=<model-id>
```

Never commit `OPENAI_API_KEY`, `sk-*`, or any private signing key to this repository. The browser must never receive the OpenAI secret.

## Signing

Optional server-side signing uses:

```bash
AKSI_SIGNING_PRIVATE_KEY=<base64-encoded PEM Ed25519 private key>
```

Without this variable AKSI still produces a SHA-256 proof record. Existing browser-side Ed25519 runtime signing remains compatible with the architecture.
