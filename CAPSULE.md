# AKSI Capsule v1.1

**Contact:** aksilove@internet.ru  
**UI:** https://milana808.github.io/capsule.html  
**Runtime:** `/aksi-capsule.js`

## What it is

One product: **portable local intelligence**.

- Memory on device
- Ask memory (or Wikipedia if empty)
- Seal answer with **ECDSA P-256 + SHA-256**
- Export / import **`.aksi`** file
- Optional **AES-GCM vault** (PBKDF2 120k)
- Verify all seals offline
- Receipt download
- Templates (note, client, task, decision, meeting, idea)
- List / delete facts
- Merge import option

## What it is not

- Not AGI
- Not a quantum computer
- Not a cloud account
- Not stronger than frontier LLMs at open chat

## 60-second demo

1. Remember a fact  
2. Ask  
3. Seal  
4. Download `.aksi`  
5. Import on another device  
6. Verify seals → OK  

## API

```js
AKSI_CAPSULE.remember(text)
AKSI_CAPSULE.forget(id)
AKSI_CAPSULE.ask(q)
AKSI_CAPSULE.sealLast()
AKSI_CAPSULE.verifyAll()
AKSI_CAPSULE.downloadCapsule()
AKSI_CAPSULE.encryptVault(password)
AKSI_CAPSULE.importCapsule(json)
AKSI_CAPSULE.importVault(obj, password)
```

## Honest claim

Portable personal state + verifiable answer trail in the browser.
