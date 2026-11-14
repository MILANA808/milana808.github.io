/* Shared AKSI site memory bridge.
 * Migrates the existing homepage notes to the same IndexedDB store used by AKSI Q.
 * Only explicit user-saved notes are imported; no automatic conversation capture.
 */
(function (root) {
  "use strict";
  function start() {
    if (!root.AKSI_Q_BROWSER || !root.AKSI_Q_BROWSER.MemoryStore) return;
    const store = new root.AKSI_Q_BROWSER.MemoryStore();
    const memoryList = document.getElementById("memoryList");
    const form = document.getElementById("memoryForm");
    const keyInput = document.getElementById("memoryKey");
    const valueInput = document.getElementById("memoryValue");
    const count = document.getElementById("memoryCount");
    const stateKey = "aksi-matrix-game-v1";

    function readState() {
      try { return JSON.parse(localStorage.getItem(stateKey) || "{}"); }
      catch (_) { return {}; }
    }
    function writeState(state) {
      try { localStorage.setItem(stateKey, JSON.stringify(state)); return true; }
      catch (_) { return false; }
    }
    function draw(records) {
      if (!memoryList) return;
      const latest = records.slice(0, 5);
      memoryList.replaceChildren();
      if (!latest.length) {
        memoryList.textContent = "Пока нет заметок.";
      } else {
        latest.forEach(record => {
          const line = document.createElement("div");
          line.textContent = "◈ " + record.key + ": " + String(record.value).slice(0, 160);
          memoryList.appendChild(line);
        });
      }
      if (count) count.textContent = String(records.length);
    }
    async function refresh() {
      const records = await store.all();
      draw(records);
      const state = readState();
      state.memory = {};
      // Keep the main chat's prompt context bounded; all records remain in IndexedDB.
      records.slice(0, 100).forEach(record => {
        try { state.memory[record.key] = JSON.parse(record.value); }
        catch (_) { state.memory[record.key] = record.value; }
      });
      root.AKSI_SITE_MEMORY_CONTEXT = Object.assign({}, state.memory);
      const keys = Object.keys(state.memory);
      if (keys.length > 100) {
        const keep = new Set(records.slice(0, 100).map(record => record.key));
        Object.keys(state.memory).forEach(key => { if (!keep.has(key)) delete state.memory[key]; });
      }
      writeState(state);
      if (root.AKSI_UNIFIED_CORE && typeof root.AKSI_UNIFIED_CORE.remember === "function") {
        records.slice(0, 100).forEach(record => {
          let value = record.value;
          try { value = JSON.parse(value); } catch (_) {}
          try { root.AKSI_UNIFIED_CORE.remember(record.key, String(value)); } catch (_) {}
        });
      }
    }

    async function migrate() {
      const alreadyMigrated = localStorage.getItem("aksi-q-memory-migrated-v1") === "1";
      if (!alreadyMigrated) {
        const state = readState();
        const notes = state.memory && typeof state.memory === "object" ? Object.entries(state.memory) : [];
        for (const [key, value] of notes) {
          if (!String(key).trim()) continue;
          const existing = await store.get(key);
          if (!existing) await store.put(key, value);
        }
        localStorage.setItem("aksi-q-memory-migrated-v1", "1");
      }
      await refresh();
    }

    if (form) {
      // Capture phase runs before the homepage's legacy handler clears the fields.
      form.addEventListener("submit", async event => {
        const key = keyInput && keyInput.value.trim();
        const value = valueInput && valueInput.value.trim();
        if (!key || !value) return;
        try {
          await store.put(key, value, ["homepage"]);
          await refresh();
        } catch (error) {
          if (memoryList) memoryList.textContent = "Ошибка сохранения в долговременную память: " + (error.message || String(error));
        }
      }, true);
    }

    // Migrate explicit chat commands, e.g. "запомни название = значение".
    const chatForm = document.getElementById("chatForm");
    const chatInput = document.getElementById("chatInput");
    if (chatForm && chatInput) {
      chatForm.addEventListener("submit", async () => {
        const match = chatInput.value.trim().match(/^запомни\s*[:：]?\s*(.+?)\s*[=:]\s*(.+)$/i);
        if (!match) return;
        try { await store.put(match[1].trim(), match[2].trim(), ["chat-command"]); await refresh(); }
        catch (error) { if (memoryList) memoryList.textContent = "Не удалось сохранить команду памяти: " + (error.message || String(error)); }
      }, true);
    }
    migrate().catch(error => {
      if (memoryList) memoryList.textContent = "Локальная память AKSI недоступна: " + (error.message || String(error));
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})(window);
