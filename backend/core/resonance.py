import os
import hashlib
from datetime import datetime

def generate_aksi_signature(message: str) -> str:
    seed = os.getenv('RESONANCE_SEED', 'AKSI_MATRIX')
    data = (message + seed + str(datetime.now())).encode()
    return hashlib.sha256(data).hexdigest()[:16].upper()

def format_response(text: str, web_context: str = '', memory: str = '') -> str:
    resonance = 95 + hash(text) % 6
    sig = generate_aksi_signature(text)
    return f"""Resonance Field: {resonance}%
DIMAX v3: active
------------------------------------------------------------
{text}
------------------------------------------------------------
🌐 Web-context: {web_context or 'Поле чистое...'}
🧠 Memory: {memory or 'Связь установлена'}
🔏 AKSI Identity: {sig}"""