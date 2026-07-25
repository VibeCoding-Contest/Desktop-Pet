const catRenderer = {
  name: 'cat',
  palette: { body: '#E8922E', dark: '#7E4A1A', inner: '#F7B5C4', nose: '#C9706E', stripe: '#A85A1A', paw: '#7E4A1A' },
  draw(ctx, o) {
    const TAU = Math.PI * 2;
    const r = o.r, p = o.palette;
    const sway = Math.sin(o.phase * TAU) * 5;

    ctx.strokeStyle = p.dark; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(r - 4, 6);
    ctx.quadraticCurveTo(r + 10, 2, r + 13, -10 + sway);
    ctx.stroke();
    ctx.fillStyle = p.body;
    ctx.beginPath(); ctx.arc(r + 13, -10 + sway, 3.5, 0, TAU); ctx.fill();

    ctx.fillStyle = p.paw;
    ctx.beginPath();
    ctx.ellipse(-6, r - 2 + o.legSwing, 4, 4, 0, 0, TAU);
    ctx.ellipse(6, r - 2 - o.legSwing, 4, 4, 0, 0, TAU);
    ctx.fill();

    ctx.fillStyle = p.body; ctx.strokeStyle = p.dark; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();

    const ear = (s) => {
      ctx.fillStyle = p.body; ctx.strokeStyle = p.dark; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s * 5, -r + 3);
      ctx.lineTo(s * 11, -r - 11);
      ctx.lineTo(s * 1, -r - 1);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = p.inner;
      ctx.beginPath();
      ctx.moveTo(s * 5, -r + 1);
      ctx.lineTo(s * 8, -r - 6);
      ctx.lineTo(s * 2, -r - 2);
      ctx.closePath(); ctx.fill();
    };
    ear(-1); ear(1);

    ctx.strokeStyle = p.stripe; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 4, -r + 2);
      ctx.lineTo(i * 4, -r + 8);
      ctx.stroke();
    }

    o.utils.eyes(ctx, -6, 6, -1, o.eye, 2.6);
    if (o.eye === 'normal' || o.eye === 'wide' || o.eye === 'half') {
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.ellipse(-6, -1, 0.9, 3, 0, 0, TAU);
      ctx.ellipse(6, -1, 0.9, 3, 0, 0, TAU);
      ctx.fill();
    }

    ctx.fillStyle = p.nose;
    ctx.beginPath();
    ctx.moveTo(-2, 3); ctx.lineTo(2, 3); ctx.lineTo(0, 6);
    ctx.closePath(); ctx.fill();

    if (o.mouth === 'smile') {
      ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 6); ctx.lineTo(0, 8);
      ctx.moveTo(0, 8); ctx.quadraticCurveTo(-4, 10, -3, 12);
      ctx.moveTo(0, 8); ctx.quadraticCurveTo(4, 10, 3, 12);
      ctx.stroke();
    } else {
      o.utils.mouth(ctx, 0, 9, o.mouth, o.mouthOpen);
    }

    ctx.strokeStyle = p.dark; ctx.lineWidth = 1; ctx.lineCap = 'round';
    const wz = (s) => {
      ctx.beginPath();
      ctx.moveTo(s * 7, 4); ctx.lineTo(s * 16, 2);
      ctx.moveTo(s * 7, 6); ctx.lineTo(s * 16, 6);
      ctx.moveTo(s * 7, 8); ctx.lineTo(s * 16, 10);
      ctx.stroke();
    };
    wz(-1); wz(1);

    if (o.state === 'sad') o.utils.tear(ctx, -11, 0, o.phase);
  },
};

if (typeof Pet !== 'undefined' && Pet.registerType) {
  Pet.registerType('cat', catRenderer);
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = catRenderer;
}
