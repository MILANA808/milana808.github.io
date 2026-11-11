# AKSI Conversation Context v1

## Behaviour

The dialogue engine keeps a bounded in-memory list of up to five grounded topic references during the current page session. It does not retain raw conversation text in this context layer.

Follow-up forms such as “А пример?”, “А почему?”, “Объясни проще” and “Дай практику” are resolved against the most recent grounded concept or theorem. The response includes a conversation_context proof-trace entry naming the topic reference and stating that it came from the previous grounded turn.

## Safety and boundaries

- Context is session-only and resets when the page is refreshed.
- Only a topic reference, topic kind and intent are retained; no raw user messages are stored by this layer.
- Similarity is not treated as evidence.
- A follow-up without a previous grounded topic asks the user to establish the topic first.
- Causal questions remain subject to the existing evidence gate; context does not create causal evidence.
- This is bounded symbolic context handling, not general conversational understanding.

## Verification examples

1. Объясни теорему Пифагора
2. А пример? — uses the Pythagorean theorem as the previous topic.
3. Что такое математика
4. А почему? — reuses the topic but still withholds unsupported causal claims.
5. Объясни проще — reuses the same grounded concept.
