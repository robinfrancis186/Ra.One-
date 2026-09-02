/* =============================================================
   game/levels.js — tile maps, built with a tiny stamping DSL.
   Legend: '#' solid  '=' one-way platform  '^' hazard
           'S' start  'C' checkpoint  'B' boss gate
           'a' sentry 'b' drone 'c' akashi-mask 't' turret
           'h' H.A.R.T. shard  'R' repair  'd' DATA SHARD
   ============================================================= */
(function (global) {
  'use strict';
  var C = global.RA.core;

  function grid(w, h) {
    var g = [];
    for (var y = 0; y < h; y++) { g.push(new Array(w).fill('.')); }
    g.w = w; g.h = h;
    return g;
  }
  function put(g, x, y, ch) {
    if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = ch;
  }
  function row(g, x0, x1, y, ch) { for (var x = x0; x <= x1; x++) put(g, x, y, ch); }
  function box(g, x0, y0, x1, y1, ch) {
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) put(g, x, y, ch);
  }
  function toStrings(g) {
    var out = []; for (var y = 0; y < g.length; y++) out.push(g[y].join(''));
    return out;
  }

  /* ---------------------------------------------------------
     LEVEL 1 — BARRON INDUSTRIES, LONDON
     The launch floor. Teaches movement, melee, blast, dash.
     --------------------------------------------------------- */
  function level1() {
    var W = 152, H = 23, g = grid(W, H);
    var FLOOR = 19;

    box(g, 0, FLOOR, W - 1, H - 1, '#');       // main floor
    box(g, 0, 0, 0, H - 1, '#');               // left wall

    put(g, 3, FLOOR - 1, 'S');                 // spawn

    // --- server aisles: raised desks and catwalks
    row(g, 12, 17, 15, '=');
    row(g, 22, 27, 13, '=');
    row(g, 31, 36, 16, '=');
    put(g, 34, 12, 'd');                       // shard: reachable off the catwalk
    row(g, 33, 37, 10, '=');

    // --- first pit: the atrium
    box(g, 42, FLOOR, 47, H - 1, '.');
    row(g, 42, 47, H - 1, '^');
    row(g, 43, 46, 15, '=');

    box(g, 52, FLOOR - 3, 55, FLOOR - 1, '#'); // crate stack
    row(g, 58, 63, 14, '=');
    row(g, 66, 70, 11, '=');
    put(g, 68, 10, 'h');

    // --- conference stage where Jenny demos the transfer tech
    box(g, 74, FLOOR - 2, 88, FLOOR - 1, '#');
    row(g, 78, 84, 13, '=');
    put(g, 81, 12, 'R');

    // --- second pit
    box(g, 92, FLOOR, 98, H - 1, '.');
    row(g, 92, 98, H - 1, '^');
    row(g, 92, 94, 16, '=');
    row(g, 96, 98, 13, '=');
    put(g, 97, 12, 'd');

    row(g, 103, 108, 15, '=');
    put(g, 105, 14, 'd');
    box(g, 110, FLOOR - 4, 113, FLOOR - 1, '#');
    row(g, 116, 121, 12, '=');
    put(g, 119, 11, 'h');
    put(g, 117, 11, 'd');

    put(g, 100, FLOOR - 1, 'C');               // checkpoint

    // --- enemies
    ['a:16:18', 'a:26:18', 'b:24:8', 'a:35:15', 'b:45:9', 't:56:18',
     'a:60:13', 'b:64:8', 'c:80:16', 'a:85:16', 'b:90:9', 't:104:14',
     'a:106:18', 'c:112:14', 'b:118:8', 'a:120:18', 'c:124:18'
    ].forEach(function (s) { var p = s.split(':'); put(g, +p[1], +p[2], p[0]); });

    // --- pickups
    [[20, 17], [30, 12], [50, 18], [62, 13], [76, 18], [102, 14], [115, 18]]
      .forEach(function (p) { put(g, p[0], p[1], 'h'); });
    put(g, 88, 15, 'R');

    // --- boss arena
    put(g, 128, FLOOR - 1, 'B');
    box(g, 130, 0, 130, FLOOR - 1, '.');
    box(g, W - 1, 0, W - 1, H - 1, '#');
    row(g, 134, 138, 13, '=');
    row(g, 143, 147, 13, '=');

    return {
      id: 1,
      name: 'LEVEL 1',
      place: 'BARRON INDUSTRIES / LONDON',
      map: toStrings(g),
      music: 'lvl1',
      bg: 'london',
      boss: 'ra1',
      bossX: 144, arenaX: 129,
      hartMax: 100,
      stalkers: [[30, 12, 0.50], [76, 11, 0.44], [124, 12, 0.56]],
      incursions: [58, 108],
      story: 'l1'
    };
  }

  /* ---------------------------------------------------------
     LEVEL 2 — THE RUNAWAY LOCAL, HEADING FOR CST
     Auto-scrolling. Coach roofs with gaps; overhead gantries
     punish blind jumps. Fall between coaches and you are gone.
     --------------------------------------------------------- */
  function level2() {
    var W = 196, H = 23, g = grid(W, H);
    var ROOF = 16;

    // platform we start on, then the train
    box(g, 0, ROOF, 10, H - 1, '#');
    put(g, 3, ROOF - 1, 'S');
    box(g, 0, 0, 0, H - 1, '#');

    var x = 12, coach = 0;
    while (x < W - 30) {
      var len = 15 + (coach % 3) * 3;
      box(g, x, ROOF, x + len, H - 1, '#');            // coach body
      // roof furniture
      if (coach % 2 === 0) box(g, x + 4, ROOF - 2, x + 6, ROOF - 1, '#');
      if (coach % 3 === 2) row(g, x + 7, x + 11, ROOF - 5, '=');
      // overhead gantry — at exactly the height of a full jump.
      // on this stretch of track you stay on your feet.
      if (coach % 2 === 1) row(g, x + 13, x + 15, ROOF - 4, '^');
      // live third-rail arcing across the gap
      if (coach % 4 === 2) put(g, x + len, ROOF - 1, '^');

      // enemies riding the roof
      put(g, x + 3, ROOF - 1, coach % 3 === 0 ? 'a' : 'c');
      if (coach % 2 === 0) put(g, x + 11, ROOF - 9, 'b');
      if (coach % 3 === 2) put(g, x + 13, ROOF - 1, 't');

      // pickups & shards
      if (coach % 2 === 1) put(g, x + 7, ROOF - 1, 'h');
      if (coach === 1) put(g, x + 5, ROOF - 5, 'd');
      if (coach === 3) put(g, x + 10, ROOF - 5, 'd');
      if (coach === 7) put(g, x + 9, ROOF - 5, 'd');
      if (coach === 5) put(g, x + 6, ROOF - 1, 'R');
      if (coach === 4 || coach === 8) put(g, x + 2, ROOF - 1, 'C');

      x += len + 3 + (coach % 2);                       // the gap between coaches
      coach++;
    }

    // the engine: boss arena
    var ex = W - 28;
    box(g, ex, ROOF, W - 1, H - 1, '#');
    box(g, ex + 6, ROOF - 3, ex + 9, ROOF - 1, '#');
    put(g, ex - 1, ROOF - 1, 'B');
    row(g, ex + 12, ex + 16, ROOF - 5, '=');
    box(g, W - 1, 0, W - 1, H - 1, '#');

    return {
      id: 2,
      name: 'LEVEL 2',
      place: 'MUMBAI LOCAL / INBOUND TO CST',
      map: toStrings(g),
      music: 'lvl2',
      bg: 'mumbai',
      boss: 'ra2',
      bossX: W - 12, arenaX: ex,
      autoScroll: 1.15,
      timer: 100,
      hartMax: 130,
      stalkers: [[42, 11, 0.48], [98, 10, 0.42], [152, 11, 0.52]],
      incursions: [64, 128],
      story: 'l2'
    };
  }

  /* ---------------------------------------------------------
     LEVEL 3 — THE THIRD LEVEL
     One arena. The only level where a player can die.
     --------------------------------------------------------- */
  function level3() {
    var W = 46, H = 23, g = grid(W, H);
    var FLOOR = 19;
    box(g, 0, FLOOR, W - 1, H - 1, '#');
    box(g, 0, 0, 0, H - 1, '#');
    box(g, W - 1, 0, W - 1, H - 1, '#');
    put(g, 4, FLOOR - 1, 'S');

    row(g, 5, 10, 15, '=');
    row(g, 18, 27, 12, '=');
    row(g, 35, 40, 15, '=');
    row(g, 12, 16, 9, '=');
    row(g, 29, 33, 9, '=');

    put(g, 22, FLOOR - 1, 'B');

    return {
      id: 3,
      name: 'LEVEL 3',
      place: 'THE THIRD LEVEL',
      map: toStrings(g),
      music: 'lvl3',
      bg: 'grid',
      boss: 'ra3',
      bossX: 34, arenaX: 1,
      hartMax: 160,
      story: 'l3'
    };
  }

  global.RA.LEVELS = [level1(), level2(), level3()];
})(window);
