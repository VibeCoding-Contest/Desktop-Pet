// app.js — 渲染进程入口（人 A）
// 职责：EventBus 单例、模块实例化与串联、全局事件、拖拽、右键菜单、渲染循环、最小持久化
// 对应里程碑：M1(EventBus) / M2(拖拽) / M3(右键菜单) / M4(联调)

// ---------- EventBus 事件总线（接口文档 §3.1）----------
class EventBus {
  constructor() { this._map = new Map(); }
  on(event, cb) {
    if (!this._map.has(event)) this._map.set(event, new Set());
    this._map.get(event).add(cb);
    return () => this.off(event, cb);
  }
  off(event, cb) {
    const set = this._map.get(event);
    if (set) set.delete(cb);
  }
  emit(event, data) {
    const set = this._map.get(event);
    if (!set) return;
    for (const cb of [...set]) {
      try { cb(data); }
      catch (e) { console.error(`[EventBus] ${event} handler error:`, e); }
    }
  }
}

// 全局单例：B/C 模块通过 window.eventBus 订阅/发布事件
const eventBus = new EventBus();
window.eventBus = eventBus;

const canvas = document.getElementById('pet-canvas');

// ---------- 模块实例化（里程碑4 串联）----------
const pet    = new Pet(canvas, eventBus);
const status = new Status(eventBus);
const bubble = new Bubble(document.getElementById('bubble-container'));
const menu   = new Menu(document.getElementById('menu-container'));

// ---------- 平台 / 点击穿透（里程碑2）----------
// Linux 下 setIgnoreMouseEvents(forward) 不可靠，默认不启用穿透
const ENABLE_CLICK_THROUGH = !!(window.petAPI && window.petAPI.platform !== 'linux');
let clickThrough = ENABLE_CLICK_THROUGH; // 与 main.js 默认值对齐

// ---------- 拖拽 + 点击辨识（里程碑2/4）----------
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let downClientX = 0;
let downClientY = 0;
let mightClick = false; // mousedown 时置 true，移动超阈值后置 false
const CLICK_THRESHOLD = 4; // 像素

// 判断鼠标是否在宠物可交互区域（使用 B 的 pet.getBounds 精确边界）
function isOverPet(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const b = pet.getBounds();
  const px = rect.left + b.x;
  const py = rect.top + b.y;
  return clientX >= px && clientX <= px + b.width &&
         clientY >= py && clientY <= py + b.height;
}

function setClickThrough(enable) {
  if (!ENABLE_CLICK_THROUGH) return;
  if (clickThrough === enable) return;
  clickThrough = enable;
  window.petAPI.setClickThrough(enable);
}

canvas.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return; // 仅左键
  isDragging = true;
  mightClick = true;
  dragStartX = e.screenX;
  dragStartY = e.screenY;
  downClientX = e.clientX;
  downClientY = e.clientY;
  setClickThrough(false);
  e.preventDefault();
});

window.addEventListener('mousemove', (e) => {
  if (isDragging) {
    // 超过阈值才确认是拖拽，避免点击时的像素抖动移动窗口
    if (mightClick && Math.hypot(e.clientX - downClientX, e.clientY - downClientY) > CLICK_THRESHOLD) {
      mightClick = false;
    }
    if (!mightClick) {
      const dx = e.screenX - dragStartX;
      const dy = e.screenY - dragStartY;
      eventBus.emit('pet:dragging', { dx, dy });
      window.petAPI.moveWindow(dx, dy);
      dragStartX = e.screenX;
      dragStartY = e.screenY;
    }
    return;
  }
  if (menu.visible) { setClickThrough(false); return; }
  setClickThrough(!isOverPet(e.clientX, e.clientY));
});

window.addEventListener('mouseup', async (e) => {
  if (!isDragging) return;
  isDragging = false;
  if (mightClick) {
    // 点击互动（F6）：跳跃 + 心情 +10 + 开心气泡
    eventBus.emit('pet:clicked', { x: e.clientX, y: e.clientY });
    pet.jump();
    status.play(10);
    showBubble('happy');
  } else {
    const bounds = await window.petAPI.getWindowBounds();
    if (bounds) eventBus.emit('pet:dragEnd', { x: bounds.x, y: bounds.y });
  }
  setClickThrough(!isOverPet(e.clientX, e.clientY));
});

// ---------- 右键菜单（里程碑3）----------
window.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  setClickThrough(false);
  menu.show(e.clientX, e.clientY);
});

// ---------- 气泡定位辅助 ----------
// 在宠物上方居中显示气泡（气泡 DOM 由 C 的 bubble.js 管理，A 仅定位）
function showBubble(type, options) {
  const rect = canvas.getBoundingClientRect();
  const b = pet.getBounds();
  const cx = rect.left + b.x + b.width / 2;
  const top = rect.top + b.y - 40;
  bubble.setPosition(cx - 40, top);
  bubble.show(type, options);
}

// ---------- 菜单事件路由（接口文档 §5.3）----------
eventBus.on('menu:exit', async () => {
  await saveState();
  window.petAPI.closeApp();
});
eventBus.on('menu:feed', () => { status.feed(30); showBubble('feed'); });
eventBus.on('menu:play', () => { status.play(10); showBubble('play'); });
eventBus.on('menu:switchPet', (data) => { if (data && data.type) pet.setPetType(data.type); });

// ---------- 状态事件 → 气泡 / 动画（接口文档 §5.4）----------
eventBus.on('status:hungry', () => showBubble('hungry'));
eventBus.on('status:starving', () => showBubble('hungry', { text: '快饿死了…' }));
eventBus.on('status:sad', () => { showBubble('sad'); pet.setState('sad', { force: true }); });
eventBus.on('status:happy', () => { pet.setState('idle', { force: true }); });

// ---------- 最小持久化（F15 完整版在里程碑6）----------
async function saveState() {
  try {
    const bounds = await window.petAPI.getWindowBounds();
    const data = {
      pet: { type: pet.petType, x: bounds ? bounds.x : 0, y: bounds ? bounds.y : 0 },
      status: status.getData(),
      timestamp: Date.now(),
    };
    window.petAPI.saveData(data);
  } catch (e) {
    console.error('[app] saveState error:', e);
  }
}

async function loadState() {
  try {
    const data = await window.petAPI.loadData();
    if (!data) return;
    if (data.pet && data.pet.type) pet.setPetType(data.pet.type);
    if (data.status) status.loadData(data.status);
    // 窗口位置恢复需新增 set-window-position IPC，留待里程碑6
  } catch (e) {
    console.error('[app] loadState error:', e);
  }
}

// ---------- 渲染循环 ----------
let lastTime = 0;
function loop(now) {
  const dt = now - lastTime;
  lastTime = now;
  pet.update(dt);
  pet.draw();
  requestAnimationFrame(loop);
}

// ---------- 初始化 ----------
async function init() {
  console.log('[app] window.petAPI =', window.petAPI);
  if (!window.petAPI) {
    console.error('[app] petAPI 未注入！检查 preload.js / contextIsolation 配置');
    return;
  }
  await loadState();
  status.start();
  pet.startAutoBehavior();
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

init();
