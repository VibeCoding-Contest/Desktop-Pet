// agent/scheduler.js — 定时调度（人 B，G6）
// 每分钟 tick：扫描到期日程 → emit('schedule:due')；到设定时间发每日早报 → emit('schedule:dailyReport')
// 暴露 window.Scheduler

class Scheduler {
  /**
   * @param eventBus
   * @param store  window.scheduleStore
   * @param options.reportTime  每日早报时间 'HH:MM'，默认 '08:00'
   */
  constructor(eventBus, store, options = {}) {
    this.eventBus = eventBus;
    this.store = store;
    this.reportTime = options.reportTime || '08:00';
    this.intervalMs = options.intervalMs || 60 * 1000;
    this.timer = null;
    this._lastReportDay = null; // 'YYYY-MM-DD'，防当日重复
  }

  start() {
    if (this.timer) return;
    // 启动时立即检查一次（防止启动即逾期被错过）
    this._tick();
    this.timer = setInterval(() => this._tick(), this.intervalMs);
  }

  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  _tick(now = Date.now()) {
    try {
      // 1) 到期提醒
      const due = this.store.listDue(now);
      for (const it of due) {
        this.eventBus.emit('schedule:due', { item: { id: it.id, title: it.title, datetime: it.datetime } });
        this.store.markFired(it.id);
      }
      // 2) 每日早报
      const d = new Date(now);
      const dayKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      const [hh, mm] = this.reportTime.split(':').map(Number);
      if (d.getHours() === hh && d.getMinutes() === mm && this._lastReportDay !== dayKey) {
        this._lastReportDay = dayKey;
        this.eventBus.emit('schedule:dailyReport', { items: this.store.listToday() });
      }
    } catch (e) {
      console.error('[scheduler] tick error:', e);
    }
  }
}

if (typeof window !== 'undefined') window.Scheduler = Scheduler;
if (typeof module !== 'undefined' && module.exports) module.exports = { Scheduler };
