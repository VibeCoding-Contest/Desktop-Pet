const dogRenderer = {
  name: 'dog',
  palette: {
    fur: '#FFFCF5',
    furLight: '#FFFFFF',
    furShade: '#F4E4DC',
    outline: '#786E69',
    ear: '#F6E2D8',
    earInner: '#F1CDC5',
    eye: '#2A2424',
    eyeGlow: '#FFFFFF',
    nose: '#302727',
    mouth: '#704443',
    tongue: '#F58F94',
    blush: 'rgba(239, 150, 157, 0.26)',
    pawLine: '#CFAFA6',
    tear: '#7EC8FF',
    zzz: '#A6A0B9',
    shadow: 'rgba(91, 72, 65, 0.14)',
  },

  draw(ctx, o) {
    const p = o.palette;
    const t = Date.now();
    const state = o.state;
    const motion = this._motion(state, o.phase, t);

    if (state === 'roll') {
      this._drawRoll(ctx, o, p, t);
      return;
    }
    if (state === 'sleep') {
      this._drawSleep(ctx, o, p, t);
      return;
    }

    ctx.save();
    ctx.translate(0, motion.bodyY);

    this._shadow(ctx, p, state === 'jump' ? 0.55 : 1);
    this._tail(ctx, p, motion.tail, state === 'sad');
    this._body(ctx, p, state, motion);
    this._hindPaws(ctx, p, state, motion);
    this._frontLegs(ctx, p, state, motion);

    ctx.save();
    ctx.translate(motion.headX, motion.headY);
    ctx.rotate(motion.headTilt);
    this._head(ctx, o, p, state, motion, t);
    ctx.restore();

    ctx.restore();
  },

  _motion(state, phase, t) {
    const TAU = Math.PI * 2;
    const wave = Math.sin(phase * TAU);
    const fastWave = Math.sin(phase * TAU * 2);
    const motion = {
      bodyY: 1,
      bodyScaleY: 1,
      headX: 0,
      headY: -10,
      headTilt: -0.012,
      tail: Math.sin(t * 0.006) * 4,
      pawLeft: 0,
      pawRight: 0,
      earLift: 0,
      furDrift: Math.sin(t * 0.0022) * 0.7,
    };

    switch (state) {
      case 'walk':
        motion.bodyY = Math.abs(fastWave) * 1.4;
        motion.headY -= Math.abs(fastWave) * 1.2;
        motion.tail = Math.sin(t * 0.014) * 9;
        motion.pawLeft = fastWave * 3.5;
        motion.pawRight = -fastWave * 3.5;
        motion.headTilt = fastWave * 0.035;
        break;
      case 'jump':
        motion.bodyScaleY = 0.93;
        motion.headY += 1;
        motion.pawLeft = -5;
        motion.pawRight = -5;
        motion.tail = Math.sin(t * 0.02) * 11;
        motion.earLift = -3;
        break;
      case 'sit':
        motion.bodyY = 3;
        motion.bodyScaleY = 0.96;
        motion.headY = -12;
        motion.tail = Math.sin(t * 0.004) * 2;
        break;
      case 'yawn':
        motion.headY = -11 + Math.sin(phase * Math.PI) * 2;
        motion.headTilt = -0.05;
        motion.tail = Math.sin(t * 0.003) * 2;
        break;
      case 'sad':
        motion.bodyY = 3;
        motion.headY = -6;
        motion.headTilt = -0.07;
        motion.tail = 12;
        motion.earLift = 3;
        break;
      case 'bark':
        motion.headY = -12 - Math.abs(wave) * 2;
        motion.headTilt = -0.07;
        motion.tail = Math.sin(t * 0.022) * 10;
        motion.earLift = -2;
        break;
      case 'sniff':
        motion.headX = 5 + Math.sin(t * 0.009) * 3;
        motion.headY = -3 + Math.sin(t * 0.012) * 1.5;
        motion.headTilt = 0.15;
        motion.tail = Math.sin(t * 0.008) * 5;
        break;
      case 'happy':
        motion.bodyY = -Math.abs(fastWave) * 2;
        motion.headY = -12;
        motion.headTilt = fastWave * 0.06;
        motion.tail = Math.sin(t * 0.026) * 13;
        motion.earLift = -2;
        break;
      case 'look':
        motion.headX = Math.sin(t * 0.005) * 5;
        motion.headTilt = Math.sin(t * 0.005) * 0.1;
        motion.tail = Math.sin(t * 0.007) * 4;
        break;
      default:
        motion.bodyY = Math.sin(t * 0.0025) * 0.8;
        motion.headY += Math.sin(t * 0.0021 + 0.8) * 0.35;
        motion.headTilt += Math.sin(t * 0.0014) * 0.012;
        break;
    }
    return motion;
  },

  _shadow(ctx, p, alpha = 1, y = 45, rx = 42) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.shadow;
    ctx.beginPath();
    ctx.ellipse(0, y, rx, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  _tail(ctx, p, wag, sad) {
    ctx.save();
    ctx.translate(27, 27);
    ctx.rotate((sad ? 0.48 : -0.2) + wag * 0.014);
    ctx.fillStyle = p.fur;
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 1.7;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-2, 7);
    ctx.bezierCurveTo(7, 9, 15, 4, 17, -4);
    ctx.bezierCurveTo(19, -12, 15, -19, 11, -24);
    ctx.lineTo(17, -23);
    ctx.lineTo(18, -30);
    ctx.lineTo(23, -25);
    ctx.lineTo(27, -27);
    ctx.bezierCurveTo(31, -18, 31, -8, 27, 1);
    ctx.bezierCurveTo(23, 12, 13, 18, 4, 17);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = p.furLight;
    ctx.beginPath();
    ctx.moveTo(16, -23);
    ctx.bezierCurveTo(24, -21, 27, -14, 26, -7);
    ctx.bezierCurveTo(23, -12, 18, -16, 13, -17);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  },

  _body(ctx, p, state, motion) {
    ctx.save();
    ctx.scale(1, motion.bodyScaleY);
    ctx.fillStyle = p.ear;
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, -1);
    ctx.bezierCurveTo(-19, -4, -30, 9, -31, 25);
    ctx.bezierCurveTo(-32, 35, -26, 42, -18, 43);
    ctx.bezierCurveTo(-10, 45, -5, 40, 0, 39);
    ctx.bezierCurveTo(7, 42, 14, 46, 22, 42);
    ctx.bezierCurveTo(31, 38, 32, 27, 29, 18);
    ctx.bezierCurveTo(25, 5, 14, -3, -4, -1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = p.furShade;
    ctx.globalAlpha = 0.68;
    ctx.beginPath();
    ctx.ellipse(-17, 25, 10, 16, -0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  },

  _hindPaws(ctx, p, state, motion) {
    const tucked = state === 'jump' ? -6 : 0;
    const paw = (side) => {
      ctx.save();
      const x = side < 0 ? -25 : 24;
      ctx.translate(x, 42 + tucked);
      ctx.rotate(side < 0 ? -0.09 : 0.045);
      ctx.fillStyle = p.fur;
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, side < 0 ? 12 : 11, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = p.pawLine;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(side * -2, -1); ctx.lineTo(side * -1.5, 3);
      ctx.moveTo(side * 2, -1); ctx.lineTo(side * 2.2, 3);
      ctx.stroke();
      ctx.restore();
    };
    paw(-1);
    paw(1);
  },

  _frontLegs(ctx, p, state, motion) {
    const leg = (side, swing) => {
      const jump = state === 'jump';
      ctx.save();
      const x = side < 0 ? -10.5 : 9.5;
      ctx.translate(x + swing, jump ? 24 : 28);
      ctx.rotate(side * (jump ? 0.18 : 0.025));
      ctx.fillStyle = p.fur;
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-7, -17);
      ctx.bezierCurveTo(-9, -7, -8, 6, -6.5, 13);
      ctx.bezierCurveTo(-4.5, 17, 4.5, 17, 6.5, 13);
      ctx.bezierCurveTo(8, 5, 8, -8, 5.5, -17);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = p.pawLine;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-2, 11); ctx.lineTo(-1.7, 15);
      ctx.moveTo(2, 11); ctx.lineTo(1.7, 15);
      ctx.stroke();
      ctx.restore();
    };
    leg(-1, motion.pawLeft);
    leg(1, motion.pawRight);
  },

  _head(ctx, o, p, state, motion, t) {
    this._ears(ctx, p, motion, t);

    ctx.fillStyle = p.fur;
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-29, -23);
    ctx.bezierCurveTo(-21, -34, -12, -37, -4, -36);
    ctx.lineTo(-2, -42 + motion.furDrift);
    ctx.lineTo(3, -36);
    ctx.lineTo(8, -40 - motion.furDrift * 0.5);
    ctx.lineTo(10, -34);
    ctx.bezierCurveTo(18, -35, 27, -31, 31, -23);
    ctx.lineTo(36, -26);
    ctx.lineTo(35, -19);
    ctx.bezierCurveTo(40, -11, 39, -2, 33, 5);
    ctx.lineTo(37, 8);
    ctx.lineTo(31, 10);
    ctx.bezierCurveTo(29, 20, 19, 27, 8, 27);
    ctx.lineTo(4, 31 + motion.furDrift * 0.4);
    ctx.lineTo(0, 27);
    ctx.lineTo(-5, 31 - motion.furDrift * 0.3);
    ctx.lineTo(-8, 26);
    ctx.bezierCurveTo(-20, 27, -30, 20, -32, 10);
    ctx.lineTo(-38, 8);
    ctx.lineTo(-33, 3);
    ctx.bezierCurveTo(-38, -6, -36, -16, -29, -23);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.beginPath();
    ctx.ellipse(-17, -24, 10, 4.5, -0.35, 0, Math.PI * 2);
    ctx.fill();

    this._chestRuff(ctx, p);
    this._face(ctx, o, p, state, t);
  },

  _ears(ctx, p, motion, t) {
    const sway = Math.sin(t * 0.0038) * 0.025;

    ctx.save();
    ctx.translate(-25, -20 + motion.earLift);
    ctx.rotate(-0.12 - sway);
    ctx.fillStyle = p.ear;
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(2, -1);
    ctx.bezierCurveTo(-7, -6, -18, -2, -21, 8);
    ctx.bezierCurveTo(-25, 20, -18, 29, -9, 29);
    ctx.bezierCurveTo(-1, 28, 3, 19, 5, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.52)';
    ctx.beginPath();
    ctx.ellipse(-11, 5, 7.5, 3.4, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.earInner;
    ctx.globalAlpha = 0.34;
    ctx.beginPath();
    ctx.ellipse(-12, 16, 6, 9, 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(26, -19 + motion.earLift * 0.8);
    ctx.rotate(0.1 + sway * 0.7);
    ctx.fillStyle = p.ear;
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(-2, -1);
    ctx.bezierCurveTo(7, -5, 17, 0, 21, 10);
    ctx.bezierCurveTo(25, 21, 18, 30, 10, 30);
    ctx.bezierCurveTo(2, 29, -3, 20, -5, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.48)';
    ctx.beginPath();
    ctx.ellipse(10, 5, 7, 3.2, 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.earInner;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.ellipse(12, 17, 5.5, 9.5, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  _chestRuff(ctx, p) {
    ctx.fillStyle = p.furLight;
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 1.05;
    ctx.beginPath();
    ctx.moveTo(-27, 13);
    ctx.bezierCurveTo(-21, 18, -17, 20, -12, 20);
    ctx.lineTo(-9, 25);
    ctx.lineTo(-4, 23);
    ctx.lineTo(0, 29);
    ctx.lineTo(5, 23);
    ctx.lineTo(10, 25);
    ctx.lineTo(13, 20);
    ctx.bezierCurveTo(19, 20, 24, 17, 28, 12);
    ctx.bezierCurveTo(25, 25, 17, 32, 7, 32);
    ctx.lineTo(2, 37);
    ctx.lineTo(-2, 32);
    ctx.lineTo(-8, 36);
    ctx.lineTo(-11, 31);
    ctx.bezierCurveTo(-20, 30, -25, 24, -27, 13);
    ctx.fill();
    ctx.stroke();
  },

  _face(ctx, o, p, state, t) {
    const blink = state !== 'sad' && (t % 4300) < 140;
    let eyeStyle = o.eye;
    if (blink) eyeStyle = 'closed';
    if (state === 'happy') eyeStyle = 'content';
    if (state === 'sad') eyeStyle = 'sad';
    if (state === 'yawn') eyeStyle = 'half';
    if (state === 'bark') eyeStyle = 'wide';

    this._cheeks(ctx, p);
    ctx.save();
    ctx.globalAlpha = 0.23;
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-15, -13); ctx.quadraticCurveTo(-12, -14.5, -9, -13);
    ctx.moveTo(10, -12); ctx.quadraticCurveTo(13, -13.5, 16, -11.5);
    ctx.stroke();
    ctx.restore();
    this._eyes(ctx, p, eyeStyle, t);

    ctx.fillStyle = p.nose;
    ctx.beginPath();
    ctx.ellipse(1, 4, 4.5, 3.1, 0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.ellipse(-0.4, 2.9, 1.1, 0.7, -0.3, 0, Math.PI * 2);
    ctx.fill();

    if (state === 'bark') {
      const open = Math.max(o.mouthOpen, 0.7);
      ctx.fillStyle = p.mouth;
      ctx.beginPath();
      ctx.ellipse(1, 11, 5.5, 4 + open * 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.tongue;
      ctx.beginPath();
      ctx.ellipse(1, 14, 3.4, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (state === 'yawn') {
      ctx.fillStyle = p.mouth;
      ctx.beginPath();
      ctx.ellipse(1, 12, 4.8, 6.5 + o.mouthOpen * 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = p.tongue;
      ctx.beginPath();
      ctx.ellipse(1, 16, 3.2, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (state === 'sad') {
      ctx.strokeStyle = p.mouth;
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(1, 14, 4.2, Math.PI, 0, false);
      ctx.stroke();
      this._tear(ctx, p, -13, 0, o.phase);
      return;
    }

    ctx.strokeStyle = p.mouth;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(1, 7);
    ctx.quadraticCurveTo(0, 11, -5, 10);
    ctx.moveTo(1, 7);
    ctx.quadraticCurveTo(2, 11, 7, 10);
    ctx.stroke();

    ctx.fillStyle = p.tongue;
    ctx.strokeStyle = '#C96F74';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-3, 10);
    ctx.bezierCurveTo(-3, 16, -1, 18, 1, 18);
    ctx.bezierCurveTo(3.3, 18, 4.3, 16, 4, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(1, 13); ctx.lineTo(1, 17);
    ctx.stroke();
  },

  _eyes(ctx, p, style, t = 0) {
    const gaze = t ? Math.sin(t * 0.0017) * 0.45 : 0;
    const sparkle = t ? 0.9 + Math.sin(t * 0.006) * 0.1 : 1;
    const eye = (x, y, rx, ry, angle, mirror) => {
      if (style === 'content' || style === 'closed') {
        ctx.strokeStyle = p.eye;
        ctx.lineWidth = 2.1;
        ctx.lineCap = 'round';
        ctx.beginPath();
        const closedY = y + (style === 'content' ? 1 : 2);
        ctx.arc(x, closedY, rx * 0.9, Math.PI + 0.18, Math.PI * 2 - 0.18);
        ctx.stroke();
        return;
      }
      if (style === 'sad') {
        ctx.fillStyle = p.eye;
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, angle, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = p.eye;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x - 3.5, y - ry - 2 + mirror);
        ctx.lineTo(x + 3.5, y - ry + mirror);
        ctx.stroke();
      } else if (style === 'half') {
        ctx.fillStyle = p.eye;
        ctx.beginPath();
        ctx.ellipse(x, y + 1, rx, ry * 0.48, angle, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const wide = style === 'wide';
        ctx.fillStyle = p.eye;
        ctx.beginPath();
        ctx.ellipse(x, y, wide ? rx * 1.08 : rx, wide ? ry * 1.08 : ry, angle, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = p.eyeGlow;
      ctx.globalAlpha = sparkle;
      ctx.beginPath();
      ctx.arc(x - rx * 0.28 + gaze, y - ry * 0.38, rx * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.48;
      ctx.beginPath();
      ctx.arc(x + rx * 0.34 + gaze * 0.5, y + ry * 0.38, rx * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    };
    eye(-12.5, -4.5, 5.1, 6.4, 0.16, -1);
    eye(13.5, -3.5, 5.7, 7.1, -0.12, 1);
  },

  _cheeks(ctx, p) {
    ctx.fillStyle = p.blush;
    ctx.beginPath();
    ctx.ellipse(-21, 7, 8, 3.8, -0.12, 0, Math.PI * 2);
    ctx.ellipse(21, 8, 7.5, 3.6, 0.12, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = '#D4777D';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-24, 6); ctx.lineTo(-20, 4.5);
    ctx.moveTo(-21, 9); ctx.lineTo(-17, 7.5);
    ctx.moveTo(17, 8); ctx.lineTo(21, 6.5);
    ctx.moveTo(20, 10); ctx.lineTo(24, 8.5);
    ctx.stroke();
    ctx.restore();
  },

  _tear(ctx, p, x, y, phase) {
    const drop = (Math.sin(phase * Math.PI * 2) * 0.5 + 0.5) * 6;
    ctx.fillStyle = p.tear;
    ctx.beginPath();
    ctx.ellipse(x, y + drop, 2, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
  },

  _drawSleep(ctx, o, p, t) {
    const breathWave = Math.sin(t * 0.0022);
    const breathe = 1 + breathWave * 0.028;
    const headSink = breathWave * 0.35;
    const twitchCycle = t % 7200;
    const earTwitch = twitchCycle > 6500
      ? Math.sin(((twitchCycle - 6500) / 700) * Math.PI) * 0.07
      : 0;
    ctx.save();
    this._shadow(ctx, p, 1, 42, 45);

    // 睡姿专用的小翘尾：身体呼吸时只做轻微惯性摆动。
    ctx.save();
    ctx.translate(30, -3 + breathWave * 0.25);
    ctx.rotate(0.11 + breathWave * 0.025);
    ctx.fillStyle = p.fur;
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 1.6;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-3, 11);
    ctx.bezierCurveTo(5, 10, 11, 4, 10, -4);
    ctx.lineTo(15, 0);
    ctx.lineTo(16, -11);
    ctx.bezierCurveTo(23, -4, 22, 6, 16, 11);
    ctx.bezierCurveTo(10, 16, 3, 16, -3, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 后方侧卧的躯干：不随头部移动，只做缓慢的腹部起伏。
    ctx.save();
    ctx.translate(8, 8);
    ctx.scale(1, breathe);
    ctx.fillStyle = p.ear;
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-11, -8);
    ctx.bezierCurveTo(2, -18, 25, -15, 36, -3);
    ctx.bezierCurveTo(47, 10, 43, 27, 31, 31);
    ctx.bezierCurveTo(21, 35, 11, 28, 1, 25);
    ctx.bezierCurveTo(-9, 22, -20, 4, -11, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    ctx.beginPath();
    ctx.ellipse(27, -1, 10, 6, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 折起的后腿压在身体前方，脚趾朝向右下。
    ctx.fillStyle = p.ear;
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 1.55;
    ctx.beginPath();
    ctx.moveTo(17, 18);
    ctx.bezierCurveTo(24, 11, 35, 13, 39, 20);
    ctx.bezierCurveTo(44, 29, 35, 35, 24, 33);
    ctx.bezierCurveTo(16, 32, 11, 26, 17, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = p.pawLine;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(34, 18); ctx.bezierCurveTo(39, 23, 37, 29, 33, 32);
    ctx.moveTo(29, 28); ctx.quadraticCurveTo(31, 31, 34, 31);
    ctx.moveTo(26, 27); ctx.quadraticCurveTo(28, 31, 30, 32);
    ctx.stroke();

    // 远侧前爪先画，近侧前爪覆盖其上，形成头枕在双爪上的层次。
    ctx.fillStyle = p.furShade;
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 1.45;
    ctx.beginPath();
    ctx.moveTo(5, 15);
    ctx.bezierCurveTo(14, 15, 23, 20, 26, 25);
    ctx.bezierCurveTo(29, 30, 24, 35, 16, 35);
    ctx.lineTo(-4, 34);
    ctx.bezierCurveTo(-11, 33, -14, 29, -10, 25);
    ctx.bezierCurveTo(-6, 21, 0, 18, 5, 15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = p.fur;
    ctx.beginPath();
    ctx.moveTo(-28, 20);
    ctx.bezierCurveTo(-21, 17, -15, 20, -11, 24);
    ctx.bezierCurveTo(-6, 27, 2, 28, 8, 30);
    ctx.bezierCurveTo(15, 33, 12, 38, 4, 39);
    ctx.lineTo(-25, 39);
    ctx.bezierCurveTo(-35, 39, -41, 35, -40, 30);
    ctx.bezierCurveTo(-39, 25, -33, 22, -28, 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = p.pawLine;
    ctx.lineWidth = 0.95;
    ctx.beginPath();
    ctx.moveTo(-32, 31); ctx.quadraticCurveTo(-30, 36, -27, 37);
    ctx.moveTo(-28, 29); ctx.quadraticCurveTo(-26, 35, -23, 37);
    ctx.stroke();

    // 左右耳朵使用不同轮廓：左耳完全摊地，右耳被身体托住。
    ctx.save();
    ctx.translate(-17, 6 + headSink);
    ctx.rotate(-0.085);

    ctx.save();
    ctx.translate(-20, -10);
    ctx.rotate(-0.23 - earTwitch);
    ctx.fillStyle = p.ear;
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 1.65;
    ctx.beginPath();
    ctx.moveTo(2, -4);
    ctx.bezierCurveTo(-8, -7, -19, 0, -22, 11);
    ctx.bezierCurveTo(-25, 23, -17, 29, -8, 27);
    ctx.bezierCurveTo(0, 25, 4, 14, 5, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    ctx.beginPath();
    ctx.ellipse(-11, 3, 7, 3, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(18, -12);
    ctx.rotate(0.18 + earTwitch * 0.45);
    ctx.fillStyle = p.ear;
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-2, -3);
    ctx.bezierCurveTo(7, -5, 16, 2, 17, 11);
    ctx.bezierCurveTo(18, 20, 11, 24, 5, 21);
    ctx.bezierCurveTo(-1, 18, -4, 8, -5, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 头部的下沿贴住前爪，呼吸时仅上下沉浮不到一个像素。
    ctx.fillStyle = p.fur;
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-23, -11);
    ctx.bezierCurveTo(-18, -23, -5, -28, 8, -25);
    ctx.lineTo(12, -28);
    ctx.lineTo(14, -23);
    ctx.bezierCurveTo(24, -18, 29, -7, 25, 4);
    ctx.bezierCurveTo(22, 15, 13, 20, 1, 20);
    ctx.bezierCurveTo(-11, 21, -22, 16, -25, 7);
    ctx.bezierCurveTo(-28, 0, -27, -5, -23, -11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = p.furShade;
    ctx.globalAlpha = 0.62;
    ctx.beginPath();
    ctx.ellipse(0, 7.5, 13.5, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = p.blush;
    ctx.beginPath();
    ctx.ellipse(-16, 7, 6.5, 2.8, -0.15, 0, Math.PI * 2);
    ctx.ellipse(16, 7, 6, 2.6, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // 厚而松弛的闭眼线，比普通“开心眼”更像真正入睡。
    ctx.strokeStyle = p.eye;
    ctx.lineWidth = 2.25;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-15, -3);
    ctx.bezierCurveTo(-12, 2, -7, 3, -4, -2);
    ctx.moveTo(6, -3);
    ctx.bezierCurveTo(9, 1, 14, 2, 17, -3);
    ctx.stroke();

    ctx.fillStyle = p.nose;
    ctx.beginPath();
    ctx.ellipse(1, 5.5, 5, 3.5, -0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(-0.5, 4.3, 1.25, 0.7, -0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = p.mouth;
    ctx.lineWidth = 1.45;
    ctx.beginPath();
    ctx.moveTo(1, 8.5);
    ctx.quadraticCurveTo(-1, 12.5, -5, 11.5);
    ctx.moveTo(1, 8.5);
    ctx.quadraticCurveTo(3, 12.5, 7, 11.5);
    ctx.stroke();
    ctx.restore();
    ctx.restore();
  },

  _drawRoll(ctx, o, p, t) {
    const wave = Math.sin(t * 0.018);
    ctx.save();
    ctx.translate(0, -3);
    ctx.scale(1.12, 1.12);
    this._shadow(ctx, p, 1, 40, 38);

    ctx.fillStyle = p.ear;
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(0, 19, 31, 21, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = p.furLight;
    ctx.beginPath();
    ctx.ellipse(0, 14, 20, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    const paw = (x, phase) => {
      ctx.save();
      ctx.translate(x, 1 + Math.sin(t * 0.02 + phase) * 4);
      ctx.rotate(Math.sin(t * 0.015 + phase) * 0.2);
      ctx.fillStyle = p.fur;
      ctx.strokeStyle = p.outline;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(0, 0, 5.5, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };
    paw(-12, 0);
    paw(-4, Math.PI / 2);
    paw(6, Math.PI);
    paw(14, Math.PI * 1.5);

    ctx.save();
    ctx.translate(0, 22);
    ctx.rotate(wave * 0.05);
    ctx.save();
    ctx.scale(0.68, 0.68);
    this._ears(ctx, p, { earLift: 0 }, t);
    ctx.restore();
    ctx.fillStyle = p.fur;
    ctx.strokeStyle = p.outline;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, -9, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.translate(0, -9);
    ctx.save();
    ctx.scale(0.68, 0.68);
    this._cheeks(ctx, p);
    this._eyes(ctx, p, 'content', t);
    ctx.restore();
    ctx.fillStyle = p.nose;
    ctx.beginPath(); ctx.ellipse(0, 3, 3.5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = p.mouth;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.quadraticCurveTo(-1, 9, -5, 8);
    ctx.moveTo(0, 5);
    ctx.quadraticCurveTo(1, 9, 5, 8);
    ctx.stroke();
    ctx.fillStyle = p.tongue;
    ctx.beginPath(); ctx.ellipse(0, 10, 2.8, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    ctx.restore();
  },
};

if (typeof Pet !== 'undefined' && Pet.registerType) {
  Pet.registerType('dog', dogRenderer);
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = dogRenderer;
}
