# AKSI Titan v1.1 — генеративная нейросеть

**Дата:** 2026-09-17  
**Контакт:** aksilove@internet.ru  

## Честно

Titan **не** обгоняет Grok / GPT / Claude.  

Это **самая полная локальная генеративная сеть в стеке АКСИ**:

- 3 слоя (emb → ReLU → ReLU → softmax)
- ~14.5k параметров
- реальное обучение backprop + grad clip
- next-char generation + corpus retrieve

## Архитектура

`context mean-embed → Linear+ReLU → Linear+ReLU → Linear → Softmax`

## API

```js
AKSI_TITAN.ensure()
AKSI_TITAN.train({ epochs: 40 })
AKSI_TITAN.ask("что такое акси")
AKSI_TITAN.generate("акси ", { maxLen: 80 })
AKSI_TITAN.claim()
```

UI: `/titan.html`
