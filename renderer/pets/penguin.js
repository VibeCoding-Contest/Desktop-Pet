const penguinRenderer = {
  name: 'penguin',
  palette: { body: '#2B2B2B', dark: '#0e0e0e', belly: '#FFFFFF', beak: '#F4A020', beakDark: '#C97A1F', feet: '#F4A020' },
  draw(ctx, o) {
    const TAU = Math.PI * 2;
    const r = o.r, p = o.palette;
    const flap = Math.sin(o.phase * TAU) * 0.35;

    ctx.fillStyle = p.feet; ctx.strokeStyle = p.beakDark; ctx.lineWidth = 1.2;
    const foot = (s) => {
      ctx.save();
      ctx.translate(s * 6, r * 0.95 + (s < 0 ? o.legSwing : -o.legSwing) * 0.4);
      ctx.beginPath();
      ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.lineTo(s * 2, 5);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    };
    foot(-1); foot(1);

    ctx.fillStyle = p.body; ctx.strokeStyle = p.dark; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.9, r * 1.12, 0, 0, TAU); ctx.fill(); ctx.stroke();

    const flip = (s) => {
      ctx.save();
      ctx.translate(s * r * 0.85, 2);
      ctx.rotate(s * (0.2 + flap));
      ctx.fillStyle = p.dark;
      ctx.beginPath(); ctx.ellipse(0, 3, 4, 8, 0, 0, TAU); ctx.fill();
      ctx.restore();
    };
    flip(-1); flip(1);

    ctx.fillStyle = p.belly;
    ctx.beginPath(); ctx.ellipse(0, 3, r * 0.55, r * 0.78, 0, 0, TAU); ctx.fill();

    const eyeY = -4;
    const drawEye = (x) => {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(x, eyeY, 2.4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#111';
      const py = eyeY + (o.eye === 'sad' ? 1 : 0);
      ctx.beginPath(); ctx.arc(x + (o.eye === 'sad' ? -0.6 : 0), py, 1.3, 0, TAU); ctx.fill();
      if (o.eye === 'content') {
        ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, eyeY, 2.4, Math.PI, 0); ctx.stroke();
      }
      if (o.eye === 'half') {
        ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x - 2.5, eyeY - 1); ctx.lineTo(x + 2.5, eyeY - 1); ctx.stroke();
      }
    };
    drawEye(-5); drawEye(5);

    const by = 1;
    const open = (o.mouth === 'o' || o.mouth === 'yawn') ? Math.max(o.mouthOpen, 0.2) : 0;
    ctx.fillStyle = p.beak; ctx.strokeStyle = p.beakDark; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-5, by); ctx.lineTo(5, by); ctx.lineTo(0, by + 5);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    if (open > 0) {
      ctx.beginPath();
      ctx.moveTo(-4, by + 2 + open * 4); ctx.lineTo(4, by + 2 + open * 4); ctx.lineTo(0, by + 6 + open * 6);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }

    if (o.state === 'sad') o.utils.tear(ctx, -8, -2, o.phase);
  },
};

if (typeof Pet !== 'undefined' && Pet.registerType) {
  Pet.registerType('penguin', penguinRenderer);
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = penguinRenderer;
}
