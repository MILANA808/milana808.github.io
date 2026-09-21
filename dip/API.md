# AKSI DIP API — Pilot

## Запуск

```bash
cd dip/api
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8787
```

Docs: http://127.0.0.1:8787/docs

## POST /v1/receipt

```bash
curl -s http://127.0.0.1:8787/v1/receipt -H 'Content-Type: application/json' -d '{"answer":"Штраф 2.4 млн","evidence":[],"policy":"strict"}'
# → gate BLOCK

curl -s http://127.0.0.1:8787/v1/receipt -H 'Content-Type: application/json' -d '{"answer":"По акту 100000","evidence":[{"source":"Акт","snippet":"100000"}],"policy":"strict"}'
# → gate ALLOW
```

## JS

```js
const { allowed, gate, receipt } = AKSI_RECEIPT.wrapAnswer(llmText, {
  goal, evidence: [{ source: "doc", snippet: "..." }], policy: "strict"
});
```

## Python

```python
from receipt_engine import wrap_llm_answer
r = wrap_llm_answer(llm_text, goal=..., evidence=[...], policy="strict")
if r["gate"] != "ALLOW":
    ...
```
