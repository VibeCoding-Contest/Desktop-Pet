// agent/tools/index.js — 工具注册表（人 B，G8）
// 插件式注册：每个 tool = { name, description, parameters(JSONSchema), handler(params)->Promise }
// 暴露 window.agentTools = { register, list, get }

(function () {
  const registry = new Map();

  const agentTools = {
    register(tool) {
      if (!tool || !tool.name || !tool.parameters || typeof tool.handler !== 'function') return false;
      registry.set(tool.name, tool);
      return true;
    },
    /** 给 LLM 看的工具清单（不含 handler） */
    list() {
      return [...registry.values()].map((t) => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      }));
    },
    /** 取某个工具的执行器 */
    get(name) {
      return registry.get(name) || null;
    },
    /** 测试/清空 */
    _clear() { registry.clear(); },
  };

  window.agentTools = agentTools;
})();
