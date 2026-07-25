// pet-image-factory.js — 自定义图片形象工厂（升级功能）
// 把 CustomPetConfig 转成符合 Pet renderer 契约的对象并注册。
// 契约：{ name, palette, init?(pet): Promise, draw(ctx, o) }
//
// 要点：
// - 复用引擎动画：图片形象自动享有 idle 呼吸 / walk 摆动倾斜 / jump 抛物线 /
//   sit 压扁 / yawn 张嘴（由引擎变换驱动，图片整体跟着动），无需自画关键帧。
// - 可选叠加表情：默认不叠加（保留原图神态），用户可在表单勾选让原图片随
//   state 变化眼睛 / 嘴 / sad 泪滴。

function createImagePet(config) {
  const img = new Image();
  let ready = false;
  const w = config.width || 64;
  const h = config.height || 64;
  const overlay = Object.assign(
    { eyes: false, mouth: false, tear: true },
    config.overlay || {}
  );

  return {
    name: config.id,
    palette: Object.assign({ tear: '#7EC8FF' }, config.palette || {}),

    init() {
      // 引擎在 setPetType 时调用；幂等：已就绪直接 resolve
      if (ready) return Promise.resolve();
      return new Promise((resolve, reject) => {
        img.onload = () => { ready = true; resolve(); };
        img.onerror = (e) => { ready = false; reject(e); };
        img.src = config.imageSrc;
      });
    },

    draw(ctx, o) {
      if (!ready) return;
      // 引擎已 translate(cx, cy+bob) + rotate(tilt) + scale(1, scaleY)
      // 这里只需把图片以 (0,0) 为中心绘制
      ctx.drawImage(img, -w / 2, -h / 2, w, h);

      // 可选：根据用户配置叠加引擎自带眼神 / 嘴
      if (overlay.eyes) {
        // Pet.eyes(ctx, lx, rx, ey, style, radius)
        o.utils.eyes(ctx, -w / 5, w / 5, -h / 8, o.eye, 2.6);
      }
      if (overlay.mouth) {
        o.utils.mouth(ctx, 0, h / 6, o.mouth, o.mouthOpen);
      }
      // sad 时叠加泪滴（默认开启，与内置形象行为一致；可由 palette.tear 调色）
      if (overlay.tear && o.state === 'sad') {
        o.utils.tear(ctx, -w / 4, -h / 4, o.phase);
      }
    },
  };
}

// 便捷注册入口（返回 bool，与 Pet.registerType 一致）
function registerCustomPet(config) {
  if (typeof Pet === 'undefined' || !Pet.registerType) return false;
  return Pet.registerType(config.id, createImagePet(config));
}

if (typeof window !== 'undefined') {
  window.createImagePet = createImagePet;
  window.registerCustomPet = registerCustomPet;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createImagePet, registerCustomPet };
}
