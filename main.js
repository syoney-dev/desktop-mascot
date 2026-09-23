'use strict';
const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

// ウィンドウサイズ（renderer.js の W / H と合わせる）
const W = 200;
const H = 180;

// electron.exe で直接起動しているときは、アプリのフォルダも渡さないと空の Electron が立ち上がってしまう
const LOGIN_ITEM = app.isPackaged ? {} : { args: [app.getAppPath()] };

let win = null;
let tray = null;
let autoWalk = true;

// 二重起動を防ぐ
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

function send(cmd) {
  if (win && !win.isDestroyed()) win.webContents.send('command', cmd);
}

function createWindow() {
  const wa = screen.getPrimaryDisplay().workArea;
  win = new BrowserWindow({
    width: W,
    height: H,
    x: wa.x + wa.width - W - 80,
    y: wa.y + wa.height - H,
    transparent: true,          // 背景を透明に
    frame: false,               // 枠なし
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    hasShadow: false,
    alwaysOnTop: true,          // 常に最前面
    skipTaskbar: true,          // タスクバーに出さない
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false, // 非アクティブでもアニメーションを止めない
    },
  });

  win.setAlwaysOnTop(true, 'floating');
  if (process.platform === 'darwin') {
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }
  // 透明部分はクリックを下のウィンドウへ通す（キャラの上に来たら renderer 側で解除）
  if (process.platform !== 'linux') {
    win.setIgnoreMouseEvents(true, { forward: true });
  }
  win.loadFile('index.html');
}

function buildMenu() {
  return Menu.buildFromTemplate([
    {
      label: 'ぶらぶら歩く',
      type: 'checkbox',
      checked: autoWalk,
      click: (item) => {
        autoWalk = item.checked;
        send({ type: 'autowalk', value: autoWalk });
        tray.setContextMenu(buildMenu());
      },
    },
    { label: 'おやすみさせる', click: () => send({ type: 'sleep' }) },
    { label: '起こす', click: () => send({ type: 'wake' }) },
    {
      label: 'マウスの位置に呼ぶ',
      click: () => {
        const p = screen.getCursorScreenPoint();
        const wa = screen.getDisplayNearestPoint(p).workArea;
        send({ type: 'summon', x: p.x, workArea: wa });
      },
    },
    { type: 'separator' },
    {
      label: 'ログイン時に起動',
      type: 'checkbox',
      visible: process.platform !== 'linux',
      checked: process.platform !== 'linux' && app.getLoginItemSettings(LOGIN_ITEM).openAtLogin,
      click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked, ...LOGIN_ITEM }),
    },
    { type: 'separator' },
    { label: '終了', click: () => app.quit() },
  ]);
}

function createTray() {
  let icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray.png'));
  if (process.platform === 'darwin') icon = icon.resize({ width: 18, height: 18 });
  tray = new Tray(icon);
  tray.setToolTip('ハコまる');
  tray.setContextMenu(buildMenu());
}

// ---- IPC ----
ipcMain.on('move', (_e, x, y) => {
  if (!win || win.isDestroyed()) return;
  // setPosition だと高DPI環境でサイズがずれることがあるので setBounds で固定
  win.setBounds({ x: Math.round(x), y: Math.round(y), width: W, height: H });
});

ipcMain.on('set-ignore', (_e, ignore) => {
  if (!win || process.platform === 'linux') return;
  win.setIgnoreMouseEvents(ignore, { forward: true });
});

ipcMain.handle('get-bounds', () => win.getBounds());

ipcMain.handle('get-work-area', (_e, point) => {
  return screen.getDisplayNearestPoint(point).workArea;
});

ipcMain.on('context-menu', () => {
  buildMenu().popup({ window: win });
});

// ---- アプリのライフサイクル ----
app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) app.dock.hide();
  createWindow();
  createTray();

  const onDisplayChange = () => send({ type: 'displays-changed' });
  screen.on('display-metrics-changed', onDisplayChange);
  screen.on('display-added', onDisplayChange);
  screen.on('display-removed', onDisplayChange);
});

app.on('window-all-closed', () => app.quit());
