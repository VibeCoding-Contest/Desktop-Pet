// agent/store/memo-store.js — 备忘便签持久化（人 B，G10）
// localStorage，key: dp.memo。暴露 window.memoStore

(function () {
  const KEY = 'dp.memo';
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch (e) { return []; }
  }
  function save(items) { localStorage.setItem(KEY, JSON.stringify(items)); }

  const store = {
    list() { return load(); },
    add({ text }) {
      const items = load();
      const it = { id: 'm' + Date.now().toString(36), text: String(text || ''), createdAt: Date.now() };
      items.unshift(it);
      save(items);
      return it;
    },
    remove(id) {
      save(load().filter((x) => x.id !== id));
    },
    clear() { save([]); },
    getData() { return load(); },
    loadData(arr) { save(Array.isArray(arr) ? arr : []); },
  };

  window.memoStore = store;
})();
