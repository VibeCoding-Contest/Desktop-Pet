// agent/store/schedule-store.js — 日程持久化（人 B，G5）
// 用 localStorage 持久化（Electron renderer 跨重启保留）。key: dp.schedule
// 暴露 window.scheduleStore

(function () {
  const KEY = 'dp.schedule';

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch (e) { console.error('[schedule-store] load error:', e); return []; }
  }
  function save(items) {
    try { localStorage.setItem(KEY, JSON.stringify(items)); }
    catch (e) { console.error('[schedule-store] save error:', e); }
  }
  function uid() { return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  const store = {
    list() { return load(); },
    listToday() {
      const items = load();
      const now = new Date();
      return items.filter((it) => {
        if (!it.datetime) return false;
        const d = new Date(it.datetime);
        return d.getFullYear() === now.getFullYear() &&
               d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
      });
    },
    listDue(now = Date.now()) {
      return load().filter((it) => !it.done && it.datetime && it.datetime <= now && !it._fired);
    },
    add({ title, datetime, repeat = 'none', note }) {
      const items = load();
      const it = {
        id: uid(),
        title: String(title || '未命名'),
        datetime: datetime || null,
        repeat,
        note: note || '',
        done: false,
        createdAt: Date.now(),
      };
      items.push(it);
      save(items);
      return it;
    },
    complete(id) {
      const items = load();
      const it = items.find((x) => x.id === id);
      if (it) it.done = true;
      save(items);
      return it || null;
    },
    remove(id) {
      const items = load().filter((x) => x.id !== id);
      save(items);
    },
    /** 标记已触发（防重复），并把重复任务滚到下一周期 */
    markFired(id) {
      const items = load();
      const it = items.find((x) => x.id === id);
      if (!it) return;
      it._fired = true;
      if (it.repeat && it.repeat !== 'none') {
        const next = _nextOccurrence(it);
        if (next) { it.datetime = next; it._fired = false; it.done = false; }
      }
      save(items);
    },
    getData() { return load(); },
    loadData(arr) { save(Array.isArray(arr) ? arr : []); },
  };

  function _nextOccurrence(it) {
    const d = new Date(it.datetime);
    const now = new Date();
    if (it.repeat === 'daily') { d.setDate(d.getDate() + 1); return d.getTime(); }
    if (it.repeat === 'weekly') { d.setDate(d.getDate() + 7); return d.getTime(); }
    if (it.repeat === 'weekday') {
      do { d.setDate(d.getDate() + 1); } while (d.getDay() === 0 || d.getDay() === 6);
      return d.getTime();
    }
    return null;
  }

  window.scheduleStore = store;
})();
