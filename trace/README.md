# AKSI Trace Ledger

Static, local-first prototype at https://milana808.github.io/trace/

## What it does
- Captures a claim, source URL, observation, evidence status and limitations.
- Chains records using SHA-256 and a previous-record hash.
- Persists the journal in the browser's localStorage.
- Verifies sequence, previous-hash linkage and each record digest.
- Exports portable JSON and verifies an imported chain before replacing local data.
- Uses no backend, account, API key, third-party script or network request for the ledger.

## Honest limits
A hash chain detects edits only relative to a trusted/known hash. It does not prove truth, authorship, or trusted time. Anyone able to rewrite the entire export can recompute it. Export and independently preserve the latest hash when a later comparison matters. Browser-local data can be deleted by the user or browser.

Protocol: [AKSI-TRACE/1](./AKSI-TRACE-1.md)  
Live page: https://milana808.github.io/trace/  
Main project: https://milana808.github.io/
