// main.js — Electron 主进程（人 A）
// 职责：透明无边框窗口、IPC handler、退出保存、托盘占位
// 对应里程碑：M1（窗口+IPC）、M6（托盘 F14 待实现）

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 220,
    height: 220,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 点击穿透：Win/macOS 默认开启（forward 转发鼠标移动用于 hover 检测）；
  // Linux 下 forward 不可靠，默认关闭（窗口始终可交互），避免宠物无法点击
  if (process.platform !== 'linux') {
    win.setIgnoreMouseEvents(true, { forward: true });
  }
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  win.on('closed', () => { win = null; });
}

// ---------- IPC handlers（见接口文档 §2.2）----------

// 拖拽：相对移动窗口
ipcMain.on('move-window', (_e, dx, dy) => {
  if (!win) return;
  const [x, y] = win.getPosition();
  win.setPosition(x + Math.round(dx), y + Math.round(dy));
});

// 切换点击穿透（enable=true 穿透不响应点击；false 可交互）
ipcMain.on('set-click-through', (_e, enable) => {
  if (!win) return;
  win.setIgnoreMouseEvents(Boolean(enable), { forward: Boolean(enable) });
});

// 返回窗口 bounds：{x,y,width,height}
ipcMain.handle('get-window-bounds', () => {
  if (!win) return null;
  return win.getBounds();
});

// 持久化：主进程无 localStorage，用 userData 下的 JSON 文件实现
function saveFile() {
  return path.join(app.getPath('userData'), 'pet-save.json');
}

ipcMain.on('save-data', (_e, data) => {
  try {
    fs.writeFileSync(saveFile(), JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('[main] save-data error:', err);
  }
});

ipcMain.handle('load-data', () => {
  try {
    if (!fs.existsSync(saveFile())) return null;
    return JSON.parse(fs.readFileSync(saveFile(), 'utf8'));
  } catch (err) {
    console.error('[main] load-data error:', err);
    return null;
  }
});

// 退出应用
ipcMain.on('close-app', () => app.quit());

// 最小化到托盘：F14 之前先 hide 兜底
ipcMain.on('minimize-to-tray', () => {
  if (win) win.hide();
});

// ---------- 生命周期 ----------
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
