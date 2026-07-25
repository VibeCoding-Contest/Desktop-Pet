class Pet {
  constructor(canvas, eventBus = null) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.eventBus = eventBus;

    this.state = 'idle';
    this.petType = 'cat';
    this.width = 64;
    this.height = 64;
    this.x = canvas.width ? (canvas.width - this.width) / 2 : 0;
    this.y = canvas.height ? (canvas.height - this.height) / 2 : 0;

    this.currentFrame = 0;
    this.frameTimer = 0;

    this._stateResolve = null;
    this._moveTarget = null;
    this._moveSpeed = 60;
    this._follow = null;

    this._autoEnabled = false;
    this._autoTimer = null;
    this._idleSince = Date.now();
  }

  setState(newState, options = {}) {
    const cfg = Pet.ACTIONS[newState];
    if (!cfg) return;
    const force = options.force === true;
    if (this.state === newState && !force) return;
    if (newState !== this.state) {
      this._moveTarget = null;
      const r = this._stateResolve;
      this._stateResolve = null;
      if (r) r();
      const f = this._follow;
      this._follow = null;
      if (f) f.resolve();
    }
    this.state = newState;
    this.currentFrame = 0;
    this.frameTimer = 0;
    if (this.eventBus) this.eventBus.emit('pet:stateChange', { state: newState });
  }

  update(deltaTime) {
    const cfg = Pet.ACTIONS[this.state];
    if (cfg) {
      this.frameTimer += deltaTime;
      while (this.frameTimer >= cfg.duration) {
        this.frameTimer -= cfg.duration;
        this.currentFrame += 1;
        if (this.currentFrame >= cfg.frames) {
          if (cfg.loop) {
            this.currentFrame = 0;
          } else if (cfg.oneShot) {
            this.currentFrame = cfg.frames - 1;
            this._finishOneShot();
            return;
          }
        }
      }
    }
    this._updateMovement(deltaTime);
  }

  _finishOneShot() {
    this._moveTarget = null;
    const resolve = this._stateResolve;
    this._stateResolve = null;
    this._idleSince = Date.now();
    this.setState('idle', { force: true });
    if (resolve) resolve();
  }

  _updateMovement(deltaTime) {
    if (this._follow) {
      const f = this._follow;
      const tgt = typeof f.getTarget === 'function' ? f.getTarget() : f.getTarget;
      if (tgt) {
        const tx = Math.max(0, Math.min(this.canvas.width - this.width, tgt.x));
        const ty = Math.max(0, Math.min(this.canvas.height - this.height, tgt.y));
        const dx = tx - this.x, dy = ty - this.y;
        const dist = Math.hypot(dx, dy);
        const step = (this._moveSpeed * 1.6) * (deltaTime / 1000);
        if (dist > step && dist > 0) {
          this.x += (dx / dist) * step;
          this.y += (dy / dist) * step;
        } else {
          this.x = tx; this.y = ty;
        }
      }
      if (Date.now() >= f.until) {
        const resolve = f.resolve;
        this._follow = null;
        this._idleSince = Date.now();
        if (this.eventBus) this.eventBus.emit('pet:moveEnd', { x: this.x, y: this.y });
        this.setState('idle', { force: true });
        if (resolve) resolve();
      }
      return;
    }
    if (!this._moveTarget) return;
    const dt = deltaTime / 1000;
    const t = this._moveTarget;
    const dx = t.x - this.x;
    const dy = t.y - this.y;
    const dist = Math.hypot(dx, dy);
    const step = this._moveSpeed * dt;
    if (dist <= step || dist === 0) {
      this.x = t.x;
      this.y = t.y;
      const resolve = this._stateResolve;
      this._stateResolve = null;
      this._moveTarget = null;
      this._idleSince = Date.now();
      if (this.eventBus) this.eventBus.emit('pet:moveEnd', { x: this.x, y: this.y });
      this.setState('idle', { force: true });
      if (resolve) resolve();
      return;
    }
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const renderer = Pet.TYPES[this.petType];
    if (!renderer) return;
    if (renderer.init && Pet._ready[this.petType] !== 'ready') return;
    const cfg = Pet.ACTIONS[this.state];
    const phase = cfg
      ? (this.currentFrame + this.frameTimer / cfg.duration) / cfg.frames
      : 0;
    const a = this._computeAnim(this.state, phase);
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    ctx.save();
    ctx.translate(cx, cy + a.bob);
    ctx.rotate(a.tilt);
    ctx.scale(1, a.scaleY);
    renderer.draw(ctx, {
      r: 18,
      state: this.state,
      phase,
      eye: a.eye,
      mouth: a.mouth,
      mouthOpen: a.mouthOpen,
      legSwing: a.legSwing,
      palette: renderer.palette,
      utils: { eyes: Pet.eyes, mouth: Pet.mouth, tear: Pet.tear },
      self: this,
    });
    ctx.restore();
  }

  setPetType(type) {
    const renderer = Pet.TYPES[type];
    if (!renderer) return;
    this.petType = type;
    if (renderer.init && Pet._ready[type] !== 'ready') {
      Pet._ready[type] = 'pending';
      Promise.resolve(renderer.init(this))
        .then(() => { Pet._ready[type] = 'ready'; })
        .catch(() => { Pet._ready[type] = 'failed'; });
    }
    this.setState('idle', { force: true });
  }

  moveTo(targetX, targetY) {
    return new Promise((resolve) => {
      const maxX = Math.max(0, this.canvas.width - this.width);
      const maxY = Math.max(0, this.canvas.height - this.height);
      this.setState('walk', { force: true });
      this._moveTarget = {
        x: Math.max(0, Math.min(maxX, targetX)),
        y: Math.max(0, Math.min(maxY, targetY)),
      };
      this._stateResolve = resolve;
    });
  }

  jump() {
    return new Promise((resolve) => {
      this.setState('jump', { force: true });
      this._stateResolve = resolve;
    });
  }

  follow(getTarget, duration = 2000) {
    return new Promise((resolve) => {
      this.setState('walk', { force: true });
      this._moveTarget = null;
      this._follow = { getTarget, until: Date.now() + duration, resolve };
    });
  }

  startAutoBehavior() {
    if (this._autoEnabled) return;
    this._autoEnabled = true;
    this._idleSince = Date.now();
    this._autoTimer = setInterval(() => this._autoTick(), 1000);
  }

  stopAutoBehavior() {
    this._autoEnabled = false;
    if (this._autoTimer) {
      clearInterval(this._autoTimer);
      this._autoTimer = null;
    }
  }

  _autoTick() {
    if (!this._autoEnabled) return;
    if (this.state !== 'idle') {
      this._idleSince = Date.now();
      return;
    }
    if (Date.now() - this._idleSince < 5000) return;
    const names = [], weights = [];
    let total = 0;
    for (const name in Pet.ACTIONS) {
      const w = Pet.ACTIONS[name].autoWeight || 0;
      if (w > 0) { names.push(name); weights.push(w); total += w; }
    }
    if (!total) return;
    let r = Math.random() * total;
    let pick = names[0];
    for (let i = 0; i < names.length; i++) {
      r -= weights[i];
      if (r <= 0) { pick = names[i]; break; }
    }
    this._triggerAuto(pick);
  }

  _triggerAuto(behavior) {
    this._idleSince = Date.now();
    if (behavior === 'walk') {
      const margin = 20;
      const maxX = Math.max(margin, this.canvas.width - this.width - margin);
      const maxY = Math.max(margin, this.canvas.height - this.height - margin);
      const tx = margin + Math.random() * (maxX - margin);
      const ty = margin + Math.random() * (maxY - margin);
      this.moveTo(tx, ty);
      return;
    }
    this.setState(behavior, { force: true });
  }

  getBounds() {
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }

  getData() {
    return { type: this.petType, x: this.x, y: this.y };
  }

  destroy() {
    this.stopAutoBehavior();
  }

  static TYPES = {};
  static _ready = {};
  static ACTIONS = {};

  static registerType(name, renderer) {
    if (!name || !renderer || typeof renderer.draw !== 'function') return false;
    Pet.TYPES[name] = renderer;
    Pet._ready[name] = renderer.init ? 'pending' : 'ready';
    return true;
  }

  static registerAction(name, desc) {
    if (!name || !desc || !desc.frames || !desc.duration) return false;
    Pet.ACTIONS[name] = {
      frames: desc.frames,
      duration: desc.duration,
      loop: !!desc.loop,
      oneShot: !!desc.oneShot,
      autoWeight: desc.autoWeight || 0,
      getAnim: typeof desc.getAnim === 'function' ? desc.getAnim : null,
    };
    return true;
  }

  _computeAnim(state, phase) {
    const TAU = Math.PI * 2;
    const base = { bob: 0, scaleY: 1, tilt: 0, eye: 'normal', mouth: 'smile', mouthOpen: 0, legSwing: 0 };
    switch (state) {
      case 'idle':
        base.bob = Math.sin(phase * TAU) * 1.5;
        break;
      case 'walk':
        base.bob = Math.sin(phase * TAU) * 1.5;
        base.tilt = Math.sin(phase * TAU * 2) * 0.08;
        base.legSwing = Math.sin(phase * TAU * 2) * 4;
        break;
      case 'jump':
        base.bob = -Math.sin(phase * Math.PI) * 22;
        base.eye = 'wide'; base.mouth = 'o'; base.mouthOpen = 0.6;
        break;
      case 'sit':
        base.scaleY = 0.72; base.bob = 3; base.eye = 'content';
        break;
      case 'yawn':
        base.eye = 'half'; base.mouth = 'yawn';
        base.mouthOpen = (Math.sin(phase * TAU) * 0.5 + 0.5) * 0.8 + 0.1;
        break;
      case 'sad':
        base.bob = 3; base.eye = 'sad'; base.mouth = 'frown';
        break;
      default:
        break;
    }
    const act = Pet.ACTIONS[state];
    if (act && typeof act.getAnim === 'function') Object.assign(base, act.getAnim(state, phase));
    return base;
  }

  static eyes(ctx, lx, rx, ey, style, radius) {
    radius = radius || 2.5;
    ctx.fillStyle = '#222';
    if (style === 'content') {
      ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(lx, ey, 3, Math.PI, 0);
      ctx.arc(rx, ey, 3, Math.PI, 0);
      ctx.stroke();
      return;
    }
    if (style === 'half') {
      ctx.beginPath();
      ctx.arc(lx, ey, 3, 0, Math.PI * 2);
      ctx.arc(rx, ey, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lx - 5, ey - 4); ctx.lineTo(lx + 5, ey - 4);
      ctx.moveTo(rx - 5, ey - 4); ctx.lineTo(rx + 5, ey - 4);
      ctx.stroke();
      return;
    }
    if (style === 'wide') {
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.arc(lx, ey, 4, 0, Math.PI * 2);
      ctx.arc(rx, ey, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#222'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(lx, ey, 2, 0, Math.PI * 2);
      ctx.arc(rx, ey, 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (style === 'sad') {
      ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lx - 3, ey - 3); ctx.lineTo(lx + 3, ey + 1);
      ctx.moveTo(lx + 3, ey - 3); ctx.lineTo(lx - 3, ey + 1);
      ctx.moveTo(rx - 3, ey - 3); ctx.lineTo(rx + 3, ey + 1);
      ctx.moveTo(rx + 3, ey - 3); ctx.lineTo(rx - 3, ey + 1);
      ctx.stroke();
      return;
    }
    ctx.beginPath();
    ctx.arc(lx, ey, radius, 0, Math.PI * 2);
    ctx.arc(rx, ey, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  static mouth(ctx, cx, cy, style, open) {
    ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    if (style === 'o' || style === 'yawn') {
      const h = 3 + open * 6;
      ctx.fillStyle = '#7A3B3B';
      ctx.beginPath();
      ctx.ellipse(cx, cy + h / 2, 4, h, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (style === 'frown') {
      ctx.beginPath();
      ctx.arc(cx, cy + 6, 5, Math.PI, 0, true);
      ctx.stroke();
      return;
    }
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  static tear(ctx, x, y, phase) {
    ctx.fillStyle = '#7EC8FF';
    const drop = (Math.sin(phase * Math.PI * 2) * 0.5 + 0.5) * 6;
    ctx.beginPath();
    ctx.ellipse(x, y + drop, 2, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

if (typeof require !== 'undefined' && typeof module !== 'undefined' && module.exports) {
  try {
    Pet.registerType('cat', require('./pets/cat.js'));
    Pet.registerType('dog', require('./pets/dog.js'));
    Pet.registerType('penguin', require('./pets/penguin.js'));
  } catch (e) { void 0; }
}

Pet.registerAction('idle', { frames: 4, duration: 180, loop: true, oneShot: false, autoWeight: 0 });
Pet.registerAction('walk', { frames: 4, duration: 120, loop: true, oneShot: false, autoWeight: 1 });
Pet.registerAction('jump', { frames: 6, duration: 90, loop: false, oneShot: true, autoWeight: 0 });
Pet.registerAction('sit', { frames: 2, duration: 400, loop: false, oneShot: true, autoWeight: 1 });
Pet.registerAction('yawn', { frames: 4, duration: 220, loop: false, oneShot: true, autoWeight: 1 });
Pet.registerAction('sad', { frames: 2, duration: 320, loop: true, oneShot: false, autoWeight: 0 });

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Pet };
}
