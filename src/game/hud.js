/* =============================================================
   game/hud.js — parallax backdrops, tile painting, HUD
   ============================================================= */
(function (global) {
  'use strict';
  var C = global.RA.core, Gfx = C.Gfx, PAL = C.PAL, T = C.TILE;
  var VW = C.VIEW_W, VH = C.VIEW_H;

  /* deterministic pseudo-random so the skyline doesn't crawl */
  function h1(n) { var x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); }

  var Back = {
    london: function (cam, t) {
      Gfx.rect(0, 0, VW, VH, '#070a14');
      // cold sky wash
      var g = Gfx.ctx.createLinearGradient(0, 0, 0, VH);
      g.addColorStop(0, '#0b1226'); g.addColorStop(0.6, '#0a0f1c'); g.addColorStop(1, '#05060b');
      Gfx.ctx.fillStyle = g; Gfx.ctx.fillRect(0, 0, VW, VH);

      // far skyline
      var ox = -cam.x * 0.12;
      for (var i = 0; i < 40; i++) {
        var bx = ((i * 70 + ox) % (VW + 140)) - 70;
        var bw = 32 + h1(i) * 42, bh = 60 + h1(i + 9) * 120;
        Gfx.rect(bx, VH - 70 - bh, bw, bh + 70, '#0d1424');
        for (var wy = 0; wy < bh; wy += 16) {
          for (var wx = 4; wx < bw - 5; wx += 12) {
            if (h1(i * 31 + wy + wx) > 0.86) {
              Gfx.rectA(bx + wx, VH - 70 - bh + wy + 5, 2, 3, '#22314f', 0.55);
            }
          }
        }
      }
      // near towers
      ox = -cam.x * 0.32;
      for (i = 0; i < 26; i++) {
        var nx = ((i * 110 + ox) % (VW + 220)) - 110;
        var nw = 56 + h1(i + 3) * 40, nh = 110 + h1(i + 7) * 130;
        Gfx.rect(nx, VH - 40 - nh, nw, nh + 40, '#0a0f1c');
        Gfx.rect(nx, VH - 40 - nh, nw, 2, '#16233d');
        for (var k = 0; k < nh; k += 22) {
          if (h1(i * 17 + k) > 0.78) Gfx.rectA(nx + 7, VH - 40 - nh + k + 6, nw - 14, 2, '#16243d', 0.7);
        }
      }
      // rain
      for (i = 0; i < 60; i++) {
        var rx = (h1(i) * VW + t * (60 + h1(i + 1) * 90)) % VW;
        var ry = (h1(i + 5) * VH + t * (260 + h1(i + 2) * 200)) % VH;
        Gfx.rectA(rx, ry, 1, 6, '#3a5480', 0.35);
      }
    },

    mumbai: function (cam, t) {
      var g = Gfx.ctx.createLinearGradient(0, 0, 0, VH);
      g.addColorStop(0, '#1a0f22'); g.addColorStop(0.45, '#241228'); g.addColorStop(1, '#0a0710');
      Gfx.ctx.fillStyle = g; Gfx.ctx.fillRect(0, 0, VW, VH);

      // haze + city glow
      Gfx.glow(VW * 0.7, VH * 0.35, 220, '#ff7a1a', 0.10);
      var ox = -cam.x * 0.15, i;
      for (i = 0; i < 46; i++) {
        var bx = ((i * 62 + ox) % (VW + 124)) - 62;
        var bh = 40 + h1(i + 21) * 90;
        Gfx.rect(bx, VH - 60 - bh, 30 + h1(i) * 28, bh + 60, '#150c1c');
        if (h1(i * 3) > 0.5) Gfx.rectA(bx + 4, VH - 60 - bh + 8, 4, 4, PAL.amber, 0.7);
        if (h1(i * 5) > 0.7) Gfx.rectA(bx + 14, VH - 60 - bh + 20, 4, 4, PAL.saffron, 0.6);
      }
      // catenary poles whipping past
      ox = -cam.x * 0.75;
      for (i = 0; i < 30; i++) {
        var px = ((i * 96 + ox) % (VW + 192)) - 96;
        Gfx.rect(px, VH - 250, 4, 250, '#0f0a14');
        Gfx.rect(px - 16, VH - 250, 36, 3, '#0f0a14');
        Gfx.rectA(px - 16, VH - 246, 36, 1, PAL.amber, 0.25);
      }
      // speed lines
      for (i = 0; i < 26; i++) {
        var sy = (h1(i + 40) * VH);
        var sx = (VW - ((t * 900 + h1(i) * 1400) % (VW + 300)));
        Gfx.rectA(sx, sy, 40 + h1(i) * 60, 1, '#ffb400', 0.16);
      }
    },

    grid: function (cam, t) {
      Gfx.rect(0, 0, VW, VH, '#03040a');
      var cxp = VW / 2, hy = VH * 0.42, i;
      // horizon glow
      Gfx.glow(cxp, hy, 260, '#123a6b', 0.35);
      Gfx.rectA(0, hy, VW, 1, PAL.hart, 0.5);
      // perspective floor
      for (i = -16; i <= 16; i++) {
        var fx = cxp + i * 46;
        Gfx.ctx.globalAlpha = 0.22;
        Gfx.line(cxp + i * 8, hy, fx * 1.6 - cxp * 0.6 - cam.x * 0.2, VH, '#1c4f80', 1);
        Gfx.ctx.globalAlpha = 1;
      }
      for (i = 0; i < 14; i++) {
        var p = ((i / 14) + (t * 0.18) % (1 / 14));
        var yy = hy + Math.pow(p, 2.4) * (VH - hy);
        Gfx.rectA(0, yy, VW, 1, '#1c4f80', 0.30);
      }
      // vertical data columns
      for (i = 0; i < 22; i++) {
        var vx = ((i * 71 - cam.x * 0.35) % (VW + 71) + VW + 71) % (VW + 71) - 35;
        var seed = Math.floor(i * 7);
        Gfx.rectA(vx, 0, 1, hy, '#0d2b4d', 0.7);
        for (var k = 0; k < 6; k++) {
          var gy = ((h1(seed + k) * hy) + t * (18 + h1(seed) * 40)) % hy;
          Gfx.rectA(vx - 1, gy, 3, 6, PAL.hart, 0.35);
        }
      }
    }
  };

  /* a scrim between backdrop and playfield: the city must never
     be mistaken for something you can stand on */
  function scrim(style) {
    Gfx.rectA(0, 0, VW, VH, style === 'mumbai' ? '#0a0410' : '#03050c', 0.42);
  }

  /* ---------- tiles ---------- */
  function drawTiles(world, cam, t) {
    var x0 = Math.max(0, Math.floor(cam.x / T) - 1);
    var x1 = Math.min(world.w - 1, Math.floor((cam.x + VW) / T) + 1);
    var y0 = Math.max(0, Math.floor(cam.y / T) - 1);
    var y1 = Math.min(world.h - 1, Math.floor((cam.y + VH) / T) + 1);
    var style = world.level.bg;

    for (var y = y0; y <= y1; y++) {
      for (var x = x0; x <= x1; x++) {
        var ch = world.tiles[y][x];
        if (ch === '.') continue;
        var px = Math.round(x * T - cam.x), py = Math.round(y * T - cam.y);
        if (ch === '#') {
          var open = !world.isSolid(x, y - 1);
          if (style === 'mumbai') {
            Gfx.rect(px, py, T, T, '#2a2033');
            Gfx.rect(px + 1, py + 1, T - 2, T - 2, '#33263e');
            if (open) { Gfx.rect(px, py, T, 2, '#3a2c46'); Gfx.rect(px, py, T, 1, PAL.amber); }
            if ((x + y) % 4 === 0) Gfx.rectA(px + 3, py + 5, T - 6, 1, '#4a3a56', 0.6);
          } else if (style === 'grid') {
            Gfx.rect(px, py, T, T, '#0e2440');
            Gfx.rect(px + 1, py + 1, T - 2, T - 2, '#123055');
            if (open) Gfx.rect(px, py, T, 1, PAL.hart);
            Gfx.rectA(px, py, 1, T, '#123a6b', 0.8);
          } else {
            Gfx.rect(px, py, T, T, '#182640');
            Gfx.rect(px + 1, py + 1, T - 2, T - 2, '#1f3352');
            Gfx.rectA(px, py, 1, T, '#0c1424', 0.9);
            if (open) { Gfx.rect(px, py, T, 2, '#3d5a86'); Gfx.rect(px, py, T, 1, PAL.hart); }
            if ((x * 7 + y * 3) % 9 === 0) Gfx.rectA(px + 4, py + 6, 3, 3, PAL.hart, 0.4);
          }
        } else if (ch === '=') {
          Gfx.rect(px, py, T, 4, style === 'grid' ? '#123a6b' : '#26364e');
          Gfx.rect(px, py, T, 1, style === 'mumbai' ? PAL.amber : PAL.hart);
          Gfx.rectA(px + 2, py + 4, T - 4, 1, '#000', 0.4);
        } else if (ch === '^') {
          // a live gantry: hard structure on top, arcing underneath
          Gfx.rect(px, py, T, 3, '#39445a');
          Gfx.rect(px, py + 3, T, 1, '#1b2331');
          if ((x % 3) === 0) Gfx.rect(px + 6, py + 3, 3, 5, '#2b3547');
          for (var s = 0; s < 3; s++) {
            var a = t * 9 + x + s * 2;
            var ax = px + 2 + s * 5 + Math.sin(a) * 1.5;
            Gfx.rectA(ax, py + 5 + Math.sin(a * 1.7) * 2, 2, T - 7, PAL.raRed, 0.85);
          }
          Gfx.glow(px + T / 2, py + T / 2, 13, PAL.raRed, 0.25);
        }
      }
    }
  }

  /* ---------- HUD ---------- */
  function bar(x, y, w, h, pct, fill, back, label, labelColor) {
    Gfx.rect(x - 1, y - 1, w + 2, h + 2, 'rgba(0,0,0,0.65)');
    Gfx.rect(x, y, w, h, back || '#16202f');
    var fw = Math.max(0, Math.round(w * C.clamp(pct, 0, 1)));
    Gfx.rect(x, y, fw, h, fill);
    Gfx.rectA(x, y, fw, 1, '#ffffff', 0.35);
    if (label) Gfx.text(label, x, y - 9, { size: 8, color: labelColor || PAL.bone });
  }

  function drawHUD(game, world, player, boss) {
    var pad = 10;
    // integrity
    bar(pad, pad + 10, 150, 8, player.hp / player.maxhp,
        player.hp > 30 ? PAL.green : PAL.raRed, '#0e1a12', 'SYSTEM INTEGRITY');
    // H.A.R.T.
    bar(pad, pad + 32, 150, 6, player.hart / player.hartMax,
        player.hartDetached ? PAL.steelLite : PAL.hart, '#0c1a24',
        player.hartDetached ? 'H.A.R.T. DETACHED' : 'H.A.R.T.',
        player.hartDetached ? PAL.amber : PAL.hart);
    if (player.charge > 0.55) {
      Gfx.text('CHARGED', pad + 156, pad + 31, { size: 8, color: PAL.hartGlow, glow: PAL.hart });
    }

    // score / lives
    Gfx.text('SCORE ' + String(game.score).padStart(7, '0'), VW - pad, pad, { size: 9, align: 'right', color: PAL.gold });
    Gfx.text('LUCIFER x' + game.lives, VW - pad, pad + 12, { size: 8, align: 'right', color: PAL.bone });
    if (game.combo > 1) {
      Gfx.text('x' + game.combo + ' COMBO', VW - pad, pad + 24, { size: 8, align: 'right', color: PAL.amber });
    }

    // level tag
    Gfx.text(world.level.name + ' — ' + world.level.place, VW / 2, pad, { size: 8, align: 'center', color: PAL.steelLite });

    // level 2 timer
    if (world.level.timer) {
      var left = Math.max(0, game.timeLeft);
      var col = left < 20 ? PAL.raRed : PAL.white;
      Gfx.text('CST IN ' + left.toFixed(1) + 's', VW / 2, pad + 12,
        { size: 11, align: 'center', color: col, glow: left < 20 ? PAL.raRed : null });
    }

    // shards
    Gfx.text('SHARDS ' + game.shardsFound + '/' + game.shardsTotal, pad, VH - 16, { size: 8, color: PAL.amber });

    // boss bar
    if (boss && !boss.dead && boss.intro <= 0) {
      var bw = 300, bx = (VW - bw) / 2, by = VH - 40;
      Gfx.text(boss.name, VW / 2, by - 22, { size: 11, align: 'center', color: PAL.raRed, glow: PAL.raRed });
      Gfx.text(boss.sub || '', VW / 2, by - 10, { size: 7, align: 'center', color: PAL.steelLite });
      bar(bx, by, bw, 7, boss.hp / boss.maxhp, PAL.raRed, '#20080c');
      if (boss.phase === 1 && boss.guardMax) {
        bar(bx, by + 11, bw, 4, boss.guard / boss.guardMax, PAL.steelLite, '#111820');
      }
      if (boss.immune && boss.invulnLabel) {
        Gfx.text(boss.invulnLabel, VW / 2, by + 18, { size: 8, align: 'center', color: PAL.amber, glow: PAL.amber });
      } else if (boss.invulnLabel && boss.phase === 3) {
        Gfx.text(boss.invulnLabel, VW / 2, by + 18, { size: 8, align: 'center', color: PAL.gold });
      }
      if (boss.mimic) {
        Gfx.text('MIMIC ACTIVE — BLOCKING ' + (boss.blockType === 'melee' ? 'MELEE' : 'BLAST') +
                 ' — SWITCH ATTACK', VW / 2, by + 18, { size: 8, align: 'center', color: PAL.magenta });
      }
    }

    // toasts
    for (var i = 0; i < game.toasts.length; i++) {
      var ts = game.toasts[i];
      var a = C.clamp(ts.t / 0.6, 0, 1);
      Gfx.text(ts.msg, VW / 2, 66 + i * 14, { size: 10, align: 'center', color: ts.color, alpha: a, glow: ts.color });
    }

    if (player.invertT > 0) {
      Gfx.text('CONTROLS INVERTED', VW / 2, VH - 60, { size: 10, align: 'center', color: PAL.magenta, glow: PAL.magenta });
    }
    if (player.hartDetached) {
      Gfx.rectA(0, 0, VW, VH, PAL.hartDeep, 0.05);
      Gfx.text('RUNNING ON RESIDUAL CHARGE — [H] TO RECOVER YOUR H.A.R.T.',
        VW / 2, 112, { size: 8, align: 'center', color: PAL.amber });
    }
  }

  global.RA.hud = { Back: Back, scrim: scrim, drawTiles: drawTiles, drawHUD: drawHUD, bar: bar };
})(window);
