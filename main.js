'use strict';
const { app, BrowserWindow, ipcMain, screen, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

// ウィンドウサイズ（renderer.js の W / H と合わせる）
const W = 200;
const H = 180;

let win = null;
let tray = null;
let autoWalk = true;

// ---- 設定の保存（大きさ・育成状態）----
const settingsPath = () => path.join(app.getPath('userData'), 'settings.json');
// size: 1〜10（10=標準、1=半分）
// pet: 育成状態（中身は renderer.js が管理。main は保存とメニュー表示だけ）
// sound: 鳴き声を出すか
let settings = { size: 10, pet: {}, sound: true };

function loadSettings() {
  try {
    settings = { ...settings, ...JSON.parse(fs.readFileSync(settingsPath(), 'utf8')) };
  } catch (_) { /* 初回起動・壊れているときは既定値 */ }
}

function saveSettings() {
  try {
    fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2));
  } catch (_) { /* 保存できなくても動作は続ける */ }
}

// 二重起動を防ぐ
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

// メニューに出す育成状態
function petLabel() {
  const p = settings.pet || {};
  return `水やり ${p.waterDays || 0}日目 ・ 咲いた回数 ${p.bloomCount || 0}`;
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
    { label: petLabel(), enabled: false },
    { label: '水をあげる', click: () => send({ type: 'water' }) },
    { type: 'separator' },
    {
      label: '鳴き声',
      type: 'checkbox',
      checked: settings.sound,
      click: (item) => {
        settings.sound = item.checked;
        saveSettings();
        send({ type: 'sound', value: settings.sound });
        tray.setContextMenu(buildMenu());
      },
    },
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
    {
      label: '大きさ',
      submenu: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => ({
        label: n === 10 ? '10（標準）' : n === 1 ? '1（半分）' : String(n),
        type: 'radio',
        checked: settings.size === n,
        click: () => {
          settings.size = n;
          saveSettings();
          send({ type: 'size', value: n });
          tray.setContextMenu(buildMenu());
        },
      })),
    },
    { type: 'separator' },
    {
      label: 'ログイン時に起動',
      type: 'checkbox',
      visible: process.platform !== 'linux',
      checked: process.platform !== 'linux' && app.getLoginItemSettings().openAtLogin,
      click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }),
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

ipcMain.handle('get-size', () => settings.size);

ipcMain.handle('get-sound', () => settings.sound);

ipcMain.handle('get-pet', () => settings.pet);

ipcMain.on('save-pet', (_e, pet) => {
  const before = petLabel();
  settings.pet = pet;
  saveSettings();
  // 表示が変わったときだけ作り直す（開いているメニューを閉じないように）
  if (tray && petLabel() !== before) tray.setContextMenu(buildMenu());
});

ipcMain.handle('get-work-area', (_e, point) => {
  return screen.getDisplayNearestPoint(point).workArea;
});

ipcMain.on('context-menu', () => {
  buildMenu().popup({ window: win });
});

// ---- アプリのライフサイクル ----
app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) app.dock.hide();
  loadSettings();
  createWindow();
  createTray();

  const onDisplayChange = () => send({ type: 'displays-changed' });
  screen.on('display-metrics-changed', onDisplayChange);
  screen.on('display-added', onDisplayChange);
  screen.on('display-removed', onDisplayChange);
});

app.on('window-all-closed', () => app.quit());
