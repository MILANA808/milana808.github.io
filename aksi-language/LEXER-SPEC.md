# AKSI Q unified front end — lexer contract (draft 0.1)

This contract defines the first shared lexical layer. It is a foundation, not
a complete compiler and not yet wired into the legacy expression or UI
interpreters.

## Token model

Each token carries:
- kind: KEYWORD, IDENT, NUMBER, STRING, OP, PUNCT, NEWLINE or EOF;
- decoded value (strings are decoded);
- source span with zero-based start/end offsets and one-based line/column
  coordinates.

Identifiers are ASCII for the first compiler milestone:
`[A-Za-z_][A-Za-z0-9_]*`. This is deliberate and avoids silently
inconsistent Unicode identifier normalization. Unicode remains supported in
string contents and comments.

## Lexical rules

- UTF-8 text is decoded by the caller.
- Whitespace separates tokens; newlines are preserved by default.
- `#` begins a comment outside string literals.
- Single- and double-quoted strings support documented escapes.
- Numeric literals accept integer, decimal and exponent forms.
- Operators use longest-match tokenization.
- Unknown characters, malformed escapes, unterminated strings and raw
  newlines inside strings produce source-located errors.
- Resource limits: 1 MB source, 100,000 tokens, 128-character identifiers,
  65,536-character decoded strings.

## Security boundary

The lexer only produces inert token records. It does not evaluate source,
load modules, access files, call host APIs, or interpret HTML. Parser and
runtime stages must retain their own independent resource limits.

## Current implementation status

`aksi_lexer.py` and its unit tests implement this contract. The existing
Python expression parser and browser UI parser remain separate legacy
components until a subsequent migration step adopts a shared syntax tree.
Passing lexer tests does not establish parser correctness or a complete
general-purpose language.
