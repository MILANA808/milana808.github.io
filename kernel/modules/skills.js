/** DID-signed skill registry (local) */
(function () {
  "use strict";
  if (!window.AksiKernel) return;
  var KEY = "AKSI_SKILLS_V1";
  var SEED = "AKSI_DIMAX_v3_2026";

  function load() {
    try {
      var a = JSON.parse(localStorage.getItem(KEY) || "[]");
      return Array.isArray(a) ? a : [];
    } catch (e) {
      return [];
    }
  }
  function save(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
  }
  function hex(buf) {
    return Array.from(new Uint8Array(buf))
      .map(function (b) {
        return b.toString(16).padStart(2, "0");
      })
      .join("");
  }
  async function skillSig(skill) {
    var payload = [skill.id, skill.name, skill.version, skill.code || ""].join("|");
    var dig = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(SEED + "|SKILL|" + payload));
    return hex(dig);
  }

  async function importSkill(skill) {
    if (!skill || !skill.id || !skill.name) throw new Error("invalid skill");
    var sig = await skillSig(skill);
    if (skill.sig && skill.sig !== sig) throw new Error("подпись навыка не совпала");
    skill.sig = sig;
    skill.importedAt = Date.now();
    var list = load().filter(function (s) {
      return s.id !== skill.id;
    });
    list.unshift(skill);
    save(list.slice(0, 50));
    if (window.AksiBus) AksiBus.emit("skills.imported", "skills", { id: skill.id });
    return skill;
  }

  AksiKernel.register({
    id: "skills",
    name: "Skill Registry",
    version: "1.0",
    list: load,
    importSkill: importSkill,
    skillSig: skillSig,
  });
})();
