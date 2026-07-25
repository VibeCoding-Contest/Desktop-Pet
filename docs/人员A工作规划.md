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
- [x] 从 `main` 拉最新代码
- [x] 创建并切换到 `feat/window` 分支
- [x] 在 `index.html` 写好三容器骨架；`style.css` 写透明 body + 容器 reset
- [ ] commit："chore: 建立渲染层骨架(index.html/style.css)" —— 待执行（见 §十 实现记录）
- [ ] push `feat/window`，建 PR 占位（Draft）—— 待执行

### 里程碑 1：透明窗口 + IPC（0:15–0:45）
- [x] `main.js`：BrowserWindow 配置（transparent/frame/alwaysOnTop/hasShadow）
- [x] `main.js`：注册 IPC handler：`move-window`、`set-click-through`、`get-window-bounds`、`save-data`、`load-data`
- [x] `preload.js`：contextBridge 暴露 `window.petAPI`（全部 API 见接口文档 §2.1）
- [x] `app.js`：创建 `EventBus` 单例（简单实现 on/off/emit 即可，或与 C 共用）
- [ ] **自测**：`npm start` 能弹出透明窗口，`window.petAPI` 在 DevTools 可见 —— 代码已写、语法校验通过；沙箱无网络无法下载 Electron 二进制，需在本机 `npm start` 验证（见 §十）

### 里程碑 2：拖拽移动（0:45–1:15，与 B 并行）
- [x] `app.js`：canvas `mousedown`→记录起点+关穿透；`mousemove`→`emit('pet:dragging')`+`moveWindow`；`mouseup`→`emit('pet:dragEnd')`+恢复穿透
- [x] 拖拽逻辑兼容 B 的 pet.js 未就绪情况（pet.js 未实现时拖拽仅移动窗口即可）
- [ ] **自测**：角色可拖到屏幕任意位置，松开停留；离开角色区域点击穿透到下层窗口 —— 代码已写、语法校验通过；需本机 `npm start` 验证（见 §十一）

### 里程碑 3：右键菜单（0:45–1:15）
- [x] `menu.js`：`Menu` 类 `show(x,y)`/`hide()`/`destroy()`
- [x] 菜单项：喂食 / 玩耍 / 切换角色 / 退出（对应 `menu:feed`/`menu:play`/`menu:switchPet`/`menu:exit`）
- [x] `app.js`：canvas `contextmenu` → `menu.show()`；监听 `menu:exit` → `closeApp()`
- [ ] **自测**：右键弹菜单，点退出能关应用；点喂食/玩耍发出事件（B/C 接收后回显） —— 代码已写、语法校验通过；需本机验证（见 §十一）

### 里程碑 4：联调（1:15–1:30，全员）
- [x] app.js 串联：实例化 pet/status/bubble/menu，注入 eventBus
- [x] 打通「拖拽→移动」全链路
- [x] 打通「右键喂食→状态+气泡」全链路
- [ ] 合并 PR 到 main —— 待执行

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

## 十、里程碑 1 实现记录（更新于 2026-07-25）

### 10.1 本次改动文件
| 文件 | 改动 | 说明 |
|------|------|------|
| `main.js` | 新建 | 透明无边框窗口 + 全部 IPC handler（move-window / set-click-through / get-window-bounds / save-data / load-data / close-app / minimize-to-tray）|
| `preload.js` | 新建 | contextBridge 暴露 `window.petAPI`（接口文档 §2.1 全量 API）|
| `renderer/index.html` | 新建 | 三容器骨架：`#pet-canvas` / `#bubble-container` / `#menu-container`；脚本加载顺序 pet→status→bubble→menu→app |
| `renderer/style.css` | 新建 | 透明 body、容器 reset、canvas dev 边框（人 B 接管后可移除）|
| `renderer/app.js` | 新建 | `EventBus` 类 + `window.eventBus` 单例 + 占位绘制 + 自测日志；模块实例化留到里程碑 4 |
| `package.json` | 修改 | `main` 由 `index.js` 改为 `main.js`；补 `start`/`build` 脚本；补 `build` 配置块；`description` |

### 10.2 关键实现决策
1. **点击穿透默认开启**：`win.setIgnoreMouseEvents(true, {forward:true})`，保证透明 220×220 窗口不挡其他应用；交互时由渲染层 `setClickThrough(false)` 关闭（里程碑 2/3 实现）。
2. **持久化用 JSON 文件而非 localStorage**：主进程无法访问 localStorage，改用 `app.getPath('userData')/pet-save.json` 读写（接口文档 §6.2 描述为主进程写入，此处落地）。
3. **EventBus 暴露为 `window.eventBus`**：B/C 模块（pet/status/bubble/menu）通过 `window.eventBus` 订阅/发布，避免改各自构造签名；`on()` 返回取消函数便于解绑。
4. **app.js 暂不实例化 B/C 模块**：里程碑 1 只交付地基，`new Pet/Status/Bubble/Menu` 留到里程碑 4 联调；占位圆形绘制让透明窗口在自测时可见。
5. **`minimize-to-tray` 兜底为 `hide()`**：托盘（F14）未实现前先隐藏窗口，避免功能缺失导致卡死。
6. **index.html 脚本顺序**：类定义在前、`app.js` 最后，使 `app.js` 能引用各全局 `class`（classic script 顶层 class 为全局词法绑定）。

### 10.3 验证情况
- [x] `node --check main.js / preload.js / renderer/app.js` 全部通过
- [x] `package.json` JSON 合法
- [x] index.html 引用的脚本文件均存在
- [ ] **运行时自测未完成**：沙箱无网络，Electron 二进制未下载（`node_modules/electron/dist/electron` 缺失，`install.js` fetch failed）。需在本机执行 `npm install`（补二进制）后 `npm start` 验证：透明窗口弹出、DevTools Console 打印 `[app] window.petAPI = {…}`、占位圆形可见。

### 10.4 与 B/C 的接口交付状态（A 侧已就绪）
- `window.petAPI` ✅ 全量暴露，B/C 无需等待
- `window.eventBus` ✅ 单例就绪，B/C 可直接订阅事件
- `index.html` ✅ 三容器 ID 固定（`#pet-canvas`/`#bubble-container`/`#menu-container`），B/C 据此挂载
- 待里程碑 2/3 完成 `pet:dragging`/`menu:*` 事件流转后即可全链路联调

### 10.5 下一步
- 里程碑 2（拖拽移动）+ 里程碑 3（右键菜单）—— 与 B 并行，依赖里程碑 1 地基（已完成）
- 完成后建议统一 commit + push `feat/window` 并建 PR

---

## 十一、里程碑 2 & 3 实现记录（更新于 2026-07-25）

> 进度背景：里程碑 1 已合并（PR #5，commit ae8c3f5）；B/C 的 `status.js`/`bubble.js` 已合并（PR #3/#4）。本轮实现 A 的里程碑 2（拖拽）+ 里程碑 3（右键菜单）。

### 11.1 本次改动文件
| 文件 | 改动 | 说明 |
|------|------|------|
| `renderer/menu.js` | 新建（填充） | `Menu` 类：`show(x,y,options)`/`hide()`/`destroy()`/`get visible()`；菜单项配置 + switch-pet 循环切换；边缘翻转定位；点外部收起 |
| `renderer/app.js` | 修改 | 拖拽事件链（mousedown/mousemove/mouseup）、点击穿透 hover 切换、右键菜单接入、菜单事件路由（`menu:exit/feed/play/switchPet`）、全局阻止默认右键 |
| `main.js` | 修改 | 点击穿透默认值改为平台感知：Win/macOS 默认开启 forward，Linux 默认关闭（窗口始终可交互） |
| `preload.js` | 修改 | `window.petAPI` 新增只读 `platform: process.platform`，供渲染层判断是否启用穿透 |
| `renderer/style.css` | 修改 | 追加 `.context-menu`/`.menu-item`/`.menu-item:hover`/`.menu-divider` 样式（接口文档 §7） |

### 11.2 关键实现决策
1. **点击穿透平台感知（重要）**：`setIgnoreMouseEvents(true,{forward:true})` 的 forward 在 Linux X11 上不可靠，会导致宠物无法点击。故 `main.js` 仅 Win/macOS 默认开启穿透；`preload.js` 暴露 `platform`，`app.js` 据 `platform!=='linux'` 设 `ENABLE_CLICK_THROUGH`：Linux 下窗口始终可交互（牺牲透明边框的透传以换取可用），Win/macOS 走 hover 切换。
2. **拖拽用增量 screen 坐标**：`dx=e.screenX-startX`，经 IPC `move-window` 让主进程 `setPosition(x+dx,y+dy)`，与规划文档 §8.5 一致；拖拽期间 `setClickThrough(false)` 保持可交互。
3. **hover 切换穿透**：非拖拽 `mousemove` 据 `isOverPet`（暂用 canvas 矩形，TODO 改用 B 的 `pet.getBounds()`）切换穿透；用 `clickThrough` 缓存避免冗余 IPC。
4. **菜单可见时不切穿透**：`menu.visible` 时 hover 分支强制 `setClickThrough(false)`，避免鼠标移向菜单（可能落在 canvas 矩形外）触发穿透导致菜单消失。
5. **菜单自绘 DOM 而非原生 Menu**：原生 `Menu` 在透明窗口定位困难，改用绝对定位 `div.context-menu`，支持边缘翻转、点外部收起、`pointer-events:auto`。
6. **switch-pet 循环切换**：每次点击「切换角色」在 `cat→dog→penguin` 间循环并 `emit('menu:switchPet',{type})`，B 的 `pet.setPetType` 接收（B 未就绪时仅日志）。
7. **菜单事件解耦**：`menu:exit`→`closeApp()`；`menu:feed/play/switchPet` 暂由 app.js 日志占位，待 C/B 接入后自动生效（B/C 已合并 status/bubble，里程碑 4 串联）。

### 11.3 事件流转（已实现）
- 拖拽：`canvas mousedown` → `setClickThrough(false)` → `window mousemove`→`emit('pet:dragging',{dx,dy})`+`moveWindow(dx,dy)` → `mouseup`→`emit('pet:dragEnd',{x,y})`+恢复穿透
- 右键：`canvas contextmenu` → `menu.show(clientX,clientY)` → 点菜单项 `emit('menu:feed|play|switchPet|exit')` → `menu.hide()`

### 11.4 验证情况
- [x] `node --check` 通过：`main.js`/`preload.js`/`renderer/app.js`/`renderer/menu.js`
- [x] 与 HEAD 对比确认未误改 B/C 的 `index.html`/`style.css` 既有内容（HEAD 的 style.css 仍是里程碑1骨架，B/C 样式在各模块内部）
- [ ] **运行时自测未完成**：沙箱无网络，Electron 二进制缺失，需本机 `npm start` 验证：
  - 左键拖拽宠物到屏幕任意位置、松开停留
  - 右键弹出菜单；点「退出」关闭应用；点「喂食/玩耍」Console 打印事件
  - Win/macOS：鼠标离开宠物区域可点击下层窗口

### 11.5 已知限制 / TODO
| 项 | 说明 |
|----|------|
| Linux 点击穿透 | forward 不可靠，默认关闭；透明边框区域会捕获点击（不透传）。Win/macOS 正常透传 |
| hover 命中区 | 暂用 canvas 矩形；待 B 实现 `pet.getBounds()` 后改用精确边界 |
| DPI / 多屏 | `moveWindow` 用 screen 像素，高 DPI 缩放下可能漂移，待联调时校准 |
| 菜单关闭 | Linux 下点窗口外不触发 document click（透传到桌面），菜单仅靠菜单项点击/再次右键关闭；待优化 |

### 11.6 下一步
- 里程碑 4（联调）：app.js 实例化 `Pet`/`Status`/`Bubble` 并注入 eventBus，打通「拖拽→移动」「右键喂食→状态+气泡」全链路（B/C 模块已就绪，仅缺 `pet.js`）

---

## 十二、里程碑 4 实现记录（更新于 2026-07-25）

> 进度背景：B 的 `pet.js` 已合并入 `origin/main`（feat/pet-animation，441 行）；本轮将 `origin/main` 合入 `feat/window` 并完成 app.js 联调。

### 12.1 本次改动文件
| 文件 | 改动 | 说明 |
|------|------|------|
| `renderer/app.js` | 重写 | 实例化 Pet/Status/Bubble/Menu 并注入 eventBus；渲染循环；点击→跳跃；菜单→状态→气泡；状态阈值→气泡/动画；最小持久化 |
| `renderer/style.css` | 追加 | 补 `.bubble`/`.bubble--visible`/`.bubble-text`/`.bubble-arrow` 最小定位样式（C 未写 CSS，A 兜底以便联调可见） |
| （合并）`renderer/pet.js` | 来自 origin/main | B 的 Pet 类，441 行 |

### 12.2 串联结构（app.js init）
```
init()
 ├─ loadState()              // 恢复 petType + status（窗口位置待 M6）
 ├─ status.start()           // 启动每秒衰减
 ├─ pet.startAutoBehavior()  // 空闲 5s 随机行为
 └─ requestAnimationFrame(loop)  // pet.update(dt) + pet.draw()
```

### 12.3 事件链路（已打通）
| 链路 | 流转 |
|------|------|
| 拖拽→移动 | `mousedown`(记录+关穿透) → 超阈值才 `moveWindow` → `mouseup`→`pet:dragEnd`(窗口坐标) |
| 点击→跳跃(F6 提前) | `mouseup` 且未超阈值 → `pet:clicked` + `pet.jump()` + `status.play(10)` + `showBubble('happy')` |
| 右键喂食 | `menu:feed` → `status.feed(30)` + `showBubble('feed')` |
| 右键玩耍 | `menu:play` → `status.play(10)` + `showBubble('play')` |
| 切换角色 | `menu:switchPet{type}` → `pet.setPetType(type)` |
| 退出 | `menu:exit` → `saveState()` + `closeApp()` |
| 饿了 | `status:hungry` → `showBubble('hungry')` |
| 快饿死 | `status:starving` → `showBubble('hungry',{text:'快饿死了…'})` |
| 心情差 | `status:sad` → `showBubble('sad')` + `pet.setState('sad')` |
| 心情恢复 | `status:happy` → `pet.setState('idle')` |

### 12.4 关键实现决策
1. **点击与拖拽辨识**：mousedown 置 `mightClick=true`；移动超 4px 才转拖拽（`mightClick=false`）并开始 `moveWindow`；未超阈值 mouseup 视为点击 → 跳跃。避免点击时窗口被像素抖动带跑。
2. **isOverPet 改用 pet.getBounds()**：命中区从 canvas 矩形升级为宠物精确边界（64×64），完成 §11.5 的 TODO。
3. **气泡定位由 A 负责**：`showBubble()` 据宠物 `getBounds()` 在其上方居中定位；C 的 `bubble.js` 只管 DOM/台词。补 `.bubble` 最小 CSS（绝对定位、外观、箭头），C 可细化动画。
4. **状态↔动画解耦**：`status:sad` → pet 切 `sad`（loop 动画）；autoBehavior 在非 idle 时自动暂停（B 的 `_autoTick` 已处理），心情恢复 `status:happy` → 回 idle。
5. **最小持久化**：`menu:exit` 前 `saveState()`（pet.type + 窗口坐标 + status）；启动 `loadState()` 恢复 petType/status。窗口位置恢复需新增 `set-window-position` IPC，留待 M6/F15。
6. **渲染循环**：`requestAnimationFrame` 驱动 `pet.update(dt)+pet.draw()`；占位绘制已移除，由 Pet 接管。

### 12.5 验证情况
- [x] `node --check` 通过：app.js / menu.js / pet.js / status.js / bubble.js
- [x] 无头逻辑测试（node）：Status 发 `status:starving/fed` 等、Pet 的 `getBounds/getData/jump/moveTo→Promise`、`pet:stateChange/moveEnd` 全部符合 app.js 监听的事件名与方法签名
- [x] 确认未误改 B/C 文件（仅改 app.js + style.css）
- [ ] **运行时自测未完成**：沙箱无 Electron 二进制，需本机 `npm start` 验证：宠物 idle 呼吸、左键拖拽、点击跳跃、右键喂食弹气泡、饿/心情低时弹气泡、自动随机走动

### 12.6 下一步
- 里程碑 5（跟随鼠标 F10，依赖 `pet.moveTo`，已就绪）
- 里程碑 6（边缘吸附 F13 + 系统托盘 F14 + 完整持久化 F15）

---

> 最后更新：2026-07-25
