# ARIN v2.1 — Seal-Coupled Resonance Network

**Дата:** 2026-09-17  
**Контакт:** aksilove@internet.ru  

## Собираем вместе — честный вклад АКСИ

Мы **не** заявляем: «первый комплексный NN в истории науки».

Мы **заявляем** продуктовый вклад:

> **Seal-Coupled Resonance** — в одном train-loop  
> `L = CE(class) + λ · (1 − Born(h_query, seal(answer)))`  
> плюс integrity gate и полный offline runtime в браузере.

### Prior art (открыто)

CVNN, complex backprop, holographic / interference memory — уже есть в науке.  
Вклад АКСИ: **связка seal-согласованности с CE в комплексном пространстве** + gate + поставка как продукт.

## Пайплайн

`complex-embed → CReLU dense → interference memory → Born readout → seal-check → integrity gate`

## Метрики 2026-09-17

| Метрика | Значение |
|--------|----------|
| Accuracy | **20/20** |
| meanSealBorn | ≈ 0.86 |
| Loss | ≈ 0.38 |
| Params | ~7728 |
| Мусор | LOW |

## API

```js
AKSI_RESONANCE.ensure()
AKSI_RESONANCE.ask("что такое seal-coupled")
AKSI_RESONANCE.claim()
AKSI_RESONANCE.status()
```

Живой UI: `/product.html`
