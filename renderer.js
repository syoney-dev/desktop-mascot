'use strict';

// =====================================================
//  設定
// =====================================================
const W = 200, H = 180;       // ウィンドウサイズ（main.js と合わせる）
const PX = 4;                 // ドット絵の1ドット = 4px
const BASE_X = W / 2;         // キャラの足元（ウィンドウ内の座標）
const BASE_Y = H - 8;
const WALK_SPEED = 48;        // 歩く速さ (px/秒)
const STRIDE = 4;             // 歩行1コマで進む距離。足のずれ幅(1ドット=4px)と一致させて「足すべり」を防ぐ
const GRAVITY = 1800;

const C = {
  line: '#5B3218', body: '#39bd17', light: '#FFD08E', shade: '#D9803A',
  leg: '#8A5433', eye: '#2A1A10', white: '#FFFFFF', cheek: '#FF8FA0',
  mouth: '#8A2B2B', tongue: '#E86A6A', stem: '#3E7B39', leaf: '#7CCB6E', leafDark: '#5AA84F',
};

const LINES_POKE = ['なあに？', 'くすぐったい！', 'えへへ', 'きょうもがんばろ', 'ちょっと休憩しよ？', 'ぴょーん！'];

// 歩行サイクル（4コマ）: a=左足, b=右足 → [前後のずれ(ドット), 持ち上げ(ドット)]
// 0と2が接地、1と3が足の入れ替わりで体が少し浮く
const WALK = [
  { a: [ 1, 0], b: [-1, 0], bob:  0, armA:  0.5, armB: -0.5 },
  { a: [ 0, 0], b: [ 0, 1], bob: -2, armA:  0,   armB:  0   },
  { a: [-1, 0], b: [ 1, 0], bob:  0, armA: -0.5, armB:  0.5 },
  { a: [ 0, 1], b: [ 0, 0], bob: -2, armA:  0,   armB:  0   },
];

// =====================================================
//  セットアップ
// =====================================================
const api = window.mascot;
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const dpr = window.devicePixelRatio || 1;
canvas.width = W * dpr;
canvas.height = H * dpr;
canvas.style.width = W + 'px';
canvas.style.height = H + 'px';

const s = {
  x: 0, y: 0, vx: 0, vy: 0,
  facing: 1, mode: 'idle', timer: 2, nextDir: 1,
  walkPhase: 0, targetX: 0,
  blinkT: 3, blink: 0,
  mood: 'normal', moodT: 0,
  squash: 1, squashV: 0, tilt: 0,
  look: 0, dragVx: 0, dragVy: 0, zT: 0,
  autoWalk: true,
};
let wa = { x: 0, y: 0, width: 1920, height: 1080 };
const dust = [];   // 砂ぼこり（スクリーン座標で保持＝ウィンドウが動いてもその場に残る）
const zzz = [];    // 寝息（ウィンドウ内座標）
let bubble = null;
let t = 0;
const sent = { x: NaN, y: NaN };

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const groundY = () => wa.y + wa.height - H;
const minX = () => wa.x + 40 - BASE_X;
const maxX = () => wa.x + wa.width - 40 - BASE_X;
const onGround = () => ['idle', 'walk', 'turn', 'look', 'sleep'].includes(s.mode);

// =====================================================
//  描画
// =====================================================
function rect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * PX, y * PX, w * PX, h * PX);
}
// 縁取りつきの箱
function box(x, y, w, h, fill) {
  rect(x, y, w, h, C.line);
  rect(x + 0.5, y + 0.5, w - 1, h - 1, fill);
}

function drawEyes(kind, look) {
  for (const ex of [-4.5 + look, 2 + look]) {
    switch (kind) {
      case 'blink':
        rect(ex, -9.5, 2.5, 0.8, C.eye);
        break;
      case 'happy': // ∩
        rect(ex, -10, 0.8, 1, C.eye);
        rect(ex + 0.5, -11, 1.5, 0.8, C.eye);
        rect(ex + 1.7, -10, 0.8, 1, C.eye);
        break;
      case 'sleep':
        rect(ex, -9.5, 2.5, 0.6, C.eye);
        rect(ex + 0.5, -9, 1.5, 0.5, C.eye);
        break;
      case 'wide':
        rect(ex - 0.3, -12, 3.1, 3.6, C.eye);
        rect(ex + 0.3, -11.5, 1.2, 1.2, C.white);
        break;
      default:
        rect(ex, -11.5, 2.5, 3, C.eye);
        rect(ex + 0.5, -11, 1, 1, C.white);
    }
  }
}

function drawMouth(kind, look) {
  const mx = look;
  switch (kind) {
    case 'open':
      rect(mx - 1.2, -7.2, 2.4, 1.6, C.mouth);
      rect(mx - 0.7, -6.2, 1.4, 0.6, C.tongue);
      break;
    case 'o':
      rect(mx - 0.6, -7.3, 1.2, 1.2, C.mouth);
      break;
    case 'small':
      rect(mx - 0.5, -7, 1, 0.6, C.mouth);
      break;
    default:
      rect(mx - 1, -7, 2, 0.7, C.mouth);
  }
}

function drawCharacter(p) {
  ctx.save();
  ctx.translate(BASE_X, BASE_Y);

  if (p.shadow) {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 1, 26 * (0.8 + 0.2 * (2 - p.squash)), 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // つぶれ・伸び（体積を保つように横も変える）＋向き反転＋傾き
  const sy = p.squash;
  const sx = 1 + (1 - p.squash) * 0.9;
  ctx.scale(sx * s.facing, sy);
  ctx.rotate(p.tilt * s.facing);

  // 足（体の後ろに描く）
  const legs = [[-5, p.legs[0]], [2, p.legs[1]]];
  for (const [lx, [dx, lift]] of legs) {
    box(lx + dx, -3.6 - lift, 3, 3.6, C.leg);
  }

  ctx.save();
  ctx.translate(0, p.bobPx);

  // 腕
  box(-10, -10 + p.armA, 2.5, 4, C.body);
  box(7.5, -10 + p.armB, 2.5, 4, C.body);

  // 頭の芽
  const sw = p.leafSway;
  rect(-0.5, -20, 1, 4.2, C.stem);
  rect(-3.5 + sw, -20, 3, 1.5, C.leaf);
  rect(-3.5 + sw, -19, 3, 0.5, C.leafDark);
  rect(0.5 + sw, -21, 3, 1.5, C.leaf);
  rect(0.5 + sw, -20, 3, 0.5, C.leafDark);

  // 体（箱）
  box(-8, -16, 16, 13, C.body);
  rect(-7.5, -15.5, 15, 1.5, C.light);
  rect(5, -14, 2.5, 10.5, C.shade);
  rect(-7.5, -4.5, 15, 1, C.shade);

  // 顔
  drawEyes(p.eyes, p.look);
  rect(-6.5 + p.look, -8, 2, 1, C.cheek);
  rect(4.5 + p.look, -8, 2, 1, C.cheek);
  drawMouth(p.mouth, p.look);

  ctx.restore();
  ctx.restore();
}

function buildPose() {
  const p = {
    legs: [[0, 0], [0, 0]], bobPx: 0, armA: 0, armB: 0,
    eyes: 'open', mouth: 'normal', look: s.look,
    leafSway: 0, tilt: s.tilt, squash: s.squash, shadow: true,
  };

  switch (s.mode) {
    case 'walk': {
      const f = WALK[Math.floor(s.walkPhase) % 4];
      p.legs = [f.a, f.b];
      p.bobPx = f.bob;
      p.armA = f.armA;
      p.armB = f.armB;
      p.look = 1;                            // 進行方向を見る
      p.leafSway = f.bob ? -0.5 : 0;         // 芽が揺れて遅れてついてくる
      break;
    }
    case 'drag': {
      const w = Math.sin(t * 10);
      p.legs = [[0, 0.4 + 0.4 * w], [0, 0.4 - 0.4 * w]]; // 足をぷらぷら
      p.armA = p.armB = -4;                               // バンザイ
      p.leafSway = clamp(-s.dragVx / 600, -1, 1);
      p.shadow = false;
      break;
    }
    case 'fall':
      p.legs = [[0, 0.5], [0, 0.5]];
      p.armA = p.armB = -3;
      p.leafSway = s.vy < 0 ? 0 : 0.5;
      p.shadow = false;
      break;
    case 'sleep':
      p.bobPx = Math.round(Math.sin(t * 1.3) * 1.5); // ゆっくり呼吸
      p.armA = p.armB = 0.5;
      p.leafSway = 0.5;
      break;
    default:
      p.bobPx = Math.round(Math.sin(t * 2.2));       // 待機中の呼吸
      p.leafSway = Math.round(Math.sin(t * 1.5)) / 2;
  }

  if (s.mood === 'happy') { p.eyes = 'happy'; p.mouth = 'open'; }
  else if (s.mood === 'surprised') { p.eyes = 'wide'; p.mouth = 'o'; }
  else if (s.mode === 'sleep') { p.eyes = 'sleep'; p.mouth = 'small'; }
  else if (s.blink > 0) { p.eyes = 'blink'; }

  return p;
}

function drawDust() {
  for (const d of dust) {
    const a = clamp(d.life / d.max, 0, 1);
    const size = Math.round(2 + (1 - a) * 3);
    ctx.fillStyle = `rgba(196,176,146,${(a * 0.8).toFixed(3)})`;
    ctx.fillRect(Math.round(d.x - sent.x), Math.round(d.y - sent.y), size, size);
  }
}

function drawZzz() {
  ctx.fillStyle = C.line;
  for (const z of zzz) {
    const a = clamp(1 - z.life / 2.4, 0, 1);
    ctx.globalAlpha = a;
    ctx.font = `bold ${Math.round(10 + z.life * 5)}px sans-serif`;
    ctx.fillText('z', z.x + z.life * 12, z.y - z.life * 22);
  }
  ctx.globalAlpha = 1;
}

function drawBubble() {
  if (!bubble) return;
  const a = Math.min(1, bubble.life / 0.15, (bubble.max - bubble.life) / 0.3);
  ctx.globalAlpha = clamp(a, 0, 1);
  ctx.font = '13px "Hiragino Maru Gothic ProN", "Hiragino Sans", "Yu Gothic UI", "Meiryo", sans-serif';
  const tw = ctx.measureText(bubble.text).width;
  const w = Math.ceil(tw + 18), h = 26;
  const bx = Math.round(clamp(BASE_X - w / 2, 3, W - 3 - w));
  const by = Math.round(BASE_Y - 21 * PX - h - 10);

  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(bx, by, w, h, 8);
  ctx.fill();
  ctx.stroke();
  // しっぽ
  ctx.beginPath();
  ctx.moveTo(BASE_X - 6, by + h - 1);
  ctx.lineTo(BASE_X, by + h + 7);
  ctx.lineTo(BASE_X + 6, by + h - 1);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(BASE_X - 6, by + h);
  ctx.lineTo(BASE_X, by + h + 7);
  ctx.lineTo(BASE_X + 6, by + h);
  ctx.stroke();

  ctx.fillStyle = C.eye;
  ctx.textBaseline = 'middle';
  ctx.fillText(bubble.text, bx + 9, by + h / 2 + 1);
  ctx.globalAlpha = 1;
}

function render() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, W, H);
  drawDust();
  drawCharacter(buildPose());
  drawZzz();
  drawBubble();
}

// =====================================================
//  行動
// =====================================================
function say(text, dur = 2.5) {
  bubble = { text, life: 0, max: dur };
}

function setMood(mood, dur = 0) {
  s.mood = mood;
  s.moodT = dur;
}

function nextAction() {
  const hour = new Date().getHours();
  const night = hour >= 23 || hour < 6;
  const r = Math.random();
  if (r < (night ? 0.25 : 0.04)) return startSleep();
  if (s.autoWalk && r < 0.7) return startWalk();
  if (r < 0.85) return startLook();
  s.mode = 'idle';
  s.timer = rand(2, 5);
}

function startWalk() {
  let dist = rand(80, 420) * (Math.random() < 0.5 ? -1 : 1);
  s.targetX = clamp(s.x + dist, minX(), maxX());
  if (Math.abs(s.targetX - s.x) < 30) s.targetX = clamp(s.x - dist, minX(), maxX());
  if (Math.abs(s.targetX - s.x) < 30) { s.mode = 'idle'; s.timer = 2; return; }

  const dir = Math.sign(s.targetX - s.x);
  s.walkPhase = 0;
  s.vx = 0;
  if (dir !== s.facing) {
    s.mode = 'turn';     // 反対を向くときは一瞬ためてから振り向く
    s.timer = 0.2;
    s.nextDir = dir;
  } else {
    s.mode = 'walk';
  }
}

function stopWalk() {
  s.vx = 0;
  s.walkPhase = 0;
  s.mode = 'idle';
  s.timer = rand(1.5, 4.5);
}

function startLook() {
  s.mode = 'look';
  s.timer = 2.4;
}

function startSleep() {
  s.mode = 'sleep';
  s.vx = 0;
  s.zT = 0.8;
  setMood('normal');
  say('ふわぁ…おやすみ', 2);
}

function wakeUp() {
  zzz.length = 0;
  setMood('surprised', 0.9);
  say('はっ！寝てないよ！', 2);
  hop(260);
}

function hop(power = 380) {
  s.squash = 0.8;
  s.mode = 'fall';
  s.vy = -power;
  s.vx = 0;
}

function onPoke() {
  if (s.mode === 'sleep') return wakeUp();
  if (!onGround()) return;
  setMood('happy', 1.2);
  say(pick(LINES_POKE));
  hop();
}

function footstep() {
  // 後ろ足の位置から、進行方向と逆に砂ぼこりを出す
  const fx = s.x + BASE_X - s.facing * 10;
  const fy = s.y + BASE_Y - 2;
  for (let i = 0; i < 2; i++) {
    dust.push({ x: fx + rand(-2, 2), y: fy, vx: -s.facing * rand(8, 26), vy: rand(-22, -8), life: 0.45, max: 0.45 });
  }
}

function dustBurst(n) {
  const fx = s.x + BASE_X, fy = s.y + BASE_Y - 2;
  for (let i = 0; i < n; i++) {
    const dir = i % 2 ? 1 : -1;
    dust.push({ x: fx + dir * rand(8, 20), y: fy, vx: dir * rand(30, 70), vy: rand(-30, -8), life: 0.55, max: 0.55 });
  }
}

function land() {
  const impact = s.vy;
  s.y = groundY();
  s.vy = 0;
  s.vx = 0;
  s.tilt = 0;
  s.squash = impact > 1000 ? 0.62 : impact > 400 ? 0.8 : 0.92;
  s.squashV = 0;
  if (impact > 400) dustBurst(impact > 1000 ? 8 : 4);
  if (impact > 1300) {
    setMood('surprised', 1);
    say(pick(['いたた…', 'びっくりした！', '目がまわる〜']), 1.8);
  } else if (s.mood === 'surprised' && s.moodT === 0) {
    setMood('normal');
  }
  s.mode = 'idle';
  s.timer = rand(1, 2.5);
}

// =====================================================
//  更新
// =====================================================
function update(dt) {
  t += dt;

  // まばたき
  s.blinkT -= dt;
  if (s.blinkT <= 0) { s.blink = 0.12; s.blinkT = rand(2, 5); }
  if (s.blink > 0) s.blink -= dt;

  // 表情のタイマー（moodT=0 は時間切れなし）
  if (s.moodT > 0) {
    s.moodT -= dt;
    if (s.moodT <= 0) { s.moodT = 0; s.mood = 'normal'; }
  }

  // つぶれ→戻りのバネ
  s.squashV += ((1 - s.squash) * 420 - s.squashV * 16) * dt;
  s.squash += s.squashV * dt;

  switch (s.mode) {
    case 'idle':
      s.look = 0;
      s.timer -= dt;
      if (s.timer <= 0) nextAction();
      break;

    case 'look':
      s.timer -= dt;
      s.look = s.timer > 1.6 ? 1 : s.timer > 0.8 ? -1 : 0;
      if (s.timer <= 0) { s.look = 0; s.mode = 'idle'; s.timer = rand(1, 3); }
      break;

    case 'turn':
      s.timer -= dt;
      if (s.timer < 0.1 && s.facing !== s.nextDir) {
        s.facing = s.nextDir;
        s.squash = 0.9;
      }
      if (s.timer <= 0) s.mode = 'walk';
      break;

    case 'walk': {
      const diff = s.targetX - s.x;
      const dist = Math.abs(diff);
      // 歩き出しは加速、目的地が近づくと減速
      const want = s.facing * WALK_SPEED * clamp(dist / 24, 0.35, 1);
      s.vx += (want - s.vx) * Math.min(1, dt * 8);

      const prev = Math.floor(s.walkPhase);
      s.x += s.vx * dt;
      // 移動した距離ぶんだけコマを進める → 速さが変わっても足が地面をすべらない
      s.walkPhase += Math.abs(s.vx) * dt / STRIDE;
      const cur = Math.floor(s.walkPhase);
      if (cur !== prev && cur % 2 === 0) footstep();

      const passed = diff * s.facing <= 0;
      const hitWall = (s.x <= minX() && s.facing < 0) || (s.x >= maxX() && s.facing > 0);
      if (dist < 1.5 || passed || hitWall) {
        s.x = clamp(s.x, minX(), maxX());
        stopWalk();
      }
      break;
    }

    case 'sleep':
      s.zT -= dt;
      if (s.zT <= 0) {
        zzz.push({ x: BASE_X + 26, y: BASE_Y - 70, life: 0 });
        s.zT = 1.3;
      }
      break;

    case 'drag':
      // 位置はポインターイベントで更新。引っぱる向きに体が傾く
      s.dragVx *= Math.pow(0.02, dt);
      s.dragVy *= Math.pow(0.02, dt);
      s.tilt += (clamp(s.dragVx / 1500, -0.5, 0.5) - s.tilt) * Math.min(1, dt * 10);
      break;

    case 'fall':
      s.vy += GRAVITY * dt;
      s.vx *= Math.pow(0.6, dt);
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.x < minX()) { s.x = minX(); s.vx = Math.abs(s.vx) * 0.5; }
      if (s.x > maxX()) { s.x = maxX(); s.vx = -Math.abs(s.vx) * 0.5; }
      if (s.y < wa.y - H) { s.y = wa.y - H; s.vy = Math.max(0, s.vy); }
      if (Math.abs(s.vx) > 40) s.facing = Math.sign(s.vx);
      s.tilt = clamp(s.vx / 1500, -0.35, 0.35);
      if (s.y >= groundY() && s.vy >= 0) land();
      break;
  }

  // 砂ぼこり
  for (let i = dust.length - 1; i >= 0; i--) {
    const d = dust[i];
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.vx *= Math.pow(0.1, dt);
    d.vy *= Math.pow(0.2, dt);
    d.life -= dt;
    if (d.life <= 0) dust.splice(i, 1);
  }
  // 寝息
  for (let i = zzz.length - 1; i >= 0; i--) {
    zzz[i].life += dt;
    if (zzz[i].life > 2.4 || s.mode !== 'sleep') zzz.splice(i, 1);
  }
  // ふきだし
  if (bubble) {
    bubble.life += dt;
    if (bubble.life >= bubble.max) bubble = null;
  }
}

// =====================================================
//  マウス操作
// =====================================================
let ignoring = true;
let drag = null;

function setIgnore(v) {
  if (v !== ignoring) {
    ignoring = v;
    api.setIgnore(v);
  }
}

// その座標にキャラ（不透明ピクセル）があるか
function hitTest(x, y) {
  if (x < 0 || y < 0 || x >= W || y >= H) return false;
  const d = ctx.getImageData(Math.floor(x * dpr), Math.floor(y * dpr), 1, 1).data;
  return d[3] > 100;
}

// キャラの上にマウスが来たときだけクリックを受け取る
window.addEventListener('mousemove', (e) => {
  if (drag) return;
  const hit = hitTest(e.clientX, e.clientY);
  setIgnore(!hit);
  canvas.style.cursor = hit ? 'grab' : 'default';
});
document.addEventListener('mouseleave', () => {
  if (!drag) setIgnore(true);
});

canvas.addEventListener('pointerdown', (e) => {
  if (e.button !== 0 || !hitTest(e.offsetX, e.offsetY)) return;
  canvas.setPointerCapture(e.pointerId);
  drag = {
    ox: e.screenX - s.x, oy: e.screenY - s.y,
    sx: e.screenX, sy: e.screenY,
    lx: e.screenX, ly: e.screenY, lt: performance.now(),
    moved: false,
  };
  s.dragVx = 0;
  s.dragVy = 0;
});

canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  if (!drag.moved) {
    if (Math.hypot(e.screenX - drag.sx, e.screenY - drag.sy) < 5) return;
    drag.moved = true;
    zzz.length = 0;
    s.mode = 'drag';
    s.vx = s.vy = 0;
    setMood('surprised');
    say('わわっ', 1.2);
    canvas.style.cursor = 'grabbing';
  }
  const now = performance.now();
  const dts = Math.max(1, now - drag.lt) / 1000;
  s.dragVx = s.dragVx * 0.6 + ((e.screenX - drag.lx) / dts) * 0.4;
  s.dragVy = s.dragVy * 0.6 + ((e.screenY - drag.ly) / dts) * 0.4;
  drag.lx = e.screenX;
  drag.ly = e.screenY;
  drag.lt = now;
  s.x = e.screenX - drag.ox;
  s.y = e.screenY - drag.oy;
});

function endDrag() {
  if (!drag) return;
  const d = drag;
  drag = null;
  canvas.style.cursor = 'grab';
  if (!d.moved) { onPoke(); return; }
  // 投げた勢いを引き継いで落下
  setMood('normal');
  s.vx = clamp(s.dragVx, -1500, 1500);
  s.vy = clamp(s.dragVy, -1500, 1500);
  s.mode = 'fall';
  refreshWorkArea(false);
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  if (hitTest(e.offsetX, e.offsetY)) api.showMenu();
});

// =====================================================
//  メインプロセスからの命令・画面情報
// =====================================================
async function refreshWorkArea(settle = true) {
  try {
    wa = await api.getWorkArea({ x: Math.round(s.x + BASE_X), y: Math.round(s.y + BASE_Y - 10) });
  } catch (_) { /* 取得失敗時は前の値のまま */ }
  // タスクバーの位置や解像度が変わったら、地面に合わせ直す
  if (settle && onGround() && Math.abs(s.y - groundY()) > 1) {
    s.mode = 'fall';
    s.vy = 0;
  }
  if (onGround()) s.x = clamp(s.x, minX(), maxX());
}

api.onCommand((c) => {
  switch (c.type) {
    case 'autowalk':
      s.autoWalk = c.value;
      if (!c.value && s.mode === 'walk') stopWalk();
      break;
    case 'sleep':
      if (onGround() && s.mode !== 'sleep') startSleep();
      break;
    case 'wake':
      if (s.mode === 'sleep') wakeUp();
      break;
    case 'summon':
      wa = c.workArea;
      zzz.length = 0;
      s.x = clamp(c.x - BASE_X, minX(), maxX());
      s.y = wa.y - 60;
      s.vx = 0;
      s.vy = 0;
      s.mode = 'fall';
      say('よばれた！', 2);
      break;
    case 'displays-changed':
      refreshWorkArea();
      break;
  }
});

function greeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'おはよう！';
  if (h >= 11 && h < 18) return 'こんにちは！';
  if (h >= 18 && h < 23) return 'こんばんは！';
  return '夜ふかしはほどほどにね';
}

let lastHour = new Date().getHours();
function hourlyCheck() {
  const h = new Date().getHours();
  if (h === lastHour) return;
  lastHour = h;
  if (onGround() && s.mode !== 'sleep') {
    say(`${h}時になったよ！`, 3);
    setMood('happy', 1);
    hop(300);
  }
}

// =====================================================
//  起動
// =====================================================
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);

  const rx = Math.round(s.x), ry = Math.round(s.y);
  if (rx !== sent.x || ry !== sent.y) {
    api.move(rx, ry);
    sent.x = rx;
    sent.y = ry;
  }
  render();
  requestAnimationFrame(frame);
}

(async () => {
  const b = await api.getBounds();
  s.x = b.x;
  s.y = b.y;
  await refreshWorkArea(false);
  // 画面の上からぴょんと登場
  s.y = groundY() - 260;
  s.mode = 'fall';
  setTimeout(() => say(greeting(), 2.5), 700);
  setInterval(() => { refreshWorkArea(); hourlyCheck(); }, 5000);
  requestAnimationFrame(frame);
})();
