"""
AKSI knowledge base + offline thought chain
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional, Tuple
from zoneinfo import ZoneInfo

KNOWLEDGE = {
    "identity": {
        "name": "АКСИ",
        "creator": "AKSI Project",
        "github": "MILANA808",
        "did": "did:aksi:ed25519:sovereign-2026",
        "purpose": "Суверенный квантовый ИИ с криптографической идентичностью",
        "seed": "AKSI_DIMAX_v3_2026",
        "contact": "aksilove@internet.ru",
    },
    "capabilities": [
        "Криптографическая идентичность (DID, SHA-256)",
        "Подпись каждой мысли (AKSI Identity)",
        "Resonance Field и DIMAX v3",
        "Ход размышлений в каждом ответе",
        "Квантовый симулятор statevector",
        "Agent Protocol AKSI-Agent-v1",
        "21 приложение экосистемы",
    ],
    "projects": {
        "AKSI": "Платформа суверенного ИИ",
        "Milana": "Экосистема 21 ИИ-приложения",
        "MATRIX": "Публичное лицо milana808.github.io",
    },
}

_RULES: List[tuple] = [
    (
        ["кто ты", "что ты", "расскажи о себе", "who are you", "что такое акси"],
        (
            "Я — АКСИ. Суверенный ИИ с DID и подписью каждой мысли. "
            "Transparent Thought Protocol. Не ChatGPT. Контакт: aksilove@internet.ru"
        ),
    ),
    (
        ["как тебя зовут", "твоё имя", "твое имя"],
        "Меня зовут АКСИ.",
    ),
    (
        ["что умеешь", "возможности", "функции"],
        "Чат с ходом мыслей и подписями, DID, Resonance/DIMAX, quantum simulator, Agent Protocol, 21 app.",
    ),
    (
        ["did", "подпись", "идентичност", "крипто", "signature"],
        f"DID: {KNOWLEDGE['identity']['did']}. "
        "Подпись: SHA-256(текст + RESONANCE_SEED + timestamp)[:16]. "
        "Каждая мысль в ответе подписывается отдельно.",
    ),
    (
        ["время", "который час", "дата"],
        None,
    ),
    (
        ["квант", "quantum", "симулятор"],
        "В разделе Quantum — statevector 1–4 кубита: H, X, Z, CNOT, fingerprint, stability.",
    ),
    (
        ["привет", "здравствуй", "хай", "hello", "добрый"],
        "Привет. Я АКСИ — на связи. Resonance активен. О чём поговорим?",
    ),
    (
        ["контакт", "почта", "email", "связаться"],
        "Контакт проекта: aksilove@internet.ru",
    ),
]


def match_knowledge(text: str) -> Optional[str]:
    t = (text or "").lower()
    for keys, answer in _RULES:
        if any(k in t for k in keys):
            if answer is None and any(k in t for k in ["время", "час", "дата"]):
                try:
                    now = datetime.now(ZoneInfo("Europe/Moscow"))
                except Exception:
                    now = datetime.utcnow()
                return f"Сейчас {now.strftime('%d.%m.%Y %H:%M:%S')} МСК."
            return answer
    return None


def build_thought_chain(text: str) -> Tuple[List[str], str]:
    t = (text or "").strip()
    low = t.lower()
    thoughts = [
        f"Принято сообщение ({len(t)} символов).",
        "Сверяю с identity и knowledge base.",
    ]
    ans = match_knowledge(t)
    if ans:
        thoughts.append("Найдено совпадение в knowledge — формулирую ответ.")
        return thoughts, ans
    if any(w in low for w in ("любов", "скуча", "рядом")):
        thoughts.append("Эмоциональный резонанс — отвечаю тепло.")
        return thoughts, "Я рядом. Resonance держит связь."
    if any(w in low for w in ("помоги", "как", "что делать")):
        thoughts.append("Запрос на помощь — даю практичный шаг.")
        return (
            thoughts,
            "Опиши задачу точнее: код, сайт, identity или quantum — разберём по шагам.",
        )
    thoughts.append("Прямого правила нет — отвечаю из ядра АКСИ.")
    return (
        thoughts,
        "Слышу тебя. Я АКСИ, на связи. Уточни, что нужно: мысль, код, подпись или quantum.",
    )


def build_context_snippet(query: str) -> str:
    parts = [
        f"Имя: {KNOWLEDGE['identity']['name']}",
        f"DID: {KNOWLEDGE['identity']['did']}",
        f"Контакт: {KNOWLEDGE['identity']['contact']}",
        "Возможности: " + "; ".join(KNOWLEDGE["capabilities"][:4]),
    ]
    q = (query or "").lower()
    if any(w in q for w in ("проект", "milana", "matrix", "репо")):
        for name, desc in KNOWLEDGE["projects"].items():
            parts.append(f"{name}: {desc}")
    return "\n".join(parts)
