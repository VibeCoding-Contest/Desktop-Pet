class Status {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.hunger = 100;
    this.mood = 100;
    this.hungerDecay = 0.5;
    this.moodDecay = 0.3;
    this.timer = null;

    this._hungryFired = false;
    this._starvingFired = false;
    this._sadFired = false;
    this._happyFired = true;
  }

  start(options = {}) {
    if (options.hungerDecay !== undefined) this.hungerDecay = options.hungerDecay;
    if (options.moodDecay !== undefined) this.moodDecay = options.moodDecay;

    this.timer = setInterval(() => {
      this.hunger = Math.max(0, this.hunger - this.hungerDecay);
      this.mood = Math.max(0, this.mood - this.moodDecay);
      this._checkThresholds();
      this.eventBus.emit('status:change', { hunger: this.hunger, mood: this.mood });
    }, 1000);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  feed(amount = 30) {
    this.hunger = Math.min(100, this.hunger + amount);
    this._resetFlags();
    this.eventBus.emit('status:fed', { hunger: this.hunger });
    this.eventBus.emit('status:change', { hunger: this.hunger, mood: this.mood });
  }

  play(amount = 10) {
    this.mood = Math.min(100, this.mood + amount);
    this._resetFlags();
    this.eventBus.emit('status:played', { mood: this.mood });
    this.eventBus.emit('status:change', { hunger: this.hunger, mood: this.mood });
  }

  getData() {
    return { hunger: this.hunger, mood: this.mood };
  }

  loadData(data) {
    if (data && typeof data.hunger === 'number' && typeof data.mood === 'number') {
      this.hunger = data.hunger;
      this.mood = data.mood;
      this._resetFlags();
      this.eventBus.emit('status:change', { hunger: this.hunger, mood: this.mood });
    }
  }

  destroy() {
    this.stop();
  }

  createStatusBar(container) {
    // 用内联 SVG 图标替代汉字/emoji，任何系统都能渲染（不依赖 emoji 字体）
    const ICON_FOOD = `<svg viewBox="0 0 24 24" width="15" height="15" aria-label="饱食">
      <path d="M3 11h18a9 9 0 0 1-18 0z" fill="#ff9800" stroke="#8d4e16" stroke-width="1.3"/>
      <path d="M5 11c0-3 4-4 7-4s7 1 7 4" fill="none" stroke="#8d4e16" stroke-width="1.3"/>
      <path d="M9 5c0-1.5 1-1.5 1-3M13 5c0-1.5 1-1.5 1-3" stroke="#b0b0b0" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    </svg>`;
    const ICON_HEART = `<svg viewBox="0 0 24 24" width="15" height="15" aria-label="心情">
      <path d="M12 21S3 14.5 3 8.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 9 2.5C21 14.5 12 21 12 21z" fill="#e91e63" stroke="#a0154a" stroke-width="1.3"/>
    </svg>`;

    this._barEl = document.createElement('div');
    this._barEl.className = 'status-bar';
    this._barEl.innerHTML = `
      <div class="status-bar__item" id="status-item-hunger">
        <span class="status-bar__label">${ICON_FOOD}</span>
        <div class="status-bar__track">
          <div class="status-bar__fill status-bar__fill--hunger" style="width:${this.hunger}%"></div>
        </div>
        <span class="status-bar__value">${Math.round(this.hunger)}</span>
      </div>
      <div class="status-bar__item" id="status-item-mood">
        <span class="status-bar__label">${ICON_HEART}</span>
        <div class="status-bar__track">
          <div class="status-bar__fill status-bar__fill--mood" style="width:${this.mood}%"></div>
        </div>
        <span class="status-bar__value">${Math.round(this.mood)}</span>
      </div>
    `;
    container.appendChild(this._barEl);

    this.eventBus.on('status:change', ({ hunger, mood }) => {
      const hungerFill = this._barEl.querySelector('.status-bar__fill--hunger');
      const moodFill = this._barEl.querySelector('.status-bar__fill--mood');
      const values = this._barEl.querySelectorAll('.status-bar__value');
      const hungerItem = this._barEl.querySelector('#status-item-hunger');
      const moodItem = this._barEl.querySelector('#status-item-mood');
      if (hungerFill) hungerFill.style.width = hunger + '%';
      if (moodFill) moodFill.style.width = mood + '%';
      if (values[0]) values[0].textContent = Math.round(hunger);
      if (values[1]) values[1].textContent = Math.round(mood);

      if (hunger < 30) { hungerFill.classList.add('status-bar__fill--low'); hungerItem.classList.add('status-bar__item--low'); }
      else { hungerFill.classList.remove('status-bar__fill--low'); hungerItem.classList.remove('status-bar__item--low'); }

      if (mood < 20) { moodFill.classList.add('status-bar__fill--low'); moodItem.classList.add('status-bar__item--low'); }
      else { moodFill.classList.remove('status-bar__fill--low'); moodItem.classList.remove('status-bar__item--low'); }
    });
  }

  setBarPosition(x, y) {
    if (!this._barEl) return;
    this._barEl.style.left = x + 'px';
    this._barEl.style.top = y + 'px';
  }

  _checkThresholds() {
    if (this.hunger < 10 && !this._starvingFired) {
      this._starvingFired = true;
      this.eventBus.emit('status:starving', { hunger: this.hunger });
    } else if (this.hunger < 30 && !this._hungryFired) {
      this._hungryFired = true;
      this.eventBus.emit('status:hungry', { hunger: this.hunger });
    }

    if (this.mood < 20 && !this._sadFired) {
      this._sadFired = true;
      this.eventBus.emit('status:sad', { mood: this.mood });
    } else if (this.mood > 80 && !this._happyFired) {
      this._happyFired = true;
      this.eventBus.emit('status:happy', { mood: this.mood });
    }
  }

  _resetFlags() {
    this._hungryFired = this.hunger < 30;
    this._starvingFired = this.hunger < 10;
    this._sadFired = this.mood < 20;
    this._happyFired = this.mood > 80;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Status;
}