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

    this._resetAnimation();
    this.el.querySelector('.bubble-text').textContent = text;
    this.el.style.display = 'block';

    const animClass = this._getAnimationClass(type);
    this.el.classList.add('bubble--visible', animClass);

    this.timer = setTimeout(() => this.hide(), duration);
  }

  hide() {
    if (this.timer) clearTimeout(this.timer);
    this.el.classList.remove('bubble--visible');
    this.el.addEventListener('transitionend', () => {
      if (!this.el.classList.contains('bubble--visible')) {
        this.el.style.display = 'none';
        this._resetAnimation();
      }
    }, { once: true });
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

  _getAnimationClass(type) {
    switch (type) {
      case 'hungry':
      case 'starving':
        return 'bubble--shake';
      case 'sad':
        return 'bubble--wobble';
      case 'happy':
      case 'feed':
      case 'play':
        return 'bubble--bounce';
      default:
        return 'bubble--bounce';
    }
  }

  _resetAnimation() {
    this.el.classList.remove('bubble--bounce', 'bubble--shake', 'bubble--wobble');
  }
}

Bubble.prototype.quotes = {
  happy: [
    '今天天气真好~', '主人最好了！', '嘿嘿', '开心！', '好耶~',
    '今天心情超棒！', '生活真美好呀', '嘿嘿嘿~', '啦啦啦~', '今天也是元气满满！',
  ],
  hungry: [
    '好饿...', '有没有好吃的？', '肚子咕咕叫', '想吃东西了...', '饿瘪了 QAQ',
    '什么时候开饭呀...', '我闻到香味了！', '饿得走不动了...', '有没有小鱼干？', '肚子在抗议了...',
  ],
  sad: [
    '无聊...', '陪陪我嘛', 'QAQ', '好孤单啊...', '呜呜',
    '没人理我...', '今天好安静', '想出去玩...', '不开心', '求摸摸头...',
  ],
  idle: [
    '发呆中...', 'zzz...', '今天干点啥呢', '（盯——）', '...',
    '放空中...', '啊...好闲', '思考猫生中', '（打哈欠）', '今天星期几来着？',
  ],
  feed: [
    '好吃！', '谢谢主人！', '饱了饱了~', '再来一份！', '嗝~',
    '美味！', '这就是幸福的味道！', '太满足了！', '好吃到飞起！', '主人手艺真好！',
  ],
  play: [
    '来玩吧！', '哈哈！', '好玩！', '再来一次！', '耶！',
    '好开心！', '继续继续！', '太好玩了！', '哈哈哈哈', '主人陪我玩！',
  ],
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Bubble;
}