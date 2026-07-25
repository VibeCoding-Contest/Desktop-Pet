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
  resizeWindow: (w, h) => ipcRenderer.send('resize-window', w, h), // G1 缩放

  // 数据持久化
  saveData: (data) => ipcRenderer.send('save-data', data),
  loadData: () => ipcRenderer.invoke('load-data'),

  // 自定义形象持久化（升级功能）
  saveCustomPet:  (config) => ipcRenderer.invoke('save-custom-pet', config),
  loadCustomPets: ()        => ipcRenderer.invoke('load-custom-pets'),
  deleteCustomPet:(id)      => ipcRenderer.invoke('delete-custom-pet', id),

  // 托盘 / 退出
  minimizeToTray: () => ipcRenderer.send('minimize-to-tray'),
  closeApp: () => ipcRenderer.send('close-app'),

  // 系统能力（G9/G6：B 的工具与 A 的提醒出口经此调用）
  showNotification: (title, body) => ipcRenderer.send('show-notification', { title, body }),
  openExternal: (url) => ipcRenderer.send('open-external', url),
  systemPower: (action, delay = 0) => ipcRenderer.invoke('system-power', { action, delay }),

  // 主进程 → 渲染进程：托盘动作回调
  onTrayAction: (callback) => {
    ipcRenderer.on('tray-action', (_event, action) => callback(action));
  },
});
