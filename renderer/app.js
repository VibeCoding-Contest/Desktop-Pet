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
const chat   = new Chat(document.getElementById('chat-panel'), eventBus);
// 子菜单高亮当前角色
menu.setCurrentTypeGetter(() => pet.petType);

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
const CLICK_THRESHOLD = 10;
let dragRAF = null;         // requestAnimationFrame id
let dragTargetX = 0;        // 最新目标窗口位置
let dragTargetY = 0;

// ---------- 跟随鼠标 F10（里程碑5）----------
let followMode = false;
let followTimer = null;
let lastFollowMove = 0;
const FOLLOW_DURATION = 2000; // 跟随持续 2 秒
const FOLLOW_THROTTLE = 80;   // mousemove 节流 ms

// ---------- 桌面漫游（桌面边框反弹）----------
let roamEnabled = false;
let roamVx = 0;
let roamVy = 0;
const ROAM_SPEED = 80;
let roamWinX = 0;
let roamWinY = 0;
let roamWinW = 220;
let roamWinH = 220;
let roamScrW = 1920;
let roamScrH = 1080;
let roamStarted = false;
let menuPollTimer = null;

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

async function initRoam() {
  const bounds = await window.petAPI.getWindowBounds();
  const scr = await window.petAPI.getScreenSize();
  if (bounds) {
    roamWinX = bounds.x;
    roamWinY = bounds.y;
    roamWinW = bounds.width;
    roamWinH = bounds.height;
  }
  if (scr) {
    roamScrW = scr.width;
    roamScrH = scr.height;
  }
  roamEnabled = true;
  roamStarted = true;
  pet.setState('walk', { force: true });
}

function stopRoam() {
  roamEnabled = false;
  roamVx = 0;
  roamVy = 0;
}

async function resumeRoam() {
  const bounds = await window.petAPI.getWindowBounds();
  if (bounds) {
    roamWinX = bounds.x;
    roamWinY = bounds.y;
  }
  roamEnabled = true;
  roamVx = 0;
  roamVy = 0;
}

function updateRoam(dt) {
  if (!roamEnabled || !roamStarted) return;
  if (pet.state !== 'walk' && pet.state !== 'idle') return;

  if (roamVx === 0 && roamVy === 0) {
    const angle = Math.random() * Math.PI * 2;
    roamVx = Math.cos(angle) * ROAM_SPEED;
    roamVy = Math.sin(angle) * ROAM_SPEED;
    pet.setState('walk', { force: true });
  }

  const sec = Math.min(dt / 1000, 0.05);
  roamWinX += roamVx * sec;
  roamWinY += roamVy * sec;

  let bounced = false;
  if (roamWinX <= 0) {
    roamWinX = 0;
    roamVx = Math.abs(roamVx);
    bounced = true;
  } else if (roamWinX + roamWinW >= roamScrW) {
    roamWinX = roamScrW - roamWinW;
    roamVx = -Math.abs(roamVx);
    bounced = true;
  }
  if (roamWinY <= 0) {
    roamWinY = 0;
    roamVy = Math.abs(roamVy);
    bounced = true;
  } else if (roamWinY + roamWinH >= roamScrH) {
    roamWinY = roamScrH - roamWinH;
    roamVy = -Math.abs(roamVy);
    bounced = true;
  }

  if (bounced) {
    const speed = Math.hypot(roamVx, roamVy);
    const baseAngle = Math.atan2(roamVy, roamVx);
    const variation = (Math.random() - 0.5) * Math.PI * 0.6;
    const newAngle = baseAngle + variation;
    roamVx = Math.cos(newAngle) * speed;
    roamVy = Math.sin(newAngle) * speed;
  }

  window.petAPI.setWindowPosition(Math.round(roamWinX), Math.round(roamWinY));
  updateStatusBarPosition();
}

canvas.addEventListener('mousedown', async (e) => {
  if (e.button !== 0) return;
  if (chat.isOpen || (typeof PetCreator !== 'undefined' && PetCreator._current)) return;
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
      stopRoam();
      dragStartScreenX = e.screenX;
      dragStartScreenY = e.screenY;
      dragStartWinX = roamWinX;
      dragStartWinY = roamWinY;
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
  if (menu.visible || chat.isOpen || (typeof PetCreator !== 'undefined' && PetCreator._current)) { setClickThrough(false); return; }
  setClickThrough(!isOverPet(e.clientX, e.clientY));
});

window.addEventListener('mouseup', async (e) => {
  if (!isDragging) return;
  isDragging = false;
  cancelAnimationFrame(dragRAF);
  dragRAF = null;
  updateStatusBarPosition();
  if (mightClick) {
    stopRoam();
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
    resumeRoam();
  }
  setClickThrough(!isOverPet(e.clientX, e.clientY));
});

// ---------- 右键菜单（里程碑3）----------
window.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  setClickThrough(false);
  stopRoam();
  if (menuPollTimer) clearInterval(menuPollTimer);
  menu.show(e.clientX, e.clientY);
});

// ---------- 双击：开始漫游 / 跟随鼠标 F10 ----------
canvas.addEventListener('dblclick', (e) => {
  e.preventDefault();
  if (!roamEnabled) {
    resumeRoam();
    return;
  }
  followMode = true;
  setClickThrough(false);
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

// ---------- 升级功能：自定义形象创建器 ----------
eventBus.on('menu:openCreator', () => {
  if (typeof PetCreator === 'undefined' || !PetCreator.open) {
    console.warn('[app] PetCreator 未加载');
    return;
  }
  PetCreator.open({ canvas, pet, eventBus });
});
// 自定义形象注册后刷新（菜单下次 show 自动反映，无需额外操作）
eventBus.on('pet:customAdded', (d) => {
  console.log('[app] 自定义形象已添加:', d && d.id);
});
// 删除当前在用的自定义形象时切回 cat（预留：管理面板接入后生效）
eventBus.on('pet:customRemoved', ({ id } = {}) => {
  if (pet.petType === id) {
    pet.setPetType('cat');
    eventBus.emit('menu:switchPet', { type: 'cat' });
  }
});

// ---------- G1 缩放：滚轮 + 菜单 ----------
const ZOOM_MIN = 0.6, ZOOM_MAX = 2.5, ZOOM_STEP = 0.15;
function applyZoom(action) {
  let s = pet.getScale();
  if (action === 'in') s = Math.min(ZOOM_MAX, s + ZOOM_STEP);
  else if (action === 'out') s = Math.max(ZOOM_MIN, s - ZOOM_STEP);
  else if (action === 'reset') s = 1;
  else return;
  pet.setScale(s);
  // 同步窗口尺寸，保持角色在画面中比例（窗口 = canvas 基础 320 × scale 的放大）
  const base = 320;
  window.petAPI.resizeWindow(Math.round(base * s) + 40, Math.round(base * s) + 40);
  saveState();
}
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  applyZoom(e.deltaY < 0 ? 'in' : 'out');
}, { passive: false });
eventBus.on('menu:zoom', (d) => applyZoom(d && d.action));

// ---------- G2 聊天面板：菜单入口 + 快捷键 ----------
// 注：canvas 双击已被 F10 跟随鼠标占用，故聊天面板用菜单 + Ctrl+Shift+P 触发
eventBus.on('menu:chat', () => chat.open());
eventBus.on('menu:schedule', () => { chat.open(); /* TODO A3：切到日程 tab */ });
eventBus.on('menu:settings', () => { chat.open(); /* TODO A3：切到设置 tab */ });
window.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && (e.key === 'P' || e.key === 'p')) {
    e.preventDefault();
    chat.toggle();
  } else if (e.key === 'Escape' && chat.isOpen) {
    chat.close();
  }
});

// ---------- 聊天面板打开/关闭时调整窗口大小 ----------
let savedWinW = 360;
let savedWinH = 360;

eventBus.on('chat:open', async () => {
  stopRoam();
  const bounds = await window.petAPI.getWindowBounds();
  if (bounds) {
    savedWinW = bounds.width;
    savedWinH = bounds.height;
  }
  await fitWindowToScreen(600, 500);
});

eventBus.on('chat:close', async () => {
  await fitWindowToScreen(savedWinW, savedWinH);
});

async function fitWindowToScreen(w, h) {
  const bounds = await window.petAPI.getWindowBounds();
  const scr = await window.petAPI.getScreenSize();
  if (!bounds || !scr) {
    window.petAPI.resizeWindow(w, h);
    return;
  }
  let nx = bounds.x;
  let ny = bounds.y;
  if (nx + w > scr.width) nx = Math.max(0, scr.width - w);
  if (ny + h > scr.height) ny = Math.max(0, scr.height - h);
  window.petAPI.resizeWindow(w, h);
  window.petAPI.setWindowPosition(nx, ny);
}

// ---------- A 的编排骨架：agent:* 事件 → 聊天/气泡呈现 ----------
// B 的 Agent 内核就绪前，chat 占位回显；就绪后真实回复经 agent:reply 走这里
eventBus.on('agent:reply', ({ text, bubble } = {}) => {
  // bubble=true：把回复首句同步显示为宠物头顶气泡（管家口头反馈）
  if (bubble && typeof text === 'string') {
    const first = text.split('\n')[0].slice(0, 40);
    showBubble('idle', { text: first, duration: 4000 });
  }
});

// ---------- A4：日程提醒 → 系统通知 + 气泡（B 的 scheduler 发事件，A 负责呈现）----------
eventBus.on('schedule:due', ({ item } = {}) => {
  const title = (item && item.title) || '提醒';
  const when = item && item.datetime ? new Date(item.datetime).toLocaleTimeString() : '';
  if (window.petAPI && window.petAPI.showNotification) {
    window.petAPI.showNotification('桌宠管家·日程提醒', `${when ? when + ' ' : ''}${title}`);
  }
  showBubble('idle', { text: `该${title}啦！`, duration: 5000 });
});
eventBus.on('schedule:dailyReport', ({ items } = {}) => {
  const n = Array.isArray(items) ? items.length : 0;
  if (window.petAPI && window.petAPI.showNotification) {
    window.petAPI.showNotification('桌宠管家·今日早报', `今天有 ${n} 项任务待完成`);
  }
  chat.open();
  showBubble('idle', { text: `早上好！今天有 ${n} 项任务`, duration: 5000 });
});

// ---------- A3：Agent 编排（防御性，B 接入后自动生效）----------
// 契约：B 在 index.html 加载 agent/agent.js、agent/llm.js、agent/tools/index.js，
//       分别暴露 window.Agent / window.LLMClient / window.agentTools（{list,get}）。
if (typeof window.Agent === 'function') {
  try {
    const llm = typeof window.LLMClient === 'function' ? new window.LLMClient() : null;
    const tools = window.agentTools || { list: () => [], get: () => null };
    window.__agent = new window.Agent(eventBus, { llm, tools });
    chat.markAgentReady();
    console.log('[app] Agent 已接入（B），工具数：', tools.list().length);
  } catch (e) { console.error('[app] Agent init failed:', e); }
} else {
  console.log('[app] Agent 未接入，聊天面板走占位回显');
}

// ---------- B：Scheduler 启动（定时提醒 / 每日早报）----------
if (typeof window.Scheduler === 'function' && window.scheduleStore) {
  try {
    window.__scheduler = new window.Scheduler(eventBus, window.scheduleStore);
    window.__scheduler.start();
    console.log('[app] Scheduler 已启动（每分钟扫描到期日程）');
  } catch (e) { console.error('[app] Scheduler init failed:', e); }
}

// ---------- 状态事件 → 气泡 / 动画（接口文档 §5.4）----------
eventBus.on('status:hungry', () => showBubble('hungry'));
eventBus.on('status:starving', () => showBubble('hungry', { text: '快饿死了…' }));
eventBus.on('status:sad', () => { showBubble('sad'); pet.setState('sad', { force: true }); });
eventBus.on('status:happy', () => { pet.setState('idle', { force: true }); showBubble('happy'); });
eventBus.on('status:fed', () => showBubble('feed'));
eventBus.on('status:played', () => showBubble('happy'));

// ---------- 加载自定义形象（升级功能）----------
// 启动时：先加载并注册所有自定义形象，再 loadState（保证存档里的自定义 id 可恢复）
async function loadCustomPets() {
  if (!window.petAPI || !window.petAPI.loadCustomPets) return;
  try {
    const customs = await window.petAPI.loadCustomPets();
    window.__customPets = Array.isArray(customs) ? customs : [];
    window.__customPets.forEach((c) => {
      if (typeof registerCustomPet === 'function') registerCustomPet(c);
    });
    console.log('[app] 自定义形象已加载:', window.__customPets.map((c) => c.id));
  } catch (e) {
    console.error('[app] loadCustomPets error:', e);
    window.__customPets = [];
  }
}

// ---------- 数据持久化 ----------
async function saveState() {
  try {
    const bounds = await window.petAPI.getWindowBounds();
    const data = {
      pet: { type: pet.petType, x: bounds ? bounds.x : 0, y: bounds ? bounds.y : 0, scale: pet.getScale() },
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
    if (data.pet && typeof data.pet.scale === 'number') pet.setScale(data.pet.scale);
    if (data.status) status.loadData(data.status);
    // F15：恢复窗口位置（并 clamp 到屏幕内，防止多屏/分辨率变化后离屏）
    if (data.pet && typeof data.pet.x === 'number' && typeof data.pet.y === 'number') {
      const scr = await window.petAPI.getScreenSize();
      if (scr) {
        const w = 360, h = 360; // 与 main.js 窗口默认尺寸一致
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
  updateRoam(dt);
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
  // ---- Agent 升级自测 ----
  chat() { console.log('[test] 打开聊天面板'); chat.open(); },
  mockReply(text) {
    console.log('[test] 模拟 Agent 回复');
    eventBus.emit('agent:reply', { text: text || '你好呀，我是桌宠管家~', bubble: true });
  },
  mockDue(title) {
    console.log('[test] 模拟日程到期');
    eventBus.emit('schedule:due', { item: { title: title || '开会', datetime: Date.now() } });
  },
  mockReport(n) {
    console.log('[test] 模拟每日早报');
    eventBus.emit('schedule:dailyReport', { items: new Array(n || 3) });
  },
  zoom(s) { console.log('[test] 设置缩放', s); pet.setScale(s); },
  // ---- 自定义形象（升级功能）自测 ----
  openCreator() { console.log('[test] 打开自定义形象创建器'); eventBus.emit('menu:openCreator'); },
  listCustoms() {
    const list = (window.__customPets || []).map((c) => ({ id: c.id, label: c.label }));
    console.table(list);
    return list;
  },
  async deleteCustomPet(id) {
    if (!window.petAPI || !window.petAPI.deleteCustomPet) { console.warn('[test] petAPI.deleteCustomPet 不可用'); return; }
    const r = await window.petAPI.deleteCustomPet(id);
    console.log('[test] 删除自定义形象', id, '→', r);
    if (r && r.ok) {
      // 从内存列表移除
      window.__customPets = (window.__customPets || []).filter((c) => c.id !== id);
      if (typeof Pet !== 'undefined' && Pet.TYPES) delete Pet.TYPES[id];
      eventBus.emit('pet:customRemoved', { id });
    }
    return r;
  },
  switchPet(type) { console.log('[test] 切换形象 →', type); eventBus.emit('menu:switchPet', { type }); },
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
  '  __test.load()        — 手动加载数据\n' +
  '  __test.chat()        — 打开聊天面板\n' +
  '  __test.mockReply()   — 模拟 Agent 回复(气泡+面板)\n' +
  '  __test.mockDue()     — 模拟日程到期(系统通知+气泡)\n' +
  '  __test.mockReport()  — 模拟每日早报\n' +
  '  __test.zoom(1.5)     — 设置缩放(0.6–2.5)\n' +
  '  ---- 自定义形象(升级功能) ----\n' +
  '  __test.openCreator() — 打开自定义形象创建器\n' +
  '  __test.listCustoms() — 列出已加载的自定义形象\n' +
  '  __test.switchPet("cat") — 切换形象\n' +
  '  __test.deleteCustomPet("kobe") — 删除自定义形象(切回cat)',
  'color: #4CAF50; font-size: 14px;'
);

// ---------- 初始化 ----------
async function init() {
  console.log('[app] window.petAPI =', window.petAPI);
  if (!window.petAPI) {
    console.error('[app] petAPI 未注入！检查 preload.js / contextIsolation 配置');
    return;
  }

  // 先加载并注册自定义形象，再 loadState（存档里的自定义 id 才能恢复）
  await loadCustomPets();

  await loadState();
  status.createStatusBar(document.body);
  updateStatusBarPosition();
  status.start();
  initRoam();
  lastTime = performance.now();
  requestAnimationFrame(loop);
  // F15：定时自动保存（防止托盘退出/异常关闭丢数据）
  setInterval(() => { saveState(); }, 10000);
}

init();