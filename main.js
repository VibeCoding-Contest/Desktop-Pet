// main.js — Electron 主进程（人 A）
// 职责：透明无边框窗口、IPC handler、系统托盘(F14)、退出保存
// 对应里程碑：M1(窗口+IPC) / M6(托盘F14+边缘吸附F13支撑+持久化F15)

const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen } = require('electron');
const path = require('path');
const fs = require('fs');

let win = null;
let tray = null;
let isQuitting = false;

function createWindow() {
  win = new BrowserWindow({
    width: 220,
    height: 220,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 点击穿透：Win/macOS 默认开启（forward 转发鼠标移动用于 hover 检测）；
  // Linux 下 forward 不可靠，默认关闭（窗口始终可交互）
  if (process.platform !== 'linux') {
    win.setIgnoreMouseEvents(true, { forward: true });
  }
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // F14：关闭按钮（Alt+F4/Cmd+Q）→ 最小化到托盘，而非退出
  win.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      win.hide();
    }
  });
  win.on('closed', () => { win = null; });
}

// ---------- 系统托盘 F14 ----------
function createTray() {
  let icon;
  try {
    const iconPath = path.join(__dirname, 'assets', 'icons', 'tray.png');
    if (fs.existsSync(iconPath)) {
      icon = nativeImage.createFromPath(iconPath);
    }
  } catch (e) {
    console.error('[main] tray icon load error:', e);
  }
  if (!icon || icon.isEmpty()) icon = nativeImage.createEmpty();

  try {
    tray = new Tray(icon);
    tray.setToolTip('Desktop Pet');
    tray.setContextMenu(Menu.buildFromTemplate([
      {
        label: '显示',
        click: () => {
          if (win) { win.show(); win.focus(); }
          sendTrayAction('show');
        },
      },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          sendTrayAction('exit');
          isQuitting = true;
          app.quit();
        },
      },
    ]));
    tray.on('click', () => { if (win) { win.show(); win.focus(); } });
  } catch (e) {
    // Linux 无 StatusNotifierItem/appindicator 时托盘可能创建失败，降级：不阻断运行
    console.warn('[main] tray create failed (ignored):', e.message);
    tray = null;
    // 无托盘时改回任务栏可见，避免窗口 hide 后无法恢复
    if (win) win.setSkipTaskbar(false);
  }
}

function sendTrayAction(action) {
  if (win && !win.isDestroyed()) win.webContents.send('tray-action', action);
}

// ---------- IPC handlers（见接口文档 §2.2）----------

// 拖拽：相对移动窗口
ipcMain.on('move-window', (_e, dx, dy) => {
  if (!win) return;
  const [x, y] = win.getPosition();
  win.setPosition(x + Math.round(dx), y + Math.round(dy));
});

// 绝对设置窗口位置（F13 边缘吸附 / F15 恢复位置）
ipcMain.on('set-window-position', (_e, x, y) => {
  if (!win) return;
  win.setPosition(Math.round(x), Math.round(y));
});

// 切换点击穿透
ipcMain.on('set-click-through', (_e, enable) => {
  if (!win) return;
  win.setIgnoreMouseEvents(Boolean(enable), { forward: Boolean(enable) });
});

ipcMain.handle('get-window-bounds', () => win ? win.getBounds() : null);

// 屏幕工作区尺寸（F13 吸附用）
ipcMain.handle('get-screen-size', () => {
  try {
    const d = screen.getPrimaryDisplay();
    return d.workAreaSize; // { width, height }
  } catch (e) {
    return null;
  }
});

// 持久化：userData 下的 JSON 文件
function saveFile() {
  return path.join(app.getPath('userData'), 'pet-save.json');
}
ipcMain.on('save-data', (_e, data) => {
  try { fs.writeFileSync(saveFile(), JSON.stringify(data, null, 2)); }
  catch (err) { console.error('[main] save-data error:', err); }
});
ipcMain.handle('load-data', () => {
  try {
    if (!fs.existsSync(saveFile())) return null;
    return JSON.parse(fs.readFileSync(saveFile(), 'utf8'));
  } catch (err) { console.error('[main] load-data error:', err); return null; }
});

// 退出 / 最小化
ipcMain.on('close-app', () => { isQuitting = true; app.quit(); });
ipcMain.on('minimize-to-tray', () => { if (win) win.hide(); });

// ---------- 生命周期 ----------
app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  // 有托盘时即使窗口都隐藏也不退出；无托盘则按平台惯例退出
  if (!tray && process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
