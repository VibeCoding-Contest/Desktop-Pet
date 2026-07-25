# 人员 A — Agent 升级工作规划：框架 / 交互 / 编排

> 本文档基于《桌面管家Agent升级规划》，把 Agent 升级工作拆为 A、B 两人。
> A 负责"壳 + 神经中枢"：窗口/交互/聊天 UI/IPC/系统通知/Agent 编排串联。
> 配套文档：《人员B-Agent升级工作规划.md》（Agent 大脑 + 工具 + 数据）。
> 仓库：https://github.com/VibeCoding-Contest/Desktop-Pet

---

## 一、角色定位与职责边界

| 项 | 内容 |
|----|------|
| **角色** | 框架 & 交互 & 编排（"壳 + 神经中枢"） |
| **职责** | 窗口放大缩放、聊天面板 UI、菜单扩展、IPC 扩展、系统通知、Agent 编排串联、pet.js 尺寸适配 |
| **协作定位** | A 提供聊天 UI 与事件骨架、IPC 与系统通知能力，是 B 的 Agent 内核能否"被看见、被执行"的前提 |

### A 对外暴露的文件（仅 A 修改）
- `main.js` — 新增 resize / 通知 / 系统控制 IPC
- `preload.js` — 暴露 `window.petAPI` 扩展方法（供 B 的工具调用）
- `renderer/app.js` — 实例化 Agent、绑定 chat↔agent↔schedule 事件、缩放交互
- `renderer/chat.js` — 聊天面板 UI（**新增**）
- `renderer/menu.js` — 菜单扩展（聊天/日程/设置/放大/缩小/重置）
- `renderer/index.html`、`renderer/style.css` — 新增 `#chat-panel` 骨架与样式
- `renderer/pet.js` — **仅尺寸相关**：`width/height/r` 常量、`scale` 读写接口（动画逻辑不动）

### 不应改动的文件（属 B）
- `renderer/agent/agent.js`、`renderer/agent/llm.js`、`renderer/agent/tools/*`
- `renderer/agent/scheduler.js`、`renderer/agent/store/*`
- `renderer/status.js`、`renderer/bubble.js`（沿用，必要时由 B 联动）

> 注：`pet.js` 在基础阶段属"原 B"。本次升级中，A 仅对 `pet.js` 做**尺寸/缩放**相关的最小改动，不触碰动画状态机；如需改动画行为，提 issue 交由熟悉该文件者处理。

---

## 二、负责文件清单与职责

| 文件 | 阶段 | 核心职责 | 关键点 |
|------|------|----------|--------|
| `main.js` | G1 起 | resize IPC、系统通知 IPC、系统控制 IPC | 新增 `resize-window`/`show-notification`/`open-external`/`system-power` |
| `preload.js` | G1 起 | 暴露扩展 API 给渲染层（含 B 的工具） | contextBridge 白名单，不暴露 ipcRenderer 本体 |
| `renderer/app.js` | G1 起 | 实例化 Agent、绑定事件、缩放交互、编排 | 串联 `chat↔agent↔schedule↔通知` |
| `renderer/chat.js` | G2 | 聊天面板 DOM、展开/收起、输入、流式渲染 | 双击/快捷键展开；气泡同步首句 |
| `renderer/menu.js` | G2 起 | 菜单加项 | 聊天/日程/设置/放大/缩小/重置 |
| `renderer/index.html` | G2 | 加 `#chat-panel` 容器 | A 先建骨架供 B 不需要改 |
| `renderer/style.css` | G2 起 | 聊天面板 + 缩放样式 | 与现有样式叠加，不删既有结构 |
| `renderer/pet.js` | G1 | 尺寸常量 + scale 接口 | `width/height=110`、`r=30`、`setScale()`/`getScale()` |

---

## 三、负责功能清单（按优先级，映射升级规划 G 编号）

### P0 — 必须完成（阶段 1）
| 编号 | 功能 | A 的产出 | 验收 |
|------|------|----------|------|
| **G1** | 角色放大与缩放 | `main.js` 窗口 360/`resizable:true` + `resize-window` IPC；`pet.js` 尺寸常量与 `scale` 接口；滚轮/菜单缩放；持久化 `pet.scale` | 默认明显变大，可滚轮缩放，重启恢复 |
| **G2** | 聊天面板 UI | `chat.js` + `#chat-panel`；展开/收起、输入框、发送、流式渲染；快捷键/双击展开 | 可输入并显示 Agent 回复（B 接入前用占位回显） |
| 编排 | Agent 串联 | `app.js` 实例化 Agent、注入工具、绑定 `chat↔agent` 事件 | 事件骨架就绪，B 接入后即可对话 |

### P1 — 尽快完成（阶段 2，与 B 联调）
| 编号 | 功能 | A 的产出 | 验收 |
|------|------|----------|------|
| 菜单 | 聊天/日程/设置入口 | `menu.js` 新增菜单项 + 事件 `menu:chat`/`menu:schedule`/`menu:settings` | 点聊天展开面板；点日程切日程 tab |
| 通知 | 系统通知 | `main.js` `Notification` 封装 + `show-notification` IPC | B 发 `schedule:due` → 弹系统通知 + 气泡 |
| 缩放交互 | 滚轮/菜单调大小 | `app.js` 滚轮缩放(0.6–2.5x)、菜单放大/缩小/重置 | 滚轮改大小，菜单可调，持久化 |

### P2 — Agent 化（阶段 3）
| 编号 | 功能 | A 的产出 | 验收 |
|------|------|----------|------|
| **G9** | 系统控制执行 | `main.js` `open-external`/`system-power` IPC（关机休眠带二次确认） | B 工具调 `petAPI.openExternal`/`systemPower` 能打开网址、定时关机 |
| 工具态 UI | "正在查天气…" | `chat.js` 监听 `agent:toolCall` 显示工具调用态 | B 工具调用时面板显示进度提示 |

### P3 — 锦上添花（阶段 4）
| 编号 | 功能 | A 的产出 | 验收 |
|------|------|----------|------|
| **G13** | 番茄钟 UI+计时 | `app.js`/`chat.js` 25min 专注 + 5min 休息，与角色状态联动 | 计时到点气泡+动画；可注册为 B 的工具 |
| **G18** | 语音 UI | `chat.js` 麦克风按钮 + TTS 播放 | 语音输入转文字交 B；TTS 播 B 返回文本 |
| **G14** | 早报出口 | 监听 `schedule:dailyReport` → 通知 + 气泡 + 打开面板 | B 生成内容，A 负责呈现 |

---

## 四、与 B 的接口约定（核心）

### 4.1 A 暴露给 B 的能力（经 preload `window.petAPI`，B 的工具直接调用）

| API | 给 B 用途 | 实现 |
|-----|-----------|------|
| `openExternal(url)` | `system.openUrl` 工具打开网址 | IPC `open-external` → `shell.openExternal` |
| `showNotification(title, body)` | 通知出口（备选） | IPC `show-notification` → `Notification` |
| `systemPower(action, delay)` | `system.power` 工具关机/休眠 | IPC `system-power`，主进程二次确认 |
| `resizeWindow(w, h)` | A 内部缩放（B 一般不用） | IPC `resize-window` |

### 4.2 EventBus 事件契约（A↔B）

| 事件 | 发出者 | 监听者 | 携带数据 | 说明 |
|------|--------|--------|----------|------|
| `chat:userMessage` | A(chat.js) | B(agent.js) | `{text}` | 用户发送消息 |
| `agent:reply` | B(agent.js) | A(chat.js) | `{text, bubble:boolean}` | Agent 回复，bubble=true 时同步显示气泡首句 |
| `agent:thinking` | B | A(chat.js) | `{state}` | 思考中/结束 |
| `agent:toolCall` | B | A(chat.js) | `{name, label}` | 工具调用态（"正在查天气…"） |
| `schedule:due` | B(scheduler.js) | A(app.js) | `{item}` | 任务到期 → A 发系统通知+气泡 |
| `schedule:dailyReport` | B | A(app.js) | `{items, weather}` | 每日早报 → A 呈现 |
| `schedule:changed` | B | A(chat.js) | 无 | 日程变更，刷新日程 tab |
| `system:requestOpenUrl` | B(可选) | A(可选) | `{url}` | 备选：经事件而非 petAPI（二选一） |

> 约定：A 只消费 `agent:*` / `schedule:*` 事件做"呈现与执行"，不关心 B 内部如何调 LLM/工具。

### 4.3 依赖 B 的接口（联调时调用）

| 调用方 | 被调方 | 接口 | 何时用 |
|--------|--------|------|--------|
| app.js | B agent.js | `new Agent(eventBus, {llm, tools})`、`agent.send(text)` | 串联聊天 |
| app.js | B scheduler.js | `new Scheduler(eventBus, scheduleStore)`、`start()` | 启动定时提醒 |
| chat.js | B agent.js | 事件 `agent:reply`/`thinking`/`toolCall` | 渲染回复 |

---

## 五、开发顺序与里程碑

### 里程碑 A1：放大与缩放（G1，0:00–0:45）
- [ ] `main.js`：窗口 360×360、`resizable:true`；新增 `resize-window` IPC
- [ ] `pet.js`：`width/height=110`、`r=30`；加 `setScale(s)`/`getScale()`，draw 内按 scale 缩放
- [ ] `index.html`：Canvas 改 320×320
- [ ] `app.js`：滚轮缩放(0.6–2.5x)；菜单放大/缩小/重置；`pet.scale` 入 SaveData
- [ ] 自测：默认变大、滚轮缩放、重启恢复

### 里程碑 A2：聊天面板 UI（G2，0:45–1:30）
- [ ] `index.html`：加 `#chat-panel` 容器
- [ ] `style.css`：面板侧边栏、消息气泡、输入框样式
- [ ] `chat.js`：`Chat` 类 `open()/close()/toggle()`、`addMessage(role,text)`、流式 `appendChunk()`
- [ ] `app.js`：双击角色/快捷键 `Ctrl+Shift+P` 展开；`menu:chat` 展开
- [ ] 自测：输入→占位回显（B 未接入时）；流式渲染可用

### 里程碑 A3：Agent 编排与菜单扩展（1:30–2:15，与 B 联调）
- [ ] `app.js`：`new Agent(eventBus,{llm,tools})`；绑定 `chat:userMessage`→`agent.send`、`agent:reply`→`chat.addMessage`+气泡
- [ ] `menu.js`：加 聊天/日程/设置 项 + `menu:chat/schedule/settings` 事件
- [ ] `chat.js`：监听 `agent:thinking`/`agent:toolCall` 显示状态
- [ ] 自测：与 B 联调后可多轮对话

### 里程碑 A4：系统通知与系统控制（2:15–3:00）
- [ ] `main.js`：`Notification` 封装 + `show-notification`/`open-external`/`system-power` IPC
- [ ] `preload.js`：暴露 `showNotification`/`openExternal`/`systemPower`
- [ ] `app.js`：监听 `schedule:due`→通知+气泡；监听 `schedule:dailyReport`→早报呈现
- [ ] 自测：B 发 `schedule:due` 弹通知；B 工具 `openExternal` 能开网址；关机带确认

### 里程碑 A5：锦上添花（3:00–4:00）
- [ ] G13 番茄钟 UI+计时（可注册为 B 工具）
- [ ] G18 语音 UI（mic + TTS 播放）
- [ ] 收尾联调

---

## 六、关键技术要点（速查）

### 6.1 放大与缩放（main.js + pet.js）
```js
// main.js
win = new BrowserWindow({ width: 360, height: 360, transparent: true,
  frame: false, alwaysOnTop: true, resizable: true, hasShadow: false });
ipcMain.on('resize-window', (_e, w, h) => win && win.setSize(Math.round(w), Math.round(h)));
```
```js
// pet.js（仅尺寸相关）
this.width = 110; this.height = 110; this._scale = 1;
setScale(s){ this._scale = Math.max(0.6, Math.min(2.5, s)); }
getScale(){ return this._scale; }
// draw 内：ctx.translate(cx,cy); ctx.scale(this._scale, this._scale); ...（r=30）
```

### 6.2 聊天面板（chat.js，纯 UI，不碰 LLM）
```js
class Chat {
  constructor(panelEl, eventBus) {
    this.el = panelEl; this.eventBus = eventBus;
    this.input = panelEl.querySelector('.chat-input');
    this.input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._send(); }
    });
    eventBus.on('agent:reply', ({text, bubble}) => {
      this.addMessage('agent', text); /* bubble 交 app.js 处理 */
    });
    eventBus.on('agent:toolCall', ({label}) => this.setTyping(label));
  }
  _send(){ const t = this.input.value.trim(); if(!t) return;
    this.addMessage('user', t); this.input.value='';
    this.eventBus.emit('chat:userMessage', { text: t }); }
  addMessage(role, text){ /* DOM 追加消息 */ }
  appendChunk(text){ /* 流式追加末条消息 */ }
  open(){ this.el.classList.add('chat-panel--open'); this.input.focus(); }
  close(){ this.el.classList.remove('chat-panel--open'); }
}
```

### 6.3 系统通知（main.js）
```js
const { Notification } = require('electron');
ipcMain.on('show-notification', (_e, {title, body}) => {
  if (Notification.isSupported()) new Notification({ title, body }).show();
});
```

### 6.4 系统控制（带确认）
```js
const { shell } = require('electron');
ipcMain.on('open-external', (_e, url) => shell.openExternal(url));
ipcMain.handle('system-power', (e, { action, delay }) => {
  // 弹确认对话框 → 执行 shutdown/休眠命令；返回 {ok}
});
```

---

## 七、验收标准（A 的部分）

### 阶段 1（P0）
- [ ] 角色默认明显变大，滚轮/菜单可缩放（0.6–2.5x），重启恢复尺寸
- [ ] 聊天面板可展开/收起，可输入并发送（B 接入前占位回显）
- [ ] `app.js` 已实例化 Agent 并绑定 chat↔agent 事件骨架

### 阶段 2（P1）
- [ ] 菜单含 聊天/日程/设置；点聊天展开面板
- [ ] B 发 `schedule:due` → 系统通知 + 气泡提醒
- [ ] 与 B 联调后多轮对话正常（流式渲染）

### 阶段 3（P2）
- [ ] B 工具 `openExternal` 能打开网址；`systemPower` 关机带二次确认
- [ ] 工具调用时面板显示"正在查天气…"等进度

### 阶段 4（P3）
- [ ] 番茄钟/语音/早报任选其一跑通

---

## 八、协作约定（A 视角）

- **分支**：`feat/agent-shell`（A 侧）；PR 由 B review
- **Commit 粒度**：每完成一个小功能点 commit，格式 `feat: xxx`/`fix: xxx`
- **冲突高发区**：`index.html`/`style.css`/`app.js` —— A 先建 `#chat-panel` 骨架与编排逻辑并 commit，B 的 agent 模块挂在其下，**追加不删**
- **事件命名**：以本文 §4.2 契约为准，不擅自改名；新增事件先与 B 确认
- **联调阻塞**：A 的聊天 UI 与 IPC 是 B 可见可执行的前提，里程碑 A1/A2 务必按时 push
- **pet.js 边界**：A 仅改尺寸/缩放；动画状态机改动交熟悉者

---

## 九、风险与应对（A 专属）

| 风险 | 应对 |
|------|------|
| 放大后点击穿透区域错乱 | 复用现有 hover 检测，按新尺寸重算命中区；Linux 关穿透兜底 |
| `resizable:true` 破坏透明无边框体验 | 仍用现有拖拽逻辑移动；缩放只改尺寸不出现原生边框 |
| 流式渲染卡顿 | 分块 `appendChunk` + `requestAnimationFrame` 批量插入 |
| 系统操作误执行 | `system-power` 主进程强制二次确认，仅白名单命令 |
| 跨平台通知差异 | `Notification.isSupported()` 判定，失败降级为气泡 |

---

## 十、接口交付状态（待实现时更新）

- [ ] `window.petAPI` 扩展方法（openExternal/showNotification/systemPower/resizeWindow）
- [ ] `#chat-panel` 容器 ID 固定，B 无需改 index.html
- [ ] EventBus 事件 `chat:userMessage`/`schedule:due` 等契约与 B 对齐
- [ ] `pet.js` `setScale/getScale` 就绪供 app.js 调用

---

> 配套：《人员B-Agent升级工作规划.md》负责 LLM/Agent 内核/工具/日程/备忘/调度/数据。
> 最后更新：2026-07-25
