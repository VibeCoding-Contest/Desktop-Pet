// menu.js — 右键上下文菜单（人 A）
// 接口文档 §4.4；CSS 类名见接口文档 §7

const PET_TYPES = ['cat', 'dog', 'penguin'];
let switchIdx = 0;

// 菜单项配置：id -> { label, event, data? }
const MENU_CONFIG = {
  'feed':       { label: '喂食',     event: 'menu:feed' },
  'play':       { label: '玩耍',     event: 'menu:play' },
  'switch-pet': { label: '切换角色', event: 'menu:switchPet' },
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
  }

  /**
   * 显示菜单
   * @param {number} x 视口坐标 x（contextmenu 事件的 clientX）
   * @param {number} y 视口坐标 y
   * @param {object} [options]
   * @param {string[]} [options.items] 自定义菜单项 id，默认 ['feed','play','switch-pet','exit']
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
      const item = document.createElement('div');
      item.className = 'menu-item';
      item.textContent = cfg.label;
      item.addEventListener('click', () => {
        let data = cfg.data;
        if (id === 'switch-pet') {
          switchIdx = (switchIdx + 1) % PET_TYPES.length;
          data = { type: PET_TYPES[switchIdx] };
        }
        window.eventBus.emit(cfg.event, data);
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
