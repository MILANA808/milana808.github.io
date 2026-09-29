#!/usr/bin/env python3
"""Minimal AKSI Permit + tool demo (works without LangChain installed)."""
from aksi_permit import AksiPermit, Evidence, PermitBlockedError, permit_tool

permit = AksiPermit(policy="strict")

def send_email(to: str) -> str:
    return f"sent to {to}"

r = permit.create(
    goal="send email",
    action="tool:send_email",
    answer="to=user@example.com",
    evidence=[],
)
print("no evidence:", r.gate, r.reasons)
assert r.gate == "BLOCK"
print("verify BLOCK receipt:", permit.verify(r.receipt)["ok"])

r2 = permit.create(
    goal="send email",
    action="tool:send_email",
    answer="to=user@example.com",
    evidence=[Evidence(source="user_explicit", tier="sealed", snippet="User clicked Confirm")],
)
print("with evidence:", r2.gate, r2.reasons)
assert r2.gate == "ALLOW"
assert permit.verify(r2.receipt)["ok"] is True

safe = permit_tool(send_email, permit, evidence_fn=lambda x: [
    Evidence(source="user_explicit", tier="sealed", snippet=f"confirmed {x}")
])
print("wrapped:", safe("alice@example.com"))

safe_strict = permit_tool(send_email, permit, evidence_fn=lambda x: [])
try:
    safe_strict("bob@example.com")
except PermitBlockedError as e:
    print("blocked as expected:", e.result.reasons)

print("OK aksi-permit langchain integration")
