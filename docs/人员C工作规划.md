# 人员 C — 工作规划

> 负责模块：状态系统 + 对话气泡 + 数据持久化
> 对应文件：`renderer/status.js`、`renderer/bubble.js`

---

## 一、职责范围

| 模块 | 文件 | 具体内容 |
|------|------|----------|
| 状态系统 | `renderer/status.js` | 饱食度/心情值属性、每秒衰减、阈值检测、事件触发 |
| 对话气泡 | `renderer/bubble.js` | 气泡 DOM 创建/销毁、台词库、显示/隐藏动画、位置跟随 |
| 台词库 | `renderer/bubble.js` | 内置台词库（happy / hungry / sad / idle / feed / play） |
| 数据序列化 | 通过 `Status.getData()` / `Status.loadData()` | 配合 app.js 完成持久化（C 只负责状态的序列化与反序列化，不负责 IPC 调用） |

---

## 二、对外接口

### 2.1 需要导出的类

```js
// status.js 导出
class Status { ... }

// bubble.js 导出
class Bubble { ... }
```

### 2.2 需要监听的 EventBus 事件（由其他模块发出，C 来响应）

| 事件名 | 来源 | 携带数据 | C 的响应动作 |
|--------|------|----------|-------------|
| `menu:feed` | menu.js (A) | 无 | `status.feed(30)` → emit `status:fed` |
| `menu:play` | menu.js (A) | 无 | `status.play(10)` → emit `status:played` |
| `pet:clicked` | pet.js (B) | `{x, y}` | `status.play(10)` → emit `status:played` |
| `bubble:show` | app.js / pet.js | `{type, text?, duration?}` | `bubble.show(type, options)` |
| `bubble:hide` | app.js | 无 | `bubble.hide()` |
| `app:save` | app.js (A) | 无 | 返回 `status.getData()` 给 app.js 收集 |
| `app:load` | app.js (A) | `{status: {hunger, mood}}` | `status.loadData(data.status)` |

### 2.3 需要发出的 EventBus 事件（C 主动 emit）

| 事件名 | 触发时机 | 携带数据 |
|--------|----------|----------|
| `status:change` | 每秒衰减 / feed / play 后 | `{hunger, mood}` |
| `status:hungry` | 饱食度首次跌破 30 | `{hunger}` |
| `status:starving` | 饱食度首次跌破 10 | `{hunger}` |
| `status:sad` | 心情值首次跌破 20 | `{mood}` |
| `status:happy` | 心情值首次回升超过 80 | `{mood}` |
| `status:fed` | feed() 调用后 | `{hunger}` |
| `status:played` | play() 调用后 | `{mood}` |

> 注意：阈值事件（hungry/starving/sad/happy）需要带**防重复触发**逻辑，只在跨越阈值时发一次，避免每秒重复 emit。

---

## 三、开发时序

```
时间线：0:00 ──────── 1:30 ──────── 3:00 ──────── 4:00
        第一阶段      第二阶段      第三阶段
```

### 阶段一：核心骨架（前 1.5h）— P0

| 步骤 | 任务 | 预计时间 | 产出 |
|------|------|----------|------|
| 1.1 | 实现 `Status` 类骨架：构造函数、hunger/mood 属性、`start()`/`stop()`、`feed()`/`play()` | 15min | status.js 基础代码 |
| 1.2 | 实现衰减逻辑：`setInterval` 每秒减 hunger/mood | 10min | 同上 |
| 1.3 | 实现阈值检测：hunger<30 触发 hungry，mood<20 触发 sad | 10min | 同上 |
| 1.4 | EventBus 集成：在 `start()` 中 emit `status:change`，阈值触发时 emit 对应事件 | 10min | 同上 |
| 1.5 | 实现 `Bubble` 类骨架：DOM 创建、`show()`/`hide()`/`setPosition()` | 20min | bubble.js 基础代码 |
| 1.6 | 内置台词库：6 种类型（happy/hungry/sad/idle/feed/play），每种至少 3 句 | 10min | 同上 |
| 1.7 | 与 A 联调：确认 EventBus 可正常收发事件 | 15min | 联调通过 |

### 阶段二：趣味互动（1.5h - 3h）— P1

| 步骤 | 任务 | 预计时间 | 产出 |
|------|------|----------|------|
| 2.1 | 气泡 CSS 动画：淡入淡出、位置跟随宠物头顶 | 20min | 完善 bubble.js + style.css |
| 2.2 | 喂食联动：监听 `menu:feed` → `status.feed()` → emit `status:fed` → 显示气泡 | 15min | 联调通过 |
| 2.3 | 点击联动：监听 `pet:clicked` → `status.play()` → emit `status:played` → 显示气泡 | 10min | 联调通过 |
| 2.4 | 防重复触发：阈值事件加 flag，避免同一阈值区间重复 emit | 15min | 完善 status.js |
| 2.5 | 状态恢复 flag：当喂食/玩耍后属性回升，重置对应阈值 flag | 10min | 同上 |
| 2.6 | 丰富台词库：每种类型 5+ 句，加入随机抖动和 emoji | 10min | 完善 bubble.js |
| 2.7 | `status:happy` 事件：心情值回升超过 80 时触发 | 5min | 完善 status.js |

### 阶段三：锦上添花（3h - 4h）— P2

| 步骤 | 任务 | 预计时间 | 产出 |
|------|------|----------|------|
| 3.1 | 数据持久化：实现 `getData()` / `loadData()`，配合 app.js 完成 save/load 闭环 | 20min | 联调通过 |
| 3.2 | `status:starving` 事件：饱食度跌破 10 时触发 | 5min | 完善 status.js |
| 3.3 | 多状态栏 DOM：可选显示饱食度/心情值进度条（用 CSS 类名 `.status-bar`） | 15min | 可选 |
| 3.4 | 自定义台词接口：`bubble.setQuotes(type, quotes)` 支持外部扩展台词 | 10min | 完善 bubble.js |
| 3.5 | 收尾联调：与 A、B 确认所有事件链路正常 | 10min | 联调通过 |

---

## 四、详细实现指南

### 4.1 Status 类完整实现

```js
class Status {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.hunger = 100;
    this.mood = 100;
    this.hungerDecay = 0.5;
    this.moodDecay = 0.3;
    this.timer = null;

    // 阈值防重复标记
    this._hungryFired = false;    // hunger < 30
    this._starvingFired = false;  // hunger < 10
    this._sadFired = false;       // mood < 20
    this._happyFired = true;      // mood > 80（初始 mood=100，已触发）
  }

  start(options = {}) {
    if (options.hungerDecay !== undefined) this.hungerDecay = options.hungerDecay;
    if (options.moodDecay !== undefined) this.moodDecay = options.moodDecay;

    this.timer = setInterval(() => {
      this.hunger = Math.max(0, this.hunger - this.hungerDecay);
      this.mood = Math.max(0, this.mood - this.moodDecay);
      this._checkThresholds();
      this.eventBus.emit('status:change', { hunger: this.hunger, mood: this.mood });
    }, 1000);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  feed(amount = 30) {
    this.hunger = Math.min(100, this.hunger + amount);
    this._resetFlags();
    this.eventBus.emit('status:fed', { hunger: this.hunger });
    this.eventBus.emit('status:change', { hunger: this.hunger, mood: this.mood });
  }

  play(amount = 10) {
    this.mood = Math.min(100, this.mood + amount);
    this._resetFlags();
    this.eventBus.emit('status:played', { mood: this.mood });
    this.eventBus.emit('status:change', { hunger: this.hunger, mood: this.mood });
  }

  getData() {
    return { hunger: this.hunger, mood: this.mood };
  }

  loadData(data) {
    if (data && typeof data.hunger === 'number' && typeof data.mood === 'number') {
      this.hunger = data.hunger;
      this.mood = data.mood;
      this._resetFlags();
      this.eventBus.emit('status:change', { hunger: this.hunger, mood: this.mood });
    }
  }

  destroy() {
    this.stop();
  }

  // ----- 内部方法 -----

  _checkThresholds() {
    // 饱食度阈值
    if (this.hunger < 10 && !this._starvingFired) {
      this._starvingFired = true;
      this.eventBus.emit('status:starving', { hunger: this.hunger });
    } else if (this.hunger < 30 && !this._hungryFired) {
      this._hungryFired = true;
      this.eventBus.emit('status:hungry', { hunger: this.hunger });
    }

    // 心情阈值
    if (this.mood < 20 && !this._sadFired) {
      this._sadFired = true;
      this.eventBus.emit('status:sad', { mood: this.mood });
    } else if (this.mood > 80 && !this._happyFired) {
      this._happyFired = true;
      this.eventBus.emit('status:happy', { mood: this.mood });
    }
  }

  _resetFlags() {
    this._hungryFired = this.hunger < 30;
    this._starvingFired = this.hunger < 10;
    this._sadFired = this.mood < 20;
    this._happyFired = this.mood > 80;
  }
}
```

### 4.2 Bubble 类完整实现

```js
class Bubble {
  constructor(container) {
    this.container = container;
    this.el = null;
    this.timer = null;
    this._createDOM();
  }

  _createDOM() {
    this.el = document.createElement('div');
    this.el.className = 'bubble';
    this.el.innerHTML = '<span class="bubble-text"></span><span class="bubble-arrow"></span>';
    this.el.style.display = 'none';
    this.container.appendChild(this.el);
  }

  show(type, options = {}) {
    const text = options.text || this._randomQuote(type);
    const duration = options.duration || 3000;

    if (this.timer) clearTimeout(this.timer);

    this.el.querySelector('.bubble-text').textContent = text;
    this.el.style.display = 'block';
    this.el.classList.add('bubble--visible');

    this.timer = setTimeout(() => this.hide(), duration);
  }

  hide() {
    if (this.timer) clearTimeout(this.timer);
    this.el.style.display = 'none';
    this.el.classList.remove('bubble--visible');
  }

  setPosition(x, y) {
    this.el.style.left = x + 'px';
    this.el.style.top = y + 'px';
  }

  setQuotes(type, quotes) {
    this.quotes[type] = quotes;
  }

  destroy() {
    this.hide();
    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
  }

  // ----- 内部方法 -----

  _randomQuote(type) {
    const list = this.quotes[type] || this.quotes.idle;
    return list[Math.floor(Math.random() * list.length)];
  }
}

// 内置台词库
Bubble.prototype.quotes = {
  happy: ['今天天气真好~', '主人最好了！', '嘿嘿', '开心！', '好耶~'],
  hungry: ['好饿...', '有没有好吃的？', '肚子咕咕叫', '想吃东西了...', '饿瘪了 QAQ'],
  sad: ['无聊...', '陪陪我嘛', 'QAQ', '好孤单啊...', '呜呜'],
  idle: ['发呆中...', 'zzz...', '今天干点啥呢', '（盯——）', '...'],
  feed: ['好吃！', '谢谢主人！', '饱了饱了~', '再来一份！', '嗝~'],
  play: ['来玩吧！', '哈哈！', '好玩！', '再来一次！', '耶！'],
};
```

### 4.3 在 app.js 中的集成方式

```js
// app.js（由 A 负责，但 C 需要了解自己的类如何被实例化）

const eventBus = new EventBus();
const status  = new Status(eventBus);
const bubble  = new Bubble(document.getElementById('bubble-container'));

// A 负责绑定以下事件：

// 菜单 → 状态
eventBus.on('menu:feed', () => status.feed(30));
eventBus.on('menu:play', () => status.play(10));

// 点击 → 状态
eventBus.on('pet:clicked', () => status.play(10));

// 状态 → 气泡（C 的模块内部联动，也可由 C 在 bubble.js 中自行监听）
eventBus.on('status:hungry', () => bubble.show('hungry'));
eventBus.on('status:starving', () => bubble.show('hungry', { text: '我要饿死了！！！' }));
eventBus.on('status:sad', () => bubble.show('sad'));
eventBus.on('status:fed', () => bubble.show('feed'));
eventBus.on('status:played', () => bubble.show('happy'));

// 气泡位置跟随宠物（A 负责）
eventBus.on('pet:dragEnd', ({ x, y }) => bubble.setPosition(x, y - 40));
eventBus.on('pet:clicked', ({ x, y }) => bubble.setPosition(x, y - 40));

// 数据持久化（A 负责）
eventBus.on('app:save', () => {
  const data = { status: status.getData() };
  // A 收集 pet 数据后调用 window.petAPI.saveData(data)
});
```

### 4.4 CSS 参考（气泡样式，C 可直接写在 style.css 或内联）

```css
.bubble {
  position: absolute;
  display: none;
  background: #fff;
  border: 2px solid #ccc;
  border-radius: 12px;
  padding: 6px 12px;
  max-width: 200px;
  font-size: 13px;
  color: #333;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  z-index: 1000;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}

.bubble--visible {
  opacity: 1;
}

.bubble-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bubble-arrow {
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 8px solid #fff;
}

/* 状态栏（可选） */
.status-bar {
  position: fixed;
  bottom: 10px;
  right: 10px;
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: #666;
}

.status-bar__hunger::before {
  content: '🍖';
  margin-right: 4px;
}

.status-bar__mood::before {
  content: '💖';
  margin-right: 4px;
}
```

---

## 五、与其他人员的接口约定

### 5.1 与 A（app.js / menu.js）的约定

| 场景 | C 提供 | A 调用 |
|------|--------|--------|
| 初始状态加载 | `status.loadData(data.status)` | app.js 启动时调用 |
| 退出保存 | `status.getData()` 返回 `{hunger, mood}` | app.js 收集后调用 IPC |
| 右键喂食 | 监听 `menu:feed` | menu.js emit `menu:feed` |
| 右键玩耍 | 监听 `menu:play` | menu.js emit `menu:play` |
| 气泡显示 | 监听 `bubble:show` | app.js emit `bubble:show` |

### 5.2 与 B（pet.js）的约定

| 场景 | C 提供 | B 调用/触发 |
|------|--------|------------|
| 点击宠物 | 监听 `pet:clicked` | pet.js emit `pet:clicked` |
| 拖拽结束 | 监听 `pet:dragEnd`（用于气泡位置跟随） | pet.js emit `pet:dragEnd` |
| 状态影响动画 | C emit `status:hungry` / `status:sad` | B 监听后切换 sad 动画 |

---

## 六、自测清单

### Status 模块

- [ ] `new Status(eventBus)` 创建实例，hunger=100, mood=100
- [ ] `start()` 后每秒 hunger 减 0.5，mood 减 0.3
- [ ] `stop()` 后停止衰减
- [ ] `feed(30)` 后 hunger +30，不超 100
- [ ] `play(10)` 后 mood +10，不超 100
- [ ] hunger 从 100 降到 30 以下时，emit `status:hungry` **仅一次**
- [ ] hunger 从 30 以上降到 10 以下时，emit `status:starving` **仅一次**
- [ ] mood 从 100 降到 20 以下时，emit `status:sad` **仅一次**
- [ ] feed() 后 hunger 回升到 ≥30，再次降到 <30 时能重新 emit `status:hungry`
- [ ] play() 后 mood 回升到 ≥20，再次降到 <20 时能重新 emit `status:sad`
- [ ] `getData()` 返回 `{hunger, mood}`
- [ ] `loadData({hunger: 50, mood: 60})` 正确恢复
- [ ] `destroy()` 清理定时器

### Bubble 模块

- [ ] `new Bubble(container)` 在 container 中创建 DOM 元素
- [ ] `show('happy')` 显示气泡，随机选择对应台词
- [ ] `show('happy', {text: '自定义'})` 显示自定义文本
- [ ] `show('happy', {duration: 1000})` 1 秒后自动隐藏
- [ ] `hide()` 立即隐藏气泡
- [ ] `setPosition(100, 200)` 气泡定位到指定坐标
- [ ] `setQuotes('test', ['a', 'b'])` 注册自定义台词
- [ ] `destroy()` 移除 DOM 元素

---

> 最后更新：2026-07-25