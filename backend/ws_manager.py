"""
AKSI WebSocket connection manager
Realtime broadcast for chat / thoughts / patch events
"""
from __future__ import annotations

import asyncio
import json
from typing import Any, Dict, List, Set

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self.active: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self.active.add(websocket)

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            self.active.discard(websocket)

    async def send_personal(self, websocket: WebSocket, data: Dict[str, Any]) -> None:
        try:
            await websocket.send_text(json.dumps(data, ensure_ascii=False))
        except Exception:
            await self.disconnect(websocket)

    async def broadcast(self, data: Dict[str, Any]) -> None:
        dead: List[WebSocket] = []
        payload = json.dumps(data, ensure_ascii=False)
        async with self._lock:
            peers = list(self.active)
        for ws in peers:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            await self.disconnect(ws)

    @property
    def count(self) -> int:
        return len(self.active)


manager = ConnectionManager()
