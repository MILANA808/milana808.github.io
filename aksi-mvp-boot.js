/**
 * AKSI MVP boot — Stats, Swarm, Chats, HRR, SDP, ADIA stats hook
 */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  function refreshChatList() {
    var box = $("chatList"); if (!box || !window.AKSI_CHATS) return;
    AKSI_CHATS.list(false).then(function (list) {
      var active = AKSI_CHATS.getActiveId();
      if (!list.length) { box.textContent = "нет диалогов"; return; }
      box.innerHTML = list.map(function (c) {
        return '<div data-chat="' + c.id + '" style="padding:8px 0;border-bottom:1px solid var(--line);cursor:pointer">' + (c.title || c.id) + (c.id === active ? " · active" : "") + "</div>";
      }).join("");
    });
  }
  function wire() {
    document.addEventListener("click", function (e) {
      var sw = e.target.closest && e.target.closest("[data-swarm]");
      if (sw && window.AKSI_SWARM && AKSI_SWARM.setAgentCount) {
        var n = AKSI_SWARM.setAgentCount(sw.getAttribute("data-swarm"));
        var lab = $("swarmLabel"); if (lab) lab.textContent = "агентов: " + n;
        document.querySelectorAll("[data-swarm]").forEach(function (b) { b.classList.toggle("p", b.getAttribute("data-swarm") === String(n)); });
      }
      var ch = e.target.closest && e.target.closest("[data-chat]");
      if (ch && window.AKSI_CHATS) { AKSI_CHATS.setActiveId(ch.getAttribute("data-chat")); refreshChatList(); }
    }, true);
    document.querySelectorAll(".bnav [data-tab]").forEach(function (b) {
      b.addEventListener("click", function () {
        var t = b.getAttribute("data-tab");
        if (t === "stats") {
          document.querySelectorAll(".stage .panel").forEach(function (p) { p.classList.toggle("on", p.id === "tab-stats"); });
          document.querySelectorAll(".bnav [data-tab]").forEach(function (x) { x.classList.toggle("on", x.getAttribute("data-tab") === "stats"); });
          var c = $("composer"); if (c) c.classList.remove("on");
          if (window.AKSI_STATS) AKSI_STATS.renderInto($("statsBox"));
          refreshChatList();
          try { if (window.AKSI_HRR_WEBGL && $("hrrGlCanvas")) AKSI_HRR_WEBGL.get().render($("hrrGlCanvas")); } catch (err) {}
        }
      });
    });
    $("btnStatsRefresh") && ($("btnStatsRefresh").onclick = function () { if (window.AKSI_STATS) AKSI_STATS.renderInto($("statsBox")); });
    $("hrrRender") && ($("hrrRender").onclick = function () { try { if (window.AKSI_HRR_WEBGL) AKSI_HRR_WEBGL.get().render($("hrrGlCanvas")); } catch (e) { alert(e.message || e); } });
    $("hrrSeedBtn") && ($("hrrSeedBtn").onclick = function () {
      try {
        var h = window.AKSI_HRR_WEBGL && AKSI_HRR_WEBGL.get();
        if (!h) return; h.clear(); ["АКСИ offline runtime", "ADIA decision integrity", "SecureMem AES", "Swarm agents"].forEach(function (t) { h.add(t, 1); });
        h.render($("hrrGlCanvas"));
      } catch (e) {}
    });
    $("chatNew") && ($("chatNew").onclick = async function () { if (!window.AKSI_CHATS) return; await AKSI_CHATS.create("Диалог " + new Date().toLocaleTimeString("ru-RU")); refreshChatList(); });
    $("chatRename") && ($("chatRename").onclick = async function () { if (!window.AKSI_CHATS) return; var id = AKSI_CHATS.getActiveId(); if (!id) return; var t = prompt("Название"); if (t) { await AKSI_CHATS.rename(id, t); refreshChatList(); } });
    $("chatArchive") && ($("chatArchive").onclick = async function () { if (!window.AKSI_CHATS) return; var id = AKSI_CHATS.getActiveId(); if (id) { await AKSI_CHATS.archive(id, true); refreshChatList(); } });
    $("chatDelete") && ($("chatDelete").onclick = async function () { if (!window.AKSI_CHATS) return; var id = AKSI_CHATS.getActiveId(); if (id && confirm("Удалить?")) { await AKSI_CHATS.remove(id); refreshChatList(); } });
    if (window.AKSI_ADIA_ASSESS && AKSI_ADIA_ASSESS.assessResponse && window.AKSI_STATS) {
      var orig = AKSI_ADIA_ASSESS.assessResponse.bind(AKSI_ADIA_ASSESS);
      AKSI_ADIA_ASSESS.assessResponse = async function (text, ctx) { var r = await orig(text, ctx); try { AKSI_STATS.recordAdia(r.score, r.axes); } catch (e) {} return r; };
    }
    var pc = null;
    function sdpLog(m) { var el = $("sdpLog"); if (el) el.textContent = (el.textContent && el.textContent !== "—" ? el.textContent + "\n" : "") + m; }
    $("sdpOffer") && ($("sdpOffer").onclick = async function () {
      try {
        pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
        pc.createDataChannel("aksi");
        pc.onicecandidate = function (e) { if (!e.candidate && $("sdpBox")) $("sdpBox").value = JSON.stringify({ sdp: pc.localDescription }); };
        var offer = await pc.createOffer(); await pc.setLocalDescription(offer); sdpLog("offer создан");
      } catch (e) { sdpLog(String(e.message || e)); }
    });
    $("sdpAnswer") && ($("sdpAnswer").onclick = async function () {
      try {
        if (!pc) pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
        var data = JSON.parse($("sdpBox").value || "{}"); await pc.setRemoteDescription(data.sdp);
        var answer = await pc.createAnswer(); await pc.setLocalDescription(answer);
        pc.onicecandidate = function (e) { if (!e.candidate && $("sdpBox")) $("sdpBox").value = JSON.stringify({ sdp: pc.localDescription }); };
        sdpLog("answer готов");
      } catch (e) { sdpLog(String(e.message || e)); }
    });
    if (window.AKSI_SWARM && AKSI_SWARM.getAgentCount) { var n = AKSI_SWARM.getAgentCount(); var lab = $("swarmLabel"); if (lab) lab.textContent = "агентов: " + n; }
    if (window.AKSI_CHATS) AKSI_CHATS.ensureActive().then(refreshChatList);
    if (window.AKSI_SENTIMENT) AKSI_SENTIMENT.load().catch(function () {});
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(wire, 50); });
  else setTimeout(wire, 50);
})();
