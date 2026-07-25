class Bubble {
  constructor(container) {
    this.container = container;
    this.el = null;
    this.timer = null;
    this._createDOM();
  }

  _createDOM() {
    this.el = document.createElement('div');
    this.el.className = 'bubble';
    this.el.innerHTML = '<span class="bubble-text"></span><span class="bubble-arrow"></span>';
    this.el.style.display = 'none';
    this.container.appendChild(this.el);
  }

  show(type, options = {}) {
    const text = options.text || this._randomQuote(type);
    const duration = options.duration || 3000;

    if (this.timer) clearTimeout(this.timer);

    this.el.querySelector('.bubble-text').textContent = text;
    this.el.style.display = 'block';
    this.el.classList.add('bubble--visible');

    this.timer = setTimeout(() => this.hide(), duration);
  }

  hide() {
    if (this.timer) clearTimeout(this.timer);
    this.el.style.display = 'none';
    this.el.classList.remove('bubble--visible');
  }

  setPosition(x, y) {
    this.el.style.left = x + 'px';
    this.el.style.top = y + 'px';
  }

  setQuotes(type, quotes) {
    this.quotes[type] = quotes;
  }

  destroy() {
    this.hide();
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
  }

  _randomQuote(type) {
    const list = this.quotes[type] || this.quotes.idle;
    return list[Math.floor(Math.random() * list.length)];
  }
}

Bubble.prototype.quotes = {
  happy: ['今天天气真好~', '主人最好了！', '嘿嘿', '开心！', '好耶~'],
  hungry: ['好饿...', '有没有好吃的？', '肚子咕咕叫', '想吃东西了...', '饿瘪了 QAQ'],
  sad: ['无聊...', '陪陪我嘛', 'QAQ', '好孤单啊...', '呜呜'],
  idle: ['发呆中...', 'zzz...', '今天干点啥呢', '（盯——）', '...'],
  feed: ['好吃！', '谢谢主人！', '饱了饱了~', '再来一份！', '嗝~'],
  play: ['来玩吧！', '哈哈！', '好玩！', '再来一次！', '耶！'],
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Bubble;
}