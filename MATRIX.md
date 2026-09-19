# AKSI MATRIX ONE

Единый клиентский runtime (без backend / без сборки).

## Главный вход

**https://milana808.github.io/matrix/**

## Архитектура

| Модуль | Путь | Роль |
|--------|------|------|
| Kernel | `matrix/kernel/kernel.js` | boot, IDB, ask/remember, events |
| QuantumRouter | `matrix/quantum/router.js` | state-vector, H/Phase, answerGate |
| Exocortex HRR | `matrix/exocortex/hrr.js` | bind/unbind, recall |
| TrustVault | `matrix/crypto/vault.js` | PBKDF2+AES-GCM, `.aksi` |
| WebLLM | `matrix/llm/webllm-bridge.js` | opt-in GPU LLM |
| Lorenz | `matrix/chaos/lorenz.js` | visual attractor |

## Связанные поверхности

- [/quantum-chip.html](/quantum-chip.html) — полный gate simulator
- [/local-ai.html](/local-ai.html) — Local AI + quantum contour
- [/capsule.html](/capsule.html) — portable sealed memory
- [/](/) — product home (След)

## Честно

- Quantum = classical state-vector simulation
- Lorenz = visualization only
- WebLLM = optional, needs WebGPU, first download caches weights
- Offline core works without LLM

Contact: aksilove@internet.ru
