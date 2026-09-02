/* =============================================================
   game/hud.js — backdrops, baked tile art, HUD

   Backdrops are five parallax layers each, drawn from deterministic
   noise so nothing crawls between frames. Tiles are baked once into
   offscreen canvases with texture, wear and an emissive top edge,
   then blitted — cheaper than the rectangles they replace and far
   less flat.
   ============================================================= */
(function (global) {
  'use strict';
  var RA = global.RA, C = RA.core, Gfx = C.Gfx, PAL = C.PAL, T = C.TILE;
  var VW = C.VIEW_W, VH = C.VIEW_H;

  /* deterministic pseudo-random: the skyline is the same every frame */
  function h1(n) { var x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); }
  function h2(a, b) { return h1(a * 31.7 + b * 91.3); }

  function cv(w, h) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    return c;
  }

  /* ================= BAKED TILES ================= */
  var TILES = {};

  function bakeStyle(style, spec) {
    var body = cv(T, T), b = body.getContext('2d');
    b.fillStyle = spec.base; b.fillRect(0, 0, T, T);
    // panel inset
    b.fillStyle = spec.face; b.fillRect(1, 1, T - 2, T - 2);
    // seams
    b.fillStyle = spec.seam;
    b.fillRect(0, 0, T, 1); b.fillRect(0, T - 1, T, 1);
    b.fillRect(0, 0, 1, T); b.fillRect(T - 1, 0, 1, T);
    spec.detail(b);
    // grime, fixed pattern
    for (var i = 0; i < 26; i++) {
      var gx = Math.floor(h2(i, 1) * T), gy = Math.floor(h2(i, 2) * T);
      b.fillStyle = h2(i, 3) > 0.5 ? spec.grimeLo : spec.grimeHi;
      b.globalAlpha = 0.20 + h2(i, 4) * 0.28;
      b.fillRect(gx, gy, 1, 1);
      b.globalAlpha = 1;
    }

    // lit top edge, with the dark band that sells the thickness
    var top = cv(T, 6), tc = top.getContext('2d');
    tc.fillStyle = spec.lip; tc.fillRect(0, 0, T, 2);
    tc.fillStyle = spec.edge; tc.fillRect(0, 0, T, 1);
    var grad = tc.createLinearGradient(0, 2, 0, 6);
    grad.addColorStop(0, 'rgba(0,0,0,0.5)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    tc.fillStyle = grad; tc.fillRect(0, 2, T, 4);

    // one-way platform
    var plat = cv(T, 6), pc = plat.getContext('2d');
    pc.fillStyle = spec.platBody; pc.fillRect(0, 1, T, 4);
    pc.fillStyle = spec.edge; pc.fillRect(0, 0, T, 1);
    pc.fillStyle = 'rgba(0,0,0,0.55)'; pc.fillRect(1, 5, T - 2, 1);
    pc.fillStyle = spec.seam;
    pc.fillRect(2, 2, 1, 2); pc.fillRect(T - 3, 2, 1, 2);

    TILES[style] = { body: body, top: top, plat: plat, edge: spec.edge };
  }

  function bakeTiles() {
    if (TILES.london) return;
    bakeStyle('london', {
      base: '#0e1626', face: '#1a2740', seam: '#0a1120',
      grimeLo: '#0b1320', grimeHi: '#33507d',
      lip: '#3f5f8f', edge: '#7fd2ff', platBody: '#22314c',
      detail: function (b) {
        b.fillStyle = '#23345a';
        b.fillRect(3, 4, T - 6, 1);
        b.fillRect(3, 10, T - 6, 1);
        b.fillStyle = '#0d1524';
        b.fillRect(3, 5, T - 6, 1);
        b.fillStyle = '#3a5a86';
        b.fillRect(3, 3, 2, 1); b.fillRect(T - 5, 3, 2, 1);
        b.fillRect(3, 9, 2, 1); b.fillRect(T - 5, 9, 2, 1);
      }
    });
    bakeStyle('mumbai', {
      base: '#2a1c2e', face: '#3a2838', seam: '#1a1020',
      grimeLo: '#20141f', grimeHi: '#6b4a3a',
      lip: '#7a5540', edge: '#ffb400', platBody: '#402c3c',
      detail: function (b) {
        // riveted coach ribs
        b.fillStyle = '#4a3548';
        b.fillRect(0, 4, T, 2); b.fillRect(0, 10, T, 2);
        b.fillStyle = '#231624';
        b.fillRect(0, 6, T, 1); b.fillRect(0, 12, T, 1);
        b.fillStyle = '#8a6a52';
        for (var r = 2; r < T; r += 5) { b.fillRect(r, 2, 1, 1); b.fillRect(r, 8, 1, 1); }
      }
    });
    bakeStyle('grid', {
      base: '#07182c', face: '#0c2440', seam: '#04101f',
      grimeLo: '#061626', grimeHi: '#1d5a8c',
      lip: '#1b5c8c', edge: '#38d8ff', platBody: '#0f2c4c',
      detail: function (b) {
        // circuit traces
        b.fillStyle = '#134470';
        b.fillRect(2, 3, 9, 1); b.fillRect(10, 3, 1, 6);
        b.fillRect(5, 12, 8, 1); b.fillRect(5, 8, 1, 4);
        b.fillStyle = '#2b8fc4';
        b.fillRect(10, 8, 2, 2); b.fillRect(4, 11, 2, 2);
      }
    });
  }

  /* ================= BACKDROPS ================= */
  /* every Back(cam, t, game) draws five layers back-to-front */

  function skyline(cam, t, o) {
    var ox = -cam.x * o.par, i;
    for (i = 0; i < o.count; i++) {
      var seed = i + o.seed;
      var span = o.span;
      var bx = (((i * span + ox) % (VW + span * 2)) + VW + span * 2) % (VW + span * 2) - span;
      var bw = o.wMin + h1(seed) * o.wVar;
      var bh = o.hMin + h1(seed + 9) * o.hVar;
      var by = o.baseY - bh;
      Gfx.rect(bx, by, bw, bh + 80, o.color);
      if (o.crown) Gfx.rectA(bx, by, bw, 1, o.crown, 0.5);
      // windows
      if (o.win) {
        for (var wy = 6; wy < bh - 4; wy += o.winGapY) {
          for (var wx = 4; wx < bw - 5; wx += o.winGapX) {
            var r = h2(seed * 13 + wy, wx);
            if (r > o.winDens) {
              Gfx.rectA(bx + wx, by + wy, o.winW, o.winH, r > 0.94 ? o.winHot : o.win,
                        0.35 + r * 0.4);
            }
          }
        }
      }
      // aircraft warning light
      if (o.blink && h1(seed + 3) > 0.72) {
        var on = (Math.floor(t * 1.1 + seed) % 3) === 0;
        if (on) {
          Gfx.rectA(bx + bw / 2, by - 2, 2, 2, PAL.raRed, 0.9);
          Gfx.glow(bx + bw / 2 + 1, by - 1, 7, PAL.raRed, 0.4);
        }
      }
    }
  }

  var Back = {
    /* ---------- LONDON: rain, glass, and the tower he came out of ---------- */
    london: function (cam, t, game) {
      var g = Gfx.ctx.createLinearGradient(0, 0, 0, VH);
      g.addColorStop(0, '#070c1a');
      g.addColorStop(0.55, '#0b1424');
      g.addColorStop(0.86, '#141d2e');
      g.addColorStop(1, '#1b2233');
      Gfx.ctx.fillStyle = g; Gfx.ctx.fillRect(0, 0, VW, VH);
      Gfx.glow(VW * 0.25, VH * 0.78, 300, '#2a3c5e', 0.16);

      skyline(cam, t, { par: 0.06, count: 30, span: 58, seed: 100, baseY: VH - 54,
        wMin: 20, wVar: 26, hMin: 40, hVar: 96, color: '#0a111f',
        win: '#2b4269', winHot: '#5d86bd', winGapX: 7, winGapY: 11,
        winW: 2, winH: 2, winDens: 0.80, blink: true });

      skyline(cam, t, { par: 0.17, count: 20, span: 96, seed: 200, baseY: VH - 40,
        wMin: 40, wVar: 40, hMin: 70, hVar: 130, color: '#0d1a2c', crown: '#27406a',
        win: '#325a8c', winHot: '#7fb0e0', winGapX: 9, winGapY: 13,
        winW: 3, winH: 3, winDens: 0.76, blink: true });

      /* the Barron Industries slab: the landmark you pass all level,
         and the building the villain walked out of */
      var bx = 240 - cam.x * 0.3;
      var bw = 128, bh = 262, by = VH - 34 - bh;
      Gfx.rect(bx - 6, by + 26, bw + 12, bh, '#0a1522');          // podium mass
      Gfx.rect(bx, by, bw, bh + 40, '#0e1c2e');                   // tower
      Gfx.rectA(bx, by, bw, 2, '#38618f', 0.9);
      Gfx.rectA(bx, by, 2, bh, '#16283f', 0.9);
      Gfx.rectA(bx + bw - 2, by, 2, bh, '#081220', 0.9);
      // spine of light up the centre
      Gfx.rectA(bx + bw / 2 - 2, by + 6, 4, bh - 46, '#123a5e', 0.9);
      Gfx.rectA(bx + bw / 2 - 1, by + 6, 2, bh - 46, '#2f7fb5', 0.5);
      // window bands
      for (var fy = by + 16; fy < by + bh - 40; fy += 15) {
        for (var wx = 8; wx < bw - 12; wx += 15) {
          var wr = h2(fy, wx);
          if (wr < 0.30) continue;
          Gfx.rectA(bx + wx, fy, 11, 7, wr > 0.92 ? '#7fb6e8' : '#20406b',
                    0.35 + wr * 0.45);
        }
      }
      // crown mast with its warning light
      Gfx.rect(bx + bw / 2 - 1, by - 26, 3, 26, '#0c1728');
      if ((Math.floor(t * 1.2) % 3) === 0) {
        Gfx.rectA(bx + bw / 2 - 1, by - 28, 3, 3, PAL.raRed, 0.95);
        Gfx.glow(bx + bw / 2, by - 27, 10, PAL.raRed, 0.5);
      }
      // the sign
      var pulse = 0.55 + 0.45 * Math.sin(t * 1.4);
      Gfx.rectA(bx + 10, by + bh - 34, bw - 20, 15, '#040a12', 0.95);
      Gfx.text('BARRON', bx + bw / 2, by + bh - 31,
        { size: 11, align: 'center', color: '#7fd2ff', alpha: 0.5 + pulse * 0.4 });
      Gfx.glow(bx + bw / 2, by + bh - 26, 30, '#38d8ff', 0.09 + pulse * 0.11);

      /* interior mullions in the near ground */
      var mx = -cam.x * 0.55;
      for (var i = 0; i < 26; i++) {
        var px = (((i * 118 + mx) % (VW + 236)) + VW + 236) % (VW + 236) - 118;
        Gfx.rectA(px, 0, 7, VH, '#060a14', 0.85);
        Gfx.rectA(px + 7, 0, 1, VH, '#16263f', 0.6);
        Gfx.rectA(px + 2, VH * 0.2, 3, VH * 0.55, '#0f2a45', 0.5);
      }

      /* rain, two speeds, plus the occasional distant strike */
      for (i = 0; i < 46; i++) {
        var rx = (h1(i) * VW + t * (140 + h1(i + 1) * 90)) % VW;
        var ry = (h1(i + 5) * VH + t * (420 + h1(i + 2) * 260)) % VH;
        Gfx.rectA(rx, ry, 1, 9, '#4a6d9e', 0.30);
      }
      for (i = 0; i < 26; i++) {
        var rx2 = (h1(i + 30) * VW + t * 70) % VW;
        var ry2 = (h1(i + 40) * VH + t * 200) % VH;
        Gfx.rectA(rx2, ry2, 1, 5, '#2f4a6d', 0.22);
      }
      var strike = Math.sin(t * 0.31) > 0.9985;
      if (strike) Gfx.rectA(0, 0, VW, VH, '#8fb6ff', 0.10);

      // floor fog
      var fg = Gfx.ctx.createLinearGradient(0, VH - 70, 0, VH);
      fg.addColorStop(0, 'rgba(30,48,78,0)');
      fg.addColorStop(1, 'rgba(38,60,96,0.30)');
      Gfx.ctx.fillStyle = fg; Gfx.ctx.fillRect(0, VH - 70, VW, 70);
    },

    /* ---------- MUMBAI: the city, and CST getting closer ---------- */
    mumbai: function (cam, t, game) {
      var g = Gfx.ctx.createLinearGradient(0, 0, 0, VH);
      g.addColorStop(0, '#160a1e');
      g.addColorStop(0.4, '#26102a');
      g.addColorStop(0.78, '#3a1a2a');
      g.addColorStop(1, '#120a14');
      Gfx.ctx.fillStyle = g; Gfx.ctx.fillRect(0, 0, VW, VH);
      Gfx.glow(VW * 0.62, VH * 0.42, 260, '#ff7a1a', 0.13);
      Gfx.glow(VW * 0.15, VH * 0.55, 180, '#ff3fd0', 0.05);

      skyline(cam, t, { par: 0.07, count: 34, span: 52, seed: 400, baseY: VH - 62,
        wMin: 18, wVar: 24, hMin: 30, hVar: 80, color: '#180d1c',
        win: '#6b4426', winHot: '#ffb400', winGapX: 6, winGapY: 9,
        winW: 2, winH: 2, winDens: 0.86, blink: false });

      /* CST grows out of the haze as the clock runs down — the film's
         whole second half is a countdown to this building */
      if (game && game.world && game.world.level.timer) {
        var prog = 1 - C.clamp(game.timeLeft / game.world.level.timer, 0, 1);
        var near = C.clamp((game.player ? game.player.x / game.world.pxW : 0), 0, 1);
        var k = Math.max(prog, near);
        var sc = 0.55 + k * 1.7;
        var cx = VW * 0.66, base = VH - 48, w = 96 * sc, h = 104 * sc;
        var al = 0.55 + k * 0.45;
        Gfx.ctx.globalAlpha = al;

        // main block, warmer and lighter than the skyline behind it
        Gfx.rect(cx - w / 2, base - h, w, h + 48, '#3b2440');
        Gfx.rectA(cx - w / 2, base - h, w, 2, '#5d3a5e', 0.9);
        // wings
        Gfx.rect(cx - w * 0.66, base - h * 0.60, w * 0.30, h * 0.60 + 48, '#33203a');
        Gfx.rect(cx + w * 0.36, base - h * 0.60, w * 0.30, h * 0.60 + 48, '#33203a');
        // the dome
        Gfx.ctx.fillStyle = '#4a2c4e';
        Gfx.ctx.beginPath();
        Gfx.ctx.arc(cx, base - h + 2, w * 0.21, Math.PI, 0);
        Gfx.ctx.fill();
        Gfx.ctx.fillStyle = '#5d3a5e';
        Gfx.ctx.beginPath();
        Gfx.ctx.arc(cx, base - h + 2, w * 0.21, Math.PI, Math.PI * 1.4);
        Gfx.ctx.fill();
        Gfx.rect(cx - 2 * sc, base - h - w * 0.32, 4 * sc, w * 0.13, '#4a2c4e');
        // turrets along the roofline
        for (var s2 = -2; s2 <= 2; s2++) {
          if (!s2) continue;
          Gfx.rect(cx + s2 * w * 0.26 - 2 * sc, base - h * 0.94, 5 * sc, h * 0.20, '#43284a');
          Gfx.ctx.beginPath();
          Gfx.ctx.fillStyle = '#4a2c4e';
          Gfx.ctx.moveTo(cx + s2 * w * 0.26 - 4 * sc, base - h * 0.94);
          Gfx.ctx.lineTo(cx + s2 * w * 0.26 + 0.5 * sc, base - h * 1.04);
          Gfx.ctx.lineTo(cx + s2 * w * 0.26 + 5 * sc, base - h * 0.94);
          Gfx.ctx.fill();
        }
        // the clock, lit
        var clk = base - h * 0.80;
        Gfx.circle(cx, clk, 5.5 * sc, '#2a1a2e');
        Gfx.circle(cx, clk, 4.4 * sc, '#ffd27a');
        Gfx.ctx.globalAlpha = al;
        Gfx.line(cx, clk, cx + Math.cos(t * 0.4) * 3 * sc, clk + Math.sin(t * 0.4) * 3 * sc, '#3a2338', 1);
        Gfx.glow(cx, clk, 16 * sc, '#ffb400', 0.22 * al);
        // arched windows
        for (var ry = 0; ry < 5; ry++) {
          for (var rx = -4; rx <= 4; rx++) {
            if (h2(ry * 3, rx + 7) < 0.34) continue;
            Gfx.rectA(cx + rx * w * 0.13 - 1.6 * sc, base - h * 0.62 + ry * h * 0.13,
                      3.2 * sc, 5.5 * sc, ry === 0 ? '#ffd27a' : '#ffab3c', 0.55);
          }
        }
        Gfx.ctx.globalAlpha = 1;
        Gfx.glow(cx, base - h * 0.45, 76 * sc, '#ff9a3c', 0.09 + k * 0.13);
        if (k > 0.55) {
          Gfx.text('CHHATRAPATI SHIVAJI TERMINUS', cx, base + 16,
            { size: 7, align: 'center', color: '#c98a5a', alpha: (k - 0.55) * 1.6 });
        }
      }

      /* catenary poles and wires */
      var ox = -cam.x * 0.78, i;
      for (i = 0; i < 24; i++) {
        var px = (((i * 104 + ox) % (VW + 208)) + VW + 208) % (VW + 208) - 104;
        Gfx.rect(px, VH - 300, 5, 300, '#100a16');
        Gfx.rect(px - 20, VH - 300, 44, 4, '#100a16');
        Gfx.rectA(px - 20, VH - 296, 44, 1, PAL.amber, 0.22);
        Gfx.rectA(px + 2, VH - 258, 1, 40, '#1d1224', 0.9);
      }
      Gfx.rectA(0, VH - 292, VW, 1, '#241a2c', 0.75);
      Gfx.rectA(0, VH - 284, VW, 1, '#1d1424', 0.6);

      /* speed lines and rail sparks */
      for (i = 0; i < 30; i++) {
        var sy = h1(i + 40) * VH;
        var sx = VW - ((t * 1100 + h1(i) * 1600) % (VW + 320));
        Gfx.rectA(sx, sy, 34 + h1(i) * 70, 1, '#ffb400', 0.13);
      }
      for (i = 0; i < 8; i++) {
        var kx = (t * 700 + i * 190) % (VW + 200) - 100;
        if (h1(Math.floor(t * 2) + i) > 0.7) {
          Gfx.rectA(VW - kx, VH - 40 + h1(i) * 20, 3, 1, '#ffd27a', 0.5);
        }
      }
    },

    /* ---------- THE GRID: ten heads in the dark ---------- */
    grid: function (cam, t, game) {
      Gfx.rect(0, 0, VW, VH, '#02030a');
      var hy = VH * 0.40, i;

      /* RAVAN. Shah Rukh Khan described Ra.One as the new-age version of
         Raavan — "a mixture of ten different evil characters". Ten heads
         watch the third level. Ten copies happen in it. */
      var rx = VW / 2 - cam.x * 0.05, ry = hy - 46;
      Gfx.ctx.globalAlpha = 0.5;
      Gfx.ctx.fillStyle = '#080d18';
      Gfx.ctx.beginPath();
      Gfx.ctx.ellipse(rx, ry + 40, 190, 54, 0, 0, Math.PI * 2);
      Gfx.ctx.fill();
      for (i = 0; i < 10; i++) {
        var a = (i - 4.5) * 0.26;
        var hx = rx + Math.sin(a) * 150;
        var hh = ry + 16 - Math.cos(a) * 34;
        Gfx.ctx.fillStyle = '#0b1220';
        Gfx.ctx.beginPath();
        Gfx.ctx.ellipse(hx, hh, 15, 19, a * 0.7, 0, Math.PI * 2);
        Gfx.ctx.fill();
        // crown spike
        Gfx.ctx.fillStyle = '#0d1626';
        Gfx.ctx.beginPath();
        Gfx.ctx.moveTo(hx - 5, hh - 15);
        Gfx.ctx.lineTo(hx, hh - 30);
        Gfx.ctx.lineTo(hx + 5, hh - 15);
        Gfx.ctx.fill();
      }
      Gfx.ctx.globalAlpha = 1;
      for (i = 0; i < 10; i++) {
        var a2 = (i - 4.5) * 0.26;
        var ex = rx + Math.sin(a2) * 150, ey = ry + 18 - Math.cos(a2) * 34;
        var blink = Math.sin(t * 0.7 + i * 1.9) > 0.86 ? 0.05 : 1;
        Gfx.rectA(ex - 6, ey, 4, 2, PAL.raRed, 0.75 * blink);
        Gfx.rectA(ex + 2, ey, 4, 2, PAL.raRed, 0.75 * blink);
        Gfx.glow(ex, ey + 1, 11, PAL.raRed, 0.22 * blink);
      }

      /* horizon */
      Gfx.glow(VW / 2, hy, 300, '#0e3f6e', 0.4);
      Gfx.rectA(0, hy, VW, 1, PAL.hart, 0.6);
      Gfx.glow(VW / 2, hy, 90, PAL.hart, 0.18);

      /* receding floor */
      var vpx = VW / 2 - cam.x * 0.12;
      for (i = -20; i <= 20; i++) {
        Gfx.ctx.globalAlpha = 0.20;
        Gfx.line(vpx + i * 7, hy, vpx + i * 78, VH, '#17527f', 1);
        Gfx.ctx.globalAlpha = 1;
      }
      for (i = 0; i < 16; i++) {
        var p = (i / 16 + (t * 0.14) % (1 / 16));
        var yy = hy + Math.pow(p, 2.5) * (VH - hy);
        Gfx.rectA(0, yy, VW, 1, '#17527f', 0.26);
      }
      // a scan pulse running out to the horizon
      var pulseP = (t * 0.35) % 1;
      var py = hy + Math.pow(pulseP, 2.5) * (VH - hy);
      Gfx.rectA(0, py, VW, 1, PAL.hart, 0.35 * (1 - pulseP));

      /* data columns */
      for (i = 0; i < 26; i++) {
        var vx = (((i * 63 - cam.x * 0.3) % (VW + 63)) + VW + 63) % (VW + 63) - 31;
        Gfx.rectA(vx, 0, 1, hy, '#0a2745', 0.7);
        for (var k = 0; k < 5; k++) {
          var gy = ((h1(i * 7 + k) * hy) + t * (16 + h1(i) * 44)) % hy;
          Gfx.rectA(vx - 1, gy, 3, 5, PAL.hart, 0.30);
        }
      }
    }
  };

  /* Ra.One in the parallax, standing on something in the middle distance,
     turned towards you. He is in the film for about eleven minutes; he is
     in this game constantly. */
  function drawStalkers(world, cam, t) {
    var list = world.level.stalkers;
    if (!list || !list.length) return;
    for (var i = 0; i < list.length; i++) {
      var st = list[i];
      var sx = st[0] * T - cam.x * (st[2] || 0.55);
      if (sx < -60 || sx > VW + 60) continue;
      var sy = st[1] * T - cam.y * 0.2;
      var face = (cam.x + VW / 2) > (st[0] * T) ? -1 : 1;
      var breathe = Math.sin(t * 1.1 + i) * 0.5;
      RA.spr.draw(RA.spr.build().ghost, 'idle', Math.floor(t * 0.8) + i,
                  sx, sy + breathe, face, { alpha: 0.85, scale: 1.15 });
      // two red pinpricks that find you across a rooftop
      Gfx.glow(sx, sy - 34, 9, PAL.raRed, 0.35 + 0.15 * Math.sin(t * 2 + i));
      Gfx.rectA(sx - 4, sy - 35, 3, 1, PAL.raRed, 0.8);
      Gfx.rectA(sx + 1, sy - 35, 3, 1, PAL.raRed, 0.8);
    }
  }

  /* the scrim keeps the city from ever reading as a platform */
  function scrim(style) {
    Gfx.rectA(0, 0, VW, VH, style === 'mumbai' ? '#0a0410' : '#02040c', 0.38);
  }

  /* ================= TILES ================= */
  function drawTiles(world, cam, t) {
    bakeTiles();
    var set = TILES[world.level.bg] || TILES.london;
    var x0 = Math.max(0, Math.floor(cam.x / T) - 1);
    var x1 = Math.min(world.w - 1, Math.floor((cam.x + VW) / T) + 1);
    var y0 = Math.max(0, Math.floor(cam.y / T) - 1);
    var y1 = Math.min(world.h - 1, Math.floor((cam.y + VH) / T) + 1);
    var ctx = Gfx.ctx;

    for (var y = y0; y <= y1; y++) {
      for (var x = x0; x <= x1; x++) {
        var ch = world.tiles[y][x];
        if (ch === '.') continue;
        var px = Math.round(x * T - cam.x), py = Math.round(y * T - cam.y);

        if (ch === '#') {
          ctx.drawImage(set.body, px, py);
          if (!world.isSolid(x, y - 1)) {
            ctx.drawImage(set.top, px, py);
            if ((x * 5 + y * 3) % 11 === 0) Gfx.glow(px + T / 2, py, 12, set.edge, 0.16);
          }
          if (!world.isSolid(x - 1, y)) Gfx.rectA(px, py, 1, T, '#000', 0.45);
          if (!world.isSolid(x + 1, y)) Gfx.rectA(px + T - 1, py, 1, T, '#000', 0.45);
        } else if (ch === '=') {
          ctx.drawImage(set.plat, px, py);
          if (x % 5 === 0) Gfx.glow(px + T / 2, py + 1, 10, set.edge, 0.14);
        } else if (ch === '^') {
          // live gantry: hard structure, arcing underneath
          Gfx.rect(px, py, T, 3, '#39445a');
          Gfx.rect(px, py, T, 1, '#5a6a86');
          Gfx.rect(px, py + 3, T, 1, '#131a26');
          if ((x % 3) === 0) Gfx.rect(px + 6, py + 3, 3, 5, '#2b3547');
          for (var s = 0; s < 3; s++) {
            var a = t * 9 + x + s * 2;
            var ax = px + 2 + s * 5 + Math.sin(a) * 1.6;
            Gfx.rectA(ax, py + 5 + Math.sin(a * 1.7) * 2, 2, T - 7, PAL.raRed, 0.9);
            Gfx.rectA(ax, py + 5, 1, 3, '#ffd0d6', 0.7);
          }
          Gfx.glow(px + T / 2, py + T / 2, 14, PAL.raRed, 0.28);
        }
      }
    }
  }

  /* ================= HUD ================= */
  function panel(x, y, w, h) {
    Gfx.rectA(x, y, w, h, '#050912', 0.72);
    Gfx.rectA(x, y, w, 1, '#1d3050', 0.9);
    Gfx.rectA(x, y + h - 1, w, 1, '#0a1220', 0.9);
  }

  function bar(x, y, w, h, pct, fill, back, label, labelColor) {
    Gfx.rect(x - 1, y - 1, w + 2, h + 2, 'rgba(2,5,12,0.85)');
    Gfx.rect(x, y, w, h, back || '#101a28');
    var fw = Math.max(0, Math.round(w * C.clamp(pct, 0, 1)));
    Gfx.rect(x, y, fw, h, fill);
    Gfx.rectA(x, y, fw, 1, '#ffffff', 0.4);
    Gfx.rectA(x, y + h - 1, fw, 1, '#000000', 0.25);
    // segment ticks
    for (var i = 1; i < 5; i++) Gfx.rectA(x + w * i / 5, y, 1, h, '#000', 0.35);
    if (label) Gfx.text(label, x, y - 9, { size: 8, color: labelColor || PAL.bone });
  }

  function drawHUD(game, world, player, boss) {
    var pad = 10;
    panel(pad - 4, pad - 2, 176, 48);

    bar(pad, pad + 10, 150, 8, player.hp / player.maxhp,
        player.hp > 30 ? PAL.green : PAL.raRed, '#0e1a12', 'SYSTEM INTEGRITY');
    bar(pad, pad + 32, 150, 6, player.hart / player.hartMax,
        player.hartDetached ? PAL.steelLite : PAL.hart, '#0c1a24',
        player.hartDetached ? 'H.A.R.T. DETACHED' : 'H.A.R.T.',
        player.hartDetached ? PAL.amber : PAL.hart);

    // core icon: it beats, and it goes out when you put it down
    var ix = pad + 162, iy = pad + 22;
    if (player.hartDetached) {
      Gfx.ring(ix, iy, 6, PAL.steel, 1, 0.7);
    } else {
      var pl = 0.6 + 0.4 * Math.sin(game.t * 4);
      Gfx.glow(ix, iy, 10 * pl, PAL.hart, 0.5);
      RA.spr.drawProp('hartShard', ix, iy);
    }
    if (player.charge > 0.55) {
      Gfx.text('CHARGED', pad + 2, pad + 42, { size: 8, color: PAL.hartGlow, glow: PAL.hart });
    }

    Gfx.text('SCORE ' + String(game.score).padStart(7, '0'), VW - pad, pad,
      { size: 9, align: 'right', color: PAL.gold });
    Gfx.text('LUCIFER x' + game.lives, VW - pad, pad + 12,
      { size: 8, align: 'right', color: PAL.bone });
    if (game.combo > 1) {
      Gfx.text('x' + game.combo + ' COMBO', VW - pad, pad + 24,
        { size: 8, align: 'right', color: PAL.amber, glow: PAL.amber });
    }

    Gfx.text(world.level.name + ' — ' + world.level.place, VW / 2, pad,
      { size: 8, align: 'center', color: PAL.steelLite });

    if (world.level.timer) {
      var left = Math.max(0, game.timeLeft);
      var crit = left < 20;
      Gfx.text('CST IN ' + left.toFixed(1) + 's', VW / 2, pad + 12,
        { size: 11, align: 'center', color: crit ? PAL.raRed : PAL.white,
          glow: crit ? PAL.raRed : null });
      if (crit) Gfx.rectA(0, 0, VW, VH, PAL.raRed, 0.04 + 0.03 * Math.sin(game.t * 9));
    }

    Gfx.text('SHARDS ' + game.shardsFound + '/' + game.shardsTotal, pad, VH - 16,
      { size: 8, color: PAL.amber });

    if (boss && !boss.dead && boss.intro <= 0) {
      var bw = 300, bx = (VW - bw) / 2, by = VH - 40;
      panel(bx - 8, by - 26, bw + 16, 40);
      Gfx.text(boss.name, VW / 2, by - 22,
        { size: 11, align: 'center', color: PAL.raRed, glow: PAL.raRed });
      Gfx.text(boss.sub || '', VW / 2, by - 10,
        { size: 7, align: 'center', color: PAL.steelLite });
      bar(bx, by, bw, 7, boss.hp / boss.maxhp, PAL.raRed, '#20080c');
      if (boss.phase === 1 && boss.guardMax) {
        bar(bx, by + 11, bw, 4, boss.guard / boss.guardMax, PAL.steelLite, '#111820');
      }
      if (boss.immune && boss.invulnLabel) {
        Gfx.text(boss.invulnLabel, VW / 2, by + 18,
          { size: 8, align: 'center', color: PAL.amber, glow: PAL.amber });
      } else if (boss.invulnLabel && boss.phase === 3) {
        Gfx.text(boss.invulnLabel, VW / 2, by + 18, { size: 8, align: 'center', color: PAL.gold });
      }
      if (boss.mimic) {
        Gfx.text('MIMIC ACTIVE — BLOCKING ' + (boss.blockType === 'melee' ? 'MELEE' : 'BLAST') +
                 ' — SWITCH ATTACK', VW / 2, by + 18,
          { size: 8, align: 'center', color: PAL.magenta, glow: PAL.magenta });
      }
    }

    for (var i = 0; i < game.toasts.length; i++) {
      var ts = game.toasts[i];
      var a = C.clamp(ts.t / 0.6, 0, 1);
      Gfx.text(ts.msg, VW / 2, 66 + i * 14,
        { size: 10, align: 'center', color: ts.color, alpha: a, glow: ts.color });
    }

    if (player.invertT > 0) {
      Gfx.text('CONTROLS INVERTED', VW / 2, VH - 60,
        { size: 10, align: 'center', color: PAL.magenta, glow: PAL.magenta });
      Gfx.rectA(0, 0, VW, VH, PAL.magenta, 0.05);
    }
    if (player.hartDetached) {
      Gfx.rectA(0, 0, VW, VH, PAL.hartDeep, 0.06);
      Gfx.text('RUNNING ON RESIDUAL CHARGE — [H] TO RECOVER YOUR H.A.R.T.',
        VW / 2, 112, { size: 8, align: 'center', color: PAL.amber });
    }
  }

  RA.hud = { Back: Back, scrim: scrim, drawTiles: drawTiles, drawHUD: drawHUD,
             drawStalkers: drawStalkers,
             bar: bar, panel: panel, bakeTiles: bakeTiles, TILES: TILES, h1: h1 };
})(window);
