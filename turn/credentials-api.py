#!/usr/bin/env python3
"""
Minimal TURN credential API for AKSI (coturn static-auth-secret).
Run behind HTTPS reverse proxy. Does not store user data.

  TURN_SECRET=... PUBLIC_IP=1.2.3.4 python3 credentials-api.py

GET /turn  ->  { iceServers: [...], ttl: 86400 }
"""
from __future__ import annotations

import hmac
import hashlib
import base64
import json
import os
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

SECRET = os.environ.get("TURN_SECRET", "CHANGE_ME_LONG_RANDOM_SECRET").encode()
HOST = os.environ.get("TURN_HOST") or os.environ.get("PUBLIC_IP") or "127.0.0.1"
TTL = int(os.environ.get("TURN_TTL", "86400"))
PORT = int(os.environ.get("PORT", "8787"))
CORS = os.environ.get("CORS_ORIGIN", "*")


def make_creds(user: str = "aksi") -> dict:
    expiry = int(time.time()) + TTL
    username = f"{expiry}:{user}"
    digest = hmac.new(SECRET, username.encode(), hashlib.sha1).digest()
    credential = base64.b64encode(digest).decode()
    ice = [
        {"urls": f"stun:{HOST}:3478"},
        {
            "urls": [
                f"turn:{HOST}:3478?transport=udp",
                f"turn:{HOST}:3478?transport=tcp",
                f"turns:{HOST}:5349?transport=tcp",
            ],
            "username": username,
            "credential": credential,
        },
    ]
    return {"ttl": TTL, "iceServers": ice, "username": username}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", CORS)
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        path = self.path.split("?")[0]
        if path not in ("/turn", "/turn/", "/ice", "/health"):
            self.send_response(404)
            self.end_headers()
            return
        if path == "/health":
            body = b'{"ok":true,"service":"aksi-turn-api"}'
        else:
            body = json.dumps(make_creds()).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self._cors()
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    print(f"AKSI TURN API on :{PORT}  host={HOST}")
    HTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
