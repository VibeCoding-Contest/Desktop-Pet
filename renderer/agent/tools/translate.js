// agent/tools/translate.js — 翻译（人 B，G11）
// 无外部 API 时走简易规则翻译（中↔英关键词），仅作演示；有 LLM 时可由 Agent 直接回复，此工具提供兜底。
// 注册：translate.run

(function () {
  if (!window.agentTools) return;

  const ZH_EN = {
    '你好': 'hello', '谢谢': 'thanks', '再见': 'bye', '天气': 'weather',
    '提醒': 'remind', '日程': 'schedule', '今天': 'today', '明天': 'tomorrow',
    '开会': 'meeting', '吃饭': 'eat', '喝水': 'drink water',
  };
  const EN_ZH = Object.fromEntries(Object.entries(ZH_EN).map(([k, v]) => [v, k]));

  function pick(dict, text) {
    let hit = null;
    for (const k of Object.keys(dict)) if (text.includes(k)) { hit = k; break; }
    return hit ? `${dict[hit]}（${hit}）` : null;
  }

  window.agentTools.register({
    name: 'translate.run',
    description: '翻译一段文字。to: 目标语言(如 en/zh)；text: 待翻译文本',
    parameters: {
      type: 'object',
      properties: { text: { type: 'string' }, to: { type: 'string' } },
      required: ['text'],
    },
    async handler({ text, to }) {
      const t = String(text || '');
      let out;
      if (to === 'en') out = pick(ZH_EN, t) || `[en] ${t}`;
      else out = pick(EN_ZH, t) || `[zh] ${t}`;
      return { ok: true, from: to === 'en' ? 'zh' : 'en', to: to || 'zh', text: out };
    },
  });
})();
