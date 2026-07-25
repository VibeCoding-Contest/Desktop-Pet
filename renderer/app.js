// app.js — 渲染进程入口（人 A）
// 职责：EventBus 单例、模块实例化、全局事件绑定、渲染循环
// 对应里程碑：M1（EventBus + 自测）、M4（串联各模块）

// ---------- EventBus 事件总线（接口文档 §3.1）----------
class EventBus {
  constructor() {
    this._map = new Map();
  }
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
// 人 B 接管后由 Pet.draw() 替代
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

function init() {
  // 里程碑1自测：确认 preload 桥接注入成功
  console.log('[app] window.petAPI =', window.petAPI);
  if (!window.petAPI) {
    console.error('[app] petAPI 未注入！检查 preload.js / contextIsolation 配置');
    return;
  }

  // 占位渲染
  drawPlaceholder();

  // TODO 里程碑4：实例化并串联各模块
  // const pet    = new Pet(canvas, eventBus);
  // const status = new Status(eventBus);
  // const bubble = new Bubble(document.getElementById('bubble-container'), eventBus);
  // const menu   = new Menu(document.getElementById('menu-container'), eventBus);
  // status.start();
  // pet.startAutoBehavior();
  // requestAnimationFrame(loop);
}

// 脚本位于 body 末尾，DOM 已就绪，直接初始化
init();
