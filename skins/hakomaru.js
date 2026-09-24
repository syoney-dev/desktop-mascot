'use strict';
// =====================================================
//  スキン：ハコまる（頭に芽の生えた箱）
//
//  スキンの約束ごと（skins/nyanmaru.js も同じ形）
//  - 座標はドット単位（1ドット = PX）。足元が (0, 0)、右向きで描く
//    左右反転・大きさ・つぶれ・傾きは renderer.js がかけてから draw() を呼ぶ
//  - rect() / box() / blob() / plantStage() などは renderer.js の関数（描画時に呼ぶ）
// =====================================================
(window.SKINS = window.SKINS || {}).hakomaru = (() => {
  const C = {
    line: '#5B3218', body: '#F4A259', light: '#FFD08E', shade: '#D9803A',
    leg: '#8A5433', eye: '#2A1A10', white: '#FFFFFF', cheek: '#FF8FA0',
    mouth: '#8A2B2B', tongue: '#E86A6A', stem: '#3E7B39', leaf: '#7CCB6E', leafDark: '#5AA84F',
    flowerCenter: '#FFD84A',
  };
  // 花の色（咲くたびに次の色になる）
  const FLOWER_COLORS = ['#FF8FB1', '#FFB347', '#B39DFF', '#6EC6FF', '#FF6B6B'];
  // 育ち具合ごとの頭のてっぺん（ドット）
  const PLANT_TOP = [21, 24, 28.5, 30.5];

  // 歩行サイクル（4コマ）: a=左足, b=右足 → [前後のずれ(ドット), 持ち上げ(ドット)]
  // 0と2が接地、1と3が足の入れ替わりで体が少し浮く
  const WALK = [
    { a: [ 1, 0], b: [-1, 0], bob:  0, armA:  0.5, armB: -0.5 },
    { a: [ 0, 0], b: [ 0, 1], bob: -2, armA:  0,   armB:  0   },
    { a: [-1, 0], b: [ 1, 0], bob:  0, armA: -0.5, armB:  0.5 },
    { a: [ 0, 1], b: [ 0, 0], bob: -2, armA:  0,   armB:  0   },
  ];

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

  // 頭の植物。育ち具合で描き分け、のどが渇いているときは葉が下がって色が沈む
  function drawPlant(sw) {
    const stage = plantStage();
    const dry = thirsty();
    const leaf = dry ? C.leafDark : C.leaf;
    const leafUnder = dry ? C.stem : C.leafDark;
    const dy = dry ? 0.5 : 0;

    if (stage === 0) { // 芽
      rect(-0.5, -20, 1, 4.2, C.stem);
      rect(-3.5 + sw, -20 + dy, 3, 1.5, leaf);
      rect(-3.5 + sw, -19 + dy, 3, 0.5, leafUnder);
      rect(0.5 + sw, -21 + dy, 3, 1.5, leaf);
      rect(0.5 + sw, -20 + dy, 3, 0.5, leafUnder);
      return;
    }

    // 双葉以降：茎がのびて葉が大きくなる
    const top = stage === 1 ? -23 : -26;
    const ly = stage === 1 ? -23 : -21;
    rect(-0.5, top, 1, -15.8 - top, C.stem);
    rect(-4.5 + sw, ly + dy, 4, 2, leaf);
    rect(-4.5 + sw, ly + 1.5 + dy, 4, 0.5, leafUnder);
    rect(0.5 + sw, ly - 1 + dy, 4, 2, leaf);
    rect(0.5 + sw, ly + 0.5 + dy, 4, 0.5, leafUnder);
    if (stage === 1) return; // 双葉

    const color = FLOWER_COLORS[pet.bloomCount % FLOWER_COLORS.length];
    const fx = sw / 2;
    if (stage === 2) { // つぼみ
      rect(fx - 1, -28 + dy, 2, 2.5, C.leafDark);
      rect(fx - 0.5, -28.5 + dy, 1, 1, color);
    } else { // 花
      rect(fx - 1.5, -30.5 + dy, 3, 5, color);
      rect(fx - 2.5, -29.5 + dy, 5, 3, color);
      rect(fx - 1, -29 + dy, 2, 2, C.flowerCenter);
    }
  }

  // 1音節ぶん：音程を「くいっ」と上げて少し戻す、ファミコン風の声
  function syllable(ac, out, t0, base, len) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(base * 0.8, t0);
    osc.frequency.exponentialRampToValueAtTime(base * 1.25, t0 + len * 0.4);
    osc.frequency.exponentialRampToValueAtTime(base * 0.95, t0 + len);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.12, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
    osc.connect(gain).connect(out);
    osc.start(t0);
    osc.stop(t0 + len + 0.02);
  }

  return {
    name: 'ハコまる',
    care: true,          // 育成（水やりで頭の植物が育つ）あり
    C,
    shadowW: 26,         // 影の横幅 (px, SCALE=1)
    dustX: 10,           // 足元の中心から後ろ足まで (px, SCALE=1)。砂ぼこりを出す位置
    headTop: () => PLANT_TOP[plantStage()],
    iconBox: () => [-10.5, -PLANT_TOP[plantStage()], 10.5, 0], // アイコンに収める範囲（ドット）

    lines: {
      hello: 'ハコまるだよ！',
      poke: ['なあに？', 'くすぐったい！', 'えへへ', 'きょうもがんばろ', 'ちょっと休憩しよ？', 'ぴょーん！'],
      sleep: 'ふわぁ…おやすみ',
      wake: 'はっ！寝てないよ！',
      grab: 'わわっ',
      hurt: ['いたた…', 'びっくりした！', '目がまわる〜'],
      summon: 'よばれた！',
      hourly: (h) => `${h}時になったよ！`,
      morning: 'おはよう！', day: 'こんにちは！', evening: 'こんばんは！', night: '夜ふかしはほどほどにね',
      away: 'ひさしぶり！', awayLong: 'あいたかったよ〜！',
    },

    pose(s, t) {
      const p = {
        legs: [[0, 0], [0, 0]], bobPx: 0, armA: 0, armB: 0,
        look: s.look, leafSway: 0, tilt: s.tilt, shadow: true,
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
      return p;
    },

    draw(p) {
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

      // 頭の植物
      drawPlant(p.leafSway);

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
    },

    // kind: 'happy'（ぴょ・ぷい）/ 'surprised'（高めに1回）
    // 毎回、高さと音節の数を少し変える
    voice(ac, out, t0, kind) {
      if (kind === 'surprised') {
        syllable(ac, out, t0, rand(1100, 1300), 0.16);
        return;
      }
      const n = 1 + Math.floor(Math.random() * 3);
      const base = rand(650, 900);
      for (let i = 0; i < n; i++) {
        const up = i === n - 1 ? 1.15 : 1;   // 最後の音節は少し上げる（語尾が上がる感じ）
        syllable(ac, out, t0 + i * 0.11, base * up * rand(0.95, 1.05), 0.09);
      }
    },
  };
})();
