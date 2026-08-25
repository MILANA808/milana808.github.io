/**
 * AKSI Vision v1.1 — offline CV + OCR (Tesseract.js)
 * Camera · motion · edges · file OCR · image/TXT text extraction
 * Contact: aksilove@internet.ru · @AKSILOVE
 */
(function (global) {
  "use strict";

  var LEDGER_KEY = "aksi_vision_ledger_v1";
  var running = false;
  var raf = 0;
  var stream = null;
  var prevGray = null;
  var lastStats = null;
  var lastOcrText = "";
  var tesseractReady = null;

  function simpleHash(s) {
    var h = 0x811c9dc5, i;
    s = String(s);
    for (i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return ("00000000" + (h >>> 0).toString(16)).slice(-8);
  }

  function appendVisionEvent(type, payload) {
    try {
      var chain = JSON.parse(localStorage.getItem(LEDGER_KEY) || "[]");
      if (!Array.isArray(chain)) chain = [];
      var prev = chain.length ? chain[chain.length - 1].hash : "GENESIS";
      var body = { type: type, ts: Date.now(), prev: prev, payload: payload };
      body.hash = simpleHash(JSON.stringify(body));
      chain.push(body);
      localStorage.setItem(LEDGER_KEY, JSON.stringify(chain.slice(-200)));
      return body;
    } catch (e) { return null; }
  }

  function pushToAgentMemory(text, src) {
    text = String(text || "").trim();
    if (!text || text.length < 3) return false;
    try {
      var key = "aksi_whole_mem_v3";
      var a = JSON.parse(localStorage.getItem(key) || "[]");
      if (!Array.isArray(a)) a = [];
      a.unshift({ id: "ocr_" + simpleHash(text).slice(0, 8), t: text.slice(0, 1500), ts: Date.now(), src: src || "ocr" });
      localStorage.setItem(key, JSON.stringify(a.slice(0, 800)));
      return true;
    } catch (e) { return false; }
  }

  function toGray(data, w, h) {
    var g = new Uint8Array(w * h), i, j = 0;
    for (i = 0; i < data.length; i += 4) {
      g[j++] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
    }
    return g;
  }

  function motionScore(prev, curr) {
    if (!prev || prev.length !== curr.length) return 0;
    var sum = 0, n = curr.length, i, d;
    for (i = 0; i < n; i += 4) {
      d = curr[i] - prev[i];
      if (d < 0) d = -d;
      if (d > 25) sum++;
    }
    return Math.min(1, sum / (n / 4) * 8);
  }

  function edgeDensity(gray, w, h) {
    var count = 0, x, y, i, gx, gy, g;
    for (y = 1; y < h - 1; y++) {
      for (x = 1; x < w - 1; x++) {
        i = y * w + x;
        gx = -gray[i - w - 1] - 2 * gray[i - 1] - gray[i + w - 1] +
              gray[i - w + 1] + 2 * gray[i + 1] + gray[i + w + 1];
        gy = -gray[i - w - 1] - 2 * gray[i - w] - gray[i - w + 1] +
              gray[i + w - 1] + 2 * gray[i + w] + gray[i + w + 1];
        g = (gx < 0 ? -gx : gx) + (gy < 0 ? -gy : gy);
        if (g > 120) count++;
      }
    }
    return Math.min(1, count / (w * h) * 12);
  }

  function loadTesseract() {
    if (tesseractReady) return tesseractReady;
    tesseractReady = new Promise(function (resolve, reject) {
      if (global.Tesseract) return resolve(global.Tesseract);
      var s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
      s.onload = function () {
        if (global.Tesseract) resolve(global.Tesseract);
        else reject(new Error("Tesseract not found"));
      };
      s.onerror = function () { reject(new Error("Не удалось загрузить Tesseract.js")); };
      document.head.appendChild(s);
    });
    return tesseractReady;
  }

  function ocrImage(source, lang, onProgress) {
    lang = lang || "rus+eng";
    return loadTesseract().then(function (T) {
      return T.recognize(source, lang, {
        logger: function (m) {
          if (onProgress && m && m.status) {
            onProgress(m.status + (m.progress != null ? " " + Math.round(m.progress * 100) + "%" : ""));
          }
        }
      });
    }).then(function (res) {
      var text = (res && res.data && res.data.text) ? String(res.data.text).trim() : "";
      lastOcrText = text;
      appendVisionEvent("vision_ocr", { chars: text.length, preview: text.slice(0, 120), hash: simpleHash(text) });
      return text;
    });
  }

  function readFileAsImage(file) {
    return new Promise(function (resolve, reject) {
      var name = (file.name || "").toLowerCase();
      if (/\.(png|jpe?g|gif|webp|bmp)$/i.test(name) || (file.type && file.type.indexOf("image/") === 0)) {
        var url = URL.createObjectURL(file);
        var img = new Image();
        img.onload = function () {
          var c = document.createElement("canvas");
          var max = 1280;
          var w = img.width, h = img.height;
          if (w > max || h > max) {
            var s = Math.min(max / w, max / h);
            w = Math.round(w * s); h = Math.round(h * s);
          }
          c.width = w; c.height = h;
          c.getContext("2d").drawImage(img, 0, 0, w, h);
          URL.revokeObjectURL(url);
          resolve({ canvas: c, name: file.name, kind: "image" });
        };
        img.onerror = function () { URL.revokeObjectURL(url); reject(new Error("Не удалось открыть изображение")); };
        img.src = url;
        return;
      }
      if (/\.txt$|\.md$|\.csv$|\.json$/i.test(name) || (file.type && file.type.indexOf("text/") === 0)) {
        var reader = new FileReader();
        reader.onload = function () {
          resolve({ text: String(reader.result || ""), name: file.name, kind: "text" });
        };
        reader.onerror = function () { reject(new Error("Не удалось прочитать текст")); };
        reader.readAsText(file, "UTF-8");
        return;
      }
      if (/\.pdf$/i.test(name)) {
        reject(new Error("PDF: экспортируй страницу в PNG/JPG или скопируй текст. OCR — для изображений и TXT."));
        return;
      }
      var url2 = URL.createObjectURL(file);
      var img2 = new Image();
      img2.onload = function () {
        var c2 = document.createElement("canvas");
        c2.width = Math.min(1280, img2.width);
        c2.height = Math.round(img2.height * (c2.width / img2.width));
        c2.getContext("2d").drawImage(img2, 0, 0, c2.width, c2.height);
        URL.revokeObjectURL(url2);
        resolve({ canvas: c2, name: file.name, kind: "image" });
      };
      img2.onerror = function () {
        URL.revokeObjectURL(url2);
        reject(new Error("Формат не поддержан. Загрузи PNG/JPG/TXT/MD."));
      };
      img2.src = url2;
    });
  }

  function analyzeFrame(video, canvas, outEl) {
    var ctx = canvas.getContext("2d", { willReadFrequently: true });
    var w = canvas.width, h = canvas.height;
    ctx.drawImage(video, 0, 0, w, h);
    var img = ctx.getImageData(0, 0, w, h);
    var gray = toGray(img.data, w, h);
    var motion = motionScore(prevGray, gray);
    prevGray = gray;
    var edges = edgeDensity(gray, w, h);
    var stats = {
      motion: Math.round(motion * 1000) / 1000,
      edges: Math.round(edges * 1000) / 1000,
      fps: lastStats && lastStats._t ? Math.round(1000 / Math.max(1, Date.now() - lastStats._t)) : 0,
      _t: Date.now()
    };
    lastStats = stats;
    ctx.fillStyle = "rgba(10,10,12,0.55)";
    ctx.fillRect(0, h - 48, w, 48);
    ctx.fillStyle = "#f4f4f5";
    ctx.font = "11px system-ui";
    ctx.fillText("motion " + (stats.motion * 100).toFixed(0) + "% · edges " + (stats.edges * 100).toFixed(0) + "% · " + stats.fps + " fps", 8, h - 28);
    ctx.fillStyle = "#a78bfa";
    ctx.fillText("АКСИ Vision · OCR готов", 8, h - 12);
    if (outEl && !outEl._ocrBusy) {
      outEl.textContent =
        "Камера · motion " + (stats.motion * 100).toFixed(0) + "% · edges " + (stats.edges * 100).toFixed(0) + "%\n" +
        "«OCR кадра» — прочитать текст. Или загрузи файл (PNG/JPG/TXT).";
    }
    return stats;
  }

  function start(video, canvas, outEl) {
    if (running) return Promise.resolve();
    return navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false
    }).then(function (s) {
      stream = s;
      video.srcObject = s;
      return video.play();
    }).then(function () {
      running = true;
      canvas.width = 320;
      canvas.height = 240;
      appendVisionEvent("vision_start", { w: 320, h: 240 });
      var loop = function () {
        if (!running) return;
        try { analyzeFrame(video, canvas, outEl); } catch (e) {}
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    });
  }

  function stop(video) {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    prevGray = null;
    if (stream) {
      stream.getTracks().forEach(function (t) { t.stop(); });
      stream = null;
    }
    if (video) video.srcObject = null;
    appendVisionEvent("vision_stop", {});
  }

  var CSS = [
    ".vis{font:14px/1.45 system-ui;color:#f4f4f5;background:#0a0a0c;border:1px solid #2a2a30;border-radius:14px;padding:14px}",
    ".vis h2{margin:0 0 6px;font-size:15px}",
    ".vis .muted{color:#a1a1aa;font-size:12.5px;margin-bottom:10px}",
    ".vis .row{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}",
    ".vis button,.vis label.btn{cursor:pointer;border:1px solid #2a2a30;background:#1a1a1e;color:#f4f4f5;border-radius:10px;padding:10px 14px;font:13px system-ui}",
    ".vis button.primary,.vis label.btn.primary{background:linear-gradient(135deg,#6d28d9,#8b5cf6);border:0;color:#fff}",
    ".vis input[type=file]{display:none}",
    ".vis video,.vis canvas{width:100%;max-width:480px;border-radius:12px;border:1px solid #2a2a30;background:#000;display:block;margin-bottom:8px}",
    ".vis video{display:none}",
    ".vis pre{background:#121214;border:1px solid #2a2a30;border-radius:10px;padding:10px;font-size:12px;white-space:pre-wrap;max-height:220px;overflow:auto}"
  ].join("");

  function mount(target) {
    var root = typeof target === "string" ? document.querySelector(target) : target;
    if (!root) throw new Error("Vision.mount: no target");
    if (!document.getElementById("vis-styles")) {
      var st = document.createElement("style");
      st.id = "vis-styles";
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    root.innerHTML =
      '<div class="vis">' +
      "<h2>Зрение · OCR + CV</h2>" +
      '<p class="muted">Читаю текст с фото, камеры и файлов (PNG/JPG/TXT). rus+eng · Tesseract.js</p>' +
      '<div class="row">' +
      '<button type="button" class="primary" id="vis-start">Камера</button>' +
      '<button type="button" id="vis-stop">Стоп</button>' +
      '<button type="button" id="vis-ocr-cam">OCR кадра</button>' +
      '<label class="btn primary">Файл OCR<input type="file" id="vis-file" accept="image/*,.txt,.md,.csv,.json,text/plain"></label>' +
      '<button type="button" id="vis-to-mem">В память</button>' +
      '<button type="button" id="vis-to-chat">В чат</button>' +
      "</div>" +
      '<video id="vis-video" playsinline muted></video>' +
      '<canvas id="vis-canvas" width="320" height="240"></canvas>' +
      '<pre id="vis-out">Загрузи файл или включи камеру → OCR.</pre>' +
      "</div>";

    var video = root.querySelector("#vis-video");
    var canvas = root.querySelector("#vis-canvas");
    var out = root.querySelector("#vis-out");

    function setOut(t) { out._ocrBusy = false; out.textContent = t; }

    root.querySelector("#vis-start").onclick = function () {
      setOut("Запрос камеры…");
      start(video, canvas, out).then(function () {
        setOut("Камера активна. Нажми «OCR кадра» чтобы прочитать текст.");
      }).catch(function (err) {
        setOut("Нет доступа к камере: " + (err && err.message || err));
      });
    };
    root.querySelector("#vis-stop").onclick = function () {
      stop(video);
      setOut("Камера остановлена");
    };
    root.querySelector("#vis-ocr-cam").onclick = function () {
      if (!running) { setOut("Сначала включи камеру"); return; }
      out._ocrBusy = true;
      out.textContent = "OCR кадра… (первый раз скачает языковые данные)";
      ocrImage(canvas, "rus+eng", function (p) { out.textContent = "OCR: " + p; }).then(function (text) {
        if (!text) setOut("Текст не найден. Поднеси документ ближе / лучше свет.");
        else setOut("——— OCR ———\n" + text);
      }).catch(function (err) {
        setOut("OCR ошибка: " + (err && err.message || err));
      });
    };
    root.querySelector("#vis-file").onchange = function (ev) {
      var f = ev.target.files && ev.target.files[0];
      if (!f) return;
      out._ocrBusy = true;
      out.textContent = "Чтение «" + f.name + "»…";
      readFileAsImage(f).then(function (res) {
        if (res.kind === "text") {
          lastOcrText = res.text;
          appendVisionEvent("vision_file_text", { name: res.name, chars: res.text.length });
          setOut("——— " + res.name + " ———\n" + res.text.slice(0, 4000));
          return;
        }
        var ctx = canvas.getContext("2d");
        canvas.width = res.canvas.width;
        canvas.height = res.canvas.height;
        ctx.drawImage(res.canvas, 0, 0);
        out.textContent = "OCR «" + res.name + "»…";
        return ocrImage(res.canvas, "rus+eng", function (p) { out.textContent = "OCR: " + p; }).then(function (text) {
          if (!text) setOut("Текст не распознан в «" + res.name + "»");
          else setOut("——— " + res.name + " ———\n" + text);
        });
      }).catch(function (err) {
        setOut(String(err && err.message || err));
      });
      ev.target.value = "";
    };
    root.querySelector("#vis-to-mem").onclick = function () {
      if (!lastOcrText) { setOut("Сначала распознай текст (файл или OCR кадра)"); return; }
      var ok = pushToAgentMemory(lastOcrText, "ocr");
      setOut((ok ? "✓ В память агента (" + lastOcrText.length + " симв.)\n\n" : "Не удалось\n\n") + lastOcrText.slice(0, 800));
    };
    root.querySelector("#vis-to-chat").onclick = function () {
      if (!lastOcrText) { setOut("Сначала распознай текст"); return; }
      var q = "прочитай и кратко перескажи:\n" + lastOcrText.slice(0, 1200);
      if (typeof global.AKSI_CHAT === "function") global.AKSI_CHAT(q);
      else if (document.getElementById("inp")) {
        document.getElementById("inp").value = q;
        var send = document.getElementById("send");
        if (send) send.click();
      }
      setOut("Отправлено в чат:\n" + lastOcrText.slice(0, 400));
    };

    return { start: start, stop: stop, ocrImage: ocrImage, lastText: function () { return lastOcrText; } };
  }

  global.AKSI_VISION = {
    mount: mount,
    start: start,
    stop: stop,
    ocrImage: ocrImage,
    version: "1.1.0"
  };
})(typeof window !== "undefined" ? window : this);
