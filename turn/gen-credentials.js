#!/usr/bin/env node
/**
 * Generate time-limited TURN credentials (coturn use-auth-secret / REST API style).
 * Compatible with WebRTC: username = expiry:user, credential = HMAC-SHA1(secret, username)
 *
 * Usage:
 *   node gen-credentials.js [ttlSeconds]
 * Env: TURN_SECRET, TURN_REALM, PUBLIC_IP (or TURN_HOST)
 */
const crypto = require("crypto");

const secret = process.env.TURN_SECRET || "CHANGE_ME_LONG_RANDOM_SECRET";
const host = process.env.TURN_HOST || process.env.PUBLIC_IP || "YOUR_PUBLIC_IP";
const realm = process.env.TURN_REALM || "aksi-turn";
const ttl = Math.max(60, parseInt(process.argv[2] || "86400", 10) || 86400);
const user = process.argv[3] || "aksi";

const expiry = Math.floor(Date.now() / 1000) + ttl;
const username = expiry + ":" + user;
const credential = crypto.createHmac("sha1", secret).update(username).digest("base64");

const ice = [
  { urls: "stun:" + host + ":3478" },
  {
    urls: [
      "turn:" + host + ":3478?transport=udp",
      "turn:" + host + ":3478?transport=tcp",
      "turns:" + host + ":5349?transport=tcp"
    ],
    username: username,
    credential: credential
  }
];

const out = {
  username: username,
  credential: credential,
  ttl: ttl,
  realm: realm,
  iceServers: ice
};

console.log(JSON.stringify(out, null, 2));
console.log("\n// Browser paste:\nwindow.AKSI_P2P_TURN = " + JSON.stringify(ice[1], null, 2) + ";");
