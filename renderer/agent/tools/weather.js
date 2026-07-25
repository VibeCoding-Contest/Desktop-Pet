// agent/tools/weather.js — 天气查询 + 穿搭建议（人 B，G4）
// 无 API Key/无网络时走 mock（按城市 hash 生成稳定天气），有 key 时调真实 API。
// 注册到 window.agentTools：weather.getToday / weather.getForecast

(function () {
  const OUTFIT = [
    { max: 999, text: '短袖短裤，注意防晒补水' },
    { max: 27, text: '薄长袖/短袖加长裤' },
    { max: 21, text: '长袖加外套' },
    { max: 14, text: '毛衣加外套，早晚可加薄羽绒' },
    { max: 7, text: '羽绒/棉服，围巾手套' },
  ];
  function outfit(t) {
    // 选 max >= t 中最小的那档（表按 max 升序后取第一档满足的）
    const cand = OUTFIT.filter((r) => t <= r.max);
    return (cand.reduce((a, b) => (a.max <= b.max ? a : b)) || OUTFIT[0]).text;
  }

  function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  const CONDS = ['晴', '多云', '阴', '小雨', '中雨', '雷阵雨'];

  // mock：按城市 hash 生成稳定天气
  function mockWeather(city) {
    const h = hash(city);
    const temp = 5 + (h % 30); // 5..34
    const cond = CONDS[h % CONDS.length];
    const wind = (h % 6) + 1; // 1..6 级
    const rain = /雨/.test(cond);
    return { city, temp, cond, wind, rain };
  }

  async function fetchWeather(city) {
    // TODO 真实 API：和风/OpenWeatherMap，需配置 KEY（见 config/llm.js 同目录说明）
    // 这里默认走 mock，保证离线可演示
    return mockWeather(city);
  }

  function decorate(w) {
    let s = outfit(w.temp);
    if (w.rain) s += '；带伞，穿防滑鞋';
    if (w.wind >= 5) s += '；风大，注意防风';
    return { ...w, suggestion: s };
  }

  if (window.agentTools) {
    window.agentTools.register({
      name: 'weather.getToday',
      description: '查询某城市今日天气并给出穿搭建议。city 为城市名，如"上海"',
      parameters: {
        type: 'object',
        properties: { city: { type: 'string', description: '城市名' } },
        required: ['city'],
      },
      async handler({ city }) {
        const w = await fetchWeather(city || '北京');
        return decorate(w);
      },
    });

    window.agentTools.register({
      name: 'weather.getForecast',
      description: '查询某城市未来 3 天天气概况',
      parameters: {
        type: 'object',
        properties: { city: { type: 'string' } },
        required: ['city'],
      },
      async handler({ city }) {
        const c = city || '北京';
        const days = [];
        for (let i = 0; i < 3; i++) days.push(decorate(mockWeather(c + i)));
        return { city: c, forecast: days };
      },
    });
  }
})();
