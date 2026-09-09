/**
 * AKSI Ready — health + integration check for real deployment
 * window.AKSI_READY.check()
 * © AKSI · aksilove@internet.ru
 */
(function (G) {
  "use strict";
  var VER = "1.0.0-ready";

  function ok(name, pass, detail) {
    return { name: name, ok: !!pass, detail: detail || null };
  }

  async function check() {
    var tests = [];
    var t0 = Date.now();

    tests.push(ok("crypto.subtle", !!(G.crypto && G.crypto.subtle)));
    tests.push(ok("indexedDB", !!G.indexedDB));
    tests.push(ok("AKSI API", !!(G.AKSI && typeof G.AKSI.decide === "function")));
    tests.push(ok("Organism", !!(G.AKSI_ORGANISM && G.AKSI_ORGANISM.think)));
    tests.push(ok("Pi Contour", !!(G.AKSI_PI_CONTOUR && G.AKSI_PI_CONTOUR.process)));
    tests.push(ok("Pi Crypto", !!(G.PiFractalCrypto || (G.AKSI_PI_CRYPTO && G.AKSI_PI_CRYPTO.PiFractalCrypto))));
    tests.push(ok("Vault", !!(G.AKSI_VAULT && G.AKSI_VAULT.learn)));
    tests.push(ok("Decision", !!(G.AKSI_DECISION && G.AKSI_DECISION.decide), "optional"));
    tests.push(ok("Neuro", !!(G.AKSI_NEURO && G.AKSI_NEURO.think), "optional"));
    tests.push(ok("Zero", !!(G.AKSI_ZERO && G.AKSI_ZERO.think), "optional"));
    tests.push(ok("WebLLM loader", !!G.AKSI_WEBLLM, "optional"));

    var smoke = { decide: false, pi: false, learn: false };
    try {
      if (G.AKSI_PI_CONTOUR && G.AKSI_PI_CONTOUR.process) {
        var pr = await G.AKSI_PI_CONTOUR.process("π");
        smoke.pi = !!(pr && pr.answer && pr.seal && pr.seal.kind === "pi-contour");
      }
    } catch (e) {
      smoke.piError = String(e.message || e);
    }
    try {
      if (G.AKSI && G.AKSI.decide) {
        var d = await G.AKSI.decide("кто ты");
        smoke.decide = !!(d && (d.answer || d.text));
      } else if (G.AKSI_ORGANISM && G.AKSI_ORGANISM.decide) {
        var d2 = await G.AKSI_ORGANISM.decide("кто ты");
        smoke.decide = !!(d2 && d2.answer);
      }
    } catch (e) {
      smoke.decideError = String(e.message || e);
    }
    try {
      if (G.AKSI && G.AKSI.learn) {
        var lr = await G.AKSI.learn("запомни: ready-check " + Date.now());
        smoke.learn = !!(lr && lr.ok !== false);
      }
    } catch (e) {
      smoke.learnError = String(e.message || e);
    }

    tests.push(ok("smoke.pi", smoke.pi));
    tests.push(ok("smoke.decide", smoke.decide));
    tests.push(ok("smoke.learn", smoke.learn, smoke.learn ? null : "optional if no vault"));

    var required = tests.filter(function (t) {
      return t.detail !== "optional" && t.name.indexOf("smoke.learn") === -1;
    });
    var passed = required.filter(function (t) { return t.ok; }).length;
    var ready = required.every(function (t) { return t.ok; });

    return {
      version: VER,
      ready: ready,
      score: Math.round((passed / Math.max(1, required.length)) * 100),
      ms: Date.now() - t0,
      tests: tests,
      smoke: smoke,
      embed: {
        decide: "await AKSI.decide('вопрос')",
        think: "await AKSI.think('вопрос')",
        learn: "await AKSI.learn('запомни: факт')",
        pi: "await AKSI_PI_CONTOUR.process('π')",
        ready: "await AKSI_READY.check()"
      },
      contact: "aksilove@internet.ru",
      product: "https://milana808.github.io/contour/",
      deploy: "https://milana808.github.io/deploy/"
    };
  }

  function banner() {
    return check().then(function (r) {
      try {
        console.log(
          "%cАКСИ READY " + (r.ready ? "OK" : "PARTIAL") + " · " + r.score + "%",
          "color:" + (r.ready ? "#2f6b48" : "#8b3a2f") + ";font-weight:bold"
        );
        console.log(r);
      } catch (e) {}
      return r;
    });
  }

  G.AKSI_READY = {
    version: VER,
    check: check,
    banner: banner
  };

  if (G.document) {
    setTimeout(function () {
      if (G.location && /contour|deploy/i.test(G.location.pathname || "")) {
        banner();
      }
    }, 1500);
  }
})(typeof window !== "undefined" ? window : globalThis);
