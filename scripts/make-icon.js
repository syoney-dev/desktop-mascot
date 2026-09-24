'use strict';
// アプリのアイコン (build/icon.png, 256x256) を、ハコまるのスキン (skins/hakomaru.js) から作る
// 使い方: npm run icon
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: { preload: path.join(root, 'preload.js'), contextIsolation: true },
  });
  // main.js の IPC は無いので、renderer.js の起動処理は get-size で止まる（エラーが出るが描画関数は使える）
  await win.loadFile(path.join(root, 'index.html'));

  const dataUrl = await win.webContents.executeJavaScript(`setSkin('hakomaru'); renderIcon(256)`);

  const out = path.join(root, 'build', 'icon.png');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('wrote', out);
  app.quit();
});
