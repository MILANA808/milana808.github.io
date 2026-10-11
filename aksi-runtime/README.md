# AKSI Runtime

Independent local agent shell for AKSI MATRIX. It runs as a process on a machine you control; it does not copy ChatGPT, contain proprietary model weights, or alter the boundaries of hosted ChatGPT.

## Run
Requires Python 3.10+; standard library only.

    python3 aksi_runtime.py

Commands:
- /search quantum computing — DuckDuckGo search with source links
- /read https://example.org — fetch a public page and extract text
- /remember Project decision: keep keys private — save a local note
- /memory — inspect local memory
- /forget — delete local memory
- /help and /quit

## Optional model
Set AKSI_MODEL_URL to the base URL of an OpenAI-compatible API endpoint. The runtime appends /chat/completions. Set AKSI_MODEL_API_KEY and AKSI_MODEL if required by your provider. Never commit API keys to source control. Without a model endpoint, the runtime offers explicit tools and memory rather than pretending to be a general LLM.

## Safety
No shell execution, arbitrary Python execution, browser control, or external account actions. URL fetching accepts only public HTTP(S) and rejects DNS-resolved non-global IP addresses, including a re-check of redirects. This is a prototype filter, not a hardened multi-tenant fetch service. Remote content is treated as untrusted text. Memory is stored locally at ~/.aksi/memory.json or under AKSI_HOME.

## Honest status
Prototype, not AGI, a quantum computer, a foundation model, or evidence of consciousness. Search-provider markup can change; URL extraction is basic. Production work still needs proper provider APIs, stricter redirect/DNS rebinding defenses, rate limits, a full test suite, and a benchmark.

Architecture: input -> command router -> constrained tool -> observable result. Optional free-form path: input -> configured model gateway -> answer.
