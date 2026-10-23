# AKSI answer reliability — release gate

Date: 2026-10-24  
Scope: browser chat routing and failure behavior in the canonical GitHub Pages repository.

## Changes in this release

- Weather requests are handled by the explicit weather route before generic answer generation.
- A weather adapter exception produces a short user-facing failure; it cannot escape into the generic generator.
- Exceptions thrown by a loaded browser-local language model are converted to a controlled model-error result. Technical stack details are not returned to chat.
- The page references bumped weather/router asset versions and the Service Worker cache namespace is incremented to reduce stale-client behavior.
- CI includes an end-to-end contract test that loads the real weather adapter and answer router together with a mocked HTTP boundary.
- The semantic graph now covers additional computing/science concepts and recognizes several natural-language paraphrases; a 20-prompt benchmark measures both supported questions and deliberate abstention.

## Acceptance tests

1. `Команда - узнай погоду в Анапе` routes to `weather`, geocodes the Russian prepositional form, and renders values only from the mocked provider response.
2. A failed weather HTTP request returns an explicit unavailable message and no fabricated values.
3. A rejected local model call returns `model-error`, without exposing the exception or stack.
4. An unsupported question with no model or web search returns the documented honest-abstention response.
5. The normal answer text must not contain internal diagnostic markers such as `[ЯДРО]` or `[ПРОЦЕСС]`.

## What these tests do not prove

- The tests do not prove that Open-Meteo is reachable from every phone/browser/network.
- Mocked weather values are test fixtures, not a live forecast.
- A successful route test does not make AKSI a general-purpose language model.
- The static product has no always-on server-side agent. Free-form reasoning still requires an explicitly loaded local language model or an enabled web search.
- The published Pages deployment and a real iPhone browser session must be checked separately from CI.

## Next engineering gates

1. Extend the initial semantic benchmark to unseen Russian paraphrases across search, weather, memory and adversarially phrased prompts.
2. Add browser-level smoke tests for the public page, script load order, service-worker update and visible response rendering.
3. Improve the knowledge base with conflict detection and provenance-aware rules; do not promote user-entered facts to verified facts.
4. Define a stable tool-result schema (route, status, text, sources, proof, error code) and validate every route against it.
5. Only after the above passes, evaluate whether a server-side execution agent is needed; keep it separate from the static frontend and require explicit permissions for external actions.
