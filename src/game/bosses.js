/* =============================================================
   game/bosses.js — RA.ONE, in three escalating builds.

   v1.0  the launch build: brute force
   v2.0  the shapeshifter: wears your face, blocks your last move
   v3.0  the third level: one bullet, ten copies, one shadow
   ============================================================= */
(function (global) {
  'use strict';
  var C = global.RA.core, Gfx = C.Gfx, PAL = C.PAL, T = C.TILE;
  var Audio = global.RA.Audio, ent = global.RA.ent;

  /* Ra.One is drawn from the same baked rig as everything else, at a
     larger scale, with his own black-and-seam palette and a cape. He
     should read as bigger than you before you have read anything else. */
  var RA_SCALE = 1.3;

  function bossPose(b) {
    if (b.aiming) return ['aim', 0];
    if (b.act === 'charge' || b.act === 'rush') return ['run', Math.floor(b.anim)];
    if (b.act) return ['cast', b.actT > 0.2 ? 0 : 1];
    if (b.hurtT > 0.06) return ['hurt', 0];
    if (!b.onGround) return [b.vy < 0 ? 'jump' : 'fall', 0];
    if (Math.abs(b.vx) > 0.5) return ['run', Math.floor(b.anim)];
    return ['idle', Math.floor(b.anim * 0.35)];
  }

  function drawRa(cxp, feetY, o) {
    o = o || {};
    var sheet = o.sheet || ent.sheets().raone;
    var sc = o.scale || RA_SCALE;
    var a = (o.alpha === undefined ? 1 : o.alpha);
    var top = feetY - 34 * sc;

    // the dark he carries with him
    Gfx.glow(cxp, feetY - 20 * sc, 34 * sc, '#000000', 0.5 * a);

    if (o.trail) {
      for (var k = 1; k <= 3; k++) {
        global.RA.spr.draw(sheet, o.anim, o.frame, cxp - (o.face || 1) * k * 7, feetY,
          o.face || 1, { alpha: 0.13 * (4 - k) * a, scale: sc });
      }
    }
    global.RA.spr.draw(sheet, o.anim || 'idle', o.frame || 0, cxp, feetY, o.face || 1,
      { alpha: o.alpha, scale: sc, flash: o.hurt ? '#ffffff' : null });

    if (o.dim !== true) {
      Gfx.glow(cxp, top + 6 * sc, 10, o.eye || PAL.raRed, 0.55 * a);   // the scan band
      Gfx.glow(cxp, top + 16 * sc, 13, o.eye || PAL.raRed, 0.35 * a);  // the core
    }
  }

  /* ================= BASE ================= */
  function Boss(x, y, level, game) {
    this.x = x; this.y = y; this.w = 22; this.h = 40;
    this.vx = 0; this.vy = 0; this.face = -1;
    this.anim = 0; this.hurtT = 0; this.phase = 1; this.t = 0;
    this.state = 'idle'; this.dead = false; this.remove = false;
    this.onGround = false; this.game = game; this.level = level;
    this.cool = 1.2; this.actT = 0; this.act = null;
    this.intro = 2.0; this.contact = 12; this.invulnLabel = null;
    this.hp = this.maxhp = 200;
    this.name = 'RA.ONE';
  }
  Boss.prototype.cx = function () { return this.x + this.w / 2; };
  Boss.prototype.cy = function () { return this.y + this.h / 2; };
  Boss.prototype.physics = function (world) {
    this.vy = Math.min(this.vy + 0.46, 13);
    this.onGround = false;
    world.move(this, this.vx, this.vy);
  };
  Boss.prototype.damage = function (n, world, kx, kind) {
    if (this.dead || this.immune) {
      if (this.immune) {
        world.parts.burst(this.cx(), this.cy(), 6, { color: PAL.steelLite, smax: 2, lmax: 0.3 });
        this.onImmuneHit && this.onImmuneHit(n, kind, world);
      }
      return false;
    }
    var mult = this.damageMult ? this.damageMult(kind) : 1;
    this.hp -= n * mult;
    this.hurtT = 0.14;
    Audio.sfx('hitflesh');
    world.parts.burst(this.cx(), this.cy(), 10, { color: PAL.raSeam, glow: true, smax: 3 });
    if (mult < 1) {
      world.parts.burst(this.cx(), this.cy(), 6, { color: PAL.steelLite, smax: 2 });
      if (this.game) this.game.toast('BLOCKED', PAL.steelLite);
    }
    if (this.hp <= 0) this.kill(world);
    return true;
  };
  Boss.prototype.kill = function (world) {
    this.hp = 0; this.dead = true;
    Audio.sfx('explode'); Audio.sfx('bossroar');
    Gfx.shake(6, 0.8); Gfx.flash('#ffffff', 0.6, 0.5);
    world.parts.burst(this.cx(), this.cy(), 60, { color: PAL.raSeam, glow: true, smax: 5, lmax: 1.4 });
    world.parts.burst(this.cx(), this.cy(), 30, { color: PAL.raRed, glow: true, smax: 4, lmax: 1.0 });
    if (this.game) this.game.addScore(5000);
  };
  Boss.prototype.hitboxes = function () { return []; };

  /* ================= RA.ONE v1.0 ================= */
  function RaOne1(x, y, level, game) {
    Boss.call(this, x, y, level, game);
    this.hp = this.maxhp = 240;
    this.name = 'RA.ONE v1.0';
    this.sub = 'RANDOM ACCESS VERSION 1.0';
  }
  RaOne1.prototype = Object.create(Boss.prototype);
  RaOne1.prototype.update = function (dt, world, player) {
    this.t += dt; this.anim += dt * 8;
    if (this.hurtT > 0) this.hurtT -= dt;
    if (this.intro > 0) { this.intro -= dt; this.physics(world); return; }

    var dx = player.cx() - this.cx(), adx = Math.abs(dx);
    this.face = dx > 0 ? 1 : -1;
    var enraged = this.hp < this.maxhp * 0.5;

    if (this.act) {
      this.actT -= dt;
      switch (this.act) {
        case 'charge':
          this.vx = this.face * (enraged ? 6.4 : 5.2);
          this.state = 'run';
          world.parts.spawn({ x: this.cx(), y: this.cy(), vx: 0, vy: 0, life: 0.3,
            size: 3, color: PAL.raRed, glow: true, grav: 0 });
          if (this.hitWall) { this.actT = 0; this.hitWall = false; Gfx.shake(3, 0.2); }
          break;
        case 'slam':
          this.state = 'attack';
          if (this.actT <= 0 && this.onGround) this.shockwave(world, player);
          break;
        case 'volley':
          this.state = 'attack';
          if (this.actT <= 0) this.volley(world, player, enraged ? 5 : 3);
          break;
      }
      if (this.actT <= 0) {
        if (this.act === 'slam' && !this.onGround) { /* wait for landing */ }
        else { this.act = null; this.cool = enraged ? 0.55 : 0.95; }
      }
    } else {
      this.state = Math.abs(this.vx) > 0.4 ? 'run' : 'idle';
      this.vx = C.approach(this.vx, adx > 60 ? this.face * 1.5 : -this.face * 0.9, 0.24);
      this.cool -= dt;
      if (this.cool <= 0) {
        var r = Math.random();
        if (adx < 90 && r < 0.4) { this.act = 'slam'; this.actT = 0.5; this.vy = -7.5; }
        else if (r < 0.75) { this.act = 'charge'; this.actT = enraged ? 0.75 : 0.6; Audio.sfx('bossroar'); }
        else { this.act = 'volley'; this.actT = 0.45; }
      }
    }
    this.physics(world);
    if (this.onGround && !this.act) this.vx *= 0.9;
  };
  RaOne1.prototype.shockwave = function (world, player) {
    Gfx.shake(5, 0.35); Audio.sfx('explode');
    world.parts.burst(this.cx(), this.y + this.h, 26,
      { color: PAL.raRed, glow: true, angle: -Math.PI / 2, spread: 1.4, smax: 5 });
    for (var s = -1; s <= 1; s += 2) {
      world.spawnShot({ x: this.cx(), y: this.y + this.h - 8, vx: s * 4.2, vy: 0,
        w: 10, h: 8, dmg: 14, owner: 'enemy', color: PAL.raRed, life: 1.3 });
    }
  };
  RaOne1.prototype.volley = function (world, player, n) {
    Audio.sfx('blast');
    var base = Math.atan2(player.cy() - this.cy(), player.cx() - this.cx());
    for (var i = 0; i < n; i++) {
      var a = base + (i - (n - 1) / 2) * 0.20;
      world.spawnShot({ x: this.cx(), y: this.cy(), vx: Math.cos(a) * 4.4, vy: Math.sin(a) * 4.4,
        w: 8, h: 5, dmg: 10, owner: 'enemy', color: PAL.raRed, life: 2.0 });
    }
  };
  RaOne1.prototype.draw = function (cam, player, world) {
    var fx = Math.round(this.cx() - cam.x), fy = Math.round(this.y + this.h - cam.y);
    if (world) ent.contactShadow(this, world, cam);
    var pose = bossPose(this);
    if (this.act === 'charge') Gfx.glow(fx, fy - 24, 30, PAL.raRed, 0.4);
    drawRa(fx, fy, { face: this.face, anim: pose[0], frame: pose[1],
                     hurt: this.hurtT > 0, trail: this.act === 'charge' });
  };

  /* ================= RA.ONE v2.0 — THE SHAPESHIFTER ================= */
  function RaOne2(x, y, level, game) {
    Boss.call(this, x, y, level, game);
    this.hp = this.maxhp = 320;
    this.name = 'RA.ONE v2.0';
    this.sub = 'SHAPESHIFT / MIMIC';
    this.mimic = false; this.mimicT = 0; this.blockType = null;
    this.decoys = []; this.morphT = 0;
  }
  RaOne2.prototype = Object.create(Boss.prototype);
  RaOne2.prototype.damageMult = function (kind) {
    if (this.mimic && kind && kind === this.blockType) return 0.15;
    return this.mimic ? 0.75 : 1;
  };
  RaOne2.prototype.update = function (dt, world, player) {
    this.t += dt; this.anim += dt * 9;
    if (this.hurtT > 0) this.hurtT -= dt;
    if (this.morphT > 0) this.morphT -= dt;
    if (this.intro > 0) { this.intro -= dt; this.physics(world); return; }

    var dx = player.cx() - this.cx(), adx = Math.abs(dx);
    this.face = dx > 0 ? 1 : -1;
    var enraged = this.hp < this.maxhp * 0.45;

    // he copies your last move and shuts it down; you have to change hands
    if (this.mimic) {
      this.mimicT -= dt;
      if (this.mimicT <= 0) { this.mimic = false; this.blockType = null; this.morphT = 0.4; }
      else if (player.lastAttackKind && player.lastAttackKind !== this.blockType && Math.random() < dt * 1.2) {
        this.blockType = player.lastAttackKind;
        this.game && this.game.toast('HE COPIED YOUR ' + (this.blockType === 'melee' ? 'FIST' : 'BLAST'), PAL.magenta);
      }
    }

    if (this.act) {
      this.actT -= dt;
      switch (this.act) {
        case 'blink':
          this.state = 'idle';
          if (this.actT <= 0) {
            world.parts.burst(this.cx(), this.cy(), 16, { color: PAL.raSeam, glow: true });
            var nx = player.cx() + (Math.random() < 0.5 ? -60 : 60);
            this.x = C.clamp(nx, 32, world.pxW - 48);
            this.y = player.y - 8;
            world.parts.burst(this.cx(), this.cy(), 16, { color: PAL.raSeam, glow: true });
            Audio.sfx('dash');
          }
          break;
        case 'rush':
          this.vx = this.face * 6.0; this.state = 'run';
          if (this.hitWall) { this.actT = 0; this.hitWall = false; }
          break;
        case 'mirror':
          this.state = 'attack';
          if (this.actT <= 0) this.mirrorVolley(world, player);
          break;
        case 'sweep':
          this.state = 'attack';
          if (this.actT <= 0) {
            Audio.sfx('blast'); Gfx.shake(3, 0.2);
            for (var i = 0; i < 6; i++) {
              var a = -Math.PI / 2 + (i - 2.5) * 0.28;
              world.spawnShot({ x: this.cx(), y: this.cy() - 6, vx: Math.cos(a) * 3.6, vy: Math.sin(a) * 3.6,
                w: 7, h: 5, dmg: 11, owner: 'enemy', color: PAL.magenta, life: 2.4, homing: enraged ? 0.05 : 0 });
            }
          }
          break;
      }
      if (this.actT <= 0) { this.act = null; this.cool = enraged ? 0.5 : 0.85; }
    } else {
      this.state = Math.abs(this.vx) > 0.4 ? 'run' : 'idle';
      this.vx = C.approach(this.vx, adx > 80 ? this.face * 1.9 : -this.face * 1.1, 0.26);
      this.cool -= dt;
      if (this.cool <= 0) {
        var r = Math.random();
        if (!this.mimic && r < 0.3) {
          this.mimic = true; this.mimicT = enraged ? 7 : 5; this.morphT = 0.5;
          this.blockType = player.lastAttackKind || 'melee';
          Audio.sfx('detach'); Gfx.flash(PAL.magenta, 0.3, 0.2);
          this.game && this.game.toast('HE IS WEARING YOUR FACE', PAL.magenta);
        }
        else if (r < 0.5) { this.act = 'blink'; this.actT = 0.3; }
        else if (r < 0.72) { this.act = 'rush'; this.actT = 0.55; }
        else if (r < 0.88) { this.act = 'mirror'; this.actT = 0.4; }
        else { this.act = 'sweep'; this.actT = 0.45; }
      }
    }
    this.physics(world);
    if (this.onGround && !this.act) this.vx *= 0.9;
  };
  RaOne2.prototype.mirrorVolley = function (world, player) {
    Audio.sfx('blast');
    // he throws your own blast back at you, from two mirror images
    for (var s = -1; s <= 1; s += 2) {
      var ox = this.cx() + s * 26;
      world.parts.burst(ox, this.cy(), 10, { color: PAL.hart, glow: true });
      var a = Math.atan2(player.cy() - this.cy(), player.cx() - ox);
      world.spawnShot({ x: ox, y: this.cy(), vx: Math.cos(a) * 5.0, vy: Math.sin(a) * 5.0,
        w: 8, h: 5, dmg: 12, owner: 'enemy', color: PAL.hart, life: 2.2 });
    }
  };
  RaOne2.prototype.draw = function (cam, player, world) {
    var fx = Math.round(this.cx() - cam.x), fy = Math.round(this.y + this.h - cam.y);
    if (world) ent.contactShadow(this, world, cam);
    var pose = bossPose(this);

    if (this.morphT > 0) {
      // mid-shift: the silhouette tears into scanlines
      for (var i = 0; i < 8; i++) {
        Gfx.rectA(fx - 18 + Math.random() * 36, fy - 4 - Math.random() * 40,
                  16, 2, PAL.raSeam, 0.45);
      }
    }
    if (this.mimic) {
      // he is wearing your face. Same rig, your colours, wrong light.
      drawRa(fx, fy, { face: this.face, anim: pose[0], frame: pose[1],
                       hurt: this.hurtT > 0, sheet: ent.sheets().gone,
                       scale: 1.15, eye: PAL.magenta, trail: this.act === 'rush' });
      Gfx.glow(fx, fy - 22, 26, PAL.magenta, 0.35);
      Gfx.ring(fx, fy - 20, 20 + Math.sin(this.t * 5) * 3, PAL.magenta, 1, 0.4);
    } else {
      drawRa(fx, fy, { face: this.face, anim: pose[0], frame: pose[1],
                       hurt: this.hurtT > 0, trail: this.act === 'rush' });
    }
  };

  /* ================= RA.ONE v3.0 — THE THIRD LEVEL ================= */
  /* Phase 1 PROVOKE : he cannot be damaged. Break his guard.
     Phase 2 ONE BULLET: the anti-H.A.R.T. round. It only kills an
             attached H.A.R.T. Detach, and let him waste it.
     Phase 3 TEN COPIES: only the original casts a shadow. */
  function RaOne3(x, y, level, game) {
    Boss.call(this, x, y, level, game);
    this.hp = this.maxhp = 300;
    this.name = 'RA.ONE v3.0';
    this.sub = 'THE THIRD LEVEL';
    this.phase = 1;
    this.guard = 100; this.guardMax = 100;
    this.immune = true; this.invulnLabel = 'IMMUNE — BREAK HIS GUARD';
    this.aimT = 0; this.aiming = false; this.bulletSpent = false;
    this.clones = []; this.realIdx = 0; this.shuffleT = 0; this.hitsOnReal = 0;
    this.pulseT = 0; this.contact = 14;
    this.bannerT = 0;
  }
  RaOne3.prototype = Object.create(Boss.prototype);

  RaOne3.prototype.onImmuneHit = function (n, kind, world) {
    if (this.phase !== 1) return;
    this.guard -= n * 0.85;
    Audio.sfx('punch');
    if (this.guard <= 0) {
      this.guard = 0;
      this.enterPhase2(world);
    }
  };

  RaOne3.prototype.enterPhase2 = function (world) {
    this.phase = 2; this.bannerT = 3.4;
    this.invulnLabel = 'ONE BULLET — DETACH YOUR H.A.R.T. [H]';
    this.aiming = false; this.aimT = 0; this.cool = 1.6;
    Audio.sfx('bossroar'); Gfx.flash(PAL.raRed, 0.5, 0.4); Gfx.shake(5, 0.6);
    this.game && this.game.unlockShardByTitle('RULE 4 — THE ONE BULLET');
    this.game && this.game.toast('HE HAS DRAWN THE ANTI-H.A.R.T. GUN', PAL.raRed);
  };

  RaOne3.prototype.enterPhase3 = function (world) {
    this.phase = 3; this.immune = false; this.bannerT = 3.4;
    this.invulnLabel = 'TEN COPIES — ONLY THE ORIGINAL CASTS A SHADOW';
    this.bulletSpent = true;
    Audio.sfx('bossroar'); Gfx.flash('#ffffff', 0.7, 0.6); Gfx.shake(7, 0.9);
    this.game && this.game.unlockShardByTitle('THE TRICK');
    this.game && this.game.unlockShardByTitle('THE SHADOW');
    this.game && this.game.toast('TEN COPIES. ONE SHADOW.', PAL.gold);
    this.spawnClones(world);
  };

  RaOne3.prototype.spawnClones = function (world) {
    this.clones = [];
    var floorY = this.y;
    for (var i = 0; i < 10; i++) {
      this.clones.push({
        x: 40 + i * ((world.pxW - 130) / 9), y: floorY,
        alive: true, t: Math.random() * 6, face: -1, fade: 0
      });
    }
    this.realIdx = C.randInt(0, 9);
    this.shuffleT = 7;
  };

  RaOne3.prototype.shuffle = function (world) {
    var alive = [];
    for (var i = 0; i < this.clones.length; i++) if (this.clones[i].alive) alive.push(i);
    if (!alive.length) return;
    for (var j = 0; j < this.clones.length; j++) {
      var c = this.clones[j];
      if (!c.alive) continue;
      world.parts.burst(c.x + 11, c.y + 20, 10, { color: PAL.raSeam, glow: true });
      c.x = C.clamp(40 + Math.random() * (world.pxW - 130), 32, world.pxW - 60);
      c.fade = 0.35;
    }
    this.realIdx = C.pick(alive);
    this.shuffleT = 6 + Math.random() * 2;
    Audio.sfx('detach');
  };

  RaOne3.prototype.update = function (dt, world, player) {
    this.t += dt; this.anim += dt * 9;
    if (this.hurtT > 0) this.hurtT -= dt;
    if (this.bannerT > 0) this.bannerT -= dt;
    if (this.intro > 0) { this.intro -= dt; this.physics(world); return; }

    var dx = player.cx() - this.cx();
    this.face = dx > 0 ? 1 : -1;

    if (this.phase === 1) this.updateP1(dt, world, player, dx);
    else if (this.phase === 2) this.updateP2(dt, world, player, dx);
    else this.updateP3(dt, world, player);
  };

  /* --- phase 1: he is simply better than you --- */
  RaOne3.prototype.updateP1 = function (dt, world, player, dx) {
    var adx = Math.abs(dx);
    if (this.act) {
      this.actT -= dt;
      if (this.act === 'rush') {
        this.vx = this.face * 6.2; this.state = 'run';
        if (this.hitWall) { this.actT = 0; this.hitWall = false; }
      } else if (this.act === 'arc') {
        this.state = 'attack';
        if (this.actT <= 0) {
          Audio.sfx('blast');
          for (var i = 0; i < 7; i++) {
            var a = (i / 7) * Math.PI * 2 + this.t;
            world.spawnShot({ x: this.cx(), y: this.cy(), vx: Math.cos(a) * 3.6, vy: Math.sin(a) * 3.6,
              w: 7, h: 5, dmg: 10, owner: 'enemy', color: PAL.raRed, life: 2.2 });
          }
        }
      } else if (this.act === 'mind') {
        this.state = 'attack';
        if (this.actT <= 0) {
          // mind control: he reads you and turns your own controls around
          Audio.sfx('detach'); Gfx.flash(PAL.magenta, 0.4, 0.3);
          player.invertT = 2.4;
          this.game && this.game.toast('HE IS IN YOUR HEAD — CONTROLS INVERTED', PAL.magenta);
          world.parts.burst(this.cx(), this.cy(), 30, { color: PAL.magenta, glow: true, smax: 4 });
        }
      }
      if (this.actT <= 0) { this.act = null; this.cool = 0.7; }
    } else {
      this.state = Math.abs(this.vx) > 0.4 ? 'run' : 'idle';
      this.vx = C.approach(this.vx, adx > 70 ? this.face * 2.0 : -this.face * 1.2, 0.26);
      this.cool -= dt;
      if (this.cool <= 0) {
        var r = Math.random();
        if (r < 0.42) { this.act = 'rush'; this.actT = 0.55; }
        else if (r < 0.8) { this.act = 'arc'; this.actT = 0.45; }
        else { this.act = 'mind'; this.actT = 0.7; }
      }
    }
    this.physics(world);
    if (this.onGround && !this.act) this.vx *= 0.9;
  };

  /* --- phase 2: the one bullet --- */
  RaOne3.prototype.updateP2 = function (dt, world, player, dx) {
    this.state = 'idle';
    this.vx = C.approach(this.vx, 0, 0.3);
    if (!this.aiming) {
      this.cool -= dt;
      if (this.cool <= 0) { this.aiming = true; this.aimT = 2.6; Audio.sfx('charge'); }
    } else {
      this.aimT -= dt;
      this.state = 'attack';
      if (this.aimT <= 0) {
        this.aiming = false; this.cool = 2.4;
        this.fireAntiHart(world, player);
      }
    }
    this.physics(world);
  };

  RaOne3.prototype.fireAntiHart = function (world, player) {
    Audio.sfx('shot'); Gfx.shake(4, 0.4); Gfx.flash(PAL.raRed, 0.4, 0.25);
    var a = Math.atan2(player.cy() - this.cy(), player.cx() - this.cx());
    world.spawnShot({
      x: this.cx(), y: this.cy(), vx: Math.cos(a) * 6.6, vy: Math.sin(a) * 6.6,
      w: 10, h: 6, dmg: 9999, owner: 'antihart', color: PAL.raRed,
      life: 3.0, antiHart: true, homing: 0.09, big: true
    });
  };

  /* --- phase 3: ten copies, one shadow --- */
  RaOne3.prototype.updateP3 = function (dt, world, player) {
    this.shuffleT -= dt;
    if (this.shuffleT <= 0) this.shuffle(world);
    this.pulseT -= dt;

    var alive = 0, real = this.clones[this.realIdx];
    for (var i = 0; i < this.clones.length; i++) {
      var c = this.clones[i];
      if (!c.alive) continue;
      alive++;
      c.t += dt;
      if (c.fade > 0) c.fade -= dt;
      c.face = player.cx() > c.x + 9 ? 1 : -1;
      c.x += Math.sin(c.t * 0.8 + i) * 0.35;
    }
    // the pack takes potshots
    if (this.pulseT <= 0 && alive > 0) {
      this.pulseT = C.clamp(2.6 - (10 - alive) * 0.12, 0.9, 2.6);
      var shooter = null, tries = 0;
      while (!shooter && tries++ < 20) { var k = C.randInt(0, 9); if (this.clones[k].alive) shooter = this.clones[k]; }
      if (shooter) {
        var ang = Math.atan2(player.cy() - (shooter.y + 20), player.cx() - (shooter.x + 11));
        world.spawnShot({ x: shooter.x + 11, y: shooter.y + 20,
          vx: Math.cos(ang) * 4.2, vy: Math.sin(ang) * 4.2,
          w: 7, h: 5, dmg: 9, owner: 'enemy', color: PAL.raRed, life: 2.2 });
        Audio.sfx('blast');
      }
    }
    // the real one keeps a body for the health bar / contact damage
    if (real && real.alive) { this.x = real.x; this.y = real.y; }
  };

  /* a hit landed on the copies — was it the one with the shadow? */
  RaOne3.prototype.hitClone = function (idx, dmg, world, player) {
    var c = this.clones[idx];
    if (!c || !c.alive) return;
    if (idx === this.realIdx) {
      this.hitsOnReal++;
      this.hp -= dmg;
      this.hurtT = 0.15;
      Audio.sfx('hitflesh'); Gfx.shake(3, 0.2);
      world.parts.burst(c.x + 11, c.y + 20, 20, { color: PAL.gold, glow: true, smax: 4 });
      this.game && this.game.toast('THAT ONE HAD A SHADOW', PAL.gold);
      if (this.hp <= 0) { this.kill(world); }
    } else {
      c.alive = false;
      Audio.sfx('explode');
      world.parts.burst(c.x + 11, c.y + 20, 24, { color: PAL.raSeam, glow: true, smax: 3 });
      player.hurt(7, world, c.x < player.x ? 1 : -1);
      this.game && this.game.toast('A COPY. NO SHADOW.', PAL.steelLite);
    }
  };

  RaOne3.prototype.cloneBoxes = function () {
    var out = [];
    if (this.phase !== 3) return out;
    for (var i = 0; i < this.clones.length; i++) {
      var c = this.clones[i];
      if (c.alive) out.push({ idx: i, x: c.x, y: c.y, w: this.w, h: this.h });
    }
    return out;
  };

  RaOne3.prototype.draw = function (cam, player, world) {
    var i, fx, fy;
    if (this.phase === 3) {
      for (i = 0; i < this.clones.length; i++) {
        var c = this.clones[i];
        if (!c.alive) continue;
        fx = Math.round(c.x + this.w / 2 - cam.x);
        fy = Math.round(c.y + this.h - cam.y);
        var isReal = (i === this.realIdx);

        // THE TELL: every copy stands in the same pool of light.
        // Exactly one of them puts something in the way of it.
        Gfx.glow(fx, fy + 2, 26, PAL.hart, 0.22);
        if (isReal) {
          Gfx.ctx.globalAlpha = 0.85;
          Gfx.ctx.fillStyle = '#000';
          Gfx.ctx.beginPath();
          Gfx.ctx.ellipse(fx, fy + 1, 15, 4, 0, 0, Math.PI * 2);
          Gfx.ctx.fill();
          Gfx.ctx.globalAlpha = 0.4;
          Gfx.ctx.beginPath();
          Gfx.ctx.ellipse(fx + 3, fy + 5, 22, 3, 0, 0, Math.PI * 2);
          Gfx.ctx.fill();
          Gfx.ctx.globalAlpha = 1;
        }
        drawRa(fx, fy, {
          face: c.face, anim: 'idle', frame: Math.floor(this.anim * 0.35) + i,
          hurt: isReal && this.hurtT > 0,
          alpha: c.fade > 0 ? 0.45 : 1
        });
      }
      return;
    }

    fx = Math.round(this.cx() - cam.x);
    fy = Math.round(this.y + this.h - cam.y);
    if (world) ent.contactShadow(this, world, cam);
    var pose = bossPose(this);

    if (this.phase === 1) {
      // the guard he has not lowered yet
      var r = 30 + Math.sin(this.t * 4) * 3;
      Gfx.ring(fx, fy - 22, r, PAL.steelLite, 1, 0.35);
      Gfx.ring(fx, fy - 22, r - 5, PAL.steelLite, 1, 0.15);
    }
    drawRa(fx, fy, { face: this.face, anim: pose[0], frame: pose[1],
                     hurt: this.hurtT > 0, trail: this.act === 'rush' });

    // the laser sight of a gun that only has to work once
    if (this.phase === 2 && this.aiming && player && !player.dead) {
      var px = player.cx() - cam.x, py = player.cy() - cam.y;
      var t = 1 - C.clamp(this.aimT / 2.6, 0, 1);
      var gx = fx + this.face * 14, gy = fy - 26;
      Gfx.ctx.globalAlpha = 0.3 + t * 0.55;
      Gfx.line(gx, gy, px, py, PAL.raRed, 1);
      Gfx.ctx.globalAlpha = 1;
      Gfx.ring(px, py, 14 - t * 9, PAL.raRed, 1, 0.9);
      Gfx.ring(px, py, 3, PAL.raRed, 1, 0.9);
      Gfx.line(px - 8, py, px - 3, py, PAL.raRed, 1);
      Gfx.line(px + 3, py, px + 8, py, PAL.raRed, 1);
      Gfx.line(px, py - 8, px, py - 3, PAL.raRed, 1);
      Gfx.line(px, py + 3, px, py + 8, PAL.raRed, 1);
      Gfx.glow(gx, gy, 10 + t * 12, PAL.raRed, 0.4 + t * 0.5);
    }
  };

  global.RA.bosses = {
    drawRa: drawRa, bossPose: bossPose, RA_SCALE: RA_SCALE,
    make: function (kind, x, y, level, game) {
      if (kind === 'ra1') return new RaOne1(x, y, level, game);
      if (kind === 'ra2') return new RaOne2(x, y, level, game);
      return new RaOne3(x, y, level, game);
    }
  };
})(window);
