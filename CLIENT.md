# AKSI Local-First Client

## Modules
- `aksi-rag.js` — vector memory + MiniLM / hash embed
- `aksi-trust-vault.js` — AES-GCM `.aksi` export/import
- `aksi-perf.js` — tok/s, load %, heap
- `aksi-webllm.js` — `completeStream`
- `aksi-client-boot.js` — wires HTML ids

## Script order
```html
<script src="/aksi-rag.js"></script>
<script src="/aksi-trust-vault.js"></script>
<script src="/aksi-perf.js"></script>
<script src="/aksi-webllm.js"></script>
<script src="/aksi-client-boot.js"></script>
```

## Flows
1. Local: Load LLM → ask (RAG + stream)
2. Mem: Учить → embeddings
3. Trust: Export/Seal/Open with passphrase
4. Stats: tok/s after inference

Contact: aksilove@internet.ru
