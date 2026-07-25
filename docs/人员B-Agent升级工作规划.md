# 人员 B — Agent 升级工作规划：大脑 / 工具 / 数据

> 本文档基于《桌面管家Agent升级规划》，把 Agent 升级工作拆为 A、B 两人。
> B 负责"大脑 + 工具 + 数据"：LLM 接入、Agent 内核、工具系统、日程/备忘/调度、数据持久化。
> 配套文档：《人员A-Agent升级工作规划.md》（壳 + 交互 + 编排）。
> 仓库：https://github.com/VibeCoding-Contest/Desktop-Pet

---

## 一、角色定位与职责边界

| 项 | 内容 |
|----|------|
| **角色** | Agent 大脑 & 工具 & 数据（"脑 + 手 + 记忆"） |
| **职责** | LLM 客户端、对话管理、人设、function-calling 调度、工具注册与实现、日程/备忘/调度、持久化 |
| **协作定位** | B 的 Agent 内核是"管家能力"的核心；依赖 A 提供的聊天 UI、IPC、系统通知能力来呈现与执行 |

### B 对外暴露的文件（仅 B 修改）
- `renderer/agent/agent.js` — Agent 内核（对话历史、人设、工具调度）
- `renderer/agent/llm.js` — LLM 客户端封装（流式 + function-calling）
- `renderer/agent/tools/index.js` — 工具注册表
- `renderer/agent/tools/weather.js` — 天气 + 穿搭
- `renderer/agent/tools/schedule.js` — 日程 CRUD + 自然语言建日程
- `renderer/agent/tools/memo.js` — 备忘便签
- `renderer/agent/tools/translate.js` — 翻译
- `renderer/agent/tools/system.js` — 系统控制（调 A 的 IPC）
- `renderer/agent/tools/search.js` — 网页搜索（可选）
- `renderer/agent/scheduler.js` — 定时调度（到期提醒、每日早报）
- `renderer/agent/store/*` — schedule/memo/chat-history 持久化

### 不应改动的文件（属 A 或他人）
- `main.js`、`preload.js`、`renderer/app.js`、`renderer/chat.js`、`renderer/menu.js`、`renderer/index.html`、`renderer/style.css`（A）
- `renderer/pet.js`（A 仅改尺寸；B 不动）
- `renderer/status.js`、`renderer/bubble.js`（沿用，B 通过事件联动，不改其源码）

---

## 二、负责文件清单与职责

| 文件 | 阶段 | 核心职责 | 关键点 |
|------|------|----------|--------|
| `agent/llm.js` | G3 | 统一 LLM API：流式、function-calling | 支持云端/本地切换；Key 不入库 |
| `agent/agent.js` | G8 | 对话历史、人设 prompt、工具调度 | function-calling 解析→执行→回灌→生成回复 |
| `agent/tools/index.js` | G8 | 插件式工具注册表 | `register(tool)`/`list()` |
| `agent/tools/weather.js` | G4 | 查天气 + 穿搭建议 | 和风/OpenWeatherMap；穿搭规则表 |
| `agent/tools/schedule.js` | G5/G7 | 日程 CRUD + NL 建日程 | 时间归一化；重复任务 |
| `agent/scheduler.js` | G6 | 到期扫描 + 早报 | 每分钟 tick，emit `schedule:due`/`dailyReport` |
| `agent/tools/memo.js` | G10 | 便签增删查 | |
| `agent/tools/translate.js` | G11 | 翻译 | 可复用 LLM 或专用 API |
| `agent/tools/system.js` | G9 | 系统控制（调 A 的 IPC） | `openExternal`/`systemPower` |
| `agent/store/*` | 全局 | schedule/memo/chat 持久化 | userData 下独立 JSON |

---

## 三、负责功能清单（按优先级，映射升级规划 G 编号）

### P0 — 必须完成（阶段 1）
| 编号 | 功能 | B 的产出 | 验收 |
|------|------|----------|------|
| **G3** | LLM 接入 | `llm.js`：`chat(messages,tools)` 流式 + function-calling；本地/云端切换 | 能多轮对话，Key 不入库 |
| **G8** | Agent 内核 + 注册表 | `agent.js`：历史/人设/调度；`tools/index.js` 注册表 | 收 `chat:userMessage` → 调 LLM → emit `agent:reply` |

### P1 — 尽快完成（阶段 2）
| 编号 | 功能 | B 的产出 | 验收 |
|------|------|----------|------|
| **G4** | 天气 + 穿搭 | `tools/weather.js`：取天气 → 回灌 LLM 生成穿搭 | "天气怎么样"→ 回复 + 穿搭建议 |
| **G5** | 日程表 | `tools/schedule.js` + `store/schedule.js`：CRUD + 持久化 | 日程可增删改查，重启恢复 |
| **G6** | 定时提醒 | `scheduler.js`：每分钟 tick，emit `schedule:due` | 到点 A 弹通知 + 气泡 |
| **G7** | NL 建日程 | function-call `schedule.add({title,datetime})` | "提醒我明天9点开会"→ 入日程 |

### P2 — Agent 化（阶段 3）
| 编号 | 功能 | B 的产出 | 验收 |
|------|------|----------|------|
| **G9** | 系统控制工具 | `tools/system.js`：`openUrl`/`power` 调 A 的 IPC | 打开网址/定时关机（A 带确认） |
| **G10** | 备忘便签 | `tools/memo.js` + store | "记一下 XX"→ 存；"我记了啥"→ 回顾 |
| **G11** | 翻译/词典 | `tools/translate.js` | 选中/输入文字翻译 |
| 复合指令 | Agent 编排 | LLM 自主选工具完成"查天气并提醒带伞" | 多工具串联可跑通 |

### P3 — 锦上添花（阶段 4）
| 编号 | 功能 | B 的产出 | 验收 |
|------|------|----------|------|
| **G14** | 每日早报内容 | `scheduler.js` 8:00 汇总今日任务+天气+习惯 → emit | A 呈现早报 |
| **G17** | 日报周报 | 从 schedule 数据生成日报 | "生成今天日报"→ 输出 |
| **G15** | 倒计时 | `tools/` 倒计时工具 | "距离 XX 还有 N 天" |
| **G16** | 快递查询 | `tools/` 快递工具 | 输入单号查物流 |
| **G20** | 插件化 | 工具以插件注册，支持扩展 | 新工具按规范即插即用 |
| **G19** | 健康提醒 | `scheduler.js` 喝水/休息定时 | 定时关怀 |

> G13 番茄钟、G18 语音：A 负责 UI/计时/播放，B 可将其注册为工具并供 Agent 调用（共享，A 主）。

---

## 四、与 A 的接口约定（核心）

### 4.1 B 调用 A 提供的能力（经 `window.petAPI`）

| API | B 用途 | 来自 A |
|-----|--------|--------|
| `window.petAPI.openExternal(url)` | `system.openUrl` 工具打开网址 | IPC `open-external` |
| `window.petAPI.showNotification(title, body)` | 备选通知出口 | IPC `show-notification` |
| `window.petAPI.systemPower(action, delay)` | `system.power` 工具关机/休眠 | IPC `system-power`（A 二次确认） |

> 通知主路径：B 发 `schedule:due` 事件 → A 监听后弹系统通知+气泡（见 §4.2）。`showNotification` 仅作工具内即时通知备选。

### 4.2 EventBus 事件契约（A↔B）

| 事件 | 发出者 | 监听者 | 携带数据 | 说明 |
|------|--------|--------|----------|------|
| `chat:userMessage` | A(chat.js) | B(agent.js) | `{text}` | 用户发送消息 → B 调 LLM |
| `agent:reply` | B(agent.js) | A(chat.js) | `{text, bubble:boolean}` | 回复，bubble=true 时 A 同步气泡首句 |
| `agent:thinking` | B | A(chat.js) | `{state}` | 思考中/结束 |
| `agent:toolCall` | B | A(chat.js) | `{name, label}` | 工具调用态（A 显示"正在查天气…"） |
| `schedule:due` | B(scheduler.js) | A(app.js) | `{item}` | 到期 → A 通知+气泡 |
| `schedule:dailyReport` | B | A(app.js) | `{items, weather?}` | 每日早报 → A 呈现 |
| `schedule:changed` | B | A(chat.js) | 无 | 日程变更 → A 刷新日程 tab |

### 4.3 B 提供给 A 的接口（联调时被 A 实例化）

| 调用方 | 被调方 | 接口 | 何时用 |
|--------|--------|------|--------|
| app.js (A) | B agent.js | `new Agent(eventBus, {llm, tools})`、`agent.send(text)` | 串联聊天 |
| app.js (A) | B scheduler.js | `new Scheduler(eventBus, scheduleStore)`、`start()/stop()` | 启动定时提醒 |

> 约定：B 不直接操作 DOM/A 的文件，所有对外通信走 EventBus；需系统执行时调 `window.petAPI`。

---

## 五、开发顺序与里程碑

### 里程碑 B1：LLM 接入（G3，0:00–0:45）
- [ ] `agent/llm.js`：`chat({messages, tools, onChunk})` 流式 + function-calling
- [ ] 配置：本地(Ollama)/云端(OpenAI 兼容)切换；Key 放本地配置，`.gitignore`
- [ ] 人设 prompt：管家性格 + 角色(猫/狗/企鹅)口癖 + 工具清单
- [ ] 自测：node 内单测 `llm.chat` 返回文本 + tool_calls

### 里程碑 B2：Agent 内核 + 注册表（G8，0:45–1:30）
- [ ] `agent/tools/index.js`：`register(tool)`/`list()`/`get(name)`
- [ ] `agent/agent.js`：维护 history；收 `chat:userMessage` → 发 LLM → 若 `tool_calls` 执行 handler → 结果回灌 → emit `agent:reply`/`agent:thinking`/`agent:toolCall`
- [ ] 自测：与 A 联调后多轮对话（无工具也行）

### 里程碑 B3：天气 + 穿搭（G4，1:30–2:15）
- [ ] `tools/weather.js`：`getToday(city)`/`getForecast(city)` 调天气 API
- [ ] 穿搭规则表（按气温分段 + 雨/风）；LLM 据天气+规则润色
- [ ] 城市定位：系统定位 → 配置默认 → 口头覆盖
- [ ] 自测："天气怎么样"→ 回复 + 穿搭

### 里程碑 B4：日程 + 调度 + NL 建日程（G5/G6/G7，2:15–3:00）
- [ ] `store/schedule.js`：JSON 持久化；`tools/schedule.js`：`add/list/listToday/complete/remove`
- [ ] `scheduler.js`：每分钟 tick，扫描到期 → emit `schedule:due`；每日定时 emit `schedule:dailyReport`
- [ ] NL 建日程：function-call `schedule.add({title,datetime})`，时间归一化
- [ ] 自测：CRUD 持久化；到点 A 弹通知；"提醒我明天9点开会"入日程

### 里程碑 B5：工具扩充（G9/G10/G11，3:00–4:00）
- [ ] `tools/system.js`：`openUrl`→`petAPI.openExternal`；`power`→`petAPI.systemPower`
- [ ] `tools/memo.js` + store；`tools/translate.js`
- [ ] 复合指令联调："查天气并提醒带伞"→ weather + schedule.add 串联
- [ ] 自测：多工具复合指令跑通

---

## 六、关键技术要点（速查）

### 6.1 工具接口规范（function-calling）
```js
// agent/tools/index.js
const registry = new Map();
function register(tool){
  if(!tool?.name || !tool?.parameters || typeof tool.handler!=='function') return false;
  registry.set(tool.name, tool); return true;
}
function list(){ return [...registry.values()].map(t => ({
  name:t.name, description:t.description, parameters:t.parameters })); }
function get(name){ return registry.get(name); }
module.exports = { register, list, get };
```

### 6.2 Agent 内核（agent.js，function-calling 循环）
```js
class Agent {
  constructor(eventBus, { llm, tools }){
    this.eventBus = eventBus; this.llm = llm; this.tools = tools;
    this.history = []; this.system = PERSONA_PROMPT; // 人设
    eventBus.on('chat:userMessage', ({text}) => this.send(text));
  }
  async send(text){
    this.history.push({role:'user', content:text});
    this.eventBus.emit('agent:thinking', {state:'start'});
    let resp = await this.llm.chat({ messages:[{role:'system',content:this.system}, ...this.history],
      tools: this.tools.list() });
    // 工具循环
    while(resp.tool_calls?.length){
      for(const call of resp.tool_calls){
        const t = this.tools.get(call.name);
        this.eventBus.emit('agent:toolCall', { name:call.name, label:LABELS[call.name]||call.name });
        const result = t ? await t.handler(call.arguments) : {error:'no such tool'};
        this.history.push({role:'tool', name:call.name, content:JSON.stringify(result)});
      }
      resp = await this.llm.chat({ messages:[{role:'system',content:this.system}, ...this.history],
        tools: this.tools.list() });
    }
    this.history.push({role:'assistant', content:resp.content});
    this.eventBus.emit('agent:thinking', {state:'end'});
    this.eventBus.emit('agent:reply', { text:resp.content, bubble:true });
  }
}
```

### 6.3 天气工具 + 穿搭规则
```js
// tools/weather.js
const OUTFIT = [
  { max:999, text:'短袖短裤，注意防晒补水' },
  { max:27,  text:'薄长袖/短袖+长裤' },
  { max:21,  text:'长袖+外套' },
  { max:14,  text:'毛衣+外套，早晚加薄羽绒' },
  { max:7,   text:'羽绒/棉服，围巾手套' },
];
function outfit(t){ return OUTFIT.find(r => t <= r.max).text; }
module.exports = {
  name:'weather.getToday',
  description:'查询某城市今日天气并给穿搭建议',
  parameters:{ type:'object', properties:{ city:{type:'string'} }, required:['city'] },
  async handler({city}){
    const w = await fetchWeather(city); // {temp, cond, wind, rain}
    return { ...w, suggestion: outfit(w.temp) + (w.rain?'；带伞，防滑鞋':'') };
  }
};
```

### 6.4 调度器（scheduler.js，renderer 侧 tick）
```js
class Scheduler {
  constructor(eventBus, store){ this.eventBus=eventBus; this.store=store; this.timer=null; }
  start(){
    this.timer = setInterval(()=> this._tick(), 60*1000);
    this._tick(); // 启动即查一次今日早报条件
  }
  stop(){ if(this.timer) clearInterval(this.timer); }
  _tick(){
    const now = Date.now();
    for(const it of this.store.list()){
      if(!it.done && it.datetime && it.datetime <= now && !it._fired){
        it._fired = true;
        this.eventBus.emit('schedule:due', { item:it });
      }
    }
    // 每日早报：到达设定时间且当天未发
    if(this._isReportTime()) this.eventBus.emit('schedule:dailyReport', { items:this.store.listToday() });
  }
}
```

### 6.5 数据持久化（store/*）
```
<userData>/
  ├── schedule.json     # ScheduleItem[]
  ├── memo.json         # MemoItem[]
  └── chat-history.json # 可选
```
- 读写经 A 现有 `save-data`/`load-data` 思路扩展，或新增独立 IPC（与 A 约定）。
- 写入节流：变更即存 + 定时兜底。

---

## 七、验收标准（B 的部分）

### 阶段 1（P0）
- [ ] `llm.js` 支持流式 + function-calling，Key 不入库
- [ ] `agent.js` 收 `chat:userMessage` → emit `agent:reply`（无工具也能对话）

### 阶段 2（P1）
- [ ] "天气怎么样"→ 回复天气 + 穿搭建议
- [ ] 日程 CRUD + 持久化；到点 emit `schedule:due`（A 弹通知）
- [ ] "提醒我明天9点开会"→ 自动入日程

### 阶段 3（P2）
- [ ] `system.openUrl` 打开网址；`system.power` 关机（A 带确认）
- [ ] 备忘/翻译可用
- [ ] 复合指令"查天气并提醒带伞"多工具串联跑通

### 阶段 4（P3）
- [ ] 早报/日报/倒计时/快递任选其一跑通
- [ ] 工具插件化，新工具按规范即插即用

---

## 八、协作约定（B 视角）

- **分支**：`feat/agent-brain`（B 侧）；PR 由 A review
- **Commit 粒度**：每完成一个工具/能力 commit，`feat: xxx`/`fix: xxx`
- **文件隔离**：B 全部新增文件在 `renderer/agent/` 下，不碰 A 的 `main.js/app.js/chat.js/...`
- **事件命名**：以《人员A-Agent升级工作规划》§4.2 契约为准；新增事件先与 A 确认
- **联调阻塞**：B 的 Agent 内核依赖 A 的聊天 UI 与 IPC；里程碑 B1/B2 务必按时 push
- **Key 安全**：LLM/天气 Key 仅本地配置，`.gitignore` 忽略；提供本地模型兜底

---

## 九、风险与应对（B 专属）

| 风险 | 应对 |
|------|------|
| LLM Key 泄露 | 本地配置 + `.gitignore`；提供本地 Ollama 兜底 |
| function-calling 不稳定 | 工具描述清晰、参数校验、失败回退普通对话 |
| 天气 API 限流/失效 | 缓存结果、多源兜底、无 Key 时降级提示 |
| 日程时间解析偏差 | 优先 LLM 产出 ISO 时间；工具内 `date` 归一化校验 |
| 复合指令工具选错 | 限制单轮工具数、加确认气泡 |
| 对话历史膨胀 | 限制历史长度（如最近 20 条）+ 摘要压缩 |

---

## 十、接口交付状态（待实现时更新）

- [ ] `llm.js` `chat({messages,tools,onChunk})` 就绪
- [ ] `agent.js` 监听 `chat:userMessage`、emit `agent:reply/thinking/toolCall`
- [ ] `scheduler.js` emit `schedule:due/dailyReport`
- [ ] `store/*` schedule/memo 读写接口就绪，供 A 调用与持久化

---

> 配套：《人员A-Agent升级工作规划.md》负责窗口/聊天UI/菜单/IPC/系统通知/编排/pet尺寸。
> 最后更新：2026-07-25
