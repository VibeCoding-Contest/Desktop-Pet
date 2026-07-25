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
    this._barEl = document.createElement('div');
    this._barEl.className = 'status-bar';
    this._barEl.innerHTML = `
      <div class="status-bar__item">
        <span class="status-bar__label">🍖</span>
        <div class="status-bar__track">
          <div class="status-bar__fill status-bar__fill--hunger" style="width:${this.hunger}%"></div>
        </div>
        <span class="status-bar__value">${Math.round(this.hunger)}</span>
      </div>
      <div class="status-bar__item">
        <span class="status-bar__label">💖</span>
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
      if (hungerFill) hungerFill.style.width = hunger + '%';
      if (moodFill) moodFill.style.width = mood + '%';
      if (values[0]) values[0].textContent = Math.round(hunger);
      if (values[1]) values[1].textContent = Math.round(mood);

      if (hunger < 30) hungerFill.classList.add('status-bar__fill--low');
      else hungerFill.classList.remove('status-bar__fill--low');

      if (mood < 20) moodFill.classList.add('status-bar__fill--low');
      else moodFill.classList.remove('status-bar__fill--low');
    });
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