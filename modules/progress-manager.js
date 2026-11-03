(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AKSIProgressManager = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function award(state, action, points, now = new Date()) {
    if (!state || typeof state !== "object") throw new TypeError("AKSI progress state is required.");
    if (!Array.isArray(state.actionRewards)) state.actionRewards = [];
    const key = String(action || "").trim();
    const amount = Number(points);
    if (!key || !Number.isFinite(amount) || amount <= 0) {
      throw new TypeError("A non-empty action and positive XP amount are required.");
    }
    const day = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
    const rewardId = day + ":" + key;
    if (state.actionRewards.includes(rewardId)) return { awarded: false, xp: Number(state.xp) || 0, rewardId };
    state.actionRewards.push(rewardId);
    state.actionRewards = state.actionRewards.slice(-500);
    state.xp = (Number(state.xp) || 0) + Math.floor(amount);
    return { awarded: true, points: Math.floor(amount), xp: state.xp, rewardId };
  }

  return { award, version: "1.0.0" };
});
