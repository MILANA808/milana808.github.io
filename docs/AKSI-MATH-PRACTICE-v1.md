# AKSI Mathematical Practice Library v1

This browser-local module adds a small, explicit educational reference set to the dialogue layer.

## Included records

- Pythagorean theorem: statement, Euclidean right-triangle assumptions, proof sketch, worked example and exercise.
- Bayes' theorem: conditional-probability identity, binary expansion, assumptions and a base-rate example.
- Modus ponens: inference rule, logical assumptions, truth-table proof sketch and example.
- Shannon entropy: discrete formula, normalized-distribution assumptions, interpretation and exercise.

## Runtime behaviour

The dialogue layer routes requests for theorem explanations, worked examples, practice tasks and the theorem catalogue to this module before general concept routing. Each answer includes a structured proof record identifying the source record and its assumptions.

## Limits

The records are curated educational material, not an automated formal proof system. Proof sketches are not machine-verified. The module does not learn new mathematical truths from user feedback and does not claim open-domain mathematical competence. Unknown theorem names are not fabricated: the module returns no result and lets the existing dialogue flow handle the request.

## Try on the public site

- `Объясни теорему Пифагора`
- `Дай практику по формуле Байеса`
- `Приведи пример применения энтропии Шеннона`
- `Покажи теоремы`
