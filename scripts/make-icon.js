'use strict';
// アプリのアイコン (build/icon.png, 256x256) を renderer.js の drawCharacter() から作る
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

  // 1ドット = 10px（PX=4 の 2.5倍）で、足元を下寄りの中央に置いて描く
  const dataUrl = await win.webContents.executeJavaScript(`(() => {
    canvas.width = 256;
    canvas.height = 256;
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(2.5, 0, 0, 2.5, 128 - BASE_X * 2.5, 233 - BASE_Y * 2.5);
    const p = buildPose();
    p.legs = [[0, 0], [0, 0]];
    p.bobPx = 0; p.armA = p.armB = 0; p.leafSway = 0;
    p.eyes = 'open'; p.mouth = 'normal'; p.look = 0;
    p.tilt = 0; p.squash = 1; p.shadow = false;
    drawCharacter(p);
    return canvas.toDataURL('image/png');
  })()`);

  const out = path.join(root, 'build', 'icon.png');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('wrote', out);
  app.quit();
});
