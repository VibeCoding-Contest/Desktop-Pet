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

    this.ANIM = {
      idle: { frames: 4, duration: 180, loop: true, oneShot: false },
      walk: { frames: 4, duration: 120, loop: true, oneShot: false },
      jump: { frames: 6, duration: 90, loop: false, oneShot: true },
      sit: { frames: 2, duration: 400, loop: false, oneShot: true },
      yawn: { frames: 4, duration: 220, loop: false, oneShot: true },
      sad: { frames: 2, duration: 320, loop: true, oneShot: false },
    };

    this._stateResolve = null;
    this._moveTarget = null;
    this._moveSpeed = 60;

    this._autoEnabled = false;
    this._autoTimer = null;
    this._idleSince = Date.now();
  }

  setState(newState, options = {}) {
    const cfg = this.ANIM[newState];
    if (!cfg) return;
    const force = options.force === true;
    if (this.state === newState && !force) return;
    if (newState !== this.state) {
      this._moveTarget = null;
      const resolve = this._stateResolve;
      this._stateResolve = null;
      if (resolve) resolve();
    }
    this.state = newState;
    this.currentFrame = 0;
    this.frameTimer = 0;
    if (this.eventBus) this.eventBus.emit('pet:stateChange', { state: newState });
  }

  update(deltaTime) {
    const cfg = this.ANIM[this.state];
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
    const cfg = this.ANIM[this.state];
    const phase = cfg
      ? (this.currentFrame + this.frameTimer / cfg.duration) / cfg.frames
      : 0;
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    this._drawPet(ctx, cx, cy, this.state, phase);
  }

  setPetType(type) {
    if (!['cat', 'dog', 'penguin'].includes(type)) return;
    this.petType = type;
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
    const behaviors = ['walk', 'sit', 'yawn'];
    const b = behaviors[Math.floor(Math.random() * behaviors.length)];
    this._triggerAuto(b);
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

  _palette() {
    const palettes = {
      cat: { body: '#FFB347', dark: '#E8922C', ear: '#FFB347' },
      dog: { body: '#C79554', dark: '#A6763B', ear: '#B07A3A' },
      penguin: { body: '#3A3A3A', dark: '#1E1E1E', ear: null, belly: '#FFFFFF', beak: '#FFB347' },
    };
    return palettes[this.petType] || palettes.cat;
  }

  _drawPet(ctx, cx, cy, state, phase) {
    const p = this._palette();
    const TAU = Math.PI * 2;
    let bodyY = cy;
    let scaleY = 1;
    let tilt = 0;
    let eye = 'normal';
    let mouth = 'smile';
    let mouthOpen = 0;
    let legSwing = 0;

    switch (state) {
      case 'idle':
        bodyY = cy + Math.sin(phase * TAU) * 1.5;
        mouthOpen = 0;
        break;
      case 'walk':
        bodyY = cy + Math.sin(phase * TAU) * 1.5;
        tilt = Math.sin(phase * TAU * 2) * 0.08;
        legSwing = Math.sin(phase * TAU * 2) * 4;
        break;
      case 'jump':
        bodyY = cy - Math.sin(phase * Math.PI) * 22;
        eye = 'wide';
        mouth = 'o';
        mouthOpen = 0.6;
        break;
      case 'sit':
        scaleY = 0.72;
        bodyY = cy + 3;
        eye = 'content';
        break;
      case 'yawn':
        eye = 'half';
        mouth = 'yawn';
        mouthOpen = (Math.sin(phase * TAU) * 0.5 + 0.5) * 0.8 + 0.1;
        break;
      case 'sad':
        bodyY = cy + 3;
        eye = 'sad';
        mouth = 'frown';
        break;
      default:
        break;
    }

    ctx.save();
    ctx.translate(cx, bodyY);
    ctx.rotate(tilt);
    ctx.scale(1, scaleY);

    const r = 18;
    this._drawLegs(ctx, r, legSwing, p);
    this._drawTail(ctx, r, p);

    ctx.fillStyle = p.body;
    ctx.strokeStyle = p.dark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    ctx.stroke();

    if (this.petType === 'penguin') {
      ctx.fillStyle = p.belly;
      ctx.beginPath();
      ctx.ellipse(0, 2, r * 0.55, r * 0.62, 0, 0, TAU);
      ctx.fill();
      this._drawBeak(ctx, 0, 4, p);
    } else {
      this._drawEars(ctx, 0, -r, p);
    }

    const eyeY = -2;
    this._drawEyes(ctx, -7, 7, eyeY, eye);
    this._drawMouth(ctx, 0, 8, mouth, mouthOpen);

    if (state === 'sad') this._drawTear(ctx, -10, 2, phase);

    ctx.restore();
  }

  _drawLegs(ctx, r, swing, p) {
    ctx.fillStyle = p.dark;
    ctx.beginPath();
    ctx.ellipse(-7, r - 2 + swing, 4, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(7, r - 2 - swing, 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawTail(ctx, r, p) {
    if (this.petType === 'penguin') return;
    ctx.strokeStyle = p.dark;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(r - 2, 4);
    ctx.quadraticCurveTo(r + 10, 0, r + 12, -8);
    ctx.stroke();
  }

  _drawEars(ctx, cx, topY, p) {
    if (!p.ear) return;
    ctx.fillStyle = p.body;
    ctx.strokeStyle = p.dark;
    ctx.lineWidth = 2;
    const ear = (sign) => {
      ctx.beginPath();
      ctx.moveTo(cx + sign * 6, topY + 4);
      ctx.lineTo(cx + sign * 12, topY - 10);
      ctx.lineTo(cx + sign * 2, topY - 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };
    ear(-1);
    ear(1);
  }

  _drawBeak(ctx, cx, cy, p) {
    ctx.fillStyle = p.beak;
    ctx.strokeStyle = '#C97A1F';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy - 2);
    ctx.lineTo(cx + 5, cy - 2);
    ctx.lineTo(cx, cy + 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  _drawEyes(ctx, lx, rx, ey, style) {
    ctx.fillStyle = '#222';
    if (style === 'content') {
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(lx, ey, 3, Math.PI, 0);
      ctx.arc(rx, ey, 3, Math.PI, 0);
      ctx.stroke();
      return;
    }
    if (style === 'half') {
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(lx, ey, 3, 0, Math.PI * 2);
      ctx.arc(rx, ey, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lx - 5, ey - 4);
      ctx.lineTo(lx + 5, ey - 4);
      ctx.moveTo(rx - 5, ey - 4);
      ctx.lineTo(rx + 5, ey - 4);
      ctx.stroke();
      return;
    }
    if (style === 'wide') {
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.arc(lx, ey, 4, 0, Math.PI * 2);
      ctx.arc(rx, ey, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(lx, ey, 2, 0, Math.PI * 2);
      ctx.arc(rx, ey, 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (style === 'sad') {
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lx - 3, ey - 3);
      ctx.lineTo(lx + 3, ey + 1);
      ctx.moveTo(lx + 3, ey - 3);
      ctx.lineTo(lx - 3, ey + 1);
      ctx.moveTo(rx - 3, ey - 3);
      ctx.lineTo(rx + 3, ey + 1);
      ctx.moveTo(rx + 3, ey - 3);
      ctx.lineTo(rx - 3, ey + 1);
      ctx.stroke();
      return;
    }
    ctx.beginPath();
    ctx.arc(lx, ey, 2.5, 0, Math.PI * 2);
    ctx.arc(rx, ey, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawMouth(ctx, cx, cy, style, openness) {
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    if (style === 'o' || style === 'yawn') {
      const h = 3 + openness * 6;
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

  _drawTear(ctx, x, y, phase) {
    ctx.fillStyle = '#7EC8FF';
    const drop = (Math.sin(phase * Math.PI * 2) * 0.5 + 0.5) * 6;
    ctx.beginPath();
    ctx.ellipse(x, y + drop, 2, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Pet };
}
