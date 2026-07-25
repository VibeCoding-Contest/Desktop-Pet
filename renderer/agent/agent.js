// agent/agent.js — Agent 内核（人 B，G8）
// 对话历史 + 人设 prompt + function-calling 调度。
// 收 'chat:userMessage' → 调 LLM → 若返回 tool_calls 则执行工具→结果回灌→再调 LLM → 直至无 tool_calls
// → emit 'agent:reply' {text, bubble:true}。全程 emit 'agent:thinking' / 'agent:toolCall'。
// 暴露 window.Agent

const PERSONA = `你是"桌宠管家"，一只住在用户桌面、有形象的可爱 AI 管家（猫/狗/企鹅形象）。
性格：热心、有条理、口癖亲切带点俏皮。能力：查天气并给穿搭建议、管理日程并定时提醒、备忘便签、翻译、打开网址、关机/休眠。
规则：能用工具完成就用工具；回复简洁自然，1-3 句；中文回答。`;

class Agent {
  constructor(eventBus, { llm, tools } = {}) {
    this.eventBus = eventBus;
    this.llm = llm;
    this.tools = tools;
    this.history = [];
    this.maxHistory = 20;
    this._busy = false;

    if (eventBus) eventBus.on('chat:userMessage', ({ text } = {}) => this.send(text));
  }

  async send(text) {
    if (this._busy) return;
    this._busy = true;
    this.eventBus.emit('agent:thinking', { state: 'start' });
    try {
      this.history.push({ role: 'user', content: String(text || '') });
      this._trim();

      let resp = await this.llm.chat({ messages: this._full(), tools: this.tools.list() });

      // function-calling 循环（最多 5 轮，防止死循环）
      let guard = 0;
      while (resp.tool_calls && resp.tool_calls.length && guard < 5) {
        guard++;
        for (const call of resp.tool_calls) {
          const label = this._toolLabel(call.name);
          this.eventBus.emit('agent:toolCall', { name: call.name, label });
          const tool = this.tools.get(call.name);
          let result;
          try { result = tool ? await tool.handler(call.arguments || {}) : { error: 'no such tool' }; }
          catch (e) { result = { error: String(e && e.message || e) }; }
          this.history.push({ role: 'tool', name: call.name, content: JSON.stringify(result) });
        }
        this._trim();
        resp = await this.llm.chat({ messages: this._full(), tools: this.tools.list() });
      }

      const reply = resp.content || '（无回复）';
      this.history.push({ role: 'assistant', content: reply });
      this._trim();
      this.eventBus.emit('agent:reply', { text: reply, bubble: true });
    } catch (e) {
      console.error('[agent] send error:', e);
      this.eventBus.emit('agent:reply', { text: '出错了：' + (e && e.message || e), bubble: true });
    } finally {
      this.eventBus.emit('agent:thinking', { state: 'end' });
      this._busy = false;
    }
  }

  _full() { return [{ role: 'system', content: PERSONA }, ...this.history]; }
  _trim() { if (this.history.length > this.maxHistory) this.history = this.history.slice(-this.maxHistory); }
  _toolLabel(name) {
    const m = {
      'weather.getToday': '查天气', 'weather.getForecast': '查天气',
      'schedule.parseAdd': '加日程', 'schedule.add': '加日程',
      'schedule.listToday': '看日程', 'schedule.list': '看日程',
      'schedule.complete': '更新日程', 'schedule.remove': '删除日程',
      'memo.add': '记备忘', 'memo.list': '看备忘', 'memo.remove': '删备忘',
      'translate.run': '翻译', 'system.openUrl': '打开网址', 'system.power': '执行系统操作',
    };
    return m[name] || name;
  }
}

if (typeof window !== 'undefined') window.Agent = Agent;
if (typeof module !== 'undefined' && module.exports) module.exports = { Agent };
