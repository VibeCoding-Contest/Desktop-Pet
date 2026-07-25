# 桌面桌宠 APP — 详细开发规划

> 技术栈：Electron + HTML/CSS/Canvas  
> 团队：3 人 | 总时长：4 小时 | 开发模式：Vibe Coding

---

## 一、项目目标

开发一款 **桌面宠物（Desktop Pet）** 应用程序，角色悬浮在桌面最上层，支持拖拽、点击互动、状态管理、自动行为等。最终产出可运行的 `.exe` / `.dmg` 安装包。

---

## 二、技术选型

| 层 | 技术 | 理由 |
|----|------|------|
| 桌面壳 | **Electron** | 原生透明窗口、系统托盘、点击穿透、成熟生态 |
| 渲染 | **HTML + CSS + Canvas 2D** | 帧动画用 Canvas，UI 用 DOM，简单直观 |
| 打包 | **electron-builder** | 一键打包 Windows/macOS/Linux |
| 状态管理 | 原生 JS Object | 无需引入框架，减少复杂度 |
| 持久化 | **localStorage** / JSON 文件 | 轻量，满足需求 |

---

## 三、功能清单（分阶段）

### 第一阶段：核心骨架（前 1.5h） ⭐ 必须完成

| 编号 | 功能 | 详细描述 | 优先级 |
|------|------|----------|--------|
| F1 | 透明无边框窗口 | 窗口置顶、无边框、背景透明，显示在桌面所有窗口之上 | P0 |
| F2 | 角色精灵渲染 | 使用 Canvas 绘制角色，支持至少 3 种动画状态（idle / walk / jump） | P0 |
| F3 | 鼠标拖拽移动 | 按住角色可拖拽到屏幕任意位置，松开后停留在目标位置 | P0 |
| F4 | 右键上下文菜单 | 右键弹出菜单，包含「喂食」「玩耍」「退出」选项 | P0 |
| F5 | 状态属性系统 | 饱食度（0-100）和心情值（0-100），随时间自动衰减 | P0 |

### 第二阶段：趣味互动（1.5h - 3h） ⭐ 尽量完成

| 编号 | 功能 | 详细描述 | 优先级 |
|------|------|----------|--------|
| F6 | 点击互动反馈 | 点击角色触发弹跳动画 + 心情值 +10 | P1 |
| F7 | 喂食系统 | 饱食度 < 30 时弹出气泡提示，通过菜单喂食恢复饱食度 | P1 |
| F8 | 挂机自动行为 | 空闲 5 秒后随机触发：走动、坐下、打哈欠，间隔随机 | P1 |
| F9 | 对话气泡 | 随机弹出气泡显示台词（吐槽、鼓励、卖萌），持续 3 秒后消失 | P1 |
| F10 | 跟随鼠标 | 双击后角色短暂跟随鼠标移动 2 秒 | P1 |

### 第三阶段：锦上添花（3h - 4h） 🎉 有余力实现

| 编号 | 功能 | 详细描述 | 优先级 |
|------|------|----------|--------|
| F11 | 多角色切换 | 菜单中支持切换角色（猫/狗/企鹅），每种有独立动画帧 | P2 |
| F12 | 番茄钟提醒 | 每 25 分钟弹出提醒气泡，与角色状态联动 | P2 |
| F13 | 窗口边缘吸附 | 拖拽到屏幕边缘时自动吸附停靠 | P2 |
| F14 | 系统托盘最小化 | 点击关闭时最小化到托盘，托盘图标右键菜单控制 | P2 |
| F15 | 本地数据持久化 | 启动时恢复角色状态、昵称、位置，关闭时自动保存 | P2 |

---

## 四、项目目录结构

```
desktop-pet/
├── package.json              # 项目配置 & 依赖
├── main.js                   # Electron 主进程（窗口管理、托盘、IPC）
├── preload.js                # 预加载脚本（暴露安全 API 给渲染进程）
├── renderer/
│   ├── index.html            # 主页面
│   ├── style.css             # 样式（气泡、菜单、动画）
│   ├── app.js                # 渲染进程入口（初始化 & 事件绑定）
│   ├── pet.js                # 角色核心（精灵动画、状态机、自动行为）
│   ├── status.js             # 状态系统（饱食度、心情值、衰减计时器）
│   ├── bubble.js             # 对话气泡模块
│   └── menu.js               # 右键菜单模块
├── assets/
│   ├── sprites/              # 精灵帧图片（idle/walk/jump/bubble）
│   │   ├── cat/              # 猫咪角色
│   │   ├── dog/              # 狗狗角色
│   │   └── penguin/          # 企鹅角色
│   ├── icons/                # 托盘图标、应用图标
│   └── sounds/               # 音效文件（可选）
└── build/                    # electron-builder 配置输出
```

---

## 五、架构设计

### 5.1 整体架构图

```
┌─────────────────────────────────────────────┐
│               Electron 主进程                 │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ 窗口管理  │  │ 系统托盘  │  │  IPC 通信  │  │
│  │ (透明置顶)│  │ (最小化)  │  │           │  │
│  └──────────┘  └──────────┘  └───────────┘  │
└────────────────────┬────────────────────────┘
                     │ preload.js (contextBridge)
┌────────────────────▼────────────────────────┐
│              渲染进程 (BrowserWindow)          │
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │           index.html                 │    │
│  │  ┌────────┐  ┌────────┐  ┌───────┐  │    │
│  │  │ Canvas │  │ Bubble │  │ Menu  │  │    │
│  │  │ (宠物)  │  │ (气泡)  │  │ (菜单) │  │    │
│  │  └────────┘  └────────┘  └───────┘  │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌────────┐  │
│  │pet.js│  │status│  │bubble│  │ menu.js│  │
│  │ 角色  │  │ .js  │  │ .js  │  │  菜单   │  │
│  │ 核心  │  │ 状态  │  │ 气泡  │  │  交互   │  │
│  └──────┘  └──────┘  └──────┘  └────────┘  │
└──────────────────────────────────────────────┘
```

### 5.2 主进程职责（main.js）

- 创建透明无边框窗口，设置 `alwaysOnTop: true`
- 配置 `setIgnoreMouseEvents({ forward: true })` 实现点击穿透（需配合轮询检测鼠标位置）
- 处理窗口拖拽（通过 IPC 接收渲染进程的拖拽事件）
- 管理系统托盘图标及菜单
- 处理应用退出逻辑

### 5.3 渲染进程职责

| 模块 | 文件 | 职责 |
|------|------|------|
| 角色核心 | `pet.js` | Canvas 绘制、帧动画播放、状态机（idle → walk → jump → idle）、自动行为调度 |
| 状态系统 | `status.js` | 属性管理（hunger / mood）、定时衰减、阈值检测、触发气泡提示 |
| 对话气泡 | `bubble.js` | 气泡 DOM 元素的创建/销毁、台词库、显示/隐藏动画 |
| 菜单交互 | `menu.js` | 右键菜单的创建、选项点击回调、与 status 模块联动 |
| 应用入口 | `app.js` | 初始化各模块、IPC 事件监听、全局事件绑定 |

### 5.4 角色状态机

```
         ┌──────────┐
         │   IDLE   │ ◄──────────────┐
         │  待机动画  │                │
         └─────┬────┘                │
               │                    │
    ┌──────────┼──────────┐         │
    │          │          │         │
    ▼          ▼          ▼         │
┌──────┐  ┌──────┐  ┌──────┐       │
│ WALK │  │ JUMP │  │ SIT  │       │
│ 走路  │  │ 跳跃  │  │ 坐下  │       │
└──┬───┘  └──┬───┘  └──┬───┘       │
   │         │         │            │
   └─────────┴─────────┴────────────┘
            (动画结束 → 回到 IDLE)
```

### 5.5 数据流

```
用户操作
  │
  ├─ 拖拽 ──→ IPC → 主进程移动窗口
  │
  ├─ 点击 ──→ pet.js 触发 jump 动画
  │         └─→ status.js 心情 +10
  │
  ├─ 右键喂食 ──→ status.js 饱食度 +30
  │             └─→ bubble.js 显示「好吃！」气泡
  │
  └─ 退出 ──→ IPC → 主进程保存数据 → 关闭应用


定时器 (每秒)
  │
  └─→ status.js 饱食度 -0.5, 心情 -0.3
      │
      ├─ 饱食度 < 30 → bubble.js 显示「好饿...」
      └─ 心情 < 20   → pet.js 切换 sad 动画


空闲检测 (5 秒无操作)
  │
  └─→ pet.js 触发随机自动行为 (walk/sit/yawn)
```

---

## 六、开发流程（时间线）

### 总览

```
0:00 ───────── 1:30 ───────── 3:00 ───────── 4:00
│ 第一阶段      │ 第二阶段      │ 第三阶段      │
│ 核心骨架      │ 趣味互动      │ 锦上添花      │
```

### 详细时间线

| 时间 | 阶段 | 任务 | 负责人 |
|------|------|------|--------|
| 0:00-0:15 | 准备 | 初始化 Electron 项目，安装依赖，建目录结构 | 全员 |
| 0:15-0:45 | P0 | 创建透明窗口，Canvas 渲染首个角色精灵 | A + B |
| 0:15-0:45 | P0 | 实现状态系统（属性 + 衰减定时器） | C |
| 0:45-1:15 | P0 | 实现拖拽移动 + 右键菜单 | A |
| 0:45-1:15 | P0 | 完善角色动画（idle / walk / jump 三套帧） | B |
| 1:15-1:30 | P0 | 联调：状态变化驱动动画切换 | 全员 |
| 1:30-2:00 | P1 | 点击互动反馈 + 喂食系统 | B + C |
| 2:00-2:30 | P1 | 挂机自动行为（随机走动/坐下/打哈欠） | B |
| 2:00-2:30 | P1 | 对话气泡系统 | C |
| 2:30-3:00 | P1 | 跟随鼠标 + 联调 | A + B |
| 3:00-3:30 | P2 | 多角色切换或系统托盘 | 全员 |
| 3:30-4:00 | P2 | 数据持久化 + 打包测试 | 全员 |

---

## 七、分工方案

### 人 A：窗口 & 交互框架
- `main.js` — Electron 主进程
- `preload.js` — 安全桥接
- `app.js` — 渲染进程初始化、事件绑定
- `menu.js` — 右键菜单
- 窗口拖拽、边缘吸附、系统托盘

### 人 B：角色 & 动画
- `pet.js` — 角色核心逻辑
- Canvas 绘制 & 帧动画系统
- 状态机（idle / walk / jump / sit / yawn）
- 自动行为调度
- 精灵素材准备（或使用简单几何图形代替）

### 人 C：状态 & 数据
- `status.js` — 属性系统（饱食度、心情值）
- 定时衰减逻辑
- 阈值检测与事件触发
- `bubble.js` — 对话气泡
- 数据持久化（localStorage）
- 台词库管理

---

## 八、关键实现细节

### 8.1 透明窗口点击穿透（main.js）

```js
// 主进程
const { BrowserWindow } = require('electron');
const win = new BrowserWindow({
  transparent: true,
  frame: false,
  alwaysOnTop: true,
  resizable: false,
  hasShadow: false,
  // ...
});

// 关键：让鼠标事件穿透透明区域
win.setIgnoreMouseEvents(true, { forward: true });

// 渲染进程通过 IPC 通知主进程切换穿透状态
// 当鼠标悬停在角色上时 → 关闭穿透（可交互）
// 当鼠标离开角色区域时 → 开启穿透（不阻挡其他窗口）
```

### 8.2 帧动画系统（pet.js）

```js
class Pet {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = 'idle';          // idle | walk | jump | sit | yawn
    this.currentFrame = 0;
    this.frameTimer = 0;
    this.sprites = {};            // 预加载的精灵帧
    this.x = 0; this.y = 0;       // 角色位置
  }

  update(deltaTime) {
    // 根据状态推进帧
    this.frameTimer += deltaTime;
    if (this.frameTimer > this.frameDuration) {
      this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
      this.frameTimer = 0;
    }
  }

  draw() {
    const frame = this.sprites[this.state][this.currentFrame];
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(frame, this.x, this.y);
  }

  setState(newState) {
    if (this.state !== newState) {
      this.state = newState;
      this.currentFrame = 0;
    }
  }
}
```

### 8.3 状态衰减（status.js）

```js
class Status {
  constructor() {
    this.hunger = 100;   // 饱食度，越小越饿
    this.mood = 100;     // 心情值，越小越差
    this.hungerDecay = 0.5;   // 每秒衰减
    this.moodDecay = 0.3;
  }

  start() {
    this.timer = setInterval(() => {
      this.hunger = Math.max(0, this.hunger - this.hungerDecay);
      this.mood = Math.max(0, this.mood - this.moodDecay);
      this.checkThresholds();
    }, 1000);
  }

  checkThresholds() {
    if (this.hunger < 30) emit('hungry');
    if (this.mood < 20) emit('sad');
  }

  feed(amount = 30) { this.hunger = Math.min(100, this.hunger + amount); }
  play(amount = 10) { this.mood = Math.min(100, this.mood + amount); }
}
```

### 8.4 对话气泡（bubble.js）

```js
const quotes = {
  happy: ['今天天气真好~', '主人最好了！', '嘿嘿'],
  hungry: ['好饿...', '有没有好吃的？', '肚子咕咕叫'],
  sad: ['无聊...', '陪陪我嘛', 'QAQ'],
  idle: ['发呆中...', 'zzz...', '今天干点啥呢'],
};

class Bubble {
  constructor(container) {
    this.el = document.createElement('div');
    this.el.className = 'bubble';
    container.appendChild(this.el);
  }

  show(type) {
    const list = quotes[type] || quotes.idle;
    const text = list[Math.floor(Math.random() * list.length)];
    this.el.textContent = text;
    this.el.style.display = 'block';
    setTimeout(() => { this.el.style.display = 'none'; }, 3000);
  }
}
```

### 8.5 鼠标拖拽窗口（app.js）

```js
// 渲染进程通过 IPC 告知主进程移动窗口
const { ipcRenderer } = require('electron');

let isDragging = false;
let dragStartX, dragStartY;

canvas.addEventListener('mousedown', (e) => {
  isDragging = true;
  dragStartX = e.screenX;
  dragStartY = e.screenY;
});

window.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const dx = e.screenX - dragStartX;
  const dy = e.screenY - dragStartY;
  ipcRenderer.send('move-window', dx, dy);
  dragStartX = e.screenX;
  dragStartY = e.screenY;
});

window.addEventListener('mouseup', () => {
  isDragging = false;
});
```

---

## 九、精灵素材方案

### 方案 A：简单几何图形（推荐前期使用）

用 Canvas 绘制简单的几何角色（圆形身体 + 耳朵 + 眼睛 + 嘴巴），通过代码控制动画帧。优点是无需外部资源，纯代码实现。

### 方案 B：Sprite Sheet 图片

从素材网站下载单张精灵图，切分为帧。优点效果更好，缺点需要找素材。推荐网站：itch.io、OpenGameArt。

### 方案 C：CSS 纯绘制

用多个 div + CSS 组合成角色，CSS transition 做动画。优点是开发快，缺点是复杂动画效果有限。

**建议**：先用方案 A 快速开发，后续有时间再替换为方案 B。

---

## 十、风险与应对

| 风险 | 概率 | 应对 |
|------|------|------|
| Electron 环境配置有问题 | 中 | 提前检查 Node.js 版本，准备离线安装包 |
| 点击穿透实现复杂 | 中 | 先做简单版本（不穿透），后续迭代 |
| 精灵素材找不到合适的 | 高 | 用几何图形兜底，功能优先于美术 |
| 动画卡顿 | 低 | 使用 `requestAnimationFrame`，控制帧率 |
| 时间不够 | 中 | 严格按优先级实现，P0 完成即可演示 |

---

## 十一、package.json 参考

```json
{
  "name": "desktop-pet",
  "version": "1.0.0",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build": "electron-builder"
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.0.0"
  },
  "build": {
    "appId": "com.team.desktop-pet",
    "win": { "target": "nsis" },
    "mac": { "target": "dmg" }
  }
}
```

---

## 十二、验收标准

### 最低验收（P0 全部完成）
- [x] 窗口透明无边框，始终置顶
- [x] 角色在桌面可见，有至少 2 种动画
- [x] 可拖拽移动角色
- [x] 右键菜单可弹出，点击「退出」可关闭应用
- [x] 饱食度和心情值随时间变化

### 理想验收（P0 + P1 完成）
- [x] 点击角色有互动反馈
- [x] 角色饿了会提示，喂食可恢复
- [x] 角色会自主随机走动
- [x] 偶尔弹出对话气泡

### 完美验收（全部完成）
- [x] 可切换多种角色
- [x] 番茄钟定时提醒
- [x] 系统托盘支持
- [x] 重启后状态恢复

---

---

## 十三、GitHub 协作指南

> 仓库地址：https://github.com/VibeCoding-Contest/Desktop-Pet

### 13.1 仓库初始化（由一人完成，其余人克隆）

```bash
# 由人 A 执行初始化并 push 到 main
git clone https://github.com/VibeCoding-Contest/Desktop-Pet.git
cd Desktop-Pet
npm init -y
npm install electron --save-dev
npm install electron-builder --save-dev
# 创建基础目录结构
mkdir -p renderer assets/sprites/cat assets/sprites/dog assets/sprites/penguin assets/icons assets/sounds build
touch main.js preload.js renderer/index.html renderer/style.css renderer/app.js renderer/pet.js renderer/status.js renderer/bubble.js renderer/menu.js
# 编写 package.json 基础配置
git add .
git commit -m "chore: 初始化 Electron 项目骨架"
git push origin main

# 人 B 和 C 克隆项目
git clone https://github.com/VibeCoding-Contest/Desktop-Pet.git
cd Desktop-Pet
npm install
```

### 13.2 分支策略（Feature Branch）

```
main                    ← 主分支，保持可运行状态
  ├── feat/window       ← 人 A：窗口管理 & 交互框架
  ├── feat/pet-animation← 人 B：角色 & 动画
  └── feat/status-bubble← 人 C：状态系统 & 气泡
```

**工作流：**

```bash
# 1. 各自从 main 拉最新代码
git checkout main
git pull origin main

# 2. 创建自己的 feature 分支
git checkout -b feat/window         # 人 A
git checkout -b feat/pet-animation  # 人 B
git checkout -b feat/status-bubble  # 人 C

# 3. 开发... 写代码

# 4. 频繁提交（每完成一个小功能点）
git add .
git commit -m "feat: 创建透明无边框窗口"

# 5. 推送自己的分支
git push origin feat/window

# 6. 在 GitHub 上创建 Pull Request → 队友 review → 合并到 main
```

### 13.3 协作规范

| 规范 | 说明 |
|------|------|
| **Commit 粒度** | 每完成一个小功能点就 commit，不要攒到最后 |
| **Commit 格式** | `feat: xxx`（新功能） / `fix: xxx`（修复） / `refactor: xxx`（重构） / `chore: xxx`（项目配置） |
| **合并前先拉** | 合并 PR 前先 `git pull origin main` 解决冲突 |
| **不要直接 push main** | 所有改动通过 PR 合并，main 分支设置保护规则 |
| **冲突处理** | 当面沟通解决，谁的模块有冲突谁负责修 |
| **PR 合并人** | 不是自己 PR 的队友点 Merge，互相 review |

### 13.4 文件修改隔离（减少冲突）

三人修改的文件天然隔离，冲突概率极低：

```
人 A 修改的文件：
  main.js, preload.js, renderer/app.js, renderer/menu.js

人 B 修改的文件：
  renderer/pet.js, assets/sprites/

人 C 修改的文件：
  renderer/status.js, renderer/bubble.js
```

**可能冲突的文件**：`index.html` 和 `style.css`

- **人 A** 先建好 `index.html` 和 `style.css` 的基础骨架，commit 到 main
- **人 B 和 C** 在此基础上添加自己的 DOM 元素和样式，注意不要删除别人的结构

### 13.5 GitHub 仓库设置建议

去仓库 Settings → Branches → Add branch protection rule：

- Branch name pattern：`main`
- 勾选 **"Require a pull request before merging"**
- 勾选 **"Require approvals"** → 设为 1
- 这样防止有人误推 main，确保代码经过 review

### 13.6 日常开发节奏

```
第一步：拉取最新代码
  git checkout main && git pull origin main

第二步：合并到自己的分支
  git checkout feat/window && git merge main

第三步：开发 & 提交
  git add . && git commit -m "feat: xxx"

第四步：推送并创建 PR
  git push origin feat/window
  # 去 GitHub 页面创建 Pull Request

第五步：队友 review 合并后，回到第一步
```

### 13.7 常见问题

**Q：我本地改了 `index.html`，推上去发现队友也改了，冲突了怎么办？**

```bash
git pull origin main
# Git 会提示冲突文件
# 打开冲突文件，找到 <<<<<<< 和 >>>>>>> 标记
# 手动合并后：
git add index.html
git merge --continue
```

**Q：不小心 commit 到 main 了？**

```bash
git checkout -b feat/xxx    # 从 main 当前状态创建分支
git checkout main
git reset --hard HEAD~1     # main 回退一个 commit
git checkout feat/xxx       # 回到自己的分支继续开发
```

**Q：怎么在开发时实时看到效果？**

```bash
npm start
# Electron 窗口会出现，修改代码后 Ctrl+R 刷新窗口
```

---

> 最后更新：2026-07-25