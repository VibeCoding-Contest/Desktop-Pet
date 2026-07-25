// agent/tools/system.js — 系统控制（人 B，G9）
// 经 A 的 window.petAPI 执行：openExternal 打开网址，systemPower 关机/休眠（主进程二次确认）。
// 注册：system.openUrl / system.power

(function () {
  if (!window.agentTools) return;

  window.agentTools.register({
    name: 'system.openUrl',
    description: '在默认浏览器打开一个 http/https 网址',
    parameters: {
      type: 'object',
      properties: { url: { type: 'string' } },
      required: ['url'],
    },
    async handler({ url }) {
      if (!window.petAPI || !window.petAPI.openExternal) return { ok: false, error: 'petAPI unavailable' };
      window.petAPI.openExternal(String(url || ''));
      return { ok: true, url };
    },
  });

  window.agentTools.register({
    name: 'system.power',
    description: '系统电源操作：action=shutdown 关机 / sleep 休眠（需用户确认）',
    parameters: {
      type: 'object',
      properties: { action: { type: 'string', enum: ['shutdown', 'sleep'] }, delay: { type: 'number' } },
      required: ['action'],
    },
    async handler({ action, delay }) {
      if (!window.petAPI || !window.petAPI.systemPower) return { ok: false, error: 'petAPI unavailable' };
      const res = await window.petAPI.systemPower(action, delay || 0);
      return res || { ok: false };
    },
  });
})();
