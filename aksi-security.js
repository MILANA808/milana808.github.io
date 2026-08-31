/**
 * AKSI Security helpers — XSS, files, sanitize
 * Contact: aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var ALLOWED_MIME = {
    "image/jpeg": 1, "image/png": 1, "image/gif": 1, "image/webp": 1, "image/svg+xml": 1,
    "text/plain": 1, "text/markdown": 1, "text/csv": 1, "application/json": 1,
    "application/pdf": 1
  };
  var BLOCKED_EXT = /\.(exe|bat|cmd|com|msi|scr|js|mjs|html|htm|svg|php|sh|ps1|dll|jar|apk|wasm)$/i;

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setText(el, text) {
    if (!el) return;
    el.textContent = String(text == null ? "" : text);
  }

  function bubbleHtml(text, meta) {
    return '<div class="bub">' + esc(text) +
      (meta ? '<div class="meta">' + esc(meta) + "</div>" : "") +
      "</div>";
  }

  function validateFile(file) {
    if (!file) return { ok: false, reason: "no file" };
    var name = String(file.name || "");
    if (BLOCKED_EXT.test(name)) {
      return { ok: false, reason: "Исполняемое/опасное расширение запрещено: " + name };
    }
    var mime = String(file.type || "application/octet-stream");
    if (mime && mime !== "application/octet-stream" && !ALLOWED_MIME[mime]) {
      if (mime.indexOf("text/") !== 0 && mime.indexOf("image/") !== 0) {
        return { ok: false, reason: "MIME не разрешён: " + mime };
      }
    }
    if (file.size > 8 * 1024 * 1024) {
      return { ok: false, reason: "Файл больше 8 МБ" };
    }
    return { ok: true, mime: mime, name: name };
  }

  G.AKSI_SECURITY = {
    esc: esc,
    setText: setText,
    bubbleHtml: bubbleHtml,
    validateFile: validateFile,
    ALLOWED_MIME: ALLOWED_MIME
  };
})(typeof window !== "undefined" ? window : globalThis);
