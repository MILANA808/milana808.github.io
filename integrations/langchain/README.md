# AKSI Permit × LangChain

**Product:** fail-closed gate before tool execution + ECDSA-P256 signed receipt (`aksi-permit/v1`).

## Install

```bash
pip install cryptography
pip install langchain-core   # optional, for BaseTool wrapper
```

Copy `aksi_permit.py` into your project (or this folder).

## Quick start

```python
from aksi_permit import AksiPermit, Evidence, permit_tool, PermitBlockedError

permit = AksiPermit(policy="strict")

def http_get(url: str) -> str:
    return f"GET {url}"

safe_get = permit_tool(
    http_get,
    permit,
    evidence_fn=lambda url: [
        Evidence(source="policy", tier="ok", snippet="allowlist checked")
    ],
)

print(safe_get("https://example.com"))

try:
    bare = permit_tool(http_get, permit, evidence_fn=lambda u: [])
    bare("https://evil.test")
except PermitBlockedError as e:
    print("BLOCK", e.result.reasons)
    print("receipt id", e.result.receipt["id"])
```

## LangChain agent pattern

```python
from langchain_core.tools import tool
from aksi_permit import AksiPermit, Evidence, permit_tool

permit = AksiPermit(policy="strict")

@tool
def write_file(path: str) -> str:
    """Write a file (dangerous)."""
    return f"wrote {path}"

guarded = permit_tool(
    write_file,
    permit,
    evidence_fn=lambda inp: [
        Evidence(source="human_approval", tier="sealed", snippet=str(inp))
    ],
)
# pass [guarded] into your agent tool list
```

## Policies

| policy | behavior |
|--------|----------|
| `strict` | no evidence → BLOCK; weak-only → BLOCK |
| `companion` | needs evidence unless `allow_ungrounded=True` |
| `lab` | always ALLOW (still signs receipt) |

## Verify receipt

```python
ok = permit.verify(result.receipt)
```

Receipt JSON is compatible with browser UI: https://milana808.github.io/permit/

## Contact

aksilove@internet.ru · not AGI · technology_serves_human
