// pet-creator.js — 自定义形象创建器 UI（升级功能）
// 浮动表单：图片选择 + 字段 + 实时预览 + 提交校验
// DOM 由 JS 动态创建，不污染 index.html。
//
// 流程：
//   1. 选图（FileReader.readAsDataURL）→ 预览
//   2. 填字段：label / id（自动生成）/ width / height / overlay 勾选
//   3. 提交：校验 → 压缩图 → registerCustomPet（立即可用）→ saveCustomPet（落盘）
//      → emit('pet:customAdded') → emit('menu:switchPet') 切过去
//
// 预览：独立 canvas 跑轻量 idle 动画（bob），不污染 Pet.TYPES。

class PetCreator {
  constructor({ canvas, pet, eventBus }) {
    this.hostCanvas = canvas;
    this.pet = pet;
    this.eventBus = eventBus;

    this.el = null;
    this.previewCanvas = null;
    this.previewCtx = null;
    this.fileInput = null;
    this.labelInput = null;
    this.idInput = null;
    this.wInput = null;
    this.hInput = null;
    this.eyesCb = null;
    this.mouthCb = null;
    this.tearCb = null;
    this.errorEl = null;

    this.previewImg = null;       // 预览用 Image
    this.imageDataUrl = '';       // 原始 data URL
    this._raf = null;
    this._phase = 0;
    this._lastTs = 0;
    this._idTouched = false;      // 用户是否手改过 id

    this._build();
  }

  // ---------- DOM 构建 ----------
  _build() {
    const overlay = document.createElement('div');
    overlay.className = 'pet-creator-overlay';
    overlay.innerHTML = `
      <div class="pet-creator" role="dialog" aria-modal="true">
        <div class="pet-creator-header">
          <span>添加自定义形象</span>
          <button class="pet-creator-close" title="取消">×</button>
        </div>
        <div class="pet-creator-body">
          <div class="pet-creator-left">
            <label class="pet-creator-filebtn">
              选择图片…
              <input type="file" accept="image/*" hidden>
            </label>
            <canvas class="pet-creator-preview" width="160" height="160"></canvas>
            <div class="pet-creator-hint">建议 PNG 透明背景</div>
          </div>
          <div class="pet-creator-right">
            <label class="pc-field">
              <span>显示名</span>
              <input type="text" class="pc-label" placeholder="例如：科比" maxlength="20">
            </label>
            <label class="pc-field">
              <span>ID</span>
              <input type="text" class="pc-id" placeholder="kobe" maxlength="32">
            </label>
            <div class="pc-field pc-row">
              <label><span>宽</span><input type="number" class="pc-w" min="16" max="256" value="64"></label>
              <span class="pc-x">×</span>
              <label><span>高</span><input type="number" class="pc-h" min="16" max="256" value="64"></label>
            </div>
            <label class="pc-check"><input type="checkbox" class="pc-eyes"> 叠加引擎眼神</label>
            <label class="pc-check"><input type="checkbox" class="pc-mouth"> 叠加引擎嘴部</label>
            <label class="pc-check"><input type="checkbox" class="pc-tear" checked> sad 时叠加泪滴</label>
            <div class="pet-creator-error"></div>
          </div>
        </div>
        <div class="pet-creator-footer">
          <button class="pc-btn pc-cancel">取消</button>
          <button class="pc-btn pc-submit">注册并使用</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    this.el = overlay;

    this.previewCanvas = overlay.querySelector('.pet-creator-preview');
    this.previewCtx = this.previewCanvas.getContext('2d');
    this.fileInput = overlay.querySelector('input[type=file]');
    this.labelInput = overlay.querySelector('.pc-label');
    this.idInput = overlay.querySelector('.pc-id');
    this.wInput = overlay.querySelector('.pc-w');
    this.hInput = overlay.querySelector('.pc-h');
    this.eyesCb = overlay.querySelector('.pc-eyes');
    this.mouthCb = overlay.querySelector('.pc-mouth');
    this.tearCb = overlay.querySelector('.pc-tear');
    this.errorEl = overlay.querySelector('.pet-creator-error');

    // 事件
    overlay.querySelector('.pet-creator-close').addEventListener('click', () => this.destroy());
    overlay.querySelector('.pc-cancel').addEventListener('click', () => this.destroy());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.destroy();
    });
    this.fileInput.addEventListener('change', (e) => this._onFile(e));
    this.labelInput.addEventListener('input', () => this._onLabelChange());
    this.idInput.addEventListener('input', () => { this._idTouched = !!this.idInput.value; });
    [this.wInput, this.hInput, this.eyesCb, this.mouthCb, this.tearCb].forEach((c) => {
      c.addEventListener('input', () => this._renderPreview());
    });

    // Esc 关闭
    this._keyHandler = (e) => {
      if (e.key === 'Escape') this.destroy();
    };
    window.addEventListener('keydown', this._keyHandler);
  }

  // ---------- 图片选择 ----------
  _onFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      this._setError('请选择图片文件（PNG / JPG / WebP）');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.imageDataUrl = String(reader.result || '');
      this.previewImg = new Image();
      this.previewImg.onload = () => {
        // 用图片真实尺寸初始化宽高（上限 128）
        const maxSide = 128;
        const scale = Math.min(1, maxSide / Math.max(this.previewImg.width, this.previewImg.height));
        const w = Math.max(16, Math.round(this.previewImg.width * scale));
        const h = Math.max(16, Math.round(this.previewImg.height * scale));
        this.wInput.value = w;
        this.hInput.value = h;
        this._renderPreview();
      };
      this.previewImg.onerror = () => this._setError('图片加载失败，文件可能已损坏');
      this.previewImg.src = this.imageDataUrl;

      // label 为空时用文件名预填
      if (!this.labelInput.value) {
        const base = file.name.replace(/\.[^.]+$/, '');
        this.labelInput.value = base;
        this._onLabelChange();
      }
    };
    reader.onerror = () => this._setError('读取文件失败');
    reader.readAsDataURL(file);
  }

  _onLabelChange() {
    if (this._idTouched) return;
    const slug = PetCreator.slugify(this.labelInput.value);
    this.idInput.value = slug;
  }

  // ---------- 实时预览 ----------
  _renderPreview() {
    if (!this.previewImg || !this.previewImg.complete) return;
    const ctx = this.previewCtx;
    const W = this.previewCanvas.width;
    const H = this.previewCanvas.height;
    ctx.clearRect(0, 0, W, H);

    const w = Math.max(16, parseInt(this.wInput.value, 10) || 64);
    const h = Math.max(16, parseInt(this.hInput.value, 10) || 64);
    const fit = Math.min(W / w, H / h, 2.2);
    const dw = w * fit;
    const dh = h * fit;

    // 轻量 idle 动画：bob 呼吸（与引擎 idle 一致的 1.5px 幅度）
    const bob = Math.sin(this._phase * Math.PI * 2) * 1.5;
    const tilt = 0;
    ctx.save();
    ctx.translate(W / 2, H / 2 + bob);
    ctx.rotate(tilt);
    ctx.drawImage(this.previewImg, -dw / 2, -dh / 2, dw, dh);

    // 可选叠加（位置与 factory 一致，按预览缩放映射）
    const sx = dw / w, sy = dh / h;
    if (this.eyesCb.checked && typeof Pet !== 'undefined' && Pet.eyes) {
      Pet.eyes(ctx, (-w / 5) * sx, (w / 5) * sx, (-h / 8) * sy, 'normal', 2.6 * sx);
    }
    if (this.mouthCb.checked && typeof Pet !== 'undefined' && Pet.mouth) {
      Pet.mouth(ctx, 0, (h / 6) * sy, 'smile', 0);
    }
    ctx.restore();
  }

  _startLoop() {
    this._lastTs = performance.now();
    const tick = (now) => {
      const dt = now - this._lastTs;
      this._lastTs = now;
      // 与引擎 idle 周期相近（duration 180ms / 4 帧）
      this._phase += dt / (180 * 4);
      this._phase %= 1;
      this._renderPreview();
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  // ---------- 提交 ----------
  async _submit() {
    this._setError('');
    const label = this.labelInput.value.trim();
    const id = PetCreator.slugify(this.idInput.value);
    if (!label) return this._setError('请填写显示名');
    if (!id) return this._setError('ID 无效（仅允许字母/数字/连字符）');
    if (!this.imageDataUrl || !this.previewImg) return this._setError('请先选择图片');
    // id 唯一性：检查已注册形象（含内置）
    if (typeof Pet !== 'undefined' && Pet.TYPES && Pet.TYPES[id]) {
      return this._setError(`ID「${id}」已被占用，请换一个`);
    }

    const w = Math.max(16, Math.min(256, parseInt(this.wInput.value, 10) || 64));
    const h = Math.max(16, Math.min(256, parseInt(this.hInput.value, 10) || 64));
    const overlay = {
      eyes: this.eyesCb.checked,
      mouth: this.mouthCb.checked,
      tear: this.tearCb.checked,
    };

    // 压缩图到 ≤128px 并统一 PNG（避免 base64 膨胀 / 显存压力）
    const compressed = await PetCreator.compressImage(this.imageDataUrl, 128).catch(() => null);
    const finalDataUrl = (compressed && compressed.dataUrl) || this.imageDataUrl;
    const finalW = compressed ? compressed.width : w;
    const finalH = compressed ? compressed.height : h;

    const config = {
      id,
      label,
      imageSrc: finalDataUrl,
      width: finalW,
      height: finalH,
      overlay,
    };

    // 1. 立即注册（可马上使用）
    if (typeof registerCustomPet === 'function') {
      if (!registerCustomPet(config)) {
        return this._setError('注册失败：形象数据无效');
      }
    } else {
      return this._setError('工厂函数未加载（pet-image-factory.js）');
    }

    // 2. 落盘（保存到 userData/custom-pets/）
    if (window.petAPI && window.petAPI.saveCustomPet) {
      try {
        const r = await window.petAPI.saveCustomPet(config);
        if (r && r.url) {
          // 已落盘：把运行期 renderer 的 imageSrc 升级为 file URL，
          // 避免内存里一直背着 base64
          if (typeof Pet !== 'undefined' && Pet.TYPES[id]) {
            Pet.TYPES[id]._cfg = config;
          }
        }
      } catch (e) {
        // 持久化失败不阻断本次使用，仅提示
        console.error('[PetCreator] saveCustomPet error:', e);
        this._setError('已注册，但保存到磁盘失败：' + (e && e.message));
      }
    }

    // 3. 通知菜单刷新 + 直接切到新形象
    if (this.eventBus) {
      this.eventBus.emit('pet:customAdded', { id, label });
      this.eventBus.emit('menu:switchPet', { type: id });
    }

    this.destroy();
  }

  _setError(msg) {
    if (!this.errorEl) return;
    this.errorEl.textContent = msg || '';
    return false;
  }

  destroy() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
    if (this._keyHandler) window.removeEventListener('keydown', this._keyHandler);
    this._keyHandler = null;
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
    this.el = null;
    if (PetCreator._current === this) PetCreator._current = null;
  }

  // ---------- 静态入口 ----------
  static open(opts) {
    if (PetCreator._current) PetCreator._current.destroy();
    const inst = new PetCreator(opts || {});
    PetCreator._current = inst;
    inst._startLoop();
    // 绑定提交按钮（build 时已创建）
    inst.el.querySelector('.pc-submit').addEventListener('click', () => inst._submit());
    return inst;
  }

  // ---------- 工具 ----------
  static slugify(s) {
    return String(s || '').trim().toLowerCase()
      .replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '');
  }

  static compressImage(dataUrl, maxSize = 128) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width || maxSize;
        let h = img.height || maxSize;
        const scale = Math.min(1, maxSize / Math.max(w, h));
        w = Math.max(16, Math.round(w * scale));
        h = Math.max(16, Math.round(h * scale));
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const cx = c.getContext('2d');
        cx.imageSmoothingEnabled = true;
        cx.imageSmoothingQuality = 'high';
        cx.drawImage(img, 0, 0, w, h);
        resolve({ dataUrl: c.toDataURL('image/png'), width: w, height: h });
      };
      img.onerror = (e) => reject(e);
      img.src = dataUrl;
    });
  }
}

if (typeof window !== 'undefined') {
  window.PetCreator = PetCreator;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PetCreator };
}
