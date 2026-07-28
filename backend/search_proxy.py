"""Optional web search helper for unified backend.
Set AKSI_TAVILY_API_KEY or AKSI_SERPER_API_KEY in environment.
"""
from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

import httpx


async def web_search(query: str, num_results: int = 5) -> Dict[str, Any]:
    tavily = os.getenv("AKSI_TAVILY_API_KEY", "").strip()
    serper = os.getenv("AKSI_SERPER_API_KEY", "").strip()

    if tavily:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": tavily,
                    "query": query,
                    "max_results": num_results,
                    "include_answer": True,
                },
            )
            if r.status_code != 200:
                return {"success": False, "error": f"Tavily {r.status_code}"}
            data = r.json()
            results = [
                {
                    "title": i.get("title", ""),
                    "url": i.get("url", ""),
                    "content": i.get("content", ""),
                }
                for i in data.get("results", [])
            ]
            return {
                "success": True,
                "provider": "tavily",
                "answer": data.get("answer", ""),
                "results": results,
                "query": query,
            }

    if serper:
        async with httpx.AsyncClient(timeout=15.0) as client:
            r = await client.post(
                "https://google.serper.dev/search",
                headers={"X-API-KEY": serper, "Content-Type": "application/json"},
                json={"q": query, "num": num_results},
            )
            if r.status_code != 200:
                return {"success": False, "error": f"Serper {r.status_code}"}
            data = r.json()
            results = [
                {
                    "title": i.get("title", ""),
                    "url": i.get("link", ""),
                    "content": i.get("snippet", ""),
                }
                for i in data.get("organic", [])
            ]
            return {
                "success": True,
                "provider": "serper",
                "answer": (data.get("answerBox") or {}).get("answer", ""),
                "results": results,
                "query": query,
            }

    return {
        "success": False,
        "error": "No search API key. Set AKSI_TAVILY_API_KEY or AKSI_SERPER_API_KEY",
    }
