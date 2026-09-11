# AKSI tests

`aksi-core-v3.test.js` is a browser/WebCrypto smoke suite. The project should run these checks in CI using a real browser runtime before the v3 branch is merged.

Minimum release gate:
- deterministic replay is stable;
- probabilities sum to 1 within floating-point tolerance;
- SHA-256 hashes are 64 hex characters;
- abstention is deterministic for identical input;
- receipt verification succeeds after serialization round-trip;
- tampering with the receipt makes verification fail.
