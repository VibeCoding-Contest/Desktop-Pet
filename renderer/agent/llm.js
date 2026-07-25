// agent/llm.js — LLM 客户端（人 B，G3）
// chat({messages, tools}) -> { content, tool_calls }
//   tool_calls: [{ name, arguments }]  供 Agent 执行后回灌
// provider:
//   - 'mock'（默认，离线可演示完整 function-calling 流程：意图→工具调用→结果回灌→自然回复）
//   - 'openai'（OpenAI 兼容云端 API，需 baseURL + apiKey）
//   - 'ollama'（本地 Ollama，默认 http://localhost:11434）
// 配置：构造前设置 window.LLM_CONFIG（或 new LLMClient(config)）。Key 不入库。

class LLMClient {
  constructor(config) {
    const cfg = config || (typeof window !== 'undefined' ? window.LLM_CONFIG : null) || {};
    this.provider = cfg.provider || 'mock';
    this.baseURL = cfg.baseURL || 'https://api.openai.com/v1';
    this.apiKey = cfg.apiKey || '';
    this.model = cfg.model || (this.provider === 'ollama' ? 'qwen2.5' : 'gpt-4o-mini');
  }

  async chat({ messages, tools = [] }) {
    if (this.provider === 'openai') return this._openai(messages, tools);
    if (this.provider === 'ollama') return this._ollama(messages, tools);
    return this._mock(messages, tools);
  }

  // ---------- mock：规则化意图识别 + 结果回灌格式化 ----------
  _mock(messages, tools) {
    const last = messages[messages.length - 1];

    // 结果回灌：上一条是 tool，则把工具结果格式化为自然回复
    if (last && last.role === 'tool') {
      return Promise.resolve({ content: this._formatToolResult(last.name, last.content), tool_calls: [] });
    }

    const text = String((last && last.content) || '').trim();

    // 工具调用意图
    const has = (re) => new RegExp(re).test(text);
    if (/天气/.test(text)) {
      const city = this._extractCity(text) || '北京';
      return Promise.resolve({ content: '', tool_calls: [{ name: 'weather.getToday', arguments: { city } }] });
    }
    if (/提醒我|提醒|我要.*开/.test(text)) {
      return Promise.resolve({ content: '', tool_calls: [{ name: 'schedule.parseAdd', arguments: { text } }] });
    }
    if (/(今天|今日).*(任务|日程|安排)|我有什么事|今天要干/.test(text)) {
      return Promise.resolve({ content: '', tool_calls: [{ name: 'schedule.listToday', arguments: {} }] });
    }
    if (/(全部|所有).*(日程|任务)/.test(text)) {
      return Promise.resolve({ content: '', tool_calls: [{ name: 'schedule.list', arguments: {} }] });
    }
    if (/记一下|备忘|记下/.test(text)) {
      const m = text.match(/(?:记一下|备忘|记下)\s*(.+)/);
      return Promise.resolve({ content: '', tool_calls: [{ name: 'memo.add', arguments: { text: m ? m[1] : text } }] });
    }
    if (/我的备忘|记了啥|备忘录/.test(text)) {
      return Promise.resolve({ content: '', tool_calls: [{ name: 'memo.list', arguments: {} }] });
    }
    if (/翻译/.test(text)) {
      const m = text.match(/翻译\s*(.+)/);
      return Promise.resolve({ content: '', tool_calls: [{ name: 'translate.run', arguments: { text: m ? m[1] : '', to: /中|zh/.test(text) ? 'zh' : 'en' } }] });
    }
    if (/(打开|访问).*https?:\/\//.test(text)) {
      const m = text.match(/(https?:\/\/[^\s]+)/);
      return Promise.resolve({ content: '', tool_calls: [{ name: 'system.openUrl', arguments: { url: m ? m[1] : '' } }] });
    }
    if (/(关机|关电脑)/.test(text)) {
      return Promise.resolve({ content: '', tool_calls: [{ name: 'system.power', arguments: { action: 'shutdown' } }] });
    }
    if (/休眠|睡眠/.test(text)) {
      return Promise.resolve({ content: '', tool_calls: [{ name: 'system.power', arguments: { action: 'sleep' } }] });
    }

    // 普通闲聊
    return Promise.resolve({ content: this._smallTalk(text), tool_calls: [] });
  }

  _formatToolResult(name, raw) {
    let r = {};
    try { r = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (e) { r = {}; }
    switch (name) {
      case 'weather.getToday':
        return `${r.city || ''} 今天 ${r.temp ?? '?'}℃ ${r.cond || ''}，${r.suggestion || ''}`;
      case 'weather.getForecast':
        return `${r.city} 未来天气已查询（${(r.forecast || []).length} 天）`;
      case 'schedule.parseAdd':
      case 'schedule.add':
        return r.when ? `已加入日程：${r.item?.title || ''}（${r.when}）✓ 到点会提醒你` : `已加入日程：${r.item?.title || ''} ✓`;
      case 'schedule.listToday':
        if (!r.count) return '今天没有日程，可以放松一下~';
        return `今天有 ${r.count} 项：` + (r.items || []).map((x, i) => `${i + 1}. ${x.datetime ? new Date(x.datetime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) + ' ' : ''}${x.title}${x.done ? '✓' : ''}`).join('；');
      case 'schedule.list':
        if (!r.count) return '目前没有任何日程。';
        return `共有 ${r.count} 条日程：` + (r.items || []).slice(0, 8).map((x) => `${x.title}`).join('、');
      case 'memo.add': return '记好了 ✓';
      case 'memo.list': return r.count ? `你的备忘：` + r.items.map((x) => x.text).join('；') : '还没有备忘。';
      case 'translate.run': return r.text || '翻译完成';
      case 'system.openUrl': return r.ok ? `已打开：${r.url}` : '打开失败';
      case 'system.power': return r.ok ? '已执行' : (r.canceled ? '已取消' : '执行失败');
      default: return '已完成。';
    }
  }

  _smallTalk(text) {
    if (/你好|hi|hello/i.test(text)) return '你好呀！我是桌宠管家，天气、日程、备忘都能帮你~';
    if (/你是谁|介绍/.test(text)) return '我是你的桌面管家，有啥吩咐尽管说！';
    if (/谢谢|辛苦/.test(text)) return '不客气~';
    return `收到：「${text}」。需要的话可以让我查天气、加日程、记备忘哦。`;
  }

  _extractCity(text) {
    const CITIES = ['北京', '上海', '广州', '深圳', '成都', '杭州', '南京', '武汉', '西安', '重庆', '天津', '苏州', '长沙', '青岛', '大连', '厦门', '哈尔滨', '沈阳', '昆明', '济南'];
    return CITIES.find((c) => text.includes(c));
  }

  // ---------- OpenAI 兼容 ----------
  // 内部历史消息格式（与 mock 共用）：
  //   assistant 带 tool_calls：{role:'assistant', content, tool_calls:[{id,name,arguments(object)}]}
  //   tool 结果：{role:'tool', tool_call_id, name, content(string)}
  // 发请求前用 _toWire 转成 OpenAI 线上格式（function.arguments 需为字符串、需带 type/id）
  _toWire(messages) {
    return messages.map((m) => {
      if (m.role === 'assistant' && m.tool_calls) {
        return {
          role: 'assistant',
          content: m.content ?? null,
          tool_calls: m.tool_calls.map((tc) => ({
            id: tc.id, type: 'function',
            function: { name: tc.name, arguments: JSON.stringify(tc.arguments || {}) },
          })),
        };
      }
      if (m.role === 'tool') {
        return { role: 'tool', tool_call_id: m.tool_call_id, content: String(m.content ?? '') };
      }
      return { role: m.role, content: m.content };
    });
  }

  async _openai(messages, tools) {
    const body = { model: this.model, messages: this._toWire(messages), temperature: 0.7 };
    if (tools.length) {
      body.tools = tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } }));
      body.tool_choice = 'auto';
    }
    const resp = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const t = await resp.text().catch(() => '');
      throw new Error('LLM HTTP ' + resp.status + ' ' + t.slice(0, 200));
    }
    const data = await resp.json();
    const msg = data.choices[0].message;
    const tool_calls = (msg.tool_calls || []).map((tc) => {
      let args = tc.function.arguments;
      try { args = typeof args === 'string' ? JSON.parse(args) : (args || {}); } catch (e) { args = {}; }
      return { id: tc.id, name: tc.function.name, arguments: args };
    });
    return { content: msg.content || '', tool_calls };
  }

  // ---------- Ollama ----------
  async _ollama(messages, tools) {
    const body = { model: this.model, messages, stream: false };
    if (tools.length) body.tools = tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } }));
    const resp = await fetch('http://localhost:11434/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    if (!resp.ok) throw new Error('Ollama HTTP ' + resp.status);
    const data = await resp.json();
    const msg = data.message || {};
    const tool_calls = (msg.tool_calls || []).map((tc) => ({ name: tc.function?.name, arguments: tc.function?.arguments || {} }));
    return { content: msg.content || '', tool_calls };
  }
}

if (typeof window !== 'undefined') window.LLMClient = LLMClient;
if (typeof module !== 'undefined' && module.exports) module.exports = { LLMClient };
