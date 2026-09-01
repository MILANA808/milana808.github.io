/**
 * AKSI Sovereign Server v1.1
 * Protocol AKSI-Relay/1 — rooms, relay and explicit BYOK LLM proxy.
 * Public source contains no personal contact data.
 */
"use strict";

const http = require("http");
const crypto = require("crypto");
const { WebSocketServer } = require("ws");

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "0.0.0.0";
const TOKEN = process.env.AKSI_TOKEN || "";
const ORIGIN = process.env.AKSI_ORIGIN || "";
const MAX_BODY = 48000;
const MAX_MESSAGE = 12000;
const ROOM_TTL_MS = 1000 * 60 * 60 * 6;
const MAX_ROOM_CLIENTS = 32;
const rooms = new Map();

function sha(s) { return crypto.createHash("sha256").update(String(s)).digest("hex"); }
function uid(prefix) { return prefix + "-" + crypto.randomBytes(8).toString("hex") + "-" + Date.now().toString(36).slice(-5); }
function allowedOrigin(req) {
  const requested = String(req.headers.origin || "");
  return ORIGIN ? (requested === ORIGIN ? ORIGIN : "") : "";
}
function json(res, code, obj, req) {
  const body = JSON.stringify(obj);
  const origin = allowedOrigin(req);
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-AKSI-Token",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Cache-Control": "no-store",
  };
  if (origin) { headers["Access-Control-Allow-Origin"] = origin; headers["Vary"] = "Origin"; }
  res.writeHead(code, headers); res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0; let settled = false;
    req.on("data", c => {
      n += c.length;
      if (n > MAX_BODY && !settled) { settled = true; reject(new Error("body too large")); req.destroy(); return; }
      if (!settled) chunks.push(c);
    });
    req.on("end", () => { if (!settled) resolve(Buffer.concat(chunks).toString("utf8")); });
    req.on("error", e => { if (!settled) { settled = true; reject(e); } });
  });
}
function checkToken(req) {
  if (!TOKEN) return true;
  const h = String(req.headers.authorization || req.headers["x-aksi-token"] || "").replace(/^Bearer\s+/i, "").trim();
  const a = Buffer.from(h), b = Buffer.from(TOKEN);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function safeText(value) { return String(value == null ? "" : value).slice(0, MAX_MESSAGE); }

class Room {
  constructor(id) { this.id = id; this.clients = new Map(); this.createdAt = Date.now(); this.lastActive = Date.now(); }
  touch() { this.lastActive = Date.now(); }
  size() { return this.clients.size; }
  broadcast(fromId, packet) {
    this.touch(); const raw = JSON.stringify(packet);
    for (const [id, ws] of this.clients) if (id !== fromId && ws.readyState === 1) { try { ws.send(raw); } catch (_) {} }
  }
  join(id, ws) { if (this.clients.size >= MAX_ROOM_CLIENTS) return false; this.clients.set(id, ws); this.touch(); return true; }
  leave(id) { this.clients.delete(id); this.touch(); }
}
function getRoom(id, create) { let r = rooms.get(id); if (!r && create) { r = new Room(id); rooms.set(id, r); } return r; }
setInterval(() => { const n = Date.now(); for (const [id, r] of rooms) if (!r.size() && n - r.lastActive > ROOM_TTL_MS) rooms.delete(id); }, 60000).unref?.();

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    const origin = allowedOrigin(req); const h = { "Access-Control-Allow-Headers": "Content-Type, Authorization, X-AKSI-Token", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Cache-Control": "no-store" };
    if (origin) { h["Access-Control-Allow-Origin"] = origin; h["Vary"] = "Origin"; }
    res.writeHead(204, h); return res.end();
  }
  const url = new URL(req.url || "/", "http://localhost");
  if (url.pathname === "/health" || url.pathname === "/") return json(res, 200, { ok: true, service: "AKSI-Sovereign-Server", version: "1.1.0", protocol: "AKSI-Relay/1", mission: "local-first · sovereign identity · proof over hype", rooms: rooms.size, tokenRequired: Boolean(TOKEN) }, req);
  if (url.pathname === "/v1/room" && req.method === "POST") {
    if (!checkToken(req)) return json(res, 401, { ok: false, error: "unauthorized" }, req);
    const id = uid("aksi"); getRoom(id, true); return json(res, 200, { ok: true, roomId: id, wsPath: "/ws" }, req);
  }
  if (url.pathname === "/v1/llm" && req.method === "POST") {
    if (!checkToken(req)) return json(res, 401, { ok: false, error: "unauthorized" }, req);
    try {
      const body = JSON.parse(await readBody(req) || "{}");
      const provider = String(body.provider || "openai"); const apiKey = String(body.apiKey || ""); const messages = body.messages;
      if (!apiKey) return json(res, 400, { ok: false, error: "apiKey required (BYOK, not stored)" }, req);
      if (!Array.isArray(messages) || !messages.length) return json(res, 400, { ok: false, error: "messages required" }, req);
      if (messages.length > 100 || messages.some(m => !m || !["system", "user", "assistant"].includes(m.role) || typeof m.content !== "string" || m.content.length > MAX_MESSAGE)) return json(res, 400, { ok: false, error: "invalid messages" }, req);
      let upstream, headers = { "Content-Type": "application/json" }, payload;
      if (provider === "anthropic") {
        upstream = "https://api.anthropic.com/v1/messages"; headers["x-api-key"] = apiKey; headers["anthropic-version"] = "2023-06-01";
        let system = ""; const msgs = [];
        for (const m of messages) m.role === "system" ? system += (system ? "\n" : "") + m.content : msgs.push({ role: m.role === "assistant" ? "assistant" : "user", content: m.content });
        payload = { model: body.model || "claude-sonnet-4-20250514", max_tokens: Math.min(Number(body.max_tokens) || 1024, 4096), system: system || undefined, messages: msgs };
      } else if (provider === "gemini") {
        const m = body.model || "gemini-2.0-flash"; upstream = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(m) + ":generateContent?key=" + encodeURIComponent(apiKey);
        const contents = []; let system = "";
        for (const msg of messages) msg.role === "system" ? system += msg.content + "\n" : contents.push({ role: msg.role === "assistant" ? "model" : "user", parts: [{ text: msg.content }] });
        payload = { contents }; if (system) payload.systemInstruction = { parts: [{ text: system }] };
      } else {
        const base = String(body.baseURL || (provider === "xai" ? "https://api.x.ai/v1" : "https://api.openai.com/v1")).replace(/\/$/, "");
        upstream = base + "/chat/completions"; headers.Authorization = "Bearer " + apiKey;
        payload = { model: body.model || (provider === "xai" ? "grok-2-latest" : "gpt-4o"), messages, temperature: Number.isFinite(Number(body.temperature)) ? Number(body.temperature) : .7, max_tokens: Math.min(Number(body.max_tokens) || 1024, 4096) };
      }
      const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 60000);
      let r; try { r = await fetch(upstream, { method: "POST", headers, body: JSON.stringify(payload), signal: controller.signal }); } finally { clearTimeout(timer); }
      const text = await r.text(); let data; try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 8000) }; }
      if (!r.ok) return json(res, 502, { ok: false, error: "upstream " + r.status, detail: data, provider }, req);
      let outText = "";
      if (provider === "anthropic") for (const b of data.content || []) if (b.type === "text") outText += b.text;
      else if (provider === "gemini") for (const p of data.candidates?.[0]?.content?.parts || []) if (p.text) outText += p.text;
      else outText = data.choices?.[0]?.message?.content || "";
      return json(res, 200, { ok: true, provider, text: outText, usage: data.usage || null, integrity: sha(outText) }, req);
    } catch (e) { return json(res, 500, { ok: false, error: e.name === "AbortError" ? "upstream timeout" : String(e.message || e) }, req); }
  }
  return json(res, 404, { ok: false, error: "not found" }, req);
});

const wss = new WebSocketServer({ server, path: "/ws" });
wss.on("connection", (ws, req) => {
  if (!checkToken(req)) return ws.close(4001, "unauthorized");
  const clientId = uid("c"); let roomId = null;
  ws.send(JSON.stringify({ type: "welcome", protocol: "AKSI-Relay/1", clientId, ts: Date.now() }));
  ws.on("message", buf => {
    let msg; try { msg = JSON.parse(String(buf)); } catch { return; }
    if (!msg || typeof msg.type !== "string") return;
    if (msg.type === "join") {
      const id = safeText(msg.roomId).trim().slice(0, 64); if (!id) return ws.send(JSON.stringify({ type: "error", error: "roomId required" }));
      if (roomId) { const old = rooms.get(roomId); if (old) { old.leave(clientId); old.broadcast(clientId, { type: "peer-left", clientId, roomId }); } }
      const room = getRoom(id, true); if (!room.join(clientId, ws)) return ws.send(JSON.stringify({ type: "error", error: "room full" }));
      roomId = id; ws.send(JSON.stringify({ type: "joined", roomId, clientId, peers: room.size() - 1, ts: Date.now() })); room.broadcast(clientId, { type: "peer-joined", clientId, roomId, peers: room.size() }); return;
    }
    if (msg.type === "leave") { if (roomId) { const room = rooms.get(roomId); if (room) { room.leave(clientId); room.broadcast(clientId, { type: "peer-left", clientId, roomId }); } roomId = null; } return ws.send(JSON.stringify({ type: "left" })); }
    if (msg.type === "ping") return ws.send(JSON.stringify({ type: "pong", t: msg.t, t1: Date.now() }));
    if (roomId && ["chat", "signal", "envelope", "relay"].includes(msg.type)) {
      const room = rooms.get(roomId); if (!room) return;
      const text = safeText(msg.text); const packet = { type: msg.type, from: clientId, roomId, text: text || undefined, body: msg.body, payload: msg.payload, ts: Date.now(), fp: text ? sha(text) : undefined };
      room.broadcast(clientId, packet); ws.send(JSON.stringify({ type: "ack", for: msg.type, ts: packet.ts }));
    }
  });
  ws.on("close", () => { if (roomId) { const room = rooms.get(roomId); if (room) { room.leave(clientId); room.broadcast(clientId, { type: "peer-left", clientId, roomId }); } } });
});
server.listen(PORT, HOST, () => console.log(JSON.stringify({ service: "AKSI-Sovereign-Server", listen: HOST + ":" + PORT, token: Boolean(TOKEN) })));
