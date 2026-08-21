/**
 * aksi-engine.js — клиентские алгоритмы из server (EQS, QCLI, net)
 * Без личных данных. Работает в браузере.
 */
(function (g) {
  "use strict";
  if (g.AksiEngine) return;

  function shannonH(text) {
    var freq = {}, i, ch, total = text.length || 1, H = 0, p;
    for (i = 0; i < text.length; i++) {
      ch = text[i];
      freq[ch] = (freq[ch] || 0) + 1;
    }
    for (ch in freq) {
      p = freq[ch] / total;
      if (p > 0) H -= p * Math.log(p) / Math.LN2;
    }
    return Math.round(H * 10000) / 10000;
  }

  function computeQCLI(message) {
    var H = shannonH(message);
    var uniq = {};
    for (var i = 0; i < message.length; i++) uniq[message[i]] = 1;
    var maxH = Math.log(Math.max(1, Object.keys(uniq).length)) / Math.LN2;
    return maxH > 0 ? Math.min(1, Math.round((H / maxH) * 10000) / 10000) : 0;
  }

  function computeHeff(message) {
    var words = message.split(/\s+/).filter(Boolean);
    var uniq = {};
    words.forEach(function (w) { uniq[w] = 1; });
    var ratio = words.length ? Object.keys(uniq).length / words.length : 0;
    return Math.round(shannonH(message) * ratio * 1000) / 1000;
  }

  function quantumFingerprint(text) {
    var h = 0xdeadbeef;
    for (var i = 0; i < text.length; i++) h = (Math.imul(31, h) + text.charCodeAt(i)) | 0;
    return (h >>> 0).toString(16).toUpperCase().padStart(8, "0");
  }

  function quantumLevel(qcli) {
    if (qcli >= 0.9) return "высокий";
    if (qcli >= 0.7) return "средний+";
    if (qcli >= 0.5) return "средний";
    return "базовый";
  }

  function computeQuantumMetrics(text) {
    var H = shannonH(text);
    var qcli = computeQCLI(text);
    var heff = computeHeff(text);
    return { H: H, qcli: qcli, heff: heff, fingerprint: quantumFingerprint(text), level: quantumLevel(qcli) };
  }

  var EQS_W = { h_avg: 0.3, reliability: 0.35, coherence: 0.25, age_factor: 0.1 };
  function computeEQS(c) {
    var raw =
      EQS_W.h_avg * Math.min(1, c.h_avg / 5) * 100 +
      EQS_W.reliability * c.reliability * 100 +
      EQS_W.coherence * c.coherence * 100 +
      EQS_W.age_factor * c.age_factor * 100;
    return Math.round(raw * 100) / 100;
  }
  function getBadge(eqs) {
    if (eqs >= 95) return "высокая";
    if (eqs >= 75) return "хорошая";
    if (eqs >= 55) return "средняя";
    return "начальная";
  }

  var repKey = "aksi_eqs_v1";
  function loadRep() {
    try { return JSON.parse(localStorage.getItem(repKey) || "{}"); } catch (e) { return {}; }
  }
  function saveRep(s) {
    try { localStorage.setItem(repKey, JSON.stringify(s)); } catch (e) {}
  }
  function recordMessage(did, name, content) {
    var store = loadRep();
    if (!store[did]) {
      store[did] = {
        did: did, name: name, eqs: 50,
        components: { h_avg: 2.5, reliability: 0.5, coherence: 0.5, age_factor: 0.5 },
        messageHistory: [], createdAt: new Date().toISOString(), isVerified: false
      };
    }
    var rec = store[did];
    var h = shannonH(content);
    rec.messageHistory.push(quantumFingerprint(content));
    if (rec.messageHistory.length > 20) rec.messageHistory.shift();
    var n = rec.messageHistory.length;
    rec.components.h_avg = Math.round(((rec.components.h_avg * (n - 1) + h) / n) * 10000) / 10000;
    rec.components.reliability = Math.min(1, rec.components.reliability + 0.001);
    var words = content.split(/\s+/).filter(Boolean);
    var ur = words.length ? (new Set(words).size / words.length) : 0.5;
    rec.components.coherence = Math.round((rec.components.coherence * 0.9 + ur * 0.1) * 10000) / 10000;
    rec.eqs = computeEQS(rec.components);
    rec.badge = getBadge(rec.eqs);
    rec.updatedAt = new Date().toISOString();
    saveRep(store);
    return rec;
  }
  function leaderboard() {
    var store = loadRep();
    return Object.keys(store).map(function (k) { return store[k]; }).sort(function (a, b) { return b.eqs - a.eqs; });
  }

  var AKSI_DID = "did:aksi:local:browser";
  var protoKey = "aksi_proto_v1";
  function loadProto() {
    try { return JSON.parse(localStorage.getItem(protoKey) || '{"agents":{},"messages":[]}'); }
    catch (e) { return { agents: {}, messages: [] }; }
  }
  function saveProto(p) {
    try { localStorage.setItem(protoKey, JSON.stringify(p)); } catch (e) {}
  }
  function ensureAksi() {
    var p = loadProto();
    if (!p.agents[AKSI_DID]) {
      p.agents[AKSI_DID] = {
        name: "АКСИ",
        joinedAt: new Date().toISOString(),
        messageCount: 0,
        reputationScore: 90,
        lastSeen: new Date().toISOString(),
        capabilities: ["chat", "quantum_demo", "wiki", "memory", "metrics"]
      };
      saveProto(p);
    }
    return p;
  }
  function createAgentMessage(to, type, content) {
    var p = ensureAksi();
    var now = new Date().toISOString();
    var id = quantumFingerprint(content + now).slice(0, 16);
    var msg = {
      id: id, from: AKSI_DID, to: to || "broadcast", type: type || "response",
      content: content,
      metadata: {
        timestamp: now, mode: "aksi", language: "ru",
        qcli: computeQCLI(content),
        fingerprint: quantumFingerprint(content + now).slice(0, 8)
      }
    };
    p.messages.push(msg);
    if (p.messages.length > 100) p.messages = p.messages.slice(-100);
    if (p.agents[AKSI_DID]) {
      p.agents[AKSI_DID].messageCount++;
      p.agents[AKSI_DID].lastSeen = now;
    }
    saveProto(p);
    recordMessage(AKSI_DID, "АКСИ", content);
    return msg;
  }
  function getProtocolStatus() {
    var p = ensureAksi();
    return {
      protocol: "AKSI-Agent-v1",
      version: "2026.local",
      aksiDid: AKSI_DID,
      registeredAgents: Object.keys(p.agents).length,
      totalMessages: p.messages.length,
      agents: Object.keys(p.agents).map(function (did) {
        var a = p.agents[did];
        return { did: did, name: a.name, reputationScore: a.reputationScore, messageCount: a.messageCount, capabilities: a.capabilities };
      }),
      recentMessages: p.messages.slice(-5).reverse()
    };
  }

  function getWeather(city) {
    city = city || "Moscow";
    return fetch("https://wttr.in/" + encodeURIComponent(city) + "?format=j1", {
      headers: { "Accept": "application/json" }
    }).then(function (r) { return r.json(); }).then(function (data) {
      var cur = data.current_condition && data.current_condition[0];
      return {
        city: city,
        temp_c: parseInt(cur && cur.temp_C || "0", 10),
        condition: (cur && cur.weatherDesc && cur.weatherDesc[0] && cur.weatherDesc[0].value) || "—",
        humidity: parseInt(cur && cur.humidity || "0", 10),
        wind_kph: parseInt(cur && cur.windspeedKmph || "0", 10),
        feelslike_c: parseInt(cur && cur.FeelsLikeC || "0", 10)
      };
    }).catch(function () {
      return { city: city, temp_c: null, condition: "недоступно", humidity: 0, wind_kph: 0, feelslike_c: 0 };
    });
  }

  function wikiSummary(topic) {
    var slug = encodeURIComponent(topic.replace(/ /g, "_"));
    return fetch("https://ru.wikipedia.org/api/rest_v1/page/summary/" + slug)
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (d) {
        return { title: d.title, extract: d.extract || "", url: (d.content_urls && d.content_urls.desktop && d.content_urls.desktop.page) || "" };
      }).catch(function () {
        return { title: topic, extract: "", url: "" };
      });
  }

  g.AksiEngine = {
    shannonH: shannonH,
    computeQCLI: computeQCLI,
    computeHeff: computeHeff,
    computeQuantumMetrics: computeQuantumMetrics,
    computeEQS: computeEQS,
    recordMessage: recordMessage,
    leaderboard: leaderboard,
    createAgentMessage: createAgentMessage,
    getProtocolStatus: getProtocolStatus,
    getWeather: getWeather,
    wikiSummary: wikiSummary,
    AKSI_DID: AKSI_DID
  };
})(window);
