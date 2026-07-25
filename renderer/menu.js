// menu.js — 右键上下文菜单（人 A）
// 接口文档 §4.4；CSS 类名见接口文档 §7
// 升级功能：切换角色从「硬编码数组循环」改为「枚举所有已注册形象」子菜单，
//          子菜单末尾追加「添加形象…」入口（发 menu:openCreator）。

// 内置形象标签（与 Pet.registerType 调用对应）
const BUILTIN_PETS = [
  { id: 'cat', label: '猫咪' },
  { id: 'dog', label: '狗狗' },
  { id: 'penguin', label: '企鹅' },
];

// 枚举所有可用形象：内置 + 自定义（来自 window.__customPets）
function listPetTypes() {
  const customs = (window.__customPets || []).map(p => ({ id: p.id, label: p.label || p.id }));
  return [...BUILTIN_PETS, ...customs];
}

// 菜单项配置：id -> { label, event, data? }
const MENU_CONFIG = {
  'feed':       { label: '喂食',     event: 'menu:feed' },
  'play':       { label: '玩耍',     event: 'menu:play' },
  'switch-pet': { label: '角色',     event: 'menu:switchPet', submenu: true },
  'zoom-in':    { label: '放大',     event: 'menu:zoom', data: { action: 'in' } },
  'zoom-out':   { label: '缩小',     event: 'menu:zoom', data: { action: 'out' } },
  'zoom-reset': { label: '重置大小', event: 'menu:zoom', data: { action: 'reset' } },
  'chat':       { label: '聊天',     event: 'menu:chat' },
  'schedule':   { label: '日程',     event: 'menu:schedule' },
  'settings':   { label: '设置',     event: 'menu:settings' },
  'exit':       { label: '退出',     event: 'menu:exit' },
};

const DEFAULT_ITEMS = ['feed', 'play', 'switch-pet', 'divider', 'zoom-in', 'zoom-out', 'zoom-reset', 'divider', 'chat', 'schedule', 'settings', 'divider', 'exit'];

class Menu {
  /**
   * @param {HTMLElement} [container=document.body] 菜单挂载容器
   */
  constructor(container = document.body) {
    this.container = container;
    this.el = document.createElement('div');
    this.el.className = 'context-menu';
    this.el.style.display = 'none';
    container.appendChild(this.el);

    this._outsideClickHandler = (e) => {
      if (!this.el.contains(e.target)) this.hide();
    };
    this._submenuHideTimer = null;
  }

  /**
   * 显示菜单
   * @param {number} x 视口坐标 x（contextmenu 事件的 clientX）
   * @param {number} y 视口坐标 y
   * @param {object} [options]
   * @param {string[]} [options.items] 自定义菜单项 id，默认 DEFAULT_ITEMS
   *        支持插入 'divider' 渲染分隔线
   */
  show(x, y, options = {}) {
    this._detachOutside();
    this.el.innerHTML = '';

    const items = (options.items && options.items.length) ? options.items : DEFAULT_ITEMS;
    items.forEach((id) => {
      if (id === 'divider') {
        const d = document.createElement('div');
        d.className = 'menu-divider';
        this.el.appendChild(d);
        return;
      }
      const cfg = MENU_CONFIG[id];
      if (!cfg) return;

      if (cfg.submenu) {
        this._renderSubmenuTrigger(cfg);
        return;
      }

      const item = document.createElement('div');
      item.className = 'menu-item';
      item.textContent = cfg.label;
      item.addEventListener('click', () => {
        window.eventBus.emit(cfg.event, cfg.data);
        this.hide();
      });
      this.el.appendChild(item);
    });

    this.el.style.display = 'block';
    // 边缘翻转：超出窗口时反向定位，避免被透明窗口裁切
    const w = this.el.offsetWidth;
    const h = this.el.offsetHeight;
    let left = x;
    let top = y;
    if (left + w > window.innerWidth) left = Math.max(0, x - w);
    if (top + h > window.innerHeight) top = Math.max(0, y - h);
    this.el.style.left = left + 'px';
    this.el.style.top = top + 'px';

    document.addEventListener('click', this._outsideClickHandler);
  }

  // 渲染「角色 ▸」触发项 + 浮出子菜单
  _renderSubmenuTrigger(cfg) {
    const trigger = document.createElement('div');
    trigger.className = 'menu-item menu-item--has-sub';
    trigger.innerHTML = `<span class="menu-item-label">${cfg.label}</span><span class="menu-item-arrow">▸</span>`;

    const sub = document.createElement('div');
    sub.className = 'context-submenu';
    sub.style.display = 'none';

    const types = listPetTypes();
    const current = (this._currentType && this._currentType()) || null;
    types.forEach((p) => {
      const it = document.createElement('div');
      it.className = 'menu-item' + (p.id === current ? ' menu-item--active' : '');
      it.textContent = p.label;
      it.addEventListener('click', (e) => {
        e.stopPropagation();
        window.eventBus.emit(cfg.event, { type: p.id });
        this.hide();
      });
      sub.appendChild(it);
    });
    // 末尾：分隔线 + 添加形象…
    const d = document.createElement('div');
    d.className = 'menu-divider';
    sub.appendChild(d);
    const add = document.createElement('div');
    add.className = 'menu-item';
    add.textContent = '添加形象…';
    add.addEventListener('click', (e) => {
      e.stopPropagation();
      window.eventBus.emit('menu:openCreator');
      this.hide();
    });
    sub.appendChild(add);

    trigger.appendChild(sub);

    const openSub = () => {
      clearTimeout(this._submenuHideTimer);
      // 边缘翻转：右侧放不下则展开到左侧
      const r = trigger.getBoundingClientRect();
      const sw = 140;
      let sl = r.right;
      if (sl + sw > window.innerWidth) sl = r.left - sw;
      sub.style.left = sl + 'px';
      sub.style.top = r.top + 'px';
      sub.style.display = 'block';
    };
    const closeSub = () => {
      this._submenuHideTimer = setTimeout(() => { sub.style.display = 'none'; }, 120);
    };
    trigger.addEventListener('mouseenter', openSub);
    trigger.addEventListener('mouseleave', closeSub);
    sub.addEventListener('mouseenter', () => clearTimeout(this._submenuHideTimer));
    sub.addEventListener('mouseleave', closeSub);

    this.el.appendChild(trigger);
  }

  // 由 app.js 注入：返回当前形象 id（用于子菜单高亮当前项）
  setCurrentTypeGetter(fn) {
    this._currentType = typeof fn === 'function' ? fn : null;
  }

  hide() {
    this._detachOutside();
    this.el.style.display = 'none';
  }

  /** @returns {boolean} 菜单当前是否可见 */
  get visible() {
    return this.el.style.display !== 'none';
  }

  destroy() {
    this.hide();
    this.el.remove();
  }

  _detachOutside() {
    document.removeEventListener('click', this._outsideClickHandler);
  }
}

if (typeof window !== 'undefined') {
  window.BUILTIN_PETS = BUILTIN_PETS;
  window.listPetTypes = listPetTypes;
}
