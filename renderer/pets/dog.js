const dogRenderer = {
  name: 'dog',
  palette: { body: '#B5773F', dark: '#7E4F24', muzzle: '#E5CFA6', nose: '#222', tongue: '#E8797C', spot: '#7E4F24', paw: '#7E4F24' },
  draw(ctx, o) {
    const TAU = Math.PI * 2;
    const r = o.r, p = o.palette;
    const wag = Math.sin(o.phase * TAU * 2) * 6;

    ctx.strokeStyle = p.dark; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(r - 4, 2);
    ctx.quadraticCurveTo(r + 6, -4, r + 9, -10 + wag);
    ctx.stroke();

    ctx.fillStyle = p.paw;
    ctx.beginPath();
    ctx.ellipse(-6, r - 2 + o.legSwing, 4, 4, 0, 0, TAU);
    ctx.ellipse(6, r - 2 - o.legSwing, 4, 4, 0, 0, TAU);
    ctx.fill();

    const ear = (s) => {
      ctx.save();
      ctx.translate(s * (r - 3), 2);
      ctx.rotate(s * (0.15 + Math.sin(o.phase * TAU * 2) * 0.1));
      ctx.fillStyle = p.dark;
      ctx.beginPath();
      ctx.ellipse(0, 8, 6, 11, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    };
    ear(-1); ear(1);

    ctx.fillStyle = p.body; ctx.strokeStyle = p.dark; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();

    ctx.fillStyle = p.spot;
    ctx.beginPath(); ctx.ellipse(7, -6, 6, 5, 0.3, 0, TAU); ctx.fill();

    ctx.fillStyle = p.muzzle;
    ctx.beginPath(); ctx.ellipse(0, 7, 10, 7, 0, 0, TAU); ctx.fill();

    ctx.fillStyle = p.nose;
    ctx.beginPath(); ctx.arc(0, 3, 2.8, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.beginPath(); ctx.arc(-1, 2, 1, 0, TAU); ctx.fill();

    if (o.mouth === 'smile') {
      ctx.fillStyle = p.tongue; ctx.strokeStyle = '#b35560'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.ellipse(0, 10, 3.5, 5, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 7); ctx.lineTo(0, 12); ctx.stroke();
    } else if (o.mouth === 'o' || o.mouth === 'yawn') {
      o.utils.mouth(ctx, 0, 9, o.mouth, Math.max(o.mouthOpen, 0.5));
    } else {
      o.utils.mouth(ctx, 0, 9, o.mouth, o.mouthOpen);
    }

    o.utils.eyes(ctx, -6, 6, -2, o.eye, 2.8);

    if (o.state === 'sad') o.utils.tear(ctx, -11, 1, o.phase);
  },
};

if (typeof Pet !== 'undefined' && Pet.registerType) {
  Pet.registerType('dog', dogRenderer);
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = dogRenderer;
}
