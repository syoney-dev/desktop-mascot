'use strict';
// =====================================================
//  スキン：にゃんまる（白地に黒ぶちの子猫）
//  約束ごとは skins/hakomaru.js の先頭を参照。体は横向き、顔はこちらを向いている
// =====================================================
(window.SKINS = window.SKINS || {}).nyanmaru = (() => {
  const C = {
    line: '#3B2F2F', white: '#FFFFFF', shade: '#DCD5CE', spot: '#2E2A2A',
    pink: '#FF9CB0', eye: '#2A1A10', cheek: '#FFB3C1', mouth: '#8A2B2B', tongue: '#E86A6A',
  };

  // 歩行サイクル（4コマ）: [前後のずれ(ドット), 持ち上げ(ドット)]
  // a = 手前の前足と奥の後ろ足、b = 奥の前足と手前の後ろ足（対角の足が一緒に動く）
  const WALK = [
    { a: [ 1, 0], b: [-1, 0], bob:  0 },
    { a: [ 0, 0], b: [ 0, 1], bob: -1 },
    { a: [-1, 0], b: [ 1, 0], bob:  0 },
    { a: [ 0, 1], b: [ 0, 0], bob: -1 },
  ];

  // 頭と耳の形（立ち姿の位置から ox, oy ずらす）。子猫らしく頭を大きめに
  const head = (ox, oy) => [
    [1.5 + ox, -17 + oy, 11, 9],
    [2 + ox, -19 + oy, 3.5, 2.5], [2 + ox, -20 + oy, 2, 1.5],       // 左耳
    [9 + ox, -19 + oy, 3.5, 2.5], [10.5 + ox, -20 + oy, 2, 1.5],    // 右耳
  ];

  function drawEyes(kind, ox, oy) {
    for (const ex of [4.1 + ox, 8.1 + ox]) {
      switch (kind) {
        case 'blink':
          rect(ex, -12.4 + oy, 1.8, 0.5, C.eye);
          break;
        case 'happy': // ^ ^
          rect(ex, -12.6 + oy, 0.6, 0.6, C.eye);
          rect(ex + 0.6, -13.2 + oy, 0.6, 0.6, C.eye);
          rect(ex + 1.2, -12.6 + oy, 0.6, 0.6, C.eye);
          break;
        case 'sleep':
          rect(ex, -12.6 + oy, 1.8, 0.45, C.eye);
          rect(ex + 0.3, -12.15 + oy, 1.2, 0.45, C.eye);
          break;
        case 'wide':
          rect(ex - 0.2, -14.4 + oy, 2.2, 3, C.eye);
          rect(ex + 0.2, -14 + oy, 0.8, 0.8, C.white);
          break;
        default:
          rect(ex, -14 + oy, 1.8, 2.4, C.eye);
          rect(ex + 0.3, -13.7 + oy, 0.7, 0.7, C.white);
      }
    }
  }

  function drawMouth(kind, ox, oy) {
    switch (kind) {
      case 'open':
        rect(6.3 + ox, -10.5 + oy, 1.4, 1.2, C.mouth);
        rect(6.5 + ox, -9.8 + oy, 1, 0.5, C.tongue);
        break;
      case 'o':
        rect(6.6 + ox, -10.5 + oy, 0.8, 0.8, C.mouth);
        break;
      case 'small':
        rect(6.7 + ox, -10.3 + oy, 0.6, 0.4, C.line);
        break;
      default: // ω
        rect(6.1 + ox, -10.3 + oy, 0.8, 0.4, C.line);
        rect(7.1 + ox, -10.3 + oy, 0.8, 0.4, C.line);
    }
  }

  // 頭のもよう・顔・ひげ（head() の形を描いたあとに重ねる）
  function drawFace(p, ox, oy) {
    rect(3 + ox, -18.5 + oy, 1.5, 1, C.pink);          // 左耳の内側
    rect(9.5 + ox, -18.5 + oy, 2.5, 1.5, C.spot);      // 右耳と頭の黒ぶち
    rect(11 + ox, -19.5 + oy, 1, 0.5, C.spot);
    rect(9.5 + ox, -16.5 + oy, 2.5, 2, C.spot);
    const lx = ox + p.look;
    drawEyes(p.eyes, lx, oy);
    rect(6.6 + lx, -11 + oy, 0.8, 0.6, C.pink);        // 鼻
    drawMouth(p.mouth, lx, oy);
    rect(3 + lx, -11.3 + oy, 1.2, 0.7, C.cheek);
    rect(9.8 + lx, -11.3 + oy, 1.2, 0.7, C.cheek);
    for (const wy of [-11.2, -10.4]) {                 // ひげ
      rect(12.5 + ox, wy + oy, 1.5, 0.3, C.line);
      rect(0 + ox, wy + oy, 1.5, 0.3, C.line);
    }
  }

  const leg = (x, y, w, h, fill) => blob([[x, y, w, h]], fill);

  // 立ち・歩き・待機
  function drawStand(p) {
    const [a, b] = p.legs;
    // 奥の足（少し暗く）→ しっぽ → 手前の足 → 体。体が足の付け根を隠す
    leg(3.5 + b[0], -3.5 - b[1], 2.5, 3.5, C.shade);
    leg(-4.5 + a[0], -3.5 - a[1], 2.5, 3.5, C.shade);
    ctx.save();
    ctx.translate(0, p.bobPx);
    const sw = p.tailSway / 2;
    blob([[-9, -8.5, 3.5, 2.2], [-9.5 + sw, -13.5, 2.2, 6.5]], C.white);
    rect(-9 + sw, -13, 1.2, 1.5, C.spot);
    ctx.restore();
    leg(2 + a[0], -3.5 - a[1], 2.5, 3.5, C.white);
    leg(-6 + b[0], -3.5 - b[1], 2.5, 3.5, C.white);

    ctx.save();
    ctx.translate(0, p.bobPx);
    blob([[-6.5, -10, 12, 7.5], ...head(0, 0)], C.white);
    rect(-5.5, -9.5, 4, 3, C.spot);                    // 背中の黒ぶち
    rect(-1, -5.5, 2, 2, C.spot);
    drawFace(p, 0, 0);
    ctx.restore();
  }

  // 丸くなって寝る。しっぽを前に巻く
  function drawSleep(p) {
    ctx.save();
    ctx.translate(0, p.bobPx);
    blob([[-7, -7.5, 13, 7.5], ...head(0, 4)], C.white);
    rect(-6, -7, 4, 3, C.spot);
    drawFace(p, 0, 4);
    blob([[-4.5, -2.2, 10, 2.2]], C.white);
    rect(4, -1.7, 1.5, 1.2, C.spot);
    ctx.restore();
  }

  // 首根っこをつままれて、ぶらーん
  function drawHang(p) {
    const w = p.legSwing, sw = p.tailSway;
    blob([[-0.9 + sw, -8, 1.8, 6]], C.white);          // しっぽ
    rect(-0.5 + sw, -3, 1, 1, C.spot);
    leg(-3.3, -8.5 + 0.5 * w, 2.5, 5, C.white);        // 後ろ足
    leg(0.8, -8.5 - 0.5 * w, 2.5, 5, C.white);
    blob([[-3.5, -18, 7, 10.5], ...head(-7, -9)], C.white);
    rect(-3, -16.5, 2, 2.5, C.spot);
    drawFace(p, -7, -9);
    leg(-4.8, -16, 2, 4, C.white);                     // 前足
    leg(2.8, -16, 2, 4, C.white);
  }

  // 放り投げられて上がっていく：前足と後ろ足をのばしてジャンプ
  function drawLeap(p) {
    leg(-12.5, -8, 4.5, 2.2, C.shade);
    leg(9, -7, 4, 2.2, C.shade);
    blob([[-16, -11.5, 7.5, 2]], C.white);
    rect(-15.5, -11, 1.5, 1, C.spot);
    leg(-13, -7, 4.5, 2.2, C.white);
    leg(9.5, -6, 4, 2.2, C.white);
    blob([[-9, -10, 15, 5.5], ...head(3.5, 1)], C.white);
    rect(-7.5, -9.5, 4, 2.5, C.spot);
    rect(-1, -6.5, 2, 1.5, C.spot);
    drawFace(p, 3.5, 1);
  }

  // 落ちてくる：足を下にのばして、すたっと着地する構え
  function drawReach(p) {
    leg(4, -4.5, 2.5, 4.5, C.shade);
    leg(-4.5, -4.5, 2.5, 4.5, C.shade);
    blob([[-9, -9.5, 3.5, 2.2], [-9.5, -15.5, 2.2, 6.5]], C.white);
    rect(-9, -15, 1.2, 1.5, C.spot);
    leg(2.5, -4.5, 2.5, 4.5, C.white);
    leg(-6, -4.5, 2.5, 4.5, C.white);
    blob([[-6.5, -10.5, 12, 7], ...head(0.5, -0.5)], C.white);
    rect(-5.5, -10, 4, 3, C.spot);
    rect(-1, -6, 2, 1.5, C.spot);
    drawFace(p, 0.5, -0.5);
  }

  // 「にゃ」1回ぶん：こもった「ん」→ 開いた「や」→ 閉じていく「ぁ」を、フィルターの開き具合で作る
  function nya(ac, out, t0, base, len) {
    const osc = ac.createOscillator();
    const filter = ac.createBiquadFilter();
    const gain = ac.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(base * 0.9, t0);
    osc.frequency.linearRampToValueAtTime(base * 1.12, t0 + len * 0.3);
    osc.frequency.exponentialRampToValueAtTime(base * 0.75, t0 + len);
    filter.type = 'lowpass';
    filter.Q.value = 6;
    filter.frequency.setValueAtTime(500, t0);
    filter.frequency.exponentialRampToValueAtTime(2600, t0 + len * 0.3);
    filter.frequency.exponentialRampToValueAtTime(900, t0 + len);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.1, t0 + 0.03);
    gain.gain.setValueAtTime(0.1, t0 + len * 0.6);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
    osc.connect(filter).connect(gain).connect(out);
    osc.start(t0);
    osc.stop(t0 + len + 0.02);
  }

  return {
    name: 'にゃんまる',
    care: false,         // 育成はまだない
    C,
    shadowW: 28,
    dustX: 22,
    // ぶら下がっているときは頭が上に来るので、ふきだしもその上に
    headTop: () => (s.mode === 'drag' ? 29 : 20),
    iconBox: () => [-10, -20.5, 14, 0.5],

    lines: {
      hello: 'にゃんまるだにゃ！',
      poke: ['にゃ？', 'なでてにゃ〜', 'ごろごろ…', 'にゃーん', 'あそぶにゃ？', 'ねむいにゃ…'],
      sleep: 'ふにゃ…おやすみにゃ',
      wake: 'にゃっ！？ねてないにゃ！',
      grab: 'にゃっ！',
      hurt: ['にゃふっ', 'びっくりしたにゃ', 'めがまわるにゃ〜'],
      summon: 'よんだにゃ？',
      hourly: (h) => `${h}時だにゃ！`,
      morning: 'おはようにゃ！', day: 'こんにちにゃ！', evening: 'こんばんにゃ！', night: '夜ふかしはだめにゃ',
      away: 'ひさしぶりにゃ！', awayLong: 'あいたかったにゃ〜！',
    },

    pose(s, t) {
      const p = {
        form: 'stand', legs: [[0, 0], [0, 0]], bobPx: 0,
        look: s.look / 2, tailSway: 0, legSwing: 0, tilt: s.tilt, shadow: true,
      };
      switch (s.mode) {
        case 'walk': {
          const f = WALK[Math.floor(s.walkPhase) % 4];
          p.legs = [f.a, f.b];
          p.bobPx = f.bob;
          p.look = 0.5;                                          // 進行方向を見る
          p.tailSway = Math.sin(s.walkPhase * Math.PI / 2);
          break;
        }
        case 'drag':
          p.form = 'hang';
          p.legSwing = Math.sin(t * 9);                          // 後ろ足ぷらぷら
          p.tailSway = clamp(-s.dragVx / 800, -1.5, 1.5) + Math.sin(t * 4) * 0.3;
          p.shadow = false;
          break;
        case 'fall':
          // 上がっている間はのびのびジャンプ、落ち始めたら足を下に
          p.form = s.vy < 150 ? 'leap' : 'reach';
          // 飛んでいく向きに体を向ける（上がるときは鼻先が上）
          p.tilt = clamp(Math.atan2(s.vy, Math.abs(s.vx) + 250) * 0.6, -0.45, 0.2);
          p.shadow = false;
          break;
        case 'sleep':
          p.form = 'sleep';
          p.bobPx = Math.round(Math.sin(t * 1.3) * 1.5);         // ゆっくり呼吸
          break;
        default:
          p.bobPx = Math.round(Math.sin(t * 2.2) * 0.8);         // 待機中の呼吸
          p.tailSway = Math.sin(t * 1.8);                        // しっぽをゆらゆら
      }
      return p;
    },

    draw(p) {
      switch (p.form) {
        case 'hang': return drawHang(p);
        case 'sleep': return drawSleep(p);
        case 'leap': return drawLeap(p);
        case 'reach': return drawReach(p);
        default: return drawStand(p);
      }
    },

    // kind: 'happy'（にゃ・にゃにゃ・にゃーん）/ 'surprised'（にゃっ）
    voice(ac, out, t0, kind) {
      if (kind === 'surprised') {
        nya(ac, out, t0, rand(1000, 1150), 0.16);
        return;
      }
      const r = Math.random();
      if (r < 0.4) {
        nya(ac, out, t0, rand(700, 850), rand(0.45, 0.6));      // にゃーん
      } else if (r < 0.75) {
        nya(ac, out, t0, rand(750, 900), 0.2);                  // にゃ
      } else {
        const base = rand(750, 900);                            // にゃにゃ
        nya(ac, out, t0, base, 0.16);
        nya(ac, out, t0 + 0.2, base * 1.08, 0.2);
      }
    },
  };
})();
