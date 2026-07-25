// LLM 配置模板：复制本文件为 config.local.js 并填入真实信息
// （config.local.js 已在 .gitignore 中，不会被提交，Key 不会泄露）
//
// 提供商可选：
//   1) 智谱 GLM（推荐，glm-4-flash 免费）：provider 'openai'，baseURL 见下
//   2) OpenAI 官方 / DeepSeek 等 OpenAI 兼容服务：改 baseURL + apiKey + model
//   3) 本地 Ollama：provider 'ollama'，无需 apiKey，baseURL 默认 http://localhost:11434
//   4) 留空或不创建 config.local.js → 默认走 mock（离线规则化演示，无需联网）
window.LLM_CONFIG = {
  provider: 'openai',
  baseURL: 'https://open.bigmodel.cn/api/paas/v4',
  apiKey: '在此粘贴你的 API Key',
  model: 'glm-4-flash',
};
