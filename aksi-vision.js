/**
 * AKSI Vision — offline computer vision (webcam + canvas)
 * Motion · edges · color · skin-blobs · snapshot → ledger hash
 * Optional online: COCO-SSD via TensorFlow.js CDN (cached after first load)
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

  function toGray(data, w, h) {
    var g = new Uint8Array(w * h), i, j = 0;
    for (i = 0; i < data.length; i += 4) {
      g[j++] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) | 0;
    }
    return g;
  }

  function motionScore(prev, curr, w, h) {
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
        g = gx < 0 ? -gx : gx;
        if (gy < 0) gy = -gy;
        g += gy;
        if (g > 120) count++;
      }
    }
    return Math.min(1, count / (w * h) * 12);
  }

  function colorStats(data) {
    var r = 0, g = 0, b = 0, n = data.length / 4, i;
    for (i = 0; i < data.length; i += 4) {
      r += data[i]; g += data[i + 1]; b += data[i + 2];
    }
    return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
  }

  function skinBlobs(data, w, h) {
    var mask = new Uint8Array(w * h), i, x, y, j = 0, R, G, B, max, min;
    for (i = 0; i < data.length; i += 4) {
      R = data[i]; G = data[i + 1]; B = data[i + 2];
      max = R > G ? (R > B ? R : B) : (G > B ? G : B);
      min = R < G ? (R < B ? R : B) : (G < B ? G : B);
      if (R > 95 && G > 40 && B > 20 && R > G && R > B && (max - min) > 15 && Math.abs(R - G) > 15) {
        mask[j] = 1;
      }
      j++;
    }
    var visited = new Uint8Array(w * h), blobs = 0, stack, sx, sy, nx, ny, idx, nidx;
    for (y = 0; y < h; y += 2) {
      for (x = 0; x < w; x += 2) {
        idx = y * w + x;
        if (!mask[idx] || visited[idx]) continue;
        blobs++;
        stack = [idx];
        visited[idx] = 1;
        var area = 0;
        while (stack.length) {
          nidx = stack.pop();
          area++;
          sy = (nidx / w) | 0; sx = nidx % w;
          [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(function (d) {
            nx = sx + d[0]; ny = sy + d[1];
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
            var ii = ny * w + nx;
            if (mask[ii] && !visited[ii]) { visited[ii] = 1; stack.push(ii); }
          });
        }
        if (area < 40) blobs--;
      }
    }
    return Math.max(0, blobs);
  }

  function drawOverlay(ctx, w, h, stats) {
    ctx.fillStyle = "rgba(10,10,12,0.55)";
    ctx.fillRect(0, h - 72, w, 72);
    ctx.fillStyle = "#f4f4f5";
    ctx.font = "12px system-ui";
    ctx.fillText(
      "motion " + (stats.motion * 100).toFixed(0) + "% · edges " + (stats.edges * 100).toFixed(0) +
      "% · skin≈" + stats.skin + " · RGB " + stats.color.r + "," + stats.color.g + "," + stats.color.b,
      10, h - 48
    );
    ctx.fillStyle = "#a78bfa";
    ctx.fillText("АКСИ Vision · offline CV · " + stats.fps + " fps", 10, h - 28);
    ctx.fillStyle = "#2a2a30";
    ctx.fillRect(10, h - 16, w - 20, 6);
    ctx.fillStyle = stats.motion > 0.35 ? "#f87171" : "#34d399";
    ctx.fillRect(10, h - 16, (w - 20) * stats.motion, 6);
  }

  function analyzeFrame(video, canvas, outEl) {
    var ctx = canvas.getContext("2d", { willReadFrequently: true });
    var w = canvas.width, h = canvas.height;
    ctx.drawImage(video, 0, 0, w, h);
    var img = ctx.getImageData(0, 0, w, h);
    var gray = toGray(img.data, w, h);
    var motion = motionScore(prevGray, gray, w, h);
    prevGray = gray;
    var edges = edgeDensity(gray, w, h);
    var color = colorStats(img.data);
    var skin = skinBlobs(img.data, w, h);
    var stats = {
      motion: Math.round(motion * 1000) / 1000,
      edges: Math.round(edges * 1000) / 1000,
      color: color,
      skin: skin,
      fps: lastStats && lastStats._t ? Math.round(1000 / Math.max(1, Date.now() - lastStats._t)) : 0,
      _t: Date.now()
    };
    lastStats = stats;
    drawOverlay(ctx, w, h, stats);
    if (outEl) {
      outEl.textContent =
        "motion: " + (stats.motion * 100).toFixed(1) + "%\n" +
        "edges:  " + (stats.edges * 100).toFixed(1) + "%\n" +
        "skin blobs≈ " + stats.skin + "\n" +
        "avg RGB: " + color.r + ", " + color.g + ", " + color.b + "\n" +
        "fps: " + stats.fps;
    }
    return stats;
  }

  function start(video, canvas, outEl) {
    if (running) return Promise.resolve();
    return navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
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

  function snapshot(canvas) {
    if (!canvas) return null;
    var dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    var hash = simpleHash(dataUrl.slice(0, 2000));
    var stats = lastStats || {};
    appendVisionEvent("vision_snap", {
      hash: hash, motion: stats.motion, edges: stats.edges, skin: stats.skin
    });
    return { dataUrl: dataUrl, hash: hash, stats: stats };
  }

  function loadCocoSsd() {
    return new Promise(function (resolve, reject) {
      if (global.cocoSsd) return resolve(global.cocoSsd);
      var s1 = document.createElement("script");
      s1.src = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js";
      s1.onload = function () {
        var s2 = document.createElement("script");
        s2.src = "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js";
        s2.onload = function () { resolve(global.cocoSsd); };
        s2.onerror = reject;
        document.head.appendChild(s2);
      };
      s1.onerror = reject;
      document.head.appendChild(s1);
    });
  }

  var cocoModel = null;
  function detectObjects(canvas) {
    return loadCocoSsd().then(function (coco) {
      if (!cocoModel) return coco.load({ base: "lite_mobilenet_v2" }).then(function (m) { cocoModel = m; return m; });
      return cocoModel;
    }).then(function (model) {
      return model.detect(canvas);
    }).then(function (preds) {
      appendVisionEvent("vision_coco", {
        n: preds.length,
        labels: preds.slice(0, 8).map(function (p) { return p.class + ":" + p.score.toFixed(2); })
      });
      return preds;
    });
  }

  var CSS = [
    ".vis{font:14px/1.45 system-ui;color:#f4f4f5;background:#0a0a0c;border:1px solid #2a2a30;border-radius:14px;padding:14px}",
    ".vis h2{margin:0 0 6px;font-size:15px}",
    ".vis .muted{color:#a1a1aa;font-size:12.5px;margin-bottom:10px}",
    ".vis .row{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px}",
    ".vis button{cursor:pointer;border:1px solid #2a2a30;background:#1a1a1e;color:#f4f4f5;border-radius:10px;padding:10px 14px;font:13px system-ui}",
    ".vis button.primary{background:linear-gradient(135deg,#6d28d9,#8b5cf6);border:0;color:#fff}",
    ".vis video,.vis canvas{width:100%;max-width:480px;border-radius:12px;border:1px solid #2a2a30;background:#000;display:block;margin-bottom:8px}",
    ".vis video{display:none}",
    ".vis pre{background:#121214;border:1px solid #2a2a30;border-radius:10px;padding:10px;font-size:12px;white-space:pre-wrap;max-height:160px;overflow:auto}",
    ".vis img.snap{max-width:100%;border-radius:10px;border:1px solid #2a2a30;margin-top:8px}"
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
      "<h2>Зрение · Computer Vision</h2>" +
      '<p class="muted">Камера локально. Motion · edges · skin-blobs · snapshot→ledger. COCO-SSD — опционально (CDN).</p>' +
      '<div class="row">' +
      '<button type="button" class="primary" id="vis-start">Камера</button>' +
      '<button type="button" id="vis-stop">Стоп</button>' +
      '<button type="button" id="vis-snap">Снимок</button>' +
      '<button type="button" id="vis-coco">COCO-SSD (online)</button>' +
      "</div>" +
      '<video id="vis-video" playsinline muted></video>' +
      '<canvas id="vis-canvas" width="320" height="240"></canvas>' +
      '<pre id="vis-out">Нажми «Камера» и разреши доступ.</pre>' +
      '<div id="vis-snap-box"></div>' +
      "</div>";

    var video = root.querySelector("#vis-video");
    var canvas = root.querySelector("#vis-canvas");
    var out = root.querySelector("#vis-out");

    root.querySelector("#vis-start").onclick = function () {
      out.textContent = "Запрос камеры…";
      start(video, canvas, out).then(function () {
        out.textContent = "Камера активна · offline CV";
      }).catch(function (err) {
        out.textContent = "Нет доступа к камере: " + (err && err.message || err);
      });
    };
    root.querySelector("#vis-stop").onclick = function () {
      stop(video);
      out.textContent = "Остановлено";
    };
    root.querySelector("#vis-snap").onclick = function () {
      var snap = snapshot(canvas);
      if (!snap) { out.textContent = "Сначала включи камеру"; return; }
      var box = root.querySelector("#vis-snap-box");
      box.innerHTML = '<img class="snap" alt="snap" src="' + snap.dataUrl + '">' +
        '<pre>hash ' + snap.hash + " · motion " + ((snap.stats.motion || 0) * 100).toFixed(0) + "%</pre>";
      out.textContent = "Снимок в ledger · hash " + snap.hash;
    };
    root.querySelector("#vis-coco").onclick = function () {
      out.textContent = "Загрузка COCO-SSD (первый раз нужен интернет)…";
      detectObjects(canvas).then(function (preds) {
        if (!preds.length) {
          out.textContent = "Объекты не найдены (нужна активная камера + сцена)";
          return;
        }
        out.textContent = preds.map(function (p) {
          return p.class + " " + (p.score * 100).toFixed(0) + "%";
        }).join("\n");
        var ctx = canvas.getContext("2d");
        preds.forEach(function (p) {
          var b = p.bbox;
          ctx.strokeStyle = "#34d399";
          ctx.lineWidth = 2;
          ctx.strokeRect(b[0], b[1], b[2], b[3]);
          ctx.fillStyle = "#34d399";
          ctx.font = "11px system-ui";
          ctx.fillText(p.class, b[0] + 4, b[1] + 14);
        });
      }).catch(function (err) {
        out.textContent = "COCO недоступен: " + (err && err.message || err) + "\nOffline CV работает без него.";
      });
    };

    return { start: start, stop: stop, snapshot: snapshot };
  }

  global.AKSI_VISION = {
    mount: mount,
    start: start,
    stop: stop,
    snapshot: snapshot,
    detectObjects: detectObjects,
    version: "1.0.0"
  };
})(typeof window !== "undefined" ? window : this);
