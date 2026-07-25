# 人员 A 工作规划：窗口 & 交互框架

> 本文档基于《桌宠APP详细规划》与《接口设计文档》，将人员 A 的任务拆解为可执行的开发清单。
> 仓库：https://github.com/VibeCoding-Contest/Desktop-Pet

---

## 一、角色定位与职责边界

| 项 | 内容 |
|----|------|
| **角色** | 窗口 & 交互框架（"地基 + 神经中枢"） |
| **职责** | Electron 主进程、安全桥接、渲染入口协调、右键菜单、窗口交互 |
| **协作定位** | A 的工作最早被依赖（窗口+IPC+入口骨架），是 B、C 联调的前提 |

### 对外暴露的文件（仅 A 修改）
- `main.js` — Electron 主进程
- `preload.js` — 安全桥接（contextBridge）
- `renderer/app.js` — 渲染进程入口、事件绑定、全局协调
- `renderer/menu.js` — 右键上下文菜单
- `renderer/index.html`、`renderer/style.css` — 基础骨架（A 先建好供 B/C 在此叠加）

### 不应改动的文件（属他人）
- `renderer/pet.js`、`assets/sprites/`（人 B）
- `renderer/status.js`、`renderer/bubble.js`（人 C）

---

## 二、负责文件清单与职责

| 文件 | 阶段 | 核心职责 | 关键点 |
|------|------|----------|--------|
| `main.js` | P0 起 | 创建透明无边框窗口、IPC handler、托盘、退出保存 | `transparent`+`frame:false`+`alwaysOnTop`；`setIgnoreMouseEvents({forward:true})` |
| `preload.js` | P0 起 | 暴露 `window.petAPI` 给渲染进程 | contextBridge，不暴露 `ipcRenderer` 本体 |
| `renderer/app.js` | P0 起 | 初始化模块、绑全局事件、协调 EventBus | 单例 `eventBus`，串联第一条链路：拖拽→移动 |
| `renderer/menu.js` | P0 起 | 右键菜单 DOM、显示/隐藏、点击回调 | 自绘 DOM 菜单（非原生 Menu），便于在透明窗口内定位 |
| `renderer/index.html` | P0 起 | 页面骨架：canvas + bubble-container + menu-container | A 先 commit 基础结构 |
| `renderer/style.css` | P0 起 | 全局样式：透明 body、菜单/气泡容器占位 | A 先 commit 基础 reset + 容器 |

---

## 三、负责功能清单（按优先级）

### P0 — 必须完成（第一阶段，0:15–1:30）
| 编号 | 功能 | A 的产出 | 验收 |
|------|------|----------|------|
| **F1** | 透明无边框置顶窗口 | `main.js` 窗口配置 + `preload.js` 桥接 | 角色悬浮桌面最上层，背景透明，无边框 |
| **F3** | 鼠标拖拽移动 | `app.js` mousedown/move/up + IPC `move-window` + 点击穿透切换 | 按住角色可拖到任意位置，松开停留 |
| **F4** | 右键上下文菜单 | `menu.js` + IPC 无关（纯渲染）+ EventBus `menu:*` 事件 | 右键弹出菜单，含喂食/玩耍/切换/退出；点退出可关闭 |

### P1 — 尽量完成（第二阶段，2:30–3:00）
| 编号 | 功能 | A 的产出 | 验收 |
|------|------|----------|------|
| **F10** | 跟随鼠标 | `app.js` 双击监听 + 2 秒跟随逻辑 + 调 B 的 `pet.moveTo` | 双击后角色跟随鼠标 2 秒 |

### P2 — 锦上添花（第三阶段，3:00–4:00）
| 编号 | 功能 | A 的产出 | 验收 |
|------|------|----------|------|
| **F13** | 窗口边缘吸附 | `app.js` 拖拽结束时检测屏幕边界，自动靠边 | 拖到边缘自动吸附停靠 |
| **F14** | 系统托盘最小化 | `main.js` Tray + 托盘菜单 + IPC `minimize-to-tray`/`tray-action` | 关闭时最小化到托盘，托盘可恢复/退出 |

---

## 四、接口依赖关系

### 4.1 A 提供给 B/C 的接口（A 须先稳定）
| 接口 | 给谁 | 形式 | 说明 |
|------|------|------|------|
| `window.petAPI.moveWindow(dx,dy)` | app.js 自用 | IPC | 拖拽移动窗口 |
| `window.petAPI.setClickThrough(bool)` | app.js 自用 | IPC | 切换鼠标穿透 |
| `window.petAPI.loadData()` / `saveData()` | app.js 自用 | IPC | 持久化（C 的 status 数据由 A 经此存取） |
| `window.petAPI.onTrayAction(cb)` | app.js 自用 | IPC | 托盘动作回调 |
| EventBus 单例（由 app.js 创建并注入各模块） | B、C | 构造参数 | B/C 模块构造函数接收 `eventBus` |
| `index.html` 容器骨架 | B、C | DOM | `#pet-canvas`、`#bubble-container`、`#menu-container` |

### 4.2 A 依赖 B/C 的接口（联调时调用）
| 调用方 | 被调方 | 接口 | 何时用 |
|--------|--------|------|--------|
| app.js | pet.js (B) | `new Pet(canvas)`、`pet.moveTo`、`pet.getBounds`、事件 `pet:stateChange`/`pet:dragging` | 拖拽时同步宠物位置；F10 跟随鼠标 |
| app.js | status.js (C) | `new Status()`、`status.start()`、事件 `status:hungry`/`sad` | 初始化；状态联动动画（间接） |
| app.js | bubble.js (C) | `new Bubble(container)`、事件 `bubble:show`/`bubble:hide` | 点击/喂食后显示气泡 |
| menu.js | status.js (C) | 事件 `menu:feed`/`menu:play` | 菜单项点击 → 状态变化 |

> 联调前，A 只需保证 **EventBus 单例** 与 **页面容器骨架** 就绪，B/C 各自实现类后注入即可。

---

## 五、开发顺序与里程碑

> 总时长约 1.5h（P0）+ 0.5h（P1）+ 0.5h（P2），与团队时间线对齐。

### 里程碑 0：分支与骨架（0:00–0:15，全员协作）
- [ ] 从 `main` 拉最新代码
- [ ] 创建并切换到 `feat/window` 分支
- [ ] 在 `index.html` 写好三容器骨架；`style.css` 写透明 body + 容器 reset
- [ ] commit："chore: 建立渲染层骨架(index.html/style.css)"
- [ ] push `feat/window`，建 PR 占位（Draft）

### 里程碑 1：透明窗口 + IPC（0:15–0:45）
- [ ] `main.js`：BrowserWindow 配置（transparent/frame/alwaysOnTop/hasShadow）
- [ ] `main.js`：注册 IPC handler：`move-window`、`set-click-through`、`get-window-bounds`、`save-data`、`load-data`
- [ ] `preload.js`：contextBridge 暴露 `window.petAPI`（全部 API 见接口文档 §2.1）
- [ ] `app.js`：创建 `EventBus` 单例（简单实现 on/off/emit 即可，或与 C 共用）
- [ ] **自测**：`npm start` 能弹出透明窗口，`window.petAPI` 在 DevTools 可见

### 里程碑 2：拖拽移动（0:45–1:15，与 B 并行）
- [ ] `app.js`：canvas `mousedown`→记录起点+关穿透；`mousemove`→`emit('pet:dragging')`+`moveWindow`；`mouseup`→`emit('pet:dragEnd')`+恢复穿透
- [ ] 拖拽逻辑兼容 B 的 pet.js 未就绪情况（pet.js 未实现时拖拽仅移动窗口即可）
- [ ] **自测**：角色可拖到屏幕任意位置，松开停留；离开角色区域点击穿透到下层窗口

### 里程碑 3：右键菜单（0:45–1:15）
- [ ] `menu.js`：`Menu` 类 `show(x,y)`/`hide()`/`destroy()`
- [ ] 菜单项：喂食 / 玩耍 / 切换角色 / 退出（对应 `menu:feed`/`menu:play`/`menu:switchPet`/`menu:exit`）
- [ ] `app.js`：canvas `contextmenu` → `menu.show()`；监听 `menu:exit` → `closeApp()`
- [ ] **自测**：右键弹菜单，点退出能关应用；点喂食/玩耍发出事件（B/C 接收后回显）

### 里程碑 4：联调（1:15–1:30，全员）
- [ ] app.js 串联：实例化 pet/status/bubble/menu，注入 eventBus
- [ ] 打通「拖拽→移动」全链路
- [ ] 打通「右键喂食→状态+气泡」全链路
- [ ] 合并 PR 到 main

### 里程碑 5：跟随鼠标 F10（2:30–3:00，与 B 联调）
- [ ] `app.js`：canvas `dblclick` → 2 秒内监听 mousemove，调 `pet.moveTo`
- [ ] **自测**：双击后角色跟随鼠标移动 2 秒

### 里程碑 6：边缘吸附 F13 + 托盘 F14（3:00–4:00）
- [ ] `main.js`：`Tray` + 托盘菜单（显示/退出）；IPC `minimize-to-tray`、`tray-action`
- [ ] `app.js`：拖拽结束时获取 window bounds，判断屏幕边缘吸附
- [ ] `app.js`：`close` 事件改为最小化到托盘
- [ ] **自测**：拖到边缘吸附；关闭最小化到托盘；托盘可恢复

---

## 六、关键技术要点（速查）

### 6.1 透明窗口点击穿透
```js
// main.js
const win = new BrowserWindow({
  transparent: true, frame: false, alwaysOnTop: true,
  resizable: false, hasShadow: false, skipTaskbar: true,
});
// 鼠标在透明区域时穿透，在角色上时由 app.js 调 setClickThrough(false) 关闭
win.setIgnoreMouseEvents(true, { forward: true });
```

### 6.2 拖拽（渲染侧触发主进程移动）
```js
// app.js
canvas.addEventListener('mousedown', e => {
  isDragging = true; startX = e.screenX; startY = e.screenY;
  window.petAPI.setClickThrough(false);
});
window.addEventListener('mousemove', e => {
  if (!isDragging) return;
  const dx = e.screenX - startX, dy = e.screenY - startY;
  eventBus.emit('pet:dragging', { dx, dy });      // 同步 pet.js 内坐标
  window.petAPI.moveWindow(dx, dy);
  startX = e.screenX; startY = e.screenY;
});
window.addEventListener('mouseup', () => {
  isDragging = false;
  eventBus.emit('pet:dragEnd', { /* x,y */ });
  window.petAPI.setClickThrough(true);
});
```

### 6.3 preload 暴露（禁止直接暴露 ipcRenderer）
```js
// preload.js
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('petAPI', {
  moveWindow: (dx, dy) => ipcRenderer.send('move-window', dx, dy),
  setClickThrough: (en) => ipcRenderer.send('set-click-through', en),
  getWindowBounds: () => ipcRenderer.invoke('get-window-bounds'),
  saveData: (d) => ipcRenderer.send('save-data', d),
  loadData: () => ipcRenderer.invoke('load-data'),
  minimizeToTray: () => ipcRenderer.send('minimize-to-tray'),
  closeApp: () => ipcRenderer.send('close-app'),
  onTrayAction: (cb) => ipcRenderer.on('tray-action', (_e, a) => cb(a)),
});
```

### 6.4 右键菜单（纯 DOM，避免原生 Menu 在透明窗口的定位问题）
- `menu.js` 用一个绝对定位的 `div.context-menu`，`show(x,y)` 时设置 `left/top`
- 点击菜单项 → `eventBus.emit('menu:feed' | 'menu:play' | ...)`
- 点击空白处 → `hide()`

---

## 七、验收标准（A 的部分）

### 最低验收（P0）
- [ ] 窗口透明无边框、始终置顶、背景不挡其他窗口（点击穿透生效）
- [ ] 角色可拖拽移动到任意位置
- [ ] 右键弹菜单，含喂食/玩耍/退出；点退出能关闭应用
- [ ] `window.petAPI` 完整暴露接口文档 §2.1 列出的全部方法
- [ ] app.js 已创建 EventBus 单例并注入各模块

### 理想验收（+P1）
- [ ] 双击角色跟随鼠标 2 秒

### 完美验收（+P2）
- [ ] 拖到屏幕边缘自动吸附
- [ ] 关闭最小化到托盘，托盘菜单可恢复/退出
- [ ] 退出前自动保存数据（IPC `save-data`）

---

## 八、协作约定（A 视角）

- **分支**：始终在 `feat/window` 开发，PR 合并由 B 或 C review
- **Commit 粒度**：每完成一个小功能点 commit，格式 `feat: xxx` / `fix: xxx` / `chore: xxx`
- **冲突高发区**：`index.html`、`style.css` —— A 先建骨架并 commit，B/C 在此基础上**追加**，不删他人结构
- **联调阻塞**：A 的窗口/IPC/入口是 B/C 的前置依赖，里程碑 1、2 务必按时 push 到分支供他人拉取
- **沟通节点**：EventBus 事件名以接口文档 §3.2 为准，不擅自改名；如需新增事件先与 B/C 确认

---

## 九、风险与应对（A 专属）

| 风险 | 应对 |
|------|------|
| 点击穿透导致角色无法点击 | 用 `setIgnoreMouseEvents(true,{forward:true})` + 渲染侧轮询鼠标位置切换穿透；先做"不穿透"版本兜底 |
| 拖拽时窗口抖动 | 用增量 `dx/dy` 而非绝对坐标；`mousemove` 节流 |
| 透明窗口在某些 Linux 桌面不生效 | 记录为已知限制，Windows/macOS 优先保证 |
| IPC 暴露过多权限 | 严格通过 contextBridge 白名单暴露，不直接 expose `ipcRenderer` |

---

> 最后更新：2026-07-25
