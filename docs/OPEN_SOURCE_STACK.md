# AKSI Open-Source Integration Map

The strongest reusable ideas found in current open-source agent work are:

1. Canonical action / attestation — CAVA demonstrates binding governance to a canonical action object instead of raw tool-call text. AKSI now has aksi-action/v1 with a deterministic fingerprint.
2. Browser post-conditions — Browser Agent and browser-use demonstrate checking live page state after an action. AKSI should require expected and actual state for consequential browser actions.
3. Trace evaluation — agentevals and Agent Health show that trajectories can be evaluated after execution. AKSI now has aksi-trace/v1 for out-of-band evaluation.
4. Temporal memory — RoMem, Cortadel and Memento demonstrate time-aware memory. AKSI now has an append-only temporal ledger.
5. Interoperability — MCP connects agents to tools; A2A connects agents to agents. AKSI should sit above both as the authority/evidence layer.
6. Security testing — MCP scanners and agent-security sandboxes can supply adversarial cases for AKSI benchmarks.

Do not copy another general-purpose agent, vector database, browser product or LLM wrapper. Those are components, not the AKSI thesis.

Target:
Agent/Model -> Canonical Action -> Intent + Mandate -> Permit -> Tool/MCP/Browser -> Expected State -> Actual State -> Verify -> Trace -> Signed Receipt -> Temporal Memory

The hypothesis to test is:
Can an arbitrary agent act through AKSI while preserving intent, authority, evidence, result verification and an independently verifiable record?

Candidate projects to study: CAVA, Browser Agent, browser-use, agentevals, Agent Health, RoMem, Cortadel, Memento, A2A, MCP and Heliox-OS.
