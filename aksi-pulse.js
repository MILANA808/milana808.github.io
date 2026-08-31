/**
 * AKSI Pulse — живой пульс системы + Sovereign Brief
 * Контакт: aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.0";
  function has(name) { try { return !!(G[name]); } catch (e) { return false; } }
  function moduleMap() {
    return [
      { id: "compose", label: "Composer", key: "AKSI_COMPOSE", role: "RU generation" },
      { id: "neuro", label: "Neuro", key: "AKSI_NEURO", role: "offline SEED+resonance" },
      { id: "adia", label: "ADIA assess", key: "AKSI_ADIA_ASSESS", role: "5-axis >=70%" },
      { id: "algo", label: "Metrics", key: "AKSI_ALGORITHM", role: "EQS / QCLI / H" },
      { id: "swarm", label: "Swarm", key: "AKSI_SWARM", role: "1-3 agents rank" },
      { id: "secure", label: "SecureMem", key: "AKSI_SECURE_MEM", role: "IDB + AES-GCM" },
      { id: "hrr", label: "HRR", key: "AKSI_HRR", role: "holographic memory" },
      { id: "hrrgl", label: "HRR viz", key: "AKSI_HRR_WEBGL", role: "256 hologram" },
      { id: "pq", label: "Trust PQ", key: "AKSI_PQ", role: "ECDSA + ML-KEM?" },
      { id: "self", label: "Self-arch", key: "AKSI_SELF_ARCH", role: "architecture QA" },
      { id: "sent", label: "Sentiment", key: "AKSI_SENTIMENT", role: "DistilBERT|heuristic" },
      { id: "chats", label: "Multi-chat", key: "AKSI_CHATS", role: "IDB dialogs" },
      { id: "stats", label: "Stats", key: "AKSI_STATS", role: "ADIA timeline" },
      { id: "skills", label: "Skills", key: "AKSI_SKILLS", role: "teach to skill" },
      { id: "pulse", label: "Pulse", key: "AKSI_PULSE", role: "this module" },
      { id: "quantum", label: "Quantum", key: "AKSI_QUANTUM", role: "lab signals" }
    ];
  }
  function snapshot() {
    var mods = moduleMap().map(function (m) { return { id: m.id, label: m.label, role: m.role, on: has(m.key) }; });
    var on = mods.filter(function (m) { return m.on; }).length;
    var total = mods.length;
    var ratio = total ? on / total : 0;
    var memN = 0; try { memN = Number(sessionStorage.getItem("aksi_mem_n") || 0); } catch (e) {}
    var swarmN = 3; try { if (G.AKSI_SWARM && G.AKSI_SWARM.getAgentCount) swarmN = G.AKSI_SWARM.getAgentCount(); } catch (e) {}
    var sent = null; try { if (G.AKSI_SENTIMENT) sent = G.AKSI_SENTIMENT.status(); } catch (e) {}
    var stats = null; try { if (G.AKSI_STATS) stats = G.AKSI_STATS.snapshot(); } catch (e) {}
    var offline = typeof navigator !== "undefined" ? !navigator.onLine : true;
    var integrity = Math.round(ratio * 55 + (memN > 0 ? 10 : 0) + (sent && sent.status === "ready" ? 12 : sent && sent.status === "fallback" ? 6 : 4) + (swarmN >= 2 ? 8 : 4) + (offline ? 8 : 5) + (has("AKSI_SECURE_MEM") ? 7 : 0));
    integrity = Math.max(0, Math.min(100, integrity));
    return { ver: VER, ts: Date.now(), modules: mods, on: on, total: total, ratio: ratio, memoryItems: memN, swarmAgents: swarmN, sentiment: sent, stats: stats, offline: offline, integrity: integrity, contact: "aksilove@internet.ru" };
  }
  function brief() {
    var s = snapshot();
    var lines = [];
    lines.push("=== AKSI SOVEREIGN BRIEF ===");
    lines.push("Generated: " + new Date(s.ts).toISOString());
    lines.push("Contact: " + s.contact);
    lines.push("");
    lines.push("Integrity pulse: " + s.integrity + " / 100 (engineering signal)");
    lines.push("Modules online: " + s.on + " / " + s.total);
    lines.push("Offline mode: " + (s.offline ? "YES" : "network available"));
    lines.push("Swarm agents: " + s.swarmAgents);
    lines.push("Memory items: " + s.memoryItems);
    if (s.sentiment) lines.push("Classifier: " + (s.sentiment.status || "?") + (s.sentiment.error ? " · " + s.sentiment.error : ""));
    if (s.stats) { lines.push("Queries recorded: " + (s.stats.queries || 0)); if (s.stats.avgAdia != null) lines.push("Avg ADIA: " + s.stats.avgAdia); }
    lines.push(""); lines.push("Module map:");
    s.modules.forEach(function (m) { lines.push("  " + (m.on ? "*" : "o") + " " + m.label + " — " + m.role); });
    lines.push("");
    lines.push("Principles: offline-first · measurable ADIA · no forced cloud · proprietary IP");
    lines.push("Live: https://milana808.github.io");
    lines.push("=== END BRIEF ===");
    return lines.join("\n");
  }
  function answer(q) {
    q = String(q || "").toLowerCase();
    if (/brief|бриф|sovereign|сводк|отчёт|отчет|пульс|pulse|здоров|health|integrity pulse|контур систем/i.test(q)) {
      return { text: brief(), source: "pulse", score: 0.95 };
    }
    if (/модул.*(включ|статус|карт)|module map|что загружено/i.test(q)) {
      var s = snapshot();
      var list = s.modules.map(function (m) { return (m.on ? "*" : "o") + " " + m.label + " — " + m.role; }).join("\n");
      return { text: "Карта модулей АКСИ (" + s.on + "/" + s.total + "):\n\n" + list + "\n\nIntegrity pulse: " + s.integrity + "/100\nКонтакт: aksilove@internet.ru", source: "pulse", score: 0.9 };
    }
    return null;
  }
  function renderInto(el) {
    if (!el) return;
    var s = snapshot();
    var html = "";
    html += '<div class="kv" style="margin-bottom:12px">';
    html += '<div class="cell"><b>' + s.integrity + '</b><span>pulse</span></div>';
    html += '<div class="cell"><b>' + s.on + '/' + s.total + '</b><span>модули</span></div>';
    html += '<div class="cell"><b>' + s.swarmAgents + '</b><span>рой</span></div>';
    html += '<div class="cell"><b>' + (s.offline ? 'OFF' : 'NET') + '</b><span>сеть</span></div>';
    html += '</div><div style="display:flex;flex-wrap:wrap;gap:6px;margin:10px 0">';
    s.modules.forEach(function (m) {
      html += '<span style="padding:6px 10px;border-radius:999px;font-size:11px;font-weight:700;border:1px solid var(--line);background:' + (m.on ? '#e8f2ea' : 'var(--s2)') + ';color:' + (m.on ? 'var(--ok)' : 'var(--muted)') + '">' + (m.on ? '* ' : 'o ') + m.label + '</span>';
    });
    html += '</div>';
    el.innerHTML = html;
  }
  G.AKSI_PULSE = { ver: VER, snapshot: snapshot, brief: brief, answer: answer, renderInto: renderInto, moduleMap: moduleMap };
})(typeof window !== "undefined" ? window : globalThis);
