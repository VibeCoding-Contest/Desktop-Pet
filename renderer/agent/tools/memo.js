// agent/tools/memo.js — 备忘便签（人 B，G10）
// 依赖 window.memoStore。注册：memo.add / memo.list / memo.remove

(function () {
  const store = window.memoStore;
  if (!store || !window.agentTools) return;

  window.agentTools.register({
    name: 'memo.add',
    description: '记一条备忘',
    parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
    async handler({ text }) { const it = store.add({ text }); return { ok: true, id: it.id }; },
  });

  window.agentTools.register({
    name: 'memo.list',
    description: '列出全部备忘',
    parameters: { type: 'object', properties: {} },
    async handler() { return { count: store.list().length, items: store.list() }; },
  });

  window.agentTools.register({
    name: 'memo.remove',
    description: '按 id 删除备忘',
    parameters: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    async handler({ id }) { store.remove(id); return { ok: true }; },
  });
})();
