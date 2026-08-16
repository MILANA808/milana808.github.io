# AKSI AI Risk Policy

## Default rule

AI output is an assistive result, not an automatic fact or legal decision.

## Risk levels

### LOW
Summaries, brainstorming, formatting and other reversible assistance.

### MEDIUM
Research, recommendations or analysis where an error can materially affect a user. Show sources, uncertainty and limitations.

### HIGH
Health, legal, financial, identity, employment, safety, security or irreversible actions. AKSI must require explicit human review and must not represent model output as professional or official determination.

## Agent actions

No external side effect is authorized solely by model output. Any action that changes external state must pass an explicit user/policy gate and create a proof record where technically appropriate.

## Evidence

Evidence, inference and conclusion must remain distinguishable. A cryptographic hash establishes integrity of the recorded artifact, not truth of its contents.

## External services

Network/model providers are treated as processors/services with their own terms and privacy/security properties. AKSI must expose the active provider and network mode when feasible.

## Incident posture

If a network failure, verification failure, malformed passport or integrity failure occurs, AKSI must fail visibly rather than silently presenting a successful state.
