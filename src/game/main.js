/* =============================================================
   game/main.js — state machine, rules glue, menus, the loop
   ============================================================= */
(function (global) {
  'use strict';
  var RA = global.RA, C = RA.core, Gfx = C.Gfx, PAL = C.PAL, T = C.TILE;
  var Input = RA.Input, Audio = RA.Audio, ent = RA.ent, hud = RA.hud;
  var VW = C.VIEW_W, VH = C.VIEW_H;
  var STEP = 1 / 60, SAVE_KEY = 'raone.luciferprotocol.v1';

  var Game = {
    state: 'boot', prev: null, t: 0, stateT: 0,
    score: 0, lives: 3, level: 0, combo: 1, comboT: 0,
    world: null, player: null, boss: null,
    toasts: [], timeLeft: 0, canDetach: false,
    difficulty: 0,                       // 0 NORMAL, 1 LUCIFER
    unlocked: {}, shardsFound: 0, shardsTotal: 0,
    hi: 0, playerName: 'LUCIFER',
    menuIdx: 0, codexCat: 0, codexIdx: 0, codexScroll: 0,
    storyKey: 'intro', storyChars: 0, nextAfterStory: null,
    respawnT: 0, clearT: 0, contT: 0, hitStop: 0,
    bossActive: false, arenaLeft: 0, missTold: false,

    /* ---------- save ---------- */
    load: function () {
      try {
        var s = JSON.parse(global.localStorage.getItem(SAVE_KEY) || '{}');
        this.hi = s.hi || 0;
        this.unlocked = s.unlocked || {};
        this.difficulty = s.difficulty || 0;
        this.bestLevel = s.bestLevel || 0;
      } catch (e) { /* private mode, no memory of past runs. fine. */ }
      this.countShards();
    },
    save: function () {
      try {
        global.localStorage.setItem(SAVE_KEY, JSON.stringify({
          hi: this.hi, unlocked: this.unlocked,
          difficulty: this.difficulty, bestLevel: this.bestLevel || 0
        }));
      } catch (e) {}
    },
    countShards: function () {
      var n = 0, f = 0;
      for (var i = 0; i < RA.CODEX.length; i++) {
        if (RA.CODEX[i].shard) { n++; if (this.unlocked[RA.CODEX[i].title]) f++; }
      }
      this.shardsTotal = n; this.shardsFound = f;
    },
    unlockShardByTitle: function (title) {
      if (this.unlocked[title]) return false;
      this.unlocked[title] = 1; this.countShards(); this.save();
      Audio.sfx('codex');
      this.toast('CODEX UNLOCKED — ' + title, PAL.gold);
      return true;
    },
    unlockNextShard: function () {
      for (var i = 0; i < RA.CODEX.length; i++) {
        var e = RA.CODEX[i];
        if (e.shard && !this.unlocked[e.title]) return this.unlockShardByTitle(e.title);
      }
      this.toast('ALL DATA SHARDS RECOVERED', PAL.gold);
      return false;
    },

    /* ---------- helpers ---------- */
    toast: function (msg, color) {
      this.toasts.unshift({ msg: msg, color: color || PAL.white, t: 2.4 });
      if (this.toasts.length > 3) this.toasts.pop();
    },
    addScore: function (n) {
      this.score += Math.round(n * this.combo);
      if (this.score > this.hi) this.hi = this.score;
    },
    bumpCombo: function () {
      this.combo = Math.min(9, this.combo + 1); this.comboT = 3;
    },
    setState: function (s) { this.prev = this.state; this.state = s; this.stateT = 0; },

    /* ---------- run control ---------- */
    newRun: function () {
      this.score = 0; this.lives = 3; this.level = 0; this.combo = 1;
      this.startStory(RA.LEVELS[0].story, function () { Game.startLevel(0); });
    },
    startStory: function (key, next) {
      this.storyKey = key; this.storyChars = 0; this.nextAfterStory = next;
      this.setState('story');
      Audio.play('title');
    },
    startLevel: function (i) {
      this.level = i;
      var lv = RA.LEVELS[i];
      this.world = new ent.World(lv, this);
      this.player = new ent.Player(this.world.spawnX, this.world.spawnY, this);
      this.player.hartMax = lv.hartMax; this.player.hart = lv.hartMax;
      if (this.difficulty === 1) { this.player.maxhp = 70; this.player.hp = 70; }
      this.boss = null; this.bossActive = false;
      this.canDetach = (lv.id === 3);
      this.timeLeft = lv.timer || 0;
      this.checkpoint = { x: this.world.spawnX, y: this.world.spawnY };
      this.world.cam.follow(this.player, true);
      this.arenaLeft = (lv.arenaX || 0) * T;
      this.respawnT = 0; this.clearT = 0; this.missTold = false;
      this.toasts.length = 0;
      this.setState('play');
      Audio.play(lv.music);
      this.bestLevel = Math.max(this.bestLevel || 0, i); this.save();
    },
    respawn: function () {
      var p = this.player, w = this.world;
      p.dead = false; p.deathT = 0;
      p.hp = p.maxhp; p.hart = p.hartMax;
      p.hartDetached = false; p.hartObj = null;
      p.invuln = 2.0; p.vx = p.vy = 0; p.invertT = 0;
      p.x = this.checkpoint.x; p.y = this.checkpoint.y;
      this.combo = 1;
      if (this.world.level.timer) this.timeLeft = Math.max(this.timeLeft, 45);
      if (this.bossActive && this.boss && !this.boss.dead) {
        // he does not get to keep his progress either
        this.boss.hp = Math.min(this.boss.maxhp, this.boss.hp + this.boss.maxhp * 0.15);
      }
      w.cam.follow(p, true);
      Audio.play(this.world.level.music);
    },

    /* ---------- boot ---------- */
    init: function (canvas) {
      Gfx.init(canvas);
      Input.init(canvas);
      this.load();
      var self = this;
      global.addEventListener('pointerdown', function () { Audio.resume(); });
      global.addEventListener('keydown', function () { Audio.resume(); }, { once: true });
      var last = performance.now(), acc = 0;
      function frame(now) {
        var dt = Math.min(0.1, (now - last) / 1000); last = now;
        acc += dt;
        var guard = 0;
        while (acc >= STEP && guard++ < 5) { self.update(STEP); acc -= STEP; }
        self.draw();
        Input.endFrame();
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    },

    /* ---------- update ---------- */
    update: function (dt) {
      this.t += dt; this.stateT += dt;
      Gfx.updateFx(dt);
      for (var i = this.toasts.length - 1; i >= 0; i--) {
        this.toasts[i].t -= dt;
        if (this.toasts[i].t <= 0) this.toasts.splice(i, 1);
      }
      if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 1; }
      if (Input.pressed('mute')) { Audio.toggleMute(); this.toast(Audio.muted ? 'SOUND OFF' : 'SOUND ON', PAL.steelLite); }

      switch (this.state) {
        case 'boot':     this.upBoot(dt); break;
        case 'title':    this.upTitle(dt); break;
        case 'codex':    this.upCodex(dt); break;
        case 'controls': if (Input.anyStart() || Input.pressed('pause')) { Audio.sfx('select'); this.setState('title'); } break;
        case 'story':    this.upStory(dt); break;
        case 'play':     this.upPlay(dt); break;
        case 'pause':    this.upPause(dt); break;
        case 'clear':    this.upClear(dt); break;
        case 'gameover': this.upGameOver(dt); break;
        case 'ending':   this.upEnding(dt); break;
        case 'credits':  if (this.stateT > 1 && Input.anyStart()) { Audio.sfx('select'); this.setState('title'); Audio.play('title'); } break;
      }
    },

    upBoot: function (dt) {
      if (Input.anyPressed || Input.anyStart()) {
        Audio.resume(); Audio.sfx('select'); Audio.play('title');
        this.setState('title');
      }
    },

    upTitle: function (dt) {
      var items = 5;
      if (Input.pressed('up')) { this.menuIdx = (this.menuIdx + items - 1) % items; Audio.sfx('menu'); }
      if (Input.pressed('down')) { this.menuIdx = (this.menuIdx + 1) % items; Audio.sfx('menu'); }
      if (Input.pressed('left') || Input.pressed('right')) {
        if (this.menuIdx === 2) { this.difficulty ^= 1; Audio.sfx('menu'); this.save(); }
      }
      if (Input.anyStart()) {
        Audio.sfx('select');
        switch (this.menuIdx) {
          case 0: this.newRun(); break;
          case 1: this.codexCat = 0; this.codexIdx = 0; this.setState('codex'); break;
          case 2: this.difficulty ^= 1; this.save(); break;
          case 3: this.setState('controls'); break;
          case 4: Audio.toggleMute(); break;
        }
      }
      if (Input.pressed('codex')) { Audio.sfx('select'); this.setState('codex'); }
    },

    codexCats: function () {
      var cats = [], seen = {};
      for (var i = 0; i < RA.CODEX.length; i++) {
        if (!seen[RA.CODEX[i].cat]) { seen[RA.CODEX[i].cat] = 1; cats.push(RA.CODEX[i].cat); }
      }
      return cats;
    },
    codexList: function () {
      var cat = this.codexCats()[this.codexCat], out = [];
      for (var i = 0; i < RA.CODEX.length; i++) if (RA.CODEX[i].cat === cat) out.push(RA.CODEX[i]);
      return out;
    },
    upCodex: function (dt) {
      var cats = this.codexCats(), list = this.codexList();
      if (Input.pressed('left')) { this.codexCat = (this.codexCat + cats.length - 1) % cats.length; this.codexIdx = 0; Audio.sfx('menu'); }
      if (Input.pressed('right')) { this.codexCat = (this.codexCat + 1) % cats.length; this.codexIdx = 0; Audio.sfx('menu'); }
      if (Input.pressed('up')) { this.codexIdx = (this.codexIdx + list.length - 1) % list.length; Audio.sfx('menu'); }
      if (Input.pressed('down')) { this.codexIdx = (this.codexIdx + 1) % list.length; Audio.sfx('menu'); }
      if (Input.pressed('pause') || Input.pressed('codex')) { Audio.sfx('select'); this.setState('title'); }
    },

    upStory: function (dt) {
      var s = RA.STORY[this.storyKey];
      var total = s.lines.join('\n').length;
      this.storyChars += dt * 130;
      if (Input.anyStart()) {
        if (this.storyChars < total) { this.storyChars = total; Audio.sfx('menu'); }
        else {
          Audio.sfx('select');
          var n = this.nextAfterStory; this.nextAfterStory = null;
          if (n) n();
        }
      }
    },

    upPause: function (dt) {
      if (Input.pressed('pause') || Input.pressed('start')) { Audio.sfx('select'); this.setState('play'); }
      if (Input.pressed('codex')) { Audio.sfx('select'); this.setState('codex'); }
    },

    upClear: function (dt) {
      this.clearT += dt;
      if (this.clearT > 1.6 && Input.anyStart()) {
        Audio.sfx('select');
        var nxt = this.level + 1;
        if (nxt < RA.LEVELS.length) {
          var self = this;
          this.startStory(RA.LEVELS[nxt].story, function () { self.startLevel(nxt); });
        } else {
          this.startStory('win', function () { Game.setState('ending'); Audio.play('ending'); });
        }
      }
    },

    upGameOver: function (dt) {
      this.contT -= dt;
      if (Input.anyStart() && this.contT > 0) {
        Audio.sfx('levelup');
        this.lives = 3;
        this.startLevel(this.level);
      } else if (this.contT <= 0 && (Input.anyStart() || this.stateT > 14)) {
        this.save();
        this.setState('title'); Audio.play('title');
      }
    },

    upEnding: function (dt) {
      if (this.stateT > 2.5 && Input.anyStart()) {
        Audio.sfx('select');
        this.startStory('epilogue', function () { Game.setState('credits'); });
      }
    },

    /* =========================================================
       PLAY
       ========================================================= */
    upPlay: function (dt) {
      var w = this.world, p = this.player, lv = w.level;
      if (Input.pressed('pause')) { Audio.sfx('select'); this.setState('pause'); return; }
      if (this.hitStop > 0) { this.hitStop -= dt; return; }
      w.time += dt;

      /* --- death / respawn --- */
      if (p.dead) {
        this.respawnT += dt;
        p.update(dt, w, Input, false);
        w.parts.update(dt);
        w.cam.follow(p, false);
        if (this.respawnT > 2.2) {
          this.respawnT = 0;
          this.lives--;
          if (this.lives <= 0) {
            this.contT = 9.99;
            this.setState('gameover');
            Audio.stop();
            if (this.score > this.hi) { this.hi = this.score; }
            this.save();
          } else this.respawn();
        }
        return;
      }

      /* --- the runaway local --- */
      if (lv.timer) {
        this.timeLeft -= dt;
        if (this.timeLeft <= 0) {
          this.timeLeft = 0;
          this.toast('THE TRAIN REACHED CST', PAL.raRed);
          p.hurt(9999, w, 0);
          return;
        }
      }

      /* --- boss gate --- */
      if (!this.bossActive && p.x > w.bossGateX && lv.boss) {
        this.bossActive = true;
        this.boss = RA.bosses.make(lv.boss, w.bossSpawnX, 40, lv, this);
        // drop him onto the arena floor
        var by = 0;
        while (by < w.h && !w.isSolid(Math.floor(w.bossSpawnX / T), by)) by++;
        this.boss.y = by * T - this.boss.h - 1;
        Audio.play('boss');
        Audio.sfx('bossroar');
        Gfx.flash(PAL.raRed, 0.5, 0.5);
        this.toast('RA.ONE HAS ENTERED THE LEVEL', PAL.raRed);
      }

      /* --- player --- */
      p.update(dt, w, Input, true);
      if (p.hartObj) p.updateHart(dt, w);

      /* --- the train sets a floor on your pace, not a ceiling --- */
      if (lv.autoScroll && !this.bossActive) {
        var follow = C.clamp(p.cx() - VW / 2, 0, Math.max(0, w.pxW - VW));
        w.cam.x = Math.min(Math.max(0, w.pxW - VW),
                           Math.max(w.cam.x + lv.autoScroll * (dt / STEP), follow));
        w.cam.y = C.lerp(w.cam.y, C.clamp(p.y - VH / 2 + 20, 0, Math.max(0, w.pxH - VH)), 0.06);
        if (p.x < w.cam.x + 6) {
          p.x = w.cam.x + 6;
          if (Math.floor(this.t * 3) % 2 === 0) p.hurt(6, w, 1);
        }
      } else {
        w.cam.follow(p, false);
      }

      /* --- arena lock --- */
      if (this.bossActive) {
        var right = Math.min(w.pxW, this.arenaLeft + Math.max(VW, 40 * T));
        w.cam.x = C.clamp(w.cam.x, this.arenaLeft, Math.max(this.arenaLeft, right - VW));
        if (p.x < this.arenaLeft + 4) { p.x = this.arenaLeft + 4; p.vx = Math.max(0, p.vx); }
      }

      /* --- actors --- */
      var i, a;
      for (i = w.actors.length - 1; i >= 0; i--) {
        a = w.actors[i];
        if (Math.abs(a.cx() - p.cx()) > VW * 1.4) continue;   // sleep off-screen
        a.update(dt, w, p);
        if (a.remove) { w.actors.splice(i, 1); this.bumpCombo(); continue; }
        if (C.aabb(a, p) && !p.dead) {
          var dmg = (a.type === 'drone' && a.diveT > 0) ? 10 : 7;
          p.hurt(dmg * (this.difficulty ? 1.4 : 1), w, a.cx() < p.cx() ? 1 : -1);
        }
      }

      /* --- boss --- */
      var b = this.boss;
      if (b && !b.dead) {
        b.update(dt, w, p);
        if (b.phase !== 3 && b.intro <= 0 && C.aabb(b, p) && !p.dead) {
          p.hurt(b.contact * (this.difficulty ? 1.4 : 1), w, b.cx() < p.cx() ? 1 : -1);
        }
        if (b.phase === 3) {
          var cbs = b.cloneBoxes();
          for (i = 0; i < cbs.length; i++) {
            if (C.aabb(cbs[i], p) && !p.dead) p.hurt(8, w, cbs[i].x < p.cx() ? 1 : -1);
          }
        }
      } else if (b && b.dead) {
        b.deadT = (b.deadT || 0) + dt;
        if (b.deadT > 2.4 && this.state === 'play') {
          this.addScore(2000 + this.lives * 500 + Math.round(p.hp) * 10);
          this.clearT = 0;
          this.setState('clear');
          Audio.play('title');
          Audio.sfx('levelup');
          this.save();
          return;
        }
      }

      /* --- melee hitbox --- */
      if (p.hitBox) {
        var hb = p.hitBox;
        for (i = 0; i < w.actors.length; i++) {
          a = w.actors[i];
          if (hb.hit.indexOf(a) >= 0) continue;
          if (C.aabb(hb, a)) {
            hb.hit.push(a);
            a.damage(hb.dmg * (this.difficulty ? 0.85 : 1), w, p.face);
            this.hitStop = 0.045; Gfx.shake(1.5, 0.1);
            w.parts.burst(a.cx(), a.cy(), 8, { color: PAL.white, glow: true, smax: 2.5 });
          }
        }
        if (b && !b.dead && b.intro <= 0) {
          if (b.phase === 3) {
            var boxes = b.cloneBoxes();
            for (i = 0; i < boxes.length; i++) {
              if (hb.hit.indexOf('c' + boxes[i].idx) >= 0) continue;
              if (C.aabb(hb, boxes[i])) {
                hb.hit.push('c' + boxes[i].idx);
                b.hitClone(boxes[i].idx, hb.dmg, w, p);
                this.hitStop = 0.06;
              }
            }
          } else if (hb.hit.indexOf(b) < 0 && C.aabb(hb, b)) {
            hb.hit.push(b);
            b.damage(hb.dmg, w, p.face, 'melee');
            this.hitStop = 0.06; Gfx.shake(2, 0.12);
          }
        }
      }

      /* --- shots --- */
      for (i = w.shots.length - 1; i >= 0; i--) {
        var s = w.shots[i];
        s.update(dt, w, p);
        var sBox = { x: s.x, y: s.y, w: s.w, h: s.h };

        if (s.owner === 'player') {
          for (var j = 0; j < w.actors.length; j++) {
            a = w.actors[j];
            if (s.hitList.indexOf(a) >= 0) continue;
            if (C.aabb(sBox, a)) {
              s.hitList.push(a);
              a.damage(s.dmg, w, s.vx > 0 ? 1 : -1);
              w.parts.burst(s.x, s.y, 8, { color: s.color, glow: true });
              if (!s.pierce) { s.remove = true; break; }
            }
          }
          if (b && !b.dead && b.intro <= 0 && !s.remove) {
            if (b.phase === 3) {
              var bx2 = b.cloneBoxes();
              for (j = 0; j < bx2.length; j++) {
                if (s.hitList.indexOf('c' + bx2[j].idx) >= 0) continue;
                if (C.aabb(sBox, bx2[j])) {
                  s.hitList.push('c' + bx2[j].idx);
                  b.hitClone(bx2[j].idx, s.dmg, w, p);
                  if (!s.pierce) s.remove = true;
                  break;
                }
              }
            } else if (s.hitList.indexOf(b) < 0 && C.aabb(sBox, b)) {
              s.hitList.push(b);
              b.damage(s.dmg, w, s.vx > 0 ? 1 : -1, 'blast');
              w.parts.burst(s.x, s.y, 10, { color: s.color, glow: true });
              if (!s.pierce) s.remove = true;
            }
          }
        } else if (!p.dead && C.aabb(sBox, p)) {
          /* ===== THE RULE OF THE THIRD LEVEL ===== */
          if (s.antiHart) {
            s.remove = true;
            if (p.hartDetached) {
              // the one bullet, spent on a body it cannot kill
              Gfx.flash('#ffffff', 0.8, 0.6); Gfx.shake(6, 0.7);
              this.toast('THE BULLET PASSED THROUGH. IT IS SPENT.', PAL.gold);
              this.addScore(3000);
              if (b && b.enterPhase3) b.enterPhase3(w);
            } else {
              this.toast('IT ONLY KILLS A H.A.R.T. THAT IS ATTACHED', PAL.raRed);
              p.hurt(9999, w, s.vx > 0 ? 1 : -1);
            }
          } else if (p.invuln <= 0) {
            s.remove = true;
            p.hurt(s.dmg * (this.difficulty ? 1.4 : 1), w, s.vx > 0 ? 1 : -1);
          }
        }
        if (s.remove) {
          if (s.antiHart && s.life <= 0 && b && b.phase === 2 && !this.missTold) {
            this.missTold = true;
            this.toast('HE RECALLS THE ROUND. HE HAS ALL NIGHT.', PAL.steelLite);
          }
          w.shots.splice(i, 1);
        }
      }

      /* --- pickups --- */
      for (i = w.pickups.length - 1; i >= 0; i--) {
        var pk = w.pickups[i];
        pk.update(dt);
        if (C.aabb(pk, p)) {
          if (pk.kind === 'hart') {
            p.hart = Math.min(p.hartMax, p.hart + 30); this.addScore(50); Audio.sfx('pickup');
          } else if (pk.kind === 'repair') {
            p.hp = Math.min(p.maxhp, p.hp + 28); this.addScore(80); Audio.sfx('pickup');
          } else {
            this.addScore(500); this.unlockNextShard();
          }
          w.parts.burst(pk.x + 6, pk.y + 6, 12, { color: PAL.gold, glow: true });
          w.pickups.splice(i, 1);
        }
      }

      /* --- checkpoints --- */
      for (i = 0; i < w.checkpoints.length; i++) {
        var cp = w.checkpoints[i];
        if (!cp.taken && Math.abs(p.cx() - cp.x) < 20 && Math.abs(p.cy() - cp.y) < 40) {
          cp.taken = true;
          this.checkpoint = { x: cp.x, y: cp.y - 8 };
          this.toast('CHECKPOINT', PAL.hart);
          Audio.sfx('pickup');
        }
      }

      w.parts.update(dt);
    },

    /* =========================================================
       DRAW
       ========================================================= */
    draw: function () {
      Gfx.begin();
      switch (this.state) {
        case 'boot': this.drawBoot(); break;
        case 'title': this.drawTitle(); break;
        case 'codex': this.drawCodex(); break;
        case 'controls': this.drawControls(); break;
        case 'story': this.drawStory(); break;
        case 'play': this.drawPlay(); break;
        case 'pause': this.drawPlay(); this.drawPause(); break;
        case 'clear': this.drawPlay(); this.drawClear(); break;
        case 'gameover': this.drawPlay(); this.drawGameOver(); break;
        case 'ending': this.drawEnding(); break;
        case 'credits': this.drawCredits(); break;
      }
      Gfx.end();
    },

    drawPlay: function () {
      var w = this.world, p = this.player, cam = w.cam;
      hud.Back[w.level.bg](cam, this.t);
      hud.scrim(w.level.bg);
      hud.drawTiles(w, cam, this.t);

      for (var i = 0; i < w.pickups.length; i++) w.pickups[i].draw(cam);
      for (i = 0; i < w.checkpoints.length; i++) {
        var cp = w.checkpoints[i];
        var cxp = Math.round(cp.x - cam.x), cyp = Math.round(cp.y - cam.y);
        Gfx.rectA(cxp - 1, cyp - 22, 2, 24, cp.taken ? PAL.hart : PAL.steel, 0.9);
        if (cp.taken) Gfx.glow(cxp, cyp - 20, 10, PAL.hart, 0.4);
      }
      for (i = 0; i < w.actors.length; i++) {
        var a = w.actors[i];
        if (Math.abs(a.cx() - cam.x - VW / 2) < VW) a.draw(cam);
      }
      if (this.boss && !this.boss.dead) this.boss.draw(cam, p);
      p.drawHart(cam, w);
      p.draw(cam);
      for (i = 0; i < w.shots.length; i++) w.shots[i].draw(cam);
      w.parts.draw(cam);

      // level 3 arena veil
      if (w.level.bg === 'grid') Gfx.rectA(0, 0, VW, VH, '#0a1a2e', 0.10);

      hud.drawHUD(this, w, p, this.boss);

      if (this.boss && this.boss.intro > 0) {
        var a2 = C.clamp(this.boss.intro, 0, 1);
        Gfx.text(this.boss.name, VW / 2, VH / 2 - 30,
          { size: 30, align: 'center', color: PAL.raRed, glow: PAL.raRed, alpha: a2 });
        Gfx.text(this.boss.sub, VW / 2, VH / 2 + 6,
          { size: 10, align: 'center', color: PAL.bone, alpha: a2 });
      }
    },

    /* ---------- screens ---------- */
    logo: function (cx, cy, big) {
      var s = big ? 58 : 34;
      var jitter = (Math.random() < 0.06) ? C.rand(-3, 3) : 0;
      Gfx.text('RA.ONE', cx + jitter, cy, { size: s, align: 'center', color: PAL.raRed, glow: PAL.raRed });
      Gfx.text('RA.ONE', cx - jitter * 0.6, cy, { size: s, align: 'center', color: PAL.white, alpha: 0.85, shadow: false });
      Gfx.text('L U C I F E R   P R O T O C O L', cx, cy + s + 4,
        { size: big ? 12 : 9, align: 'center', color: PAL.hart, glow: PAL.hart });
    },

    drawBoot: function () {
      Gfx.rect(0, 0, VW, VH, '#020307');
      var lines = [
        'BARRON INDUSTRIES / LONDON',
        'H.A.R.T. RUNTIME v1.0 ................ OK',
        'RANDOM ACCESS CORE ................... OK',
        'MOTION CAPTURE (A. AKASHI) ........... OK',
        'AVATAR: G.ONE ........................ OK',
        'AVATAR: RA.ONE ....................... WARNING',
        '  > antagonist exceeds protagonist',
        '  > this is intentional',
        'PLAYER PROFILE ....................... LUCIFER'
      ];
      var n = Math.min(lines.length, Math.floor(this.stateT * 3.2));
      for (var i = 0; i < n; i++) {
        Gfx.text(lines[i], 40, 60 + i * 16,
          { size: 10, color: i === 5 ? PAL.amber : (i === 6 || i === 7 ? PAL.steelLite : PAL.green) });
      }
      if (this.stateT > 3 && Math.floor(this.t * 2) % 2 === 0) {
        Gfx.text('PRESS ANY KEY', VW / 2, VH - 60, { size: 12, align: 'center', color: PAL.white });
      }
      Gfx.text('AN UNOFFICIAL FAN TRIBUTE TO RA.ONE (2011)', VW / 2, VH - 24,
        { size: 7, align: 'center', color: PAL.steel });
    },

    drawTitle: function () {
      hud.Back.grid({ x: this.t * 30, y: 0 }, this.t);
      Gfx.rectA(0, 0, VW, VH, '#02030a', 0.45);
      this.logo(VW / 2, 42, true);

      var items = [
        'START GAME',
        'CODEX  (' + this.shardsFound + '/' + this.shardsTotal + ' SHARDS)',
        'DIFFICULTY:  ' + (this.difficulty ? 'LUCIFER' : 'NORMAL'),
        'CONTROLS',
        'SOUND:  ' + (Audio.muted ? 'OFF' : 'ON')
      ];
      for (var i = 0; i < items.length; i++) {
        var sel = i === this.menuIdx;
        var y = 168 + i * 22;
        if (sel) {
          Gfx.rectA(VW / 2 - 150, y - 4, 300, 18, PAL.hart, 0.12);
          Gfx.text('>', VW / 2 - 146, y, { size: 12, color: PAL.hart });
        }
        Gfx.text(items[i], VW / 2, y,
          { size: 12, align: 'center', color: sel ? PAL.white : PAL.steelLite, glow: sel ? PAL.hart : null });
      }
      Gfx.text('HI-SCORE ' + String(this.hi).padStart(7, '0'), VW / 2, VH - 44,
        { size: 9, align: 'center', color: PAL.gold });
      Gfx.text('UNOFFICIAL FAN TRIBUTE — NO FILM ASSETS USED — ALL ART DRAWN IN CODE',
        VW / 2, VH - 22, { size: 7, align: 'center', color: PAL.steel });
    },

    drawControls: function () {
      Gfx.rect(0, 0, VW, VH, '#04060e');
      Gfx.text('CONTROLS', VW / 2, 26, { size: 20, align: 'center', color: PAL.hart, glow: PAL.hart });
      var rows = [
        ['MOVE', 'ARROWS  /  A D'],
        ['JUMP  (double)', 'SPACE  /  Z'],
        ['MELEE  (3-hit combo)', 'X  /  J'],
        ['H.A.R.T. BLAST', 'C  /  K   (hold = charged beam)'],
        ['DASH', 'SHIFT  /  L'],
        ['DETACH H.A.R.T.', 'H     (level 3 only)'],
        ['DROP THROUGH', 'DOWN + JUMP'],
        ['PAUSE', 'ESC  /  P'],
        ['CODEX', 'TAB'],
        ['MUTE', 'M']
      ];
      for (var i = 0; i < rows.length; i++) {
        Gfx.text(rows[i][0], 90, 66 + i * 22, { size: 10, color: PAL.bone });
        Gfx.text(rows[i][1], VW - 90, 66 + i * 22, { size: 10, align: 'right', color: PAL.hart });
      }
      Gfx.text('PRESS ENTER TO GO BACK', VW / 2, VH - 26, { size: 9, align: 'center', color: PAL.steelLite });
    },

    drawCodex: function () {
      Gfx.rect(0, 0, VW, VH, '#04060e');
      hud.Back.grid({ x: this.t * 12, y: 0 }, this.t * 0.4);
      Gfx.rectA(0, 0, VW, VH, '#02030a', 0.72);

      var cats = this.codexCats(), list = this.codexList();
      Gfx.text('CODEX', 20, 16, { size: 18, color: PAL.hart, glow: PAL.hart });
      Gfx.text('DATA SHARDS ' + this.shardsFound + '/' + this.shardsTotal, VW - 20, 20,
        { size: 9, align: 'right', color: PAL.gold });

      var cx = 20;
      for (var i = 0; i < cats.length; i++) {
        var on = i === this.codexCat;
        var wdt = Gfx.textWidth(cats[i], 9) + 16;
        if (on) Gfx.rectA(cx - 6, 40, wdt, 15, PAL.hart, 0.2);
        Gfx.text(cats[i], cx, 43, { size: 9, color: on ? PAL.white : PAL.steel });
        cx += wdt + 6;
      }
      Gfx.rectA(20, 60, VW - 40, 1, PAL.steel, 0.6);

      // list
      var top = 72;
      for (i = 0; i < list.length; i++) {
        var e = list[i], sel = i === this.codexIdx;
        var locked = e.shard && !this.unlocked[e.title];
        var y = top + i * 15;
        if (sel) Gfx.rectA(16, y - 3, 210, 14, PAL.hart, 0.14);
        Gfx.text(locked ? '??? LOCKED SHARD' : e.title, 22, y,
          { size: 8, color: locked ? PAL.steel : (sel ? PAL.white : PAL.bone) });
      }

      // detail
      var sel2 = list[this.codexIdx];
      Gfx.rectA(236, 68, VW - 256, VH - 100, '#060b16', 0.9);
      Gfx.rectA(236, 68, VW - 256, 1, PAL.hart, 0.5);
      if (sel2) {
        var lockd = sel2.shard && !this.unlocked[sel2.title];
        if (lockd) {
          Gfx.text('LOCKED', 250, 82, { size: 12, color: PAL.amber });
          var lw = Gfx.wrap('This entry is sealed behind a DATA SHARD. Find it in a level ' +
                            'and it opens. The film is in here — you just have to go and get it.', 9, VW - 290);
          for (i = 0; i < lw.length; i++) Gfx.text(lw[i], 250, 106 + i * 14, { size: 9, color: PAL.steelLite });
        } else {
          Gfx.text(sel2.title, 250, 80, { size: 11, color: PAL.hart, glow: PAL.hart });
          var lines = Gfx.wrap(sel2.body, 9, VW - 292);
          for (i = 0; i < lines.length; i++) {
            Gfx.text(lines[i], 250, 104 + i * 14, { size: 9, color: PAL.bone });
          }
        }
      }
      Gfx.text('ARROWS NAVIGATE   ESC BACK', VW / 2, VH - 20, { size: 8, align: 'center', color: PAL.steel });
    },

    drawStory: function () {
      Gfx.rect(0, 0, VW, VH, '#03040a');
      var s = RA.STORY[this.storyKey];
      // faint scan of the level colour behind the words
      Gfx.rectA(0, 0, VW, VH, PAL.deep, 0.5);
      Gfx.text(s.title, VW / 2, 44, { size: 16, align: 'center', color: PAL.raRed, glow: PAL.raRed });
      Gfx.rectA(VW / 2 - 150, 66, 300, 1, PAL.steel, 0.7);

      var shown = Math.floor(this.storyChars), used = 0;
      for (var i = 0; i < s.lines.length; i++) {
        var ln = s.lines[i];
        if (used > shown) break;
        var vis = ln.substring(0, Math.max(0, shown - used));
        Gfx.text(vis, VW / 2, 92 + i * 18, { size: 11, align: 'center', color: PAL.bone });
        used += ln.length + 1;
      }
      if (Math.floor(this.t * 2) % 2 === 0) {
        Gfx.text('PRESS ENTER', VW / 2, VH - 30, { size: 10, align: 'center', color: PAL.hart });
      }
    },

    drawPause: function () {
      Gfx.rectA(0, 0, VW, VH, '#000', 0.72);
      Gfx.text('PAUSED', VW / 2, 100, { size: 28, align: 'center', color: PAL.hart, glow: PAL.hart });
      Gfx.text('ENTER — RESUME     TAB — CODEX     M — SOUND', VW / 2, 150,
        { size: 10, align: 'center', color: PAL.bone });
      Gfx.text('SCORE ' + this.score + '     SHARDS ' + this.shardsFound + '/' + this.shardsTotal,
        VW / 2, 176, { size: 9, align: 'center', color: PAL.gold });
    },

    drawClear: function () {
      Gfx.rectA(0, 0, VW, VH, '#000', 0.75);
      var lv = RA.LEVELS[this.level];
      Gfx.text(lv.name + ' CLEAR', VW / 2, 96, { size: 26, align: 'center', color: PAL.gold, glow: PAL.gold });
      Gfx.text(lv.place, VW / 2, 130, { size: 10, align: 'center', color: PAL.bone });
      Gfx.text('SCORE  ' + String(this.score).padStart(7, '0'), VW / 2, 164,
        { size: 12, align: 'center', color: PAL.white });
      Gfx.text('SHARDS ' + this.shardsFound + '/' + this.shardsTotal, VW / 2, 186,
        { size: 10, align: 'center', color: PAL.amber });
      if (this.clearT > 1.6 && Math.floor(this.t * 2) % 2 === 0) {
        Gfx.text('PRESS ENTER', VW / 2, 228, { size: 11, align: 'center', color: PAL.hart });
      }
    },

    drawGameOver: function () {
      Gfx.rectA(0, 0, VW, VH, '#12010a', 0.85);
      Gfx.text('GAME OVER', VW / 2, 86, { size: 34, align: 'center', color: PAL.raRed, glow: PAL.raRed });
      Gfx.text('RA.ONE DOES NOT ACCEPT AN UNFINISHED TURN', VW / 2, 130,
        { size: 9, align: 'center', color: PAL.bone });
      if (this.contT > 0) {
        Gfx.text('CONTINUE?', VW / 2, 168, { size: 18, align: 'center', color: PAL.white });
        Gfx.text(Math.max(0, Math.ceil(this.contT)).toString(), VW / 2, 196,
          { size: 26, align: 'center', color: PAL.amber, glow: PAL.amber });
        Gfx.text('PRESS ENTER', VW / 2, 232, { size: 10, align: 'center', color: PAL.hart });
      } else {
        Gfx.text('SCORE ' + String(this.score).padStart(7, '0'), VW / 2, 180,
          { size: 12, align: 'center', color: PAL.gold });
      }
    },

    drawEnding: function () {
      Gfx.rect(0, 0, VW, VH, '#03040a');
      var t = this.stateT;
      // the H.A.R.T., left behind on an empty floor
      var pulse = 0.6 + 0.4 * Math.sin(t * 2.2);
      Gfx.rectA(0, VH - 90, VW, 90, '#080d18', 1);
      Gfx.rectA(0, VH - 90, VW, 1, PAL.steel, 0.6);
      var hx = VW / 2, hy = VH - 120;
      Gfx.glow(hx, hy, 40 + pulse * 22, PAL.hart, 0.55);
      Gfx.rect(hx - 3, hy - 10, 6, 20, PAL.hart);
      Gfx.rect(hx - 10, hy - 3, 20, 6, PAL.hart);
      Gfx.rect(hx - 4, hy - 4, 8, 8, PAL.hartGlow);
      Gfx.ring(hx, hy, 26 + pulse * 8, PAL.hart, 1, 0.45);
      for (var i = 0; i < 10; i++) {
        var a = t * 0.8 + i * 0.63, r = 40 + Math.sin(t + i) * 14;
        Gfx.rectA(hx + Math.cos(a) * r, hy + Math.sin(a) * r * 0.5, 2, 2, PAL.hartGlow, 0.6);
      }
      Gfx.text('THE BODY GOES BACK TO THE VIRTUAL WORLD.', VW / 2, 60,
        { size: 11, align: 'center', color: PAL.bone, alpha: C.clamp(t - 0.4, 0, 1) });
      Gfx.text('THE H.A.R.T. STAYS BEHIND.', VW / 2, 82,
        { size: 11, align: 'center', color: PAL.hart, glow: PAL.hart, alpha: C.clamp(t - 1.4, 0, 1) });
      if (t > 2.5 && Math.floor(this.t * 2) % 2 === 0) {
        Gfx.text('PRESS ENTER', VW / 2, VH - 34, { size: 10, align: 'center', color: PAL.white });
      }
    },

    drawCredits: function () {
      Gfx.rect(0, 0, VW, VH, '#03040a');
      hud.Back.grid({ x: this.t * 20, y: 0 }, this.t * 0.5);
      Gfx.rectA(0, 0, VW, VH, '#02030a', 0.7);
      this.logo(VW / 2, 26, false);
      var rows = [
        ['FINAL SCORE', String(this.score)],
        ['HI-SCORE', String(this.hi)],
        ['DATA SHARDS', this.shardsFound + ' / ' + this.shardsTotal],
        ['DIFFICULTY', this.difficulty ? 'LUCIFER' : 'NORMAL']
      ];
      for (var i = 0; i < rows.length; i++) {
        Gfx.text(rows[i][0], VW / 2 - 130, 120 + i * 20, { size: 10, color: PAL.steelLite });
        Gfx.text(rows[i][1], VW / 2 + 130, 120 + i * 20, { size: 10, align: 'right', color: PAL.gold });
      }
      Gfx.text('INSPIRED BY RA.ONE (2011) — DIR. ANUBHAV SINHA', VW / 2, VH - 60,
        { size: 8, align: 'center', color: PAL.bone });
      Gfx.text('UNOFFICIAL FAN TRIBUTE. NOT AFFILIATED WITH THE RIGHTS HOLDERS.', VW / 2, VH - 44,
        { size: 7, align: 'center', color: PAL.steel });
      if (Math.floor(this.t * 2) % 2 === 0) {
        Gfx.text('PRESS ENTER', VW / 2, VH - 22, { size: 9, align: 'center', color: PAL.hart });
      }
    }
  };

  global.RA.Game = Game;
  global.addEventListener('load', function () {
    Game.init(document.getElementById('screen'));
  });
})(window);
