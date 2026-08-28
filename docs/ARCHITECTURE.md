# AKSI Architecture (for engineers)

Local-first **Decision Integrity Runtime**.

## Pipeline
```
User → LIVE.think → Quantum.shot → Brain/Core/LLM → Trust.verify → UI
                 ↘ Overlay.shareAnswer (if room open)
```

## Globals
| Global | File |
|--------|------|
| AKSI_QUANTUM | aksi-quantum.js |
| AKSI_OVERLAY | aksi-overlay.js |
| AKSI_LIVE | aksi-live.js |
| AKSI_TRUST | aksi-trust.js |
| AKSI_BRAIN | aksi-brain.js |
| AKSI_ONE | aksi-one.js |
| AKSI_DKV | aksi-dkv.js |
| AKSI_LANG | aksi-lang.js |
| AKSI_P2P | aksi-p2p.js |
| AKSI_WHOLE | aksi-whole.js |

```js
AKSI_WHOLE.health()
AKSI_WHOLE.ask("вопрос")
```

Contact: aksilove@internet.ru · Proprietary
