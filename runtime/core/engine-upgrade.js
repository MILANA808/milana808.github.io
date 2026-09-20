/**
 * AKSI Runtime upgrade — human-serving layer on any engine ≥1.0
 * - exportSession / listSessions
 * - after startGoal: ground claims to FACT ids, attach hypotheses, enrich report
 * Principle: technology_serves_human
 */
(function (G) {
  'use strict';
  var R = G.AKSI_RUNTIME;
  if (!R) return;

  R.PRINCIPLE = R.PRINCIPLE || 'technology_serves_human';
  R.VERSION_UI = '1.2.0-human';

  function tok(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
      .split(/\s+/)
      .filter(function (w) {
        return w.length > 1;
      });
  }

  function groundSession(session) {
    if (!session || !session.claims) return session;
    session.hypotheses = session.hypotheses || [];
    var facts = (session.evidence || []).filter(function (e) {
      return e.kind === 'FACT' || e.kind === 'SOURCE';
    });
    var grounded = 0;
    var ungrounded = 0;
    session.claims.forEach(function (c) {
      if (!c.kind) c.kind = c.path && String(c.path).indexOf('A_') === 0 ? 'HYPOTHESIS' : 'CLAIM';
      if (c.kind === 'HYPOTHESIS' && session.hypotheses.indexOf(c) === -1) session.hypotheses.push(c);
      if (c.based_on && c.based_on.length) {
        c.grounded = true;
        c.status = 'GROUNDED';
        grounded++;
        return;
      }
      var cw = tok(c.text);
      var best = [];
      facts.forEach(function (f) {
        var fw = tok(f.content);
        var hit = 0;
        cw.forEach(function (w) {
          if (fw.indexOf(w) !== -1) hit++;
        });
        if (hit >= 2 || (hit >= 1 && cw.length <= 4)) best.push({ id: f.id, score: hit });
      });
      best.sort(function (a, b) {
        return b.score - a.score;
      });
      if (best.length) {
        c.based_on = best.slice(0, 3).map(function (b) {
          return b.id;
        });
        c.grounded = true;
        c.status = 'GROUNDED';
        grounded++;
      } else {
        c.based_on = [];
        c.grounded = false;
        c.status = 'UNGROUNDED';
        ungrounded++;
      }
    });
    session.claims.forEach(function (c) {
      if (c.grounded && c.kind !== 'HYPOTHESIS' && c.source_path && c.source_path.indexOf('http') === 0) {
        c.kind = 'HYPOTHESIS';
        if (session.hypotheses.indexOf(c) === -1) session.hypotheses.push(c);
      }
    });
    if (session.report) {
      session.report.grounding = {
        grounded: grounded,
        ungrounded: ungrounded,
        facts: facts.filter(function (e) {
          return e.kind === 'FACT';
        }).length
      };
      var extra =
        '\n\n## HYPOTHESIS ↔ FACTS (human layer)\n' +
        session.claims
          .slice(0, 12)
          .map(function (h, i) {
            return (
              (i + 1) +
              '. **[' +
              (h.status || '?') +
              ']** ' +
              String(h.text).slice(0, 200) +
              (h.based_on && h.based_on.length
                ? '\n   ← ' + h.based_on.join(', ')
                : '\n   ← UNGROUNDED')
            );
          })
          .join('\n') +
        '\n\n## For the human\n- FACTS are source extracts.\n- UNGROUNDED is visible on purpose.\n- You decide.\n';
      if (session.report.markdown && session.report.markdown.indexOf('HYPOTHESIS ↔ FACTS') === -1) {
        session.report.markdown += extra;
      }
    }
    session.world = session.world || {};
    session.world.uncertainties = session.world.uncertainties || [];
    if (ungrounded) {
      session.world.uncertainties.push({
        text: ungrounded + ' UNGROUNDED claims kept visible',
        at: new Date().toISOString()
      });
    }
    return session;
  }

  if (!R.exportSession) {
    R.exportSession = function (session) {
      return {
        format: 'aksi-runtime-session',
        version: R.VERSION || R.VERSION_UI,
        principle: R.PRINCIPLE,
        exported_at: new Date().toISOString(),
        id: session.id,
        goal: session.goal,
        status: session.status,
        tasks: session.tasks,
        evidence: session.evidence,
        claims: session.claims,
        hypotheses: session.hypotheses,
        conflicts: session.conflicts,
        multi_llm: session.multi_llm,
        self_checks: session.self_checks,
        world: session.world,
        events: session.events,
        proof: session.proof,
        report: session.report,
        live: session.live
      };
    };
  }

  if (!R.listSessions) {
    R.listSessions = function () {
      var S = R._sessions || {};
      return Object.keys(S).map(function (id) {
        var s = S[id];
        return { id: s.id, goal: s.goal, status: s.status };
      });
    };
  }

  var _start = R.startGoal;
  if (_start && !R._humanWrapped) {
    R._humanWrapped = true;
    R.startGoal = async function (goal, opts) {
      var session = await _start.call(R, goal, opts);
      try {
        groundSession(session);
      } catch (e) {}
      return session;
    };
  }

  R.groundSession = groundSession;
})(typeof window !== 'undefined' ? window : globalThis);
