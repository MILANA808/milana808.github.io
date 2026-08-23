# AKSI — buyer demo

## One sentence

**AKSI is a verification and provenance layer for AI agents: it records what happened, what was permitted, what evidence was used, and whether the recorded history was altered.**

## Five-minute demonstration

1. Ask AKSI a factual question.
2. Show the answer and its provenance.
3. Show whether web access was enabled.
4. Open the proof record.
5. Alter a copy of the recorded payload.
6. Run verification.
7. Show the detected integrity failure.
8. Correct the answer and create a learning event.
9. Show the new version and its proof.
10. Repeat the task offline and show which capabilities remain available.

## Buyer questions this should answer

### Can the system prove the answer is true?
No. Proof demonstrates integrity/provenance of the recorded event. Truth still requires evidence and domain validation.

### Can it work without a cloud model?
The architecture is local-first. Exact capability depends on which local adapters are installed.

### Can it browse automatically?
Not by default. External access should be an explicit permissioned capability.

### Can it execute actions?
Only through explicit tools and policy gates. Risky or irreversible actions should require human confirmation.

### Is this AGI?
No claim is made. AKSI is an engineering architecture for verifiable personal/agentic AI workflows.

## What must be measured before selling

- verification latency;
- proof generation overhead;
- storage overhead per event;
- reconstruction time for an agent incident;
- percentage of tool calls covered by policy;
- percentage of outputs with provenance;
- offline functionality coverage;
- false-positive/false-negative rates of integrity checks;
- integration time for a third-party agent.

## Commercial rule

Do not sell a valuation. Sell a measurable capability and let a buyer decide its strategic value.
