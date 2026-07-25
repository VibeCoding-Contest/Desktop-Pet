// app.js — 渲染进程入口（人 A）
// 职责：EventBus 单例、模块实例化、全局事件绑定、拖拽、右键菜单
// 对应里程碑：M1(EventBus+自测) / M2(拖拽) / M3(右键菜单) / M4(串联)

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
const ctx = canvas.getContext('2d');

// 临时占位绘制：人 B 实现 Pet 类前，画一个圆形让透明窗口可见
function drawPlaceholder() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  ctx.fillStyle = '#ffcc66';
  ctx.beginPath();
  ctx.arc(cx, cy, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(cx - 14, cy - 6, 5, 0, Math.PI * 2);
  ctx.arc(cx + 14, cy - 6, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy + 6, 8, 0, Math.PI);
  ctx.stroke();
}

// ---------- 右键菜单实例（人 A 模块）----------
const menu = new Menu(document.getElementById('menu-container'));

// ---------- 拖拽与点击穿透状态（里程碑2）----------
// Linux 下 setIgnoreMouseEvents(forward) 不可靠，默认不启用穿透（窗口始终可交互）
// Win/macOS 启用穿透：鼠标离开宠物时透传到下层窗口
const ENABLE_CLICK_THROUGH = window.petAPI && window.petAPI.platform !== 'linux';

let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let clickThrough = ENABLE_CLICK_THROUGH; // 穿透状态缓存，与 main.js 默认值对齐

// 判断鼠标是否在宠物可交互区域
// TODO 人 B 实现 pet.getBounds() 后改用其精确边界
function isOverPet(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return clientX >= rect.left && clientX <= rect.right &&
         clientY >= rect.top && clientY <= rect.bottom;
}

function setClickThrough(enable) {
  if (!ENABLE_CLICK_THROUGH) return; // 平台不启用穿透时不动 IPC
  if (clickThrough === enable) return;
  clickThrough = enable;
  window.petAPI.setClickThrough(enable);
}

// ---------- 拖拽事件（里程碑2）----------
canvas.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return; // 仅左键启动拖拽
  isDragging = true;
  dragStartX = e.screenX;
  dragStartY = e.screenY;
  setClickThrough(false); // 拖拽期间保持可交互
  e.preventDefault();
});

window.addEventListener('mousemove', (e) => {
  if (isDragging) {
    const dx = e.screenX - dragStartX;
    const dy = e.screenY - dragStartY;
    eventBus.emit('pet:dragging', { dx, dy });
    window.petAPI.moveWindow(dx, dy);
    dragStartX = e.screenX;
    dragStartY = e.screenY;
    return;
  }
  // 菜单可见时保持可交互，避免鼠标移向菜单触发穿透导致菜单消失
  if (menu.visible) { setClickThrough(false); return; }
  // 非拖拽：据是否悬停在宠物上切换穿透
  setClickThrough(!isOverPet(e.clientX, e.clientY));
});

window.addEventListener('mouseup', async (e) => {
  if (!isDragging) return;
  isDragging = false;
  const bounds = await window.petAPI.getWindowBounds();
  if (bounds) eventBus.emit('pet:dragEnd', { x: bounds.x, y: bounds.y });
  setClickThrough(!isOverPet(e.clientX, e.clientY));
});

// ---------- 右键菜单事件（里程碑3）----------
// 全局阻止浏览器默认右键菜单（透明边框区域；Linux 交互模式下尤其需要）
window.addEventListener('contextmenu', (e) => e.preventDefault());

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  setClickThrough(false); // 菜单显示期间保持可交互
  menu.show(e.clientX, e.clientY);
});

// 菜单项事件路由
eventBus.on('menu:exit', () => window.petAPI.closeApp());
eventBus.on('menu:feed', () => { console.log('[app] menu:feed（待人 C status.feed 处理）'); });
eventBus.on('menu:play', () => { console.log('[app] menu:play（待人 C status.play 处理）'); });
eventBus.on('menu:switchPet', (data) => { console.log('[app] menu:switchPet', data, '（待人 B pet.setPetType 处理）'); });

// ---------- 初始化 ----------
function init() {
  console.log('[app] window.petAPI =', window.petAPI);
  if (!window.petAPI) {
    console.error('[app] petAPI 未注入！检查 preload.js / contextIsolation 配置');
    return;
  }
  // 人 B 未实现 Pet 时画占位；Pet 就绪后由其 own 渲染循环接管
  if (typeof Pet === 'undefined') drawPlaceholder();

  // TODO 里程碑4：实例化并串联 pet/status/bubble
  // const pet    = new Pet(canvas, eventBus);
  // const status = new Status(eventBus);
  // const bubble = new Bubble(document.getElementById('bubble-container'), eventBus);
  // status.start(); pet.startAutoBehavior(); requestAnimationFrame(loop);
}

init();
