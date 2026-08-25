/**
 * AKSI DKV module entry
 * Full offline verifier lives in aksi-dkv.html (engine + UI + facts inlined).
 * This file re-exports when the full source is present; otherwise guides the host page.
 *
 * Integration: open /aksi-dkv.html or see DKV-INTEGRATION.md
 * Contact: aksilove@internet.ru
 */
(function (g) {
  "use strict";
  if (g.DKV && g.DKV.DKVEngine) return;
  g.DKV = g.AKSI_DKV = {
    version: "1.0.0-entry",
    mount: function (sel) {
      var el = typeof sel === "string" ? document.querySelector(sel) : sel;
      if (!el) return;
      el.innerHTML =
        '<div style="padding:16px;border:1px solid #2a2a30;border-radius:12px;background:#121214;color:#f4f4f5;font:14px system-ui">' +
        "<b>AKSI DKV</b><p style=\"color:#a1a1aa\">Полный верификатор: <a href=\"aksi-dkv.html\" style=\"color:#a78bfa\">aksi-dkv.html</a></p>" +
        "<p style=\"color:#71717a;font-size:12px\">Модуль самодостаточный (offline, SHA-256 ledger, Canvas-граф).</p></div>";
    },
    DKVEngine: function () {
      throw new Error("Open aksi-dkv.html — full DKVEngine is inlined there");
    }
  };
})(typeof window !== "undefined" ? window : this);
