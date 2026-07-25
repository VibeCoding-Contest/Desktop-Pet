// preload.js — 安全桥接（人 A）
// 通过 contextBridge 暴露 window.petAPI，不直接暴露 ipcRenderer
// 对应接口文档 §2.1（含 F13/F15 扩展：setWindowPosition / getScreenSize）

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('petAPI', {
  // 运行平台（renderer 用于决定是否启用点击穿透：Linux 下转发不可靠，默认不启用）
  platform: process.platform,

  // 窗口操作
  moveWindow: (dx, dy) => ipcRenderer.send('move-window', dx, dy),
  setWindowPosition: (x, y) => ipcRenderer.send('set-window-position', x, y), // F13/F15
  setClickThrough: (enable) => ipcRenderer.send('set-click-through', enable),
  getWindowBounds: () => ipcRenderer.invoke('get-window-bounds'),
  getScreenSize: () => ipcRenderer.invoke('get-screen-size'), // F13

  // 数据持久化
  saveData: (data) => ipcRenderer.send('save-data', data),
  loadData: () => ipcRenderer.invoke('load-data'),

  // 托盘 / 退出
  minimizeToTray: () => ipcRenderer.send('minimize-to-tray'),
  closeApp: () => ipcRenderer.send('close-app'),

  // 主进程 → 渲染进程：托盘动作回调
  onTrayAction: (callback) => {
    ipcRenderer.on('tray-action', (_event, action) => callback(action));
  },
});
