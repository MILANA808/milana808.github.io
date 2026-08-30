# АКСИ (AKSI) — offline-first AI · MVP

**EN** · Local-first browser AI with measurable decision integrity (**ADIA**).  
**RU** · Локальный ИИ в браузере с измеримой целостностью решений (**ADIA**).

| | |
|--|--|
| **Live** | https://milana808.github.io |
| **Contact** | **aksilove@internet.ru** · X [@AKSILOVE](https://x.com/AKSILOVE) |
| **License** | [Proprietary](./LICENSE) |
| **Algorithm** | [ALGORITHM.md](./ALGORITHM.md) |

---

## English

### What it is

AKSI is a **sovereign offline-first AI companion** in the browser — not a thin ChatGPT wrapper.

**MVP modules**

| Module | Role |
|--------|------|
| **SecureMem** | IndexedDB + optional AES-GCM |
| **ADIA assess** | 5-axis score; DistilBERT if online, else heuristics |
| **Swarm** | 1–3 agents, ADIA rank |
| **HRR** | Holographic resonance + hologram view |
| **Neuro / Composer** | Pure-JS offline (zero download) |
| **WebLLM** | Optional WebGPU (user opt-in) |
| **PQ Trust** | ECDSA P-256 + optional ML-KEM |
| **Multi-chat** | Rename / archive / delete |
| **Stats** | Local ADIA timeline |
| **Protocol** | `/protocol/` Living Mind lab |

Network is **off by default**.

### Quick start

1. https://milana808.github.io  
2. **Ctrl+F5**  
3. Chat: “status”, “запомни: demo”  
4. **Stats** tab → swarm 1–3, hologram, chats  
5. Optional: allow DistilBERT once online  

### Demo scenarios (conferences)

1. Offline — DevTools Offline → chat works  
2. Teach — `запомни:` then related question  
3. Swarm — agents 1–3  
4. ADIA — Lab assess JSON  
5. HRR — Stats → hologram / Protocol  
6. P2P — SDP copy between tabs  
7. Encrypt memory — password on unlock  

### Honest limits

Three full LLMs (Llama / Phi / WebLLM) in parallel need multi-GB RAM/VRAM — not the default MVP path. Swarm uses pure-JS engines; heavy models are progressive. DistilBERT loads from CDN when online; offline → heuristic classifier with UI notice.

### How to contribute

1. Report issues with browser + online/offline steps.  
2. No PRs with secrets, FIO, or public prices.  
3. Prefer pure JS modules (no build step for GH Pages).  
4. Partnership / education / pilot: **aksilove@internet.ru**  

---

## Русский

### Что это

**АКСИ** — суверенный offline-first компаньон + слой **ADIA**. Данные и inference по умолчанию на устройстве.

### Быстрый старт

1. https://milana808.github.io · **Ctrl+F5**  
2. «статус», «запомни: факт»  
3. Вкладка **Stats** — рой, голограмма, диалоги  

### Сценарии демо

Офлайн · Память · Рой 1–3 · ADIA · HRR · SDP P2P · AES-память

### Ограничения

Полные Llama/Phi×3 в браузере — гигабайты. MVP-рой = pure-JS + опциональные модели.

### Вклад

Баги, модули на чистом JS, пилоты: **aksilove@internet.ru**

---

© AKSI · aksilove@internet.ru · MVP shell v34 · SW aksi-shell-v33
