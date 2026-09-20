/** AKSI Runtime upgrade layer: exportSession + listSessions. Load after engine.js */
(function(G){
  'use strict';
  var R = G.AKSI_RUNTIME;
  if (!R) return;
  if (!R.exportSession) {
    R.exportSession = function(session){
      return {
        format: 'aksi-runtime-session',
        version: R.VERSION || '1.0-upgrade',
        exported_at: new Date().toISOString(),
        id: session.id,
        goal: session.goal,
        status: session.status,
        tasks: session.tasks,
        evidence: session.evidence,
        claims: session.claims,
        conflicts: session.conflicts,
        multi_llm: session.multi_llm,
        self_checks: session.self_checks || [],
        memories: session.memories,
        world: session.world,
        events: session.events,
        proof: session.proof,
        report: session.report,
        live: session.live
      };
    };
  }
  if (!R.listSessions) {
    R.listSessions = function(){
      var S = R._sessions || {};
      return Object.keys(S).map(function(id){
        var s = S[id];
        return { id: s.id, goal: s.goal, status: s.status, created_at: s.created_at };
      });
    };
  }
  R.VERSION_UI = '1.1.0-upgrade';
})(typeof window !== 'undefined' ? window : globalThis);
