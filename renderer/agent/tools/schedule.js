// agent/tools/schedule.js — 日程 CRUD + 自然语言建日程（人 B，G5/G7）
// 依赖 window.scheduleStore（store/schedule-store.js）
// 注册：schedule.add / schedule.listToday / schedule.list / schedule.complete / schedule.remove

(function () {
  const store = window.scheduleStore;

  // 把自然语言时间归一化为时间戳（"明天9点" 等）；失败返回 null
  function parseTime(text) {
    if (!text) return null;
    const now = new Date();
    let d = new Date(now);
    let matched = false;

    // 相对日期
    const dayMatch = text.match(/(今天|明天|后天|大后天)/);
    if (dayMatch) {
      matched = true;
      const map = { '今天': 0, '明天': 1, '后天': 2, '大后天': 3 };
      d.setDate(d.getDate() + map[dayMatch[1]]);
    } else {
      // 明确日期 MM-DD / MM月DD日
      const m = text.match(/(\d{1,2})[月\-\/](\d{1,2})/);
      if (m) { matched = true; d.setMonth(+m[1] - 1); d.setDate(+m[2]); }
    }

    // 时间 HH:MM / HH点MM / HH点
    const t = text.match(/(\d{1,2})\s*[点:：](\s*\d{1,2})?/) || text.match(/(上午|下午|晚上|早上)\s*(\d{1,2})\s*[点:：]?\s*(\d{1,2})?/);
    if (t) {
      matched = true;
      let hh, mm;
      if (t[1] && /[上下]/.test(t[1])) {
        const ap = t[1]; hh = +t[2]; mm = t[3] ? +t[3] : 0;
        if ((ap === '下午' || ap === '晚上') && hh < 12) hh += 12;
        if (ap === '上午' || ap === '早上') { if (hh === 12) hh = 0; }
      } else {
        hh = +t[1]; mm = t[2] ? +t[2].trim() : 0;
        if (/下午|晚上/.test(text) && hh < 12) hh += 12;
      }
      d.setHours(hh, mm, 0, 0);
    }

    if (!matched) return null;
    // 若只指定日期无时间，默认当天 09:00
    if (!t) d.setHours(9, 0, 0, 0);
    return d.getTime();
  }

  function cleanTitle(text) {
    return text
      .replace(/提醒我|提醒|我要|请|帮我|让|明天|今天|后天|大后天|上午|下午|晚上|早上|\d{1,2}月?\d{0,2}日?|\d{1,2}\s*[点:：]\s*\d{0,2}|点|的|去|来|一下/g, '')
      .replace(/\s+/g, '').slice(0, 30) || '提醒';
  }

  if (store && window.agentTools) {
    window.agentTools.register({
      name: 'schedule.add',
      description: '添加一条日程。title 任务标题；datetime 为 ISO 字符串或毫秒时间戳；repeat 可选 daily/weekly/weekday/none',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          datetime: { type: 'string', description: 'ISO 时间或时间戳' },
          repeat: { type: 'string' },
        },
        required: ['title'],
      },
      async handler({ title, datetime, repeat }) {
        let ts = datetime;
        if (typeof ts === 'string' && isNaN(Number(ts)) && isNaN(Date.parse(ts))) ts = null;
        else if (typeof ts === 'string' && /^\d+$/.test(ts)) ts = Number(ts);
        else if (typeof ts === 'string') ts = Date.parse(ts);
        const it = store.add({ title, datetime: ts, repeat });
        return { ok: true, item: { id: it.id, title: it.title, datetime: it.datetime } };
      },
    });

    window.agentTools.register({
      name: 'schedule.parseAdd',
      description: '从自然语言解析并添加日程，如"提醒我明天9点开会"',
      parameters: {
        type: 'object',
        properties: { text: { type: 'string' } },
        required: ['text'],
      },
      async handler({ text }) {
        const datetime = parseTime(text);
        const title = cleanTitle(text);
        const it = store.add({ title, datetime });
        return { ok: true, item: { id: it.id, title: it.title, datetime: it.datetime }, when: datetime ? new Date(datetime).toLocaleString('zh-CN') : '未指定时间' };
      },
    });

    window.agentTools.register({
      name: 'schedule.listToday',
      description: '列出今天的日程',
      parameters: { type: 'object', properties: {} },
      async handler() {
        const items = store.listToday().map((x) => ({ id: x.id, title: x.title, datetime: x.datetime, done: x.done }));
        return { count: items.length, items };
      },
    });

    window.agentTools.register({
      name: 'schedule.list',
      description: '列出全部日程',
      parameters: { type: 'object', properties: {} },
      async handler() {
        const items = store.list().map((x) => ({ id: x.id, title: x.title, datetime: x.datetime, done: x.done, repeat: x.repeat }));
        return { count: items.length, items };
      },
    });

    window.agentTools.register({
      name: 'schedule.complete',
      description: '按 id 标记日程完成',
      parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      async handler({ id }) { const it = store.complete(id); return { ok: !!it }; },
    });

    window.agentTools.register({
      name: 'schedule.remove',
      description: '按 id 删除日程',
      parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      async handler({ id }) { store.remove(id); return { ok: true }; },
    });
  }
})();
