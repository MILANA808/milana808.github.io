# AKSI Outcome Engine

The Outcome Engine extends Decision Integrity from **decision evidence** to **result evidence**:

`DecisionPacket → authorized ActionRequest → OutcomeReceipt`

## Boundary

This module records and signs evidence. It does not autonomously execute external actions.

## Outcome states

- `succeeded`
- `failed`
- `partial`
- `reversed`
- `unknown`

A signed receipt proves integrity and key possession for the signed bytes. It does not prove that the observed result is objectively true; evidence-source provenance and independent verification are required.

## Strategic value

This creates a foundation for feedback loops, compliance, incident reconstruction, and measuring whether AI decisions actually produced intended outcomes.
