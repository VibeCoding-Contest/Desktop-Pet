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

// ---------- 实例化 C 模块 ----------
const status = new Status(eventBus);
const bubble = new Bubble(document.getElementById('bubble-container'));

// ---------- 事件串联（人员 C 负责）----------

// 状态 → 气泡
eventBus.on('status:hungry', () => bubble.show('hungry'));
eventBus.on('status:starving', () => bubble.show('hungry', { text: '我要饿死了！！！' }));
eventBus.on('status:sad', () => bubble.show('sad'));
eventBus.on('status:happy', () => bubble.show('happy'));
eventBus.on('status:fed', () => bubble.show('feed'));
eventBus.on('status:played', () => bubble.show('happy'));

// 气泡位置跟随宠物（B 实现后生效）
eventBus.on('pet:dragEnd', ({ x, y }) => bubble.setPosition(x, y - 40));
eventBus.on('pet:clicked', ({ x, y }) => bubble.setPosition(x, y - 40));

// 菜单 → 状态（A 菜单实现后生效）
eventBus.on('menu:feed', () => status.feed(30));
eventBus.on('menu:play', () => status.play(10));

// 点击 → 状态（B 宠物点击实现后生效）
eventBus.on('pet:clicked', data => {
  status.play(10);
  bubble.setPosition(data.x, data.y - 40);
});

// ---------- 数据持久化（人员 C：3.1）----------

async function save() {
  const bounds = await window.petAPI.getWindowBounds();
  const data = {
    status: status.getData(),
    pet: bounds ? { x: bounds.x, y: bounds.y } : { x: 0, y: 0 },
    timestamp: Date.now(),
  };
  window.petAPI.saveData(data);
  console.log('[app] 数据已保存:', data);
}

async function load() {
  try {
    const data = await window.petAPI.loadData();
    if (data && data.status) {
      status.loadData(data.status);
      console.log('[app] 数据已恢复:', data.status);
      return data;
    }
    console.log('[app] 无已保存数据，使用默认值');
  } catch (err) {
    console.error('[app] 加载数据失败:', err);
  }
  return null;
}

eventBus.on('app:save', () => save());
eventBus.on('menu:exit', () => {
  save();
  window.petAPI.closeApp();
});

window.addEventListener('beforeunload', () => save());

// ---------- 阶段三自测：控制台手动验证持久化 + 状态栏 ----------
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
    bubble.show(type, text ? { text } : undefined);
  },
  state() {
    console.log('[test] 当前状态:', status.getData());
    return status.getData();
  },
  save() {
    console.log('[test] 手动保存');
    save().then(() => console.log('[test] 保存完成'));
  },
  load() {
    console.log('[test] 手动加载');
    load().then(data => console.log('[test] 加载完成:', data));
  },
};

console.log(
  '%c[阶段三自测] 在控制台运行以下命令验证所有功能：\n' +
  '  __test.listEvents()  — 查看已注册事件\n' +
  '  __test.feed()        — 模拟喂食 → 弹跳气泡「好吃！」\n' +
  '  __test.play()        — 模拟玩耍 → 弹跳气泡「来玩吧！」\n' +
  '  __test.lowHunger()   — 模拟饥饿 → 抖动气泡「好饿...」\n' +
  '  __test.starve()      — 模拟极度饥饿 → 抖动气泡「我要饿死了！！！」\n' +
  '  __test.lowMood()     — 模拟心情低落 → 摇摆气泡「无聊...」\n' +
  '  __test.highMood()    — 模拟心情高涨 → 弹跳气泡「嘿嘿」\n' +
  '  __test.showBubble("happy") — 直接显示气泡\n' +
  '  __test.state()       — 查看当前状态值\n' +
  '  __test.save()        — 手动保存数据到磁盘\n' +
  '  __test.load()        — 手动加载数据（可修改值后测试恢复）',
  'color: #4CAF50; font-size: 14px;'
);

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

  // 加载持久化数据（人员 C：3.1）
  load().then(() => {
    status.createStatusBar(document.body);
    status.start();
  });

  // TODO 里程碑4：B 实现 Pet 类后，实例化并启动渲染循环
  // const pet = new Pet(canvas, eventBus);
  // pet.startAutoBehavior();
  // requestAnimationFrame(loop);
}

// 脚本位于 body 末尾，DOM 已就绪，直接初始化
init();
