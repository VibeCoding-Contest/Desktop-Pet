// chat.js — 聊天面板 UI（人 A，G2）
// 纯 UI：发送时 emit('chat:userMessage')；监听 agent:reply/thinking/toolCall 渲染。
// 不依赖 B 的 agent.js 实现；B 未接入时发消息走占位回显，便于自测。
// 接口契约见《人员A-Agent升级工作规划》§4.2。

const AVATAR_PAW = `<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="6" cy="9" r="2.1" fill="#fff"/><circle cx="9.6" cy="5.6" r="2.1" fill="#fff"/><circle cx="14.4" cy="5.6" r="2.1" fill="#fff"/><circle cx="18" cy="9" r="2.1" fill="#fff"/><ellipse cx="12" cy="15.2" rx="4.6" ry="4" fill="#fff"/></svg>`;
const AVATAR_USER = `<svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="8" r="3.8" fill="#fff"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6z" fill="#fff"/></svg>`;

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
    this._composing = false; // 中文输入法组词状态（显式追踪，比 isComposing 更可靠）
    this._compositionEndedAt = -Infinity; // 兼容 compositionend 早于确认 Enter 的输入法

    this._bind();
    this._wireEvents();
  }

  _bind() {
    if (this.sendBtn) this.sendBtn.addEventListener('click', (e) => { e.preventDefault(); this._send(); });
    if (this.input) {
      // 显式追踪输入法组词：compositionstart→end 之间的 Enter 是"选词确认"，绝不发送
      this.input.addEventListener('compositionstart', () => { this._composing = true; });
      this.input.addEventListener('compositionupdate', () => { this._composing = true; });
      this.input.addEventListener('compositionend', () => {
        this._composing = false;
        this._compositionEndedAt = performance.now();
        this._autosize();
      });
      this.input.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' || e.shiftKey) return;
        // 某些中文 IME 会先 compositionend，再补发同一次确认 Enter；短暂保护该 Enter。
        const justCommitted = performance.now() - this._compositionEndedAt < 100;
        if (this._composing || e.isComposing || e.keyCode === 229) return;
        if (justCommitted) {
          e.preventDefault();
          return;
        }
        e.preventDefault();
        this._send();
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
    this.input.focus({ preventScroll: true });
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
    const isUser = role === 'user';
    const el = document.createElement('div');
    el.className = 'chat-message chat-message--' + (isUser ? 'user' : 'agent');
    const av = document.createElement('div');
    av.className = 'chat-avatar chat-avatar--' + (isUser ? 'user' : 'agent');
    av.innerHTML = isUser ? AVATAR_USER : AVATAR_PAW;
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = text;
    el.appendChild(av);
    el.appendChild(bubble);
    this.messagesEl.appendChild(el);
    this._lastAgentEl = isUser ? this._lastAgentEl : bubble;
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
    this.typingEl.style.display = label ? 'flex' : 'none';
  }
  clearTyping() { this.setTyping(''); }

  _scrollBottom() {
    if (this.messagesEl) this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }

  open() {
    this._open = true;
    this.el.classList.add('chat-panel--open');
    this.focusInput();
    this.eventBus.emit('chat:open');
  }
  close() {
    this._open = false;
    this.el.classList.remove('chat-panel--open');
    this.eventBus.emit('chat:close');
  }
  toggle() { this._open ? this.close() : this.open(); }
  get isOpen() { return this._open; }
  focusInput() {
    if (this.input) this.input.focus({ preventScroll: true });
  }

  // B 的 agent.js 就绪后可调用此方法，关闭占位回显
  markAgentReady() { this._agentAlive = true; }
}

if (typeof module !== 'undefined' && module.exports) module.exports = { Chat };
