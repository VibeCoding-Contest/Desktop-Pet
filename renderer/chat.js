// chat.js — 聊天面板 UI（人 A，G2）
// 纯 UI：发送时 emit('chat:userMessage')；监听 agent:reply/thinking/toolCall 渲染。
// 不依赖 B 的 agent.js 实现；B 未接入时发消息走占位回显，便于自测。
// 接口契约见《人员A-Agent升级工作规划》§4.2。

class Chat {
  constructor(panelEl, eventBus) {
    this.el = panelEl;
    this.eventBus = eventBus;
    this.messagesEl = panelEl.querySelector('#chat-messages') || panelEl.querySelector('.chat-messages');
    this.typingEl = panelEl.querySelector('#chat-typing') || panelEl.querySelector('.chat-typing');
    this.input = panelEl.querySelector('#chat-input') || panelEl.querySelector('.chat-input');
    this.sendBtn = panelEl.querySelector('#chat-send') || panelEl.querySelector('.chat-send');
    this.closeBtn = panelEl.querySelector('.chat-close');
    this._open = false;
    this._lastAgentEl = null; // 流式追加目标

    this._bind();
    this._wireEvents();
  }

  _bind() {
    if (this.sendBtn) this.sendBtn.addEventListener('click', (e) => { e.preventDefault(); this._send(); });
    if (this.input) {
      this.input.addEventListener('keydown', (e) => {
        // 中文输入法组词时 Enter 用来选词，不能当发送（isComposing / keyCode 229）
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) {
          e.preventDefault();
          this._send();
        }
      });
      // 自适应高度
      this.input.addEventListener('input', () => this._autosize());
    }
    if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.close());
  }

  _wireEvents() {
    // B 的 Agent 回复
    this.eventBus.on('agent:reply', ({ text, bubble } = {}) => {
      this.clearTyping();
      this.addMessage('agent', text || '');
      // bubble=true 时由 app.js 同步显示气泡首句（A 在 app.js 处理）
    });
    this.eventBus.on('agent:thinking', ({ state } = {}) => {
      if (state === 'start') this.setTyping('思考中…');
      else this.clearTyping();
    });
    this.eventBus.on('agent:toolCall', ({ label } = {}) => {
      this.setTyping(label ? `正在${label}…` : '处理中…');
    });
  }

  _autosize() {
    if (!this.input) return;
    this.input.style.height = 'auto';
    this.input.style.height = Math.min(96, this.input.scrollHeight) + 'px';
  }

  _send() {
    if (!this.input) return;
    const text = this.input.value.trim();
    if (!text) return;
    this.addMessage('user', text);
    this.input.value = '';
    this._autosize();
    this.eventBus.emit('chat:userMessage', { text });

    // B 未接入时的占位回显（收到真实 agent:reply 后会被覆盖）
    if (!this._agentAlive) {
      this.setTyping('（Agent 尚未接入，占位回显）');
      setTimeout(() => {
        this.clearTyping();
        this.addMessage('agent', `收到：「${text}」\n（接入 B 的 agent.js 后将由 LLM 回复）`);
      }, 400);
    }
  }

  addMessage(role, text) {
    const el = document.createElement('div');
    el.className = 'chat-message chat-message--' + (role === 'user' ? 'user' : 'agent');
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = text;
    el.appendChild(bubble);
    this.messagesEl.appendChild(el);
    this._lastAgentEl = role === 'agent' ? bubble : this._lastAgentEl;
    this._scrollBottom();
  }

  appendChunk(chunk) {
    if (!chunk) return;
    if (!this._lastAgentEl) { this.addMessage('agent', chunk); return; }
    this._lastAgentEl.textContent += chunk;
    this._scrollBottom();
  }

  setTyping(label) {
    if (!this.typingEl) return;
    this.typingEl.textContent = label || '';
    this.typingEl.style.display = label ? 'block' : 'none';
  }
  clearTyping() { this.setTyping(''); }

  _scrollBottom() {
    if (this.messagesEl) this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  open() {
    this._open = true;
    this.el.classList.add('chat-panel--open');
    if (this.input) this.input.focus();
    this.eventBus.emit('chat:open');
  }
  close() {
    this._open = false;
    this.el.classList.remove('chat-panel--open');
    this.eventBus.emit('chat:close');
  }
  toggle() { this._open ? this.close() : this.open(); }
  get isOpen() { return this._open; }

  // B 的 agent.js 就绪后可调用此方法，关闭占位回显
  markAgentReady() { this._agentAlive = true; }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { Chat };
