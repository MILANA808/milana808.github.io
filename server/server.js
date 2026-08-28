/**
 * AKSI Sovereign Server v1
 * Protocol AKSI-Relay/1 — rooms, message relay, LLM proxy BYOK
 * © AKSI · aksilove@internet.ru · Proprietary
 */
"use strict";

const http = require("http");
const crypto = require("crypto");
const { WebSocketServer } = require("ws");

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "0.0.0.0";
const TOKEN = process.env.AKSI_TOKEN || "";
const MAX_BODY = 48000;
const ROOM_TTL_MS = 1000 * 60 * 60 * 6;
const MAX_ROOM_CLIENTS = 32;
const rooms = new Map();

function sha(s) {
  return crypto.createHash("sha256").update(String(s)).digest("hex").slice(0, 16);
}
function uid(prefix) {
  return prefix + "-" + crypto.randomBytes(4).toString("hex") + "-" + Date.now().toString(36).slice(-4);
}
function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-AKSI-Token",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let n = 0;
    req.on("data", (c) => {
      n += c.length;
      if (n > MAX_BODY) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}
function checkToken(req) {
  if (!TOKEN) return true;
  const h = req.headers["authorization"] || req.headers["x-aksi-token"] || "";
  return String(h).replace(/^Bearer\s+/i, "").trim() === TOKEN;
}

class Room {
  constructor(id) {
    this.id = id;
    this.clients = new Map();
    this.createdAt = Date.now();
    this.lastActive = Date.now();
  }
  touch() { this.lastActive = Date.now(); }
  size() { return this.clients.size; }
  broadcast(fromId, packet) {
    this.touch();
    const raw = JSON.stringify(packet);
    for (const [id, ws] of this.clients) {
      if (id === fromId) continue;
      if (ws.readyState === 1) {
        try { ws.send(raw); } catch (_) {}
      }
    }
  }
  join(clientId, ws) {
    if (this.clients.size >= MAX_ROOM_CLIENTS) return false;
    this.clients.set(clientId, ws);
    this.touch();
    return true;
  }
  leave(clientId) {
    this.clients.delete(clientId);
    this.touch();
  }
}

function getRoom(id, create) {
  let r = rooms.get(id);
  if (!r && create) {
    r = new Room(id);
    rooms.set(id, r);
  }
  return r;
}
setInterval(() => {
  const now = Date.now();
  for (const [id, r] of rooms) {
    if (r.size() === 0 && now - r.lastActive > ROOM_TTL_MS) rooms.delete(id);
  }
}, 60000);

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-AKSI-Token",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    });
    return res.end();
  }
  const url = new URL(req.url || "/", "http://localhost");

  if (url.pathname === "/health" || url.pathname === "/") {
    return json(res, 200, {
      ok: true,
      service: "AKSI-Sovereign-Server",
      version: "1.0.0",
      protocol: "AKSI-Relay/1",
      mission: "local-first · sovereign identity · proof over hype",
      rooms: rooms.size,
      tokenRequired: Boolean(TOKEN),
      contact: "aksilove@internet.ru",
      note: "UI on GitHub Pages. This process is your private contour.",
    });
  }

  if (url.pathname === "/v1/room" && req.method === "POST") {
    if (!checkToken(req)) return json(res, 401, { ok: false, error: "unauthorized" });
    const id = uid("aksi");
    getRoom(id, true);
    return json(res, 200, { ok: true, roomId: id, wsPath: "/ws" });
  }

  if (url.pathname === "/v1/llm" && req.method === "POST") {
    if (!checkToken(req)) return json(res, 401, { ok: false, error: "unauthorized" });
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw || "{}");
      const provider = String(body.provider || "openai");
      const apiKey = String(body.apiKey || "");
      const messages = body.messages || [];
      const model = body.model;
      if (!apiKey) return json(res, 400, { ok: false, error: "apiKey required (BYOK, not stored)" });
      if (!Array.isArray(messages) || !messages.length)
        return json(res, 400, { ok: false, error: "messages required" });

      let upstream, headers = { "Content-Type": "application/json" }, payload;

      if (provider === "anthropic") {
        upstream = "https://api.anthropic.com/v1/messages";
        headers["x-api-key"] = apiKey;
        headers["anthropic-version"] = "2023-06-01";
        let system = "";
        const msgs = [];
        for (const m of messages) {
          if (m.role === "system") system += (system ? "\n" : "") + m.content;
          else msgs.push({ role: m.role === "assistant" ? "assistant" : "user", content: m.content });
        }
        payload = { model: model || "claude-sonnet-4-20250514", max_tokens: body.max_tokens || 1024, system: system || undefined, messages: msgs };
      } else if (provider === "gemini") {
        const m = model || "gemini-2.0-flash";
        upstream = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(m) + ":generateContent?key=" + encodeURIComponent(apiKey);
        const contents = [];
        let system = "";
        for (const msg of messages) {
          if (msg.role === "system") system += msg.content + "\n";
          else contents.push({ role: msg.role === "assistant" ? "model" : "user", parts: [{ text: msg.content }] });
        }
        payload = { contents };
        if (system) payload.systemInstruction = { parts: [{ text: system }] };
      } else {
        const base = String(body.baseURL || (provider === "xai" ? "https://api.x.ai/v1" : "https://api.openai.com/v1")).replace(/\/$/, "");
        upstream = base + "/chat/completions";
        headers.Authorization = "Bearer " + apiKey;
        payload = {
          model: model || (provider === "xai" ? "grok-2-latest" : "gpt-4o"),
          messages,
          temperature: body.temperature ?? 0.7,
          max_tokens: body.max_tokens || 1024,
        };
      }

      const r = await fetch(upstream, { method: "POST", headers, body: JSON.stringify(payload) });
      const text = await r.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
      if (!r.ok) return json(res, 502, { ok: false, error: "upstream " + r.status, detail: data, provider });

      let outText = "";
      if (provider === "anthropic") {
        for (const b of data.content || []) if (b.type === "text") outText += b.text;
      } else if (provider === "gemini") {
        for (const p of data.candidates?.[0]?.content?.parts || []) if (p.text) outText += p.text;
      } else {
        outText = data.choices?.[0]?.message?.content || "";
      }
      return json(res, 200, { ok: true, provider, text: outText, usage: data.usage || null });
    } catch (e) {
      return json(res, 500, { ok: false, error: String(e.message || e) });
    }
  }

  json(res, 404, { ok: false, error: "not found" });
});

const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws, req) => {
  if (!checkToken(req)) {
    ws.close(4001, "unauthorized");
    return;
  }
  const clientId = uid("c");
  let roomId = null;

  ws.send(JSON.stringify({
    type: "welcome",
    protocol: "AKSI-Relay/1",
    clientId,
    mission: "АКСИ · суверенный канал",
    ts: Date.now(),
  }));

  ws.on("message", (buf) => {
    let msg;
    try { msg = JSON.parse(String(buf)); } catch { return; }
    if (!msg || !msg.type) return;

    if (msg.type === "join") {
      const id = String(msg.roomId || "").trim().slice(0, 64);
      if (!id) {
        ws.send(JSON.stringify({ type: "error", error: "roomId required" }));
        return;
      }
      if (roomId) {
        const old = rooms.get(roomId);
        if (old) {
          old.leave(clientId);
          old.broadcast(clientId, { type: "peer-left", clientId, roomId });
        }
      }
      const room = getRoom(id, true);
      if (!room.join(clientId, ws)) {
        ws.send(JSON.stringify({ type: "error", error: "room full" }));
        return;
      }
      roomId = id;
      ws.send(JSON.stringify({ type: "joined", roomId, clientId, peers: room.size() - 1, ts: Date.now() }));
      room.broadcast(clientId, { type: "peer-joined", clientId, roomId, peers: room.size() });
      return;
    }

    if (msg.type === "leave") {
      if (roomId) {
        const room = rooms.get(roomId);
        if (room) {
          room.leave(clientId);
          room.broadcast(clientId, { type: "peer-left", clientId, roomId });
        }
        roomId = null;
      }
      ws.send(JSON.stringify({ type: "left" }));
      return;
    }

    if (msg.type === "ping") {
      ws.send(JSON.stringify({ type: "pong", t: msg.t, t1: Date.now() }));
      return;
    }

    if (roomId && (msg.type === "chat" || msg.type === "signal" || msg.type === "envelope" || msg.type === "relay")) {
      const room = rooms.get(roomId);
      if (!room) return;
      const packet = {
        type: msg.type,
        from: clientId,
        roomId,
        text: msg.text,
        body: msg.body,
        payload: msg.payload,
        ts: Date.now(),
        fp: msg.text ? sha(msg.text) : undefined,
      };
      room.broadcast(clientId, packet);
      ws.send(JSON.stringify({ type: "ack", for: msg.type, ts: packet.ts }));
    }
  });

  ws.on("close", () => {
    if (roomId) {
      const room = rooms.get(roomId);
      if (room) {
        room.leave(clientId);
        room.broadcast(clientId, { type: "peer-left", clientId, roomId });
      }
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(JSON.stringify({
    service: "AKSI-Sovereign-Server",
    listen: HOST + ":" + PORT,
    ws: "/ws",
    health: "/health",
    llm: "/v1/llm",
    token: Boolean(TOKEN),
    contact: "aksilove@internet.ru",
  }));
});
