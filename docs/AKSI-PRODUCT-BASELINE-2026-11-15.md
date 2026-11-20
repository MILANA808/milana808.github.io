# AKSI MATRIX — verified product baseline and first user mission

**Snapshot:** 2026-11-15  
**Repository:** `MILANA808/milana808.github.io`  
**Inspected ref:** `aksi-q-site-rewrite`  
**Commit:** `e5fd0ecf6fd92725e5f321289bf689931e5908e6`  
**Main:** `372fe303a84f70b969b4996ea85203b429f518f9`  
**PR:** [#264](https://github.com/MILANA808/milana808.github.io/pull/264), open, draft, not merged  
**Purpose:** factual baseline, not a product-completion claim.

## 1. First question: whose burden should AKSI remove?

The first product mission should be narrow and testable:

> Help a person check a consequential factual claim or answer against accessible sources, understand what each source actually supports, see disagreements and uncertainty, and receive an honest “not enough evidence” when the record is insufficient.

**Initial users:** people who must make sense of unfamiliar information under time pressure — initially independent professionals, small-business operators and researchers, not “everyone” at once.

**Burden removed:** manually opening many tabs, losing the origin of claims, confusing a plausible explanation with a verified fact, and being unable to reproduce how a conclusion was reached.

**First user story:** “I paste one claim or question. AKSI finds relevant primary/credible sources, extracts atomic claims, links each claim to exact passages, marks conflicts and missing evidence, runs appropriate deterministic checks, and produces a concise reviewable report. If it cannot support the answer, it says so.”

This is a product hypothesis, not a proven market need. Validate it with 5–10 target users before expanding the scope. AKSI must not make legal, medical, financial or safety-critical decisions on behalf of the user.

## 2. Repository snapshot — measured facts

The recursive tree at the inspected branch contains **918 tracked files**:

| File class | Count |
|---|---:|
| HTML | 212 |
| JavaScript / MJS / CJS | 393 |
| Python | 39 |
| JSON | 41 |
| Markdown | 137 |
| CSS | 16 |
| GitHub Actions workflow YAML | 34 |
| Test-related files (path-name inventory) | 51 |

Counts are path-extension counts, not counts of unique product features or production-ready modules. HTML count includes demos, labs, legacy routes and experiments. Test-related count is a filename/path filter, not a claim that every test is executed in every workflow.

The current branch is **one commit** ahead of the inspected main ref for this PR state. PR #264 reports 16 changed files, 1,933 additions and 75 deletions; it remains a draft. No merge or deployment is part of this baseline.

## 3. Screens and routes already present

### 3.1 Main homepage — `index.html`

The homepage is a large, custom HTML/CSS/JavaScript application. Its inspected DOM IDs show these concrete interface areas:

- **Home / hero / system state:** `home`, `systemState`, `core`.
- **Universe visualisation:** `universe`, `universeField`, `universeCanvas`, `worldCore`, `worldStatus`.
- **Progress and counters:** `xp`, `missionCount`, `memoryCount`, `onlineCount`, `rank`, `progressLabel`, `progressBar`.
- **Chat:** `chatlog`, `chatForm`, `chatInput`, `chatStatus`, `mic`.
- **Model controls:** `aksiModelStatus`, `aksiLocalModelPanel`, `aksiLocalModelBadge`, `aksiLocalModelSelect`, `aksiLoadLocalModel`, `aksiUnloadLocalModel`, `aksiLocalModelStatus`, `aksiModelProgress`.
- **Evidence and receipts:** `aksiEvidence`, `aksiProveAnswer`, `aksiVerifyPassport`, `aksiDownloadPassport`, `aksiProofOutput`.
- **Memory controls:** `aksiRememberTurns`, `aksiClearMemory`, `memoryForm`, `memoryKey`, `memoryValue`, `memoryList`.
- **External-source/backend toggles:** `aksiUseWeb`, `aksiUseBackend`.
- **Health and event history:** `refreshHealth`, `healthlist`, `voiceHealthStatus`, `exportLog`, `eventlog`.
- **Missions and modules:** `missions`, `modules`.
- **Diagnostics:** `runDiagnostics`, `runAnswerSelfTest`, `diagOutput`.
- **Preferences:** `soundToggle`.

These IDs establish that controls and UI containers exist in source. They do **not** by themselves prove every button works in a real browser or that the status text accurately reflects backend availability.

### 3.2 Linked product screens / routes

The homepage links to a broad set of route families, including:

- **Work and assistant:** `/workspace/`, `/personal-intelligence/`, `/chat/`, `/aksi-agent/`, `/aksi-one/`, `/infinity/`.
- **Research and intelligence:** `/research/`, `/core/`, `/training-lab/`, `/neural-lab/`, `/aixi-lab/`, `/world-lab/`, `/reality-engine/`, `/counterfactual-lab/`.
- **Language and runtime:** `/aksi-q-studio/`, `/runtime/`, `/whole/`, `/kernel/`, `/context-compiler/`.
- **Knowledge and evidence:** `/search/`, `/evidence/`, `/evidence-lifecycle/`, `/proof/`, `/verify/`, `/receipt/`, `/trace/`, `/seal/`, `/trust/`.
- **Math and quantum simulation:** `/aksi-lab/`, `/math-ai.html`, `/quantum/`, `/quantum-lab/`, `/quantum-mind/`, `/field/`.
- **Other experiments/products:** `/local-ai/`, `/llm/`, `/superpose/`, `/globe/`, `/matrix/`, `/aksi-exchange/`, `/quant/`, `/enterprise/`, `/offer/`, `/lifecore/`.

There are 212 HTML files in the tree, so this is not an exhaustive route-by-route functional audit. Some routes are experiments, legacy interfaces or demos. They must not be represented as one integrated application until route contracts and end-to-end behaviour are verified.

## 4. Data and storage already present

| Data / store | What the inspected code indicates | Boundary |
|---|---|---|
| Semantic concept graph | Canonical concepts, aliases, definitions and typed relations in `aksi-semantic-reasoning.js`; export tooling and generated JSON bridge | Explicit curated graph, not open-domain understanding |
| Symbolic facts and rules | `aksi-symbolic-inference.js` supports facts/rules, inference and proof traces | Only what is encoded in facts/rules |
| Browser RAG corpus | `aksi-rag.js`: localStorage, up to 500 documents, vectors and cosine retrieval | Fallback is deterministic hashed bag-of-words, not a semantic neural embedding |
| Optional embeddings | Opt-in dynamic import of Transformers.js MiniLM from a CDN | Requires network/model download; fallback may be much weaker |
| Conversation memory | `aksi-memory.js`: IndexedDB with localStorage fallback | Device/origin-local, quota-limited, not automatically cloud-synced |
| AKSI Q memory | `aksi-q-site-memory.js` and browser runtime memory profile | Separate profile; requires conformance and privacy review |
| Web evidence cache | `aksi-web-evidence.js`: local cache, Wikipedia and Crossref providers | Results are marked `trust: unverified`; source retrieval is not source validation |
| Evidence Passport / receipts | `modules/evidence-passport.js`, proof/receipt/trace files and schemas | Integrity/provenance records do not prove a claim is true |
| Research and benchmark data | `datasets/`, `benchmark/`, `benchmarks/`, `training-results/`, `math/corpus/` | Each dataset needs provenance, licence, quality and leakage review |
| Credentials and private material | Example environment templates and crypto/key-store modules exist | Never place secrets in public corpus; existing key-storage risks are documented separately |

No source inspected here establishes differential privacy as implemented end-to-end. The repository's own `llms.txt` describes differential privacy and formal verification as requirements/research, not completed capabilities.

## 5. Functions and engines already present

### 5.1 Answer and knowledge path

- `aksi-answer-router.js` — routes weather, explicit symbolic requests, semantic graph answers, local knowledge and other handlers; includes a source-oriented response path and explicit no-source wording.
- `aksi-native-language-core.js` — constrained natural-language answer composition using local semantic structures.
- `aksi-semantic-reasoning.js` — explicit concept lookup and relation answers.
- `aksi-symbolic-inference.js` — rule-based inference and proof traces.
- `aksi-knowledge-base.js` — local knowledge records and query routing.
- `aksi-rag.js` — vector-like local retrieval and context assembly.
- `aksi-web-evidence.js` — web retrieval from Wikipedia/Crossref, source URLs and cache.
- `aksi-weather.js` — live weather adapter.
- `aksi-dialogue-intelligence.js`, `aksi-cognitive-core.js`, `aksi-unified-adaptive-core.js` — dialogue/cognitive orchestration components; require integration-level verification before treating them as one reliable reasoning engine.

### 5.2 Computation and scientific components

- `aksi-calculator.js`, `aksi-math.js`, `aksi-math-practice.js` — deterministic arithmetic and math-related utilities.
- `aksi-geometric-knowledge-core.js`, `aksi-dna-topology-engine.js` — geometric/structural knowledge experiments.
- `aksi-wave-bayesian-engine.js` — deterministic hashed Fourier-style intent features with softmax normalization and thresholds. Its output is a routing score; it is **not yet demonstrated to be a calibrated probability of correctness**.
- `aksi-quantum.js` and Python AKSI Q simulator — classical state-vector simulation. Python runtime caps state-vector simulation at 10 qubits; this is not quantum hardware or quantum advantage.
- `aksi-counterfactual.js`, `reality-engine/`, `counterfactual-lab/` — simulation and decision-analysis experiments.

### 5.3 Security, execution and evidence

- `aksi-core-v3.js` — decision scoring, abstention and receipt helpers.
- `aksi-crypto-provider.js`, `aksi-seal.js`, `trust/`, `permit/`, `aksi-kernel/` — crypto, signing, policy/permit, trace and verification components.
- `modules/evidence-passport.js`, `evidence/`, `receipts/`, `trace/` — structured evidence and execution records.
- `backend/` and `runtime/backend/` — optional server-side Python/FastAPI-related code; separate from the static browser product.

## 6. AKSI Q — actual state at this snapshot

The language folder contains:
- `aksi_lexer.py` — bounded lexer with source spans, line/column positions, comments, string escapes, newline tokens and token limits.
- `aksi_parser.py` — legacy Pratt expression parser used by the Python reference interpreter.
- `aksi_frontend.py` — new recursive-descent declaration parser plus Pratt expressions; frozen source-spanned syntax nodes.
- `aksi_q.py` — Python reference interpreter, deterministic math, vectors/complex values, semantic facts/relations and classical state-vector simulation.
- `aksi-ui.js` — separate bounded declarative UI grammar and safe DOM renderer.
- `conformance/common-v1.json` — shared fixtures checked against browser and Python runtimes.
- Examples: `first.aksi`, `quantum.aksi`, `homepage.aksiui`.
- Tests: lexer, front-end parser, expression runtime, semantic export; parity scripts for runtime fixtures and quantum state vectors.
- Specs/design: `LANGUAGE-SPEC.md`, `LANGUAGE_DESIGN.md`, `LEXER-SPEC.md`, `PARSER-SPEC.md`, `INTEGRATION-PLAN.md`, `FULL_SITE_MIGRATION.md`.

**Important separation:** the new lexer/parser front-end is not yet the single parser used by every AKSI Q runtime. The older expression parser and UI profile remain separate. There is no completed shared type checker, name resolver, module loader/package manager, async/effect checker, bytecode/WASM compiler or self-hosting compiler. The production homepage has not been rewritten in AKSI Q.

## 7. Test inventory and validation status

### Test files visible in the tree

The repository has test suites for:
- answers, answer quality, routing and integration;
- semantic reasoning, symbolic inference and knowledge-base routing;
- calculator and math practice;
- native language core and dialogue intelligence;
- browser AKSI Q and isolated AKSI Q Studio;
- declarative UI language;
- unified runtime and legacy runtime;
- crypto provider, integrity key storage, CSPRNG labels and channel security;
- Evidence Passport and evidence lifecycle;
- self-tool safety and backend isolation;
- main UI/workspace contracts;
- weather, research lab, discovery engine and WebLLM context;
- neural/cognitive/geometry/topology/Bayesian engines and other experiments.

There are also Python tests under `aksi-language/tests/`, `backend/`, `runtime/` and `aksi-quantum-ai/`, plus scripts under `scripts/` and `tools/`.

### Current known CI fact

The AKSI Q workflow run [#43759674060](https://github.com/MILANA808/milana808.github.io/actions/runs/43759674060) completed successfully on commit `e5fd0ecf6fd92725e5f321289bf689931e5908e6`. Its steps passed: UI/Studio tests, semantic export, Python interpreter/front-end tests, examples, Python/browser runtime fixture comparison and quantum state-vector parity.

This is one workflow, not a claim that all 34 workflows, all 51 test-related paths, every screen, the live website, or the optional backend have passed. The repository `package.json` default `npm test` script runs a selected subset of tests, not every test file in the tree.

## 8. Requested architecture — present, partial, absent

| Capability requested | Current evidence | Status |
|---|---|---|
| Semantic search / vector index | Local RAG with cosine scoring; MiniLM optional, hash fallback | Partial; evaluate retrieval quality |
| RAG with source links | Web evidence and source-oriented answer route | Partial; citations and claim-to-passage entailment not end-to-end guaranteed |
| “No evidence → don't know” | No-source wording, route abstention and Core v3 abstention | Partial; requires measured false-answer/abstention benchmarks |
| Symbolic mathematics | Calculator and symbolic/rule components | Partial; no full CAS integration established |
| Python + numerical tests | Python reference runtime and tests | Present for selected tasks |
| SAT/SMT | No solver implementation or dependency found in inspected inventory/search | Not implemented / not verified |
| Interval arithmetic | No interval arithmetic engine or test suite identified | Not implemented / not verified |
| Bayesian uncertainty | Intent-routing experiment with softmax-like normalization | Partial; no demonstrated calibration on expert-labelled outcomes |
| Probability calibration | No calibration report/held-out reliability curve or Brier/ECE benchmark established | Not verified |
| Differential privacy | Listed as a research/security requirement | Not implemented end-to-end |
| Access control | Permit/policy/kernel modules exist | Partial; end-to-end enforcement and threat-model tests required |
| Encryption | Crypto and browser key-storage modules exist | Partial; not equivalent to secure key custody; see security audit |
| Decision/model version log | Receipts, trace, event log and versioned modules exist | Partial; need unified provenance schema and replay |
| Quantum simulator | Classical state-vector engines and parity checks | Present as bounded classical simulation only |

## 9. First prototype — one scenario, one evidence contract

### Input
A user submits one factual claim or a focused question, plus optional context and jurisdiction/date where relevant.

### Processing pipeline
1. **Normalize:** preserve the original text and create atomic claims without silently changing meaning.
2. **Retrieve:** search approved local corpus and explicitly enabled public sources; record provider, URL, retrieval time and content hash.
3. **Rank:** use lexical + semantic retrieval; report retrieval score as relevance only, not truth probability.
4. **Extract evidence:** each source passage is attached to the exact claim it may support, contradict or leave unresolved.
5. **Check:** run deterministic arithmetic/unit checks where appropriate; run symbolic rules only when their premises are explicit; later add SAT/SMT and interval arithmetic as separately tested engines.
6. **Assess uncertainty:** initially use categorical evidence states (supported / contradicted / mixed / insufficient). Add calibrated probabilities only after a held-out expert-labelled dataset and reliability tests exist.
7. **Respond:** concise conclusion, source passages/links, conflicts, assumptions, date, limits and “I don't know” when evidence is insufficient.
8. **Receipt:** record query, pipeline version, sources, transformations, checks, output hash and user-visible limitations. A receipt proves what the system recorded, not that the conclusion is true.

### MVP acceptance gates
- Every factual claim in the report links to at least one exact source passage or is explicitly labelled unsupported.
- No fabricated URLs, source titles, quotations or retrieval timestamps.
- A source's existence is not treated as support for a claim unless the cited passage is relevant to that claim.
- Conflicting evidence is displayed, not averaged away.
- Unsupported questions trigger abstention rather than a fluent guess.
- Same frozen input, source snapshot and version produce a replayable trace.
- Report quality is reviewed by independent domain-competent humans on a blinded set.
- Measure: claim-level precision/recall, citation entailment, unsupported-claim rate, abstention precision/coverage, source freshness, latency and cost.
- Publish dataset composition, exclusions, confidence intervals and known failure cases.

Do not choose a single universal numeric threshold before collecting baseline data. Set thresholds from the pilot's risk level and publish the false-positive/false-negative trade-off.

## 10. Engineering order

1. Freeze this baseline and designate canonical modules for retrieval, evidence, symbolic checks, maths, memory, policy and receipts.
2. Add a small versioned evidence schema and end-to-end fixtures; make “source passage → claim → verdict” inspectable.
3. Build the first claim-checking vertical slice using existing retrieval and evidence code; do not yet introduce a large new model dependency.
4. Establish an expert-labelled evaluation set and a no-answer policy.
5. Add a symbolic algebra backend only for defined expression classes; add SAT/SMT as a separate optional solver with bounded inputs and reproducible outputs.
6. Add interval arithmetic for numerical bounds/uncertainty, with outward rounding and tests against exact/reference calculations.
7. Calibrate confidence on held-out data; publish reliability diagrams, Brier score/ECE and subgroup analysis. Until then, scores remain heuristics.
8. Threat-model storage, permissions, browser origin, supply chain and prompt/source injection. Differential privacy is a separate formal design, not a checkbox.
9. Fuzz parsers and untrusted inputs; add dependency scanning, secret scanning, SBOM and independent security review.
10. Pilot with real users, record usability and harm reports, and only then decide whether to broaden to a general research assistant.
11. Each release must have a versioned manifest, CI evidence, rollback path, migration notes and known limitations.

## 11. Explicit non-claims

This baseline does not claim:
- that all 918 files or all 21 account repositories were audited line by line;
- that all listed routes are functional or integrated;
- that the current RAG always understands meaning or validates citations;
- that Bayesian routing scores are calibrated probabilities;
- that SAT/SMT, interval analysis or differential privacy are implemented;
- that receipts prove truth;
- that AKSI Q is already a general-purpose production language;
- that the live optional backend is currently reachable;
- that the classical simulator has quantum advantage;
- that AKSI is conscious, AGI or predicts the future.

**Decision:** AKSI's first public promise should be evidence-led claim checking with transparent uncertainty — not universal intelligence. Build the smallest working vertical slice, measure it with users, and earn every broader claim with evidence.
