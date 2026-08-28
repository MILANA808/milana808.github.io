/**
 * AKSI Photo Pipeline v1 — OCR + optional vision LLM (Ollama llava)
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.0.0-photo";
  function fileToCanvas(file, maxSide) {
    maxSide = maxSide || 1280;
    return new Promise(function (resolve, reject) {
      if (!file || (!(file.type || "").match(/^image\//) && !/\.(png|jpe?g|gif|webp|bmp)$/i.test(file.name || ""))) {
        reject(new Error("Нужен файл изображения (PNG/JPG/WebP)"));
        return;
      }
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var w = img.width, h = img.height;
        if (w > maxSide || h > maxSide) {
          var s = Math.min(maxSide / w, maxSide / h);
          w = Math.round(w * s); h = Math.round(h * s);
        }
        var c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(c);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("Не удалось открыть изображение")); };
      img.src = url;
    });
  }
  function canvasToBase64(canvas, quality) {
    return canvas.toDataURL("image/jpeg", quality || 0.85).replace(/^data:image\/\w+;base64,/, "");
  }
  function ocr(canvas, onProgress) {
    if (!G.AKSI_VISION || typeof G.AKSI_VISION.ocrImage !== "function") return Promise.resolve("");
    return G.AKSI_VISION.ocrImage(canvas, "rus+eng", onProgress || function () {});
  }
  function ollamaVision(prompt, b64, opts) {
    opts = opts || {};
    var base = (opts.base || "http://127.0.0.1:11434").replace(/\/$/, "");
    var model = opts.model || "llava";
    var ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    var t = setTimeout(function () { try { if (ctrl) ctrl.abort(); } catch (e) {} }, opts.timeout || 60000);
    return fetch(base + "/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl && ctrl.signal,
      body: JSON.stringify({
        model: model, stream: false,
        prompt: prompt || "Опиши изображение по-русски кратко. Если есть текст — прочитай.",
        images: [b64],
      }),
    }).then(function (r) {
      clearTimeout(t);
      if (!r.ok) throw new Error("Ollama HTTP " + r.status);
      return r.json();
    }).then(function (j) {
      return j && j.response ? String(j.response).trim() : "";
    }).catch(function (e) { clearTimeout(t); throw e; });
  }
  function analyze(file, opts) {
    opts = opts || {};
    var progress = opts.onProgress || function () {};
    progress("Загрузка…");
    return fileToCanvas(file).then(function (canvas) {
      progress("OCR…");
      return ocr(canvas, progress).then(function (ocrText) {
        var b64 = canvasToBase64(canvas);
        var parts = [];
        if (ocrText && ocrText.length > 2) parts.push("Текст с фото (OCR):\n" + ocrText);
        progress("Vision LLM…");
        return ollamaVision(
          opts.prompt || "Ты АКСИ. Опиши изображение по-русски. Если есть текст — процитируй.",
          b64, opts
        ).then(function (visionText) {
          if (visionText) parts.push("Описание модели:\n" + visionText);
          var text = parts.join("\n\n") || "Не удалось извлечь текст. Установите Ollama + llava или дождитесь OCR.";
          return { text: text, ocr: ocrText || "", vision: visionText || "", meta: "photo·" + (visionText ? "ocr+llm" : "ocr"), offline: !visionText };
        }).catch(function () {
          var text = ocrText && ocrText.length > 2
            ? "Текст с фото (OCR):\n" + ocrText
            : "OCR пуст. Для описания: Ollama + ollama pull llava.";
          return { text: text, ocr: ocrText || "", vision: "", meta: ocrText ? "photo·ocr" : "photo·empty", offline: true };
        });
      });
    });
  }
  function wireChat() {
    var btn = document.getElementById("photoBtn");
    var input = document.getElementById("photoFile");
    if (!btn || !input) return;
    btn.onclick = function () { input.click(); };
    input.onchange = function () {
      var file = input.files && input.files[0];
      input.value = "";
      if (!file) return;
      var badge = document.getElementById("stBadge");
      if (badge) badge.textContent = "фото…";
      analyze(file, {
        onProgress: function (p) { if (badge) badge.textContent = String(p).slice(0, 18); },
      }).then(function (res) {
        if (badge) badge.textContent = "MIND";
        var q = "Проанализируй содержимое фото и ответь:\n" + (res.text || "").slice(0, 3500);
        if (G.AKSI_ONE && typeof G.AKSI_ONE.ask === "function") {
          G.AKSI_ONE.ask("📷 Фото: " + (file.name || "image") + "\n" + q);
        } else if (G.AKSI_MIND && G.AKSI_MIND.think) {
          G.AKSI_MIND.think(q).then(function (r) {
            alert((r && r.text) || res.text);
          });
        } else alert(res.text.slice(0, 500));
      }).catch(function (e) {
        if (badge) badge.textContent = "ошибка";
        alert(String(e.message || e));
      });
    };
  }
  function mount(sel) {
    var root = typeof sel === "string" ? document.querySelector(sel) : sel;
    if (!root) return;
    root.innerHTML = '<div class="card"><h2>Фото · OCR + Vision</h2>' +
      '<p class="muted">1) OCR offline · 2) Ollama llava если установлен</p>' +
      '<input type="file" id="phFile" accept="image/*" capture="environment">' +
      '<div class="row"><button type="button" class="btn p" id="phGo">Обработать</button></div>' +
      '<pre id="phOut" class="out">—</pre></div>';
    document.getElementById("phGo").onclick = function () {
      var f = document.getElementById("phFile").files[0];
      if (!f) { document.getElementById("phOut").textContent = "Выберите файл"; return; }
      document.getElementById("phOut").textContent = "…";
      analyze(f, {
        onProgress: function (p) { document.getElementById("phOut").textContent = p; },
      }).then(function (r) {
        document.getElementById("phOut").textContent = r.text + "\n\n[" + r.meta + "]";
      });
    };
    wireChat();
  }
  if (typeof document !== "undefined") {
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", function () { setTimeout(wireChat, 200); });
    else setTimeout(wireChat, 200);
  }
  G.AKSI_PHOTO = { version: VER, analyze: analyze, ocr: ocr, fileToCanvas: fileToCanvas, mount: mount, wireChat: wireChat };
})(typeof window !== "undefined" ? window : this);
