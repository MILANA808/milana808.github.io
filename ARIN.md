# ARIN v2.0 FULL — AKSI Resonance Integrity Network

**Дата:** 2026-09-17  
**Версия:** 2.0.0-arin-full  
**Контакт:** aksilove@internet.ru  

## Полный вид нейросети АКСИ

1. **Complex embed** — триграммы → z ∈ ℂ^D (D=24)  
2. **Complex dense** — h = CReLU((Wr+iWi)z + b)  
3. **Interference memory** — эталоны m_k ∈ ℂ^D  
4. **Born-like readout** — s_k = |⟨h,m_k⟩|² / (‖h‖²‖m_k‖²)  
5. **Integrity gate** — conf / margin / born  

Слои: `complex-embed` → `complex-dense-CReLU` → `interference-memory` → `Born-readout` → `integrity-gate`

## Метрики 2026-09-17

| Метрика | Значение |
|--------|----------|
| Классы | 20 |
| Параметры | ~6768 |
| Эпохи | 40 |
| Loss | ≈ 0.24 |
| Accuracy | **20/20** |
| Мусор | LOW |

## API

```js
AKSI_RESONANCE.ensure()
AKSI_RESONANCE.train({ epochs: 40 })
AKSI_RESONANCE.ask("что такое arin")
AKSI_RESONANCE.status()
AKSI_RESONANCE.architecture()
```

Модуль: `/aksi-resonance-net.js` · UI: `/product.html`
