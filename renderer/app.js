// app.js — 渲染进程入口（人 A）
// 职责：EventBus 单例、模块实例化与串联、全局事件、拖拽、右键菜单、跟随鼠标、渲染循环、持久化
// 对应里程碑：M1(EventBus) / M2(拖拽) / M3(右键菜单) / M4(联调) / M5(跟随) / M6(吸附+持久化)

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

// ---------- 模块实例化 ----------
const pet    = new Pet(canvas, eventBus);
const status = new Status(eventBus);
const bubble = new Bubble(document.getElementById('bubble-container'));
const menu   = new Menu(document.getElementById('menu-container'));

// ---------- 平台 / 点击穿透（里程碑2）----------
// Linux 下 setIgnoreMouseEvents(forward) 不可靠，默认不启用穿透
const ENABLE_CLICK_THROUGH = !!(window.petAPI && window.petAPI.platform !== 'linux');
let clickThrough = ENABLE_CLICK_THROUGH;

// ---------- 拖拽 + 点击辨识（里程碑2/4）----------
let isDragging = false;
let dragStartScreenX = 0;
let dragStartScreenY = 0;
let dragStartWinX = 0;
let dragStartWinY = 0;
let downClientX = 0;
let downClientY = 0;
let mightClick = false;
const CLICK_THRESHOLD = 4;
let dragRAF = null;         // requestAnimationFrame id
let dragTargetX = 0;        // 最新目标窗口位置
let dragTargetY = 0;

// ---------- 跟随鼠标 F10（里程碑5）----------
let followMode = false;
let followTimer = null;
let lastFollowMove = 0;
const FOLLOW_DURATION = 2000; // 跟随持续 2 秒
const FOLLOW_THROTTLE = 80;   // mousemove 节流 ms

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

function updateStatusBarPosition() {
  const rect = canvas.getBoundingClientRect();
  const b = pet.getBounds();
  const x = rect.left + b.x;
  const y = rect.top + b.y + b.height + 4;
  status.setBarPosition(x, y);
}

canvas.addEventListener('mousedown', async (e) => {
  if (e.button !== 0) return;
  isDragging = true;
  mightClick = true;
  dragStartScreenX = e.screenX;
  dragStartScreenY = e.screenY;
  downClientX = e.clientX;
  downClientY = e.clientY;

  const bounds = await window.petAPI.getWindowBounds();
  if (bounds) {
    dragStartWinX = bounds.x;
    dragStartWinY = bounds.y;
  }
  setClickThrough(false);
  e.preventDefault();
});

window.addEventListener('mousemove', (e) => {
  if (isDragging) {
    if (mightClick && Math.hypot(e.clientX - downClientX, e.clientY - downClientY) > CLICK_THRESHOLD) {
      mightClick = false;
    }
    if (!mightClick) {
      dragTargetX = dragStartWinX + (e.screenX - dragStartScreenX);
      dragTargetY = dragStartWinY + (e.screenY - dragStartScreenY);
      eventBus.emit('pet:dragging', { dx: e.screenX - dragStartScreenX, dy: e.screenY - dragStartScreenY });
      updateStatusBarPosition();
      if (!dragRAF) {
        dragRAF = requestAnimationFrame(() => {
          dragRAF = null;
          window.petAPI.setWindowPosition(dragTargetX, dragTargetY);
        });
      }
    }
    return;
  }
  if (followMode) {
    const now = performance.now();
    if (now - lastFollowMove > FOLLOW_THROTTLE) {
      lastFollowMove = now;
      const rect = canvas.getBoundingClientRect();
      const tx = (e.clientX - rect.left) - pet.width / 2;
      const ty = (e.clientY - rect.top) - pet.height / 2;
      pet.moveTo(tx, ty); // 限 canvas 内，pet 自动 clamp
    }
    return;
  }
  if (menu.visible) { setClickThrough(false); return; }
  setClickThrough(!isOverPet(e.clientX, e.clientY));
});

window.addEventListener('mouseup', async (e) => {
  if (!isDragging) return;
  isDragging = false;
  cancelAnimationFrame(dragRAF);
  dragRAF = null;
  updateStatusBarPosition();
  if (mightClick) {
    eventBus.emit('pet:clicked', { x: e.clientX, y: e.clientY });
    pet.jump();
    status.play(10);
    showBubble('happy');
  } else {
    const bounds = await window.petAPI.getWindowBounds();
    if (bounds) {
      eventBus.emit('pet:dragEnd', { x: bounds.x, y: bounds.y });
      // F13 边缘吸附
      const scr = await window.petAPI.getScreenSize();
      if (scr) {
        const SNAP = 24;
        let nx = bounds.x, ny = bounds.y;
        if (bounds.x <= SNAP) nx = 0;
        else if (bounds.x + bounds.width >= scr.width - SNAP) nx = scr.width - bounds.width;
        if (bounds.y <= SNAP) ny = 0;
        else if (bounds.y + bounds.height >= scr.height - SNAP) ny = scr.height - bounds.height;
        if (nx !== bounds.x || ny !== bounds.y) {
          window.petAPI.setWindowPosition(nx, ny);
        }
      }
    }
    saveState(); // F15：拖拽结束持久化位置
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

// ---------- 跟随鼠标 F10（里程碑5）----------
canvas.addEventListener('dblclick', (e) => {
  e.preventDefault();
  followMode = true;
  setClickThrough(false); // 跟随期间保持可交互
  if (followTimer) clearTimeout(followTimer);
  followTimer = setTimeout(() => { followMode = false; }, FOLLOW_DURATION);
});

// ---------- 气泡定位辅助 ----------
function showBubble(type, options) {
  const rect = canvas.getBoundingClientRect();
  const b = pet.getBounds();
  const cx = rect.left + b.x + b.width / 2;
  const top = rect.top + b.y - 40;
  bubble.setPosition(cx - 40, top);
  bubble.show(type, options);
}

// ---------- 菜单事件路由（接口文档 §5.3）----------
eventBus.on('pet:moveEnd', () => updateStatusBarPosition());
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
eventBus.on('status:happy', () => { pet.setState('idle', { force: true }); showBubble('happy'); });
eventBus.on('status:fed', () => showBubble('feed'));
eventBus.on('status:played', () => showBubble('happy'));

// ---------- 数据持久化 ----------
async function saveState() {
  try {
    const bounds = await window.petAPI.getWindowBounds();
    const data = {
      pet: { type: pet.petType, x: bounds ? bounds.x : 0, y: bounds ? bounds.y : 0 },
      status: status.getData(),
      timestamp: Date.now(),
    };
    window.petAPI.saveData(data);
    console.log('[app] 数据已保存:', data);
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
    // F15：恢复窗口位置（并 clamp 到屏幕内，防止多屏/分辨率变化后离屏）
    if (data.pet && typeof data.pet.x === 'number' && typeof data.pet.y === 'number') {
      const scr = await window.petAPI.getScreenSize();
      if (scr) {
        const w = 220, h = 220; // 与 main.js 窗口尺寸一致
        const x = Math.max(0, Math.min(data.pet.x, scr.width - w));
        const y = Math.max(0, Math.min(data.pet.y, scr.height - h));
        window.petAPI.setWindowPosition(x, y);
      }
    }
  } catch (e) {
    console.error('[app] loadState error:', e);
  }
}

eventBus.on('app:save', () => saveState());
window.addEventListener('beforeunload', () => saveState());

// ---------- 渲染循环 ----------
let lastTime = 0;
function loop(now) {
  const dt = now - lastTime;
  lastTime = now;
  pet.update(dt);
  pet.draw();
  requestAnimationFrame(loop);
}

// ---------- 自测工具 ----------
window.__test = {
  listEvents() {
    const events = [];
    for (const [key, set] of eventBus._map) {
      events.push({ event: key, handlers: set.size });
    }
    console.table(events);
  },
  feed() {
    console.log('[test] 模拟喂食');
    status.feed(30);
  },
  play() {
    console.log('[test] 模拟玩耍');
    status.play(10);
  },
  lowHunger() {
    console.log('[test] 模拟饥饿：手动设置 hunger=25');
    status.hunger = 25;
    status._hungryFired = false;
    status._checkThresholds();
    status.eventBus.emit('status:change', { hunger: status.hunger, mood: status.mood });
  },
  starve() {
    console.log('[test] 模拟极度饥饿：手动设置 hunger=5');
    status.hunger = 5;
    status._starvingFired = false;
    status._hungryFired = true;
    status._checkThresholds();
    status.eventBus.emit('status:change', { hunger: status.hunger, mood: status.mood });
  },
  lowMood() {
    console.log('[test] 模拟心情低落：手动设置 mood=15');
    status.mood = 15;
    status._sadFired = false;
    status._checkThresholds();
    status.eventBus.emit('status:change', { hunger: status.hunger, mood: status.mood });
  },
  highMood() {
    console.log('[test] 模拟心情高涨：手动设置 mood=90');
    status.mood = 90;
    status._happyFired = false;
    status._checkThresholds();
    status.eventBus.emit('status:change', { hunger: status.hunger, mood: status.mood });
  },
  showBubble(type, text) {
    console.log('[test] 直接显示气泡:', type, text);
    showBubble(type, text ? { text } : undefined);
  },
  state() {
    console.log('[test] 当前状态:', status.getData());
    return status.getData();
  },
  save() {
    console.log('[test] 手动保存');
    saveState().then(() => console.log('[test] 保存完成'));
  },
  load() {
    console.log('[test] 手动加载');
    loadState().then(() => console.log('[test] 加载完成'));
  },
};

console.log(
  '%c[自测] 在控制台运行以下命令验证所有功能：\n' +
  '  __test.listEvents()  — 查看已注册事件\n' +
  '  __test.feed()        — 模拟喂食 → 弹跳气泡\n' +
  '  __test.play()        — 模拟玩耍 → 弹跳气泡\n' +
  '  __test.lowHunger()   — 模拟饥饿 → 抖动气泡\n' +
  '  __test.starve()      — 模拟极度饥饿 → 抖动气泡\n' +
  '  __test.lowMood()     — 模拟心情低落 → 摇摆气泡\n' +
  '  __test.highMood()    — 模拟心情高涨 → 弹跳气泡\n' +
  '  __test.showBubble("happy") — 直接显示气泡\n' +
  '  __test.state()       — 查看当前状态值\n' +
  '  __test.save()        — 手动保存数据\n' +
  '  __test.load()        — 手动加载数据',
  'color: #4CAF50; font-size: 14px;'
);

// ---------- 初始化 ----------
async function init() {
  console.log('[app] window.petAPI =', window.petAPI);
  if (!window.petAPI) {
    console.error('[app] petAPI 未注入！检查 preload.js / contextIsolation 配置');
    return;
  }

  await loadState();
  status.createStatusBar(document.body);
  updateStatusBarPosition();
  status.start();
  pet.startAutoBehavior();
  lastTime = performance.now();
  requestAnimationFrame(loop);
  // F15：定时自动保存（防止托盘退出/异常关闭丢数据）
  setInterval(() => { saveState(); }, 10000);
}

init();