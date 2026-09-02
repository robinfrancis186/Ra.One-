/* =============================================================
   game/entities.js — world collision, G.One, enemies, projectiles
   ============================================================= */
(function (global) {
  'use strict';
  var C = global.RA.core, Gfx = C.Gfx, PAL = C.PAL, T = C.TILE;
  var Audio = global.RA.Audio;

  var SOLID = { '#': 1 }, ONEWAY = { '=': 1 }, HAZARD = { '^': 1 };

  /* ================= WORLD ================= */
  function World(level, game) {
    this.level = level;
    this.game = game;
    this.map = level.map.slice();
    this.h = this.map.length;
    this.w = this.map[0].length;
    this.pxW = this.w * T; this.pxH = this.h * T;
    this.tiles = [];
    for (var y = 0; y < this.h; y++) this.tiles.push(this.map[y].split(''));

    this.actors = [];
    this.shots = [];
    this.pickups = [];
    this.parts = new C.Particles();
    this.cam = new C.Camera(C.VIEW_W, C.VIEW_H);
    this.cam.boundsW = this.pxW; this.cam.boundsH = this.pxH;
    this.spawnX = 32; this.spawnY = 32;
    this.checkpoints = [];
    this.bossGateX = (level.arenaX || 0) * T;
    this.bossSpawnX = (level.bossX || 0) * T;
    this.time = 0;
    this.scanEntities();
  }

  World.prototype.scanEntities = function () {
    for (var y = 0; y < this.h; y++) {
      for (var x = 0; x < this.w; x++) {
        var ch = this.tiles[y][x], px = x * T, py = y * T;
        switch (ch) {
          case 'S': this.spawnX = px; this.spawnY = py - 8; this.tiles[y][x] = '.'; break;
          case 'C': this.checkpoints.push({ x: px, y: py }); this.tiles[y][x] = '.'; break;
          case 'B': this.tiles[y][x] = '.'; break;
          case 'a': this.actors.push(new Sentry(px, py)); this.tiles[y][x] = '.'; break;
          case 'b': this.actors.push(new Drone(px, py)); this.tiles[y][x] = '.'; break;
          case 'c': this.actors.push(new Mask(px, py)); this.tiles[y][x] = '.'; break;
          case 't': this.actors.push(new Turret(px, py)); this.tiles[y][x] = '.'; break;
          case 'h': this.pickups.push(new Pickup(px, py, 'hart')); this.tiles[y][x] = '.'; break;
          case 'R': this.pickups.push(new Pickup(px, py, 'repair')); this.tiles[y][x] = '.'; break;
          case 'd': this.pickups.push(new Pickup(px, py, 'data')); this.tiles[y][x] = '.'; break;
        }
      }
    }
  };

  World.prototype.tileAt = function (tx, ty) {
    if (ty < 0 || ty >= this.h || tx < 0 || tx >= this.w) return tx < 0 || tx >= this.w ? '#' : '.';
    return this.tiles[ty][tx];
  };
  World.prototype.isSolid = function (tx, ty) { return !!SOLID[this.tileAt(tx, ty)]; };
  World.prototype.isOneWay = function (tx, ty) { return !!ONEWAY[this.tileAt(tx, ty)]; };
  World.prototype.isHazard = function (tx, ty) { return !!HAZARD[this.tileAt(tx, ty)]; };

  World.prototype.solidRect = function (r) {
    var x0 = Math.floor(r.x / T), x1 = Math.floor((r.x + r.w - 1) / T);
    var y0 = Math.floor(r.y / T), y1 = Math.floor((r.y + r.h - 1) / T);
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) if (this.isSolid(x, y)) return true;
    return false;
  };
  World.prototype.hazardRect = function (r) {
    var x0 = Math.floor(r.x / T), x1 = Math.floor((r.x + r.w - 1) / T);
    var y0 = Math.floor(r.y / T), y1 = Math.floor((r.y + r.h - 1) / T);
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) if (this.isHazard(x, y)) return true;
    return false;
  };

  /* axis-separated tile collision, with one-way platforms */
  World.prototype.move = function (a, dx, dy) {
    var i, steps;
    // X
    if (dx) {
      steps = Math.ceil(Math.abs(dx) / 4) || 1;
      for (i = 0; i < steps; i++) {
        var sx = dx / steps;
        a.x += sx;
        if (this.solidRect(a)) {
          a.x -= sx;
          var tx = sx > 0 ? Math.floor((a.x + a.w) / T) : Math.floor(a.x / T) - 1;
          a.x = sx > 0 ? tx * T - a.w - 0.01 : (tx + 1) * T + 0.01;
          a.vx = 0; a.hitWall = true;
          break;
        }
      }
    }
    // Y
    if (dy) {
      steps = Math.ceil(Math.abs(dy) / 4) || 1;
      for (i = 0; i < steps; i++) {
        var sy = dy / steps, prevBottom = a.y + a.h;
        a.y += sy;
        var blocked = this.solidRect(a);
        if (!blocked && sy > 0 && !a.dropThrough) blocked = this.oneWayHit(a, prevBottom);
        if (blocked) {
          a.y -= sy;
          if (sy > 0) {
            var ty = Math.floor((a.y + a.h) / T);
            a.y = ty * T - a.h - 0.01;
            a.onGround = true;
          } else {
            a.y = (Math.floor(a.y / T) + 1) * T + 0.01;
          }
          a.vy = 0;
          break;
        }
      }
    }
  };
  World.prototype.oneWayHit = function (a, prevBottom) {
    var x0 = Math.floor(a.x / T), x1 = Math.floor((a.x + a.w - 1) / T);
    var ty = Math.floor((a.y + a.h - 1) / T);
    for (var x = x0; x <= x1; x++) {
      if (this.isOneWay(x, ty) && prevBottom <= ty * T + 2) return true;
    }
    return false;
  };

  World.prototype.spawnShot = function (o) { this.shots.push(new Shot(o)); };

  /* ================= ACTOR BASE ================= */
  function Actor(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.vx = 0; this.vy = 0; this.face = 1;
    this.onGround = false; this.dead = false; this.remove = false;
    this.hurtT = 0; this.anim = 0; this.hp = 1; this.maxhp = 1;
    this.score = 100; this.hostile = true; this.type = 'actor';
  }
  Actor.prototype.cx = function () { return this.x + this.w / 2; };
  Actor.prototype.cy = function () { return this.y + this.h / 2; };
  Actor.prototype.damage = function (n, world, kx) {
    if (this.dead || this.invuln > 0) return false;
    this.hp -= n; this.hurtT = 0.18;
    if (kx) this.vx = kx * 2.4;
    world.parts.burst(this.cx(), this.cy(), 8, { color: PAL.hartGlow, glow: true, lmax: 0.4 });
    if (this.hp <= 0) { this.die(world); return true; }
    Audio.sfx('hitflesh');
    return true;
  };
  Actor.prototype.die = function (world) {
    this.dead = true; this.remove = true;
    world.parts.burst(this.cx(), this.cy(), 24, { color: PAL.raSeam, glow: true, smax: 4, lmax: 0.9 });
    world.parts.burst(this.cx(), this.cy(), 12, { color: PAL.raRed, smax: 3, lmax: 0.6 });
    Audio.sfx('explode');
    Gfx.shake(2, 0.15);
    if (world.game) world.game.addScore(this.score);
  };

  /* ================= SPRITE ACCESS =================
     Frames are baked once at boot by engine/sprites.js; drawing a
     character is one drawImage of a pre-composited pixel canvas. */
  var SH = null;
  function sheets() { return SH || (SH = global.RA.spr.build()); }

  /* pick the animation and frame for any rigged actor */
  function poseOf(a) {
    if (a.dashT > 0) return ['dash', 0];
    if (a.attackT > 0 || a.strikeT > 0 || a.lungeT > 0) {
      var t = a.attackT || a.strikeT || a.lungeT;
      return ['punch', t > 0.16 ? 0 : 1];
    }
    if (a.hurtT > 0) return ['hurt', 0];
    if (!a.onGround) return [a.vy < 0 ? 'jump' : 'fall', 0];
    if (Math.abs(a.vx) > 0.45) return ['run', Math.floor(a.anim)];
    return ['idle', Math.floor(a.anim * 0.35)];
  }

  /* a contact shadow that tightens as you approach the floor */
  function contactShadow(a, world, cam) {
    var ty = Math.floor((a.y + a.h + 2) / T), gy = null;
    for (var k = 0; k < 12; k++) {
      var t = a.y + a.h + k * T;
      if (world.isSolid(Math.floor(a.cx() / T), Math.floor(t / T))) {
        gy = Math.floor(t / T) * T; break;
      }
    }
    if (gy === null) return;
    var drop = C.clamp((gy - (a.y + a.h)) / 90, 0, 1);
    var w = (a.w + 4) * (1 - drop * 0.55);
    Gfx.ctx.globalAlpha = 0.42 * (1 - drop * 0.7);
    Gfx.ctx.fillStyle = '#000';
    Gfx.ctx.beginPath();
    Gfx.ctx.ellipse(Math.round(a.cx() - cam.x), Math.round(gy - cam.y), w / 2, 2.5, 0, 0, Math.PI * 2);
    Gfx.ctx.fill();
    Gfx.ctx.globalAlpha = 1;
  }

  /* ================= PLAYER — G.ONE ================= */
  function Player(x, y, game) {
    Actor.call(this, x, y, 12, 24);
    this.type = 'player';
    this.game = game;
    this.maxhp = 100; this.hp = 100;
    this.hartMax = 100; this.hart = 100;
    this.invuln = 0; this.attackT = 0; this.combo = 0; this.comboT = 0;
    this.blastCd = 0; this.charge = 0; this.dashT = 0; this.dashCd = 0;
    this.coyote = 0; this.jumpBuf = 0; this.airJumps = 0;
    this.hartDetached = false; this.hartObj = null;
    this.state = 'idle'; this.hitBox = null; this.dead = false;
    this.invertT = 0; this.lastAttackKind = null;
    this.deathT = 0; this.spawnFlash = 1.2;
  }
  Player.prototype = Object.create(Actor.prototype);
  Player.prototype.constructor = Player;

  Player.prototype.speed = function () { return this.hartDetached ? 2.0 : 2.5; };

  Player.prototype.update = function (dt, world, input, allowControl) {
    var G = 0.46, ph = this;
    this.anim += dt * (Math.abs(this.vx) > 0.4 ? 14 : 5);
    if (this.hurtT > 0) this.hurtT -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.blastCd > 0) this.blastCd -= dt;
    if (this.dashCd > 0) this.dashCd -= dt;
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }
    if (this.spawnFlash > 0) this.spawnFlash -= dt;
    if (this.invertT > 0) this.invertT -= dt;   // he is reading your inputs

    if (this.dead) {
      this.deathT += dt;
      this.vy += G; this.vx *= 0.9;
      world.move(this, this.vx, this.vy);
      return;
    }

    // ----- H.A.R.T. economy -----
    if (this.hartDetached) {
      this.hp -= 3 * dt;                                   // running on residual charge
      if (this.hp <= 1) { this.hp = 1; }
    } else {
      this.hart = Math.min(this.hartMax, this.hart + 9 * dt);
    }

    var ctl = allowControl !== false;
    var left = ctl && input.down('left'), right = ctl && input.down('right');
    if (this.invertT > 0) { var swap = left; left = right; right = swap; }

    // ----- dash -----
    if (this.dashT > 0) {
      this.dashT -= dt;
      this.vx = this.face * 6.4;
      this.invuln = Math.max(this.invuln, 0.05);
      world.parts.spawn({ x: this.cx(), y: this.cy(), vx: -this.face * 0.6, vy: 0,
        life: 0.28, size: 3, color: PAL.hart, glow: true, grav: 0 });
    } else {
      var acc = this.onGround ? 0.55 : 0.32, spd = this.speed();
      if (left && !right) { this.vx = C.approach(this.vx, -spd, acc); this.face = -1; }
      else if (right && !left) { this.vx = C.approach(this.vx, spd, acc); this.face = 1; }
      else this.vx = C.approach(this.vx, 0, this.onGround ? 0.5 : 0.14);
    }

    if (ctl && input.pressed('dash') && this.dashCd <= 0 && !this.hartDetached) {
      this.dashT = 0.17; this.dashCd = 0.55; Audio.sfx('dash');
      world.parts.burst(this.cx(), this.cy(), 8, { color: PAL.hartGlow, glow: true, smax: 2 });
    }

    // ----- jump -----
    if (this.onGround) { this.coyote = 0.11; this.airJumps = 1; }
    else if (this.coyote > 0) this.coyote -= dt;
    if (ctl && input.pressed('jump')) this.jumpBuf = 0.12;
    if (this.jumpBuf > 0) this.jumpBuf -= dt;

    if (this.jumpBuf > 0 && (this.coyote > 0 || this.airJumps > 0)) {
      if (this.coyote <= 0) {
        this.airJumps--;
        world.parts.burst(this.cx(), this.y + this.h, 10,
          { color: PAL.hart, glow: true, angle: Math.PI / 2, spread: 1.0, smax: 2 });
      }
      this.vy = -8.0; this.jumpBuf = 0; this.coyote = 0; this.onGround = false;
      Audio.sfx('jump');
    }
    if (!input.down('jump') && this.vy < -3.0) this.vy = -3.0;      // variable height
    this.dropThrough = ctl && input.down('down') && input.down('jump');

    // ----- melee -----
    if (this.attackT > 0) {
      this.attackT -= dt;
      if (this.attackT <= 0) this.hitBox = null;
    } else if (ctl && input.pressed('hit')) {
      this.attackT = 0.22;
      this.combo = Math.min(3, this.combo + 1); this.comboT = 0.55;
      var reach = 20 + this.combo * 2;
      this.hitBox = { x: this.face > 0 ? this.x + this.w - 2 : this.x - reach + 2,
                      y: this.y + 4, w: reach, h: 16,
                      dmg: (this.hartDetached ? 5 : 9) + this.combo * 2, hit: [] };
      Audio.sfx('punch');
      this.lastAttackKind = 'melee';
      if (!this.onGround) this.vy = Math.min(this.vy, 1.0);
    }

    // ----- H.A.R.T. blast (tap) / charged beam (hold) -----
    if (ctl && input.down('blast') && !this.hartDetached) {
      this.charge += dt;
      if (this.charge > 0.55 && Math.random() < 0.5) {
        world.parts.spawn({ x: this.x + (this.face > 0 ? this.w + 4 : -4), y: this.cy(),
          vx: C.rand(-.4, .4), vy: C.rand(-.4, .4), life: 0.3, size: 2, color: PAL.hartGlow, glow: true, grav: 0 });
      }
      if (this.charge > 0.55 && this.charge < 0.6) Audio.sfx('charge');
    } else if (this.charge > 0) {
      var charged = this.charge > 0.55;
      var cost = charged ? 40 : 14;
      if (!this.hartDetached && this.hart >= cost && this.blastCd <= 0) {
        this.hart -= cost;
        this.blastCd = charged ? 0.5 : 0.22;
        world.spawnShot({
          x: this.x + (this.face > 0 ? this.w : -6), y: this.y + 9,
          vx: this.face * (charged ? 9 : 7), vy: 0,
          w: charged ? 14 : 8, h: charged ? 8 : 5,
          dmg: charged ? 26 : 9, owner: 'player',
          color: charged ? PAL.hartGlow : PAL.hart, pierce: charged, life: 1.6, big: charged
        });
        Audio.sfx('blast');
        this.lastAttackKind = 'blast';
        this.vx -= this.face * (charged ? 1.6 : 0.4);
        if (charged) Gfx.shake(2, 0.12);
      } else if (this.hart < cost) Audio.sfx('deny');
      this.charge = 0;
    }

    // ----- detach / re-attach the H.A.R.T. -----
    if (ctl && input.pressed('hart') && this.game.canDetach) this.toggleHart(world);

    // ----- integrate -----
    this.vy = Math.min(this.vy + G, 13);
    this.onGround = false;
    world.move(this, this.vx, this.vy);

    if (this.hazardTouch(world)) this.hurt(12, world, -this.face);
    if (this.y > world.pxH + 40) this.hurt(9999, world, 0);

    this.state = this.attackT > 0 ? 'attack'
               : (!this.onGround ? (this.vy < 0 ? 'jump' : 'fall')
               : (Math.abs(this.vx) > 0.5 ? 'run' : 'idle'));
  };

  Player.prototype.hazardTouch = function (world) {
    return world.hazardRect({ x: this.x + 2, y: this.y + 2, w: this.w - 4, h: this.h - 4 });
  };

  Player.prototype.toggleHart = function (world) {
    if (!this.hartDetached) {
      this.hartDetached = true;
      this.hartObj = { x: this.cx(), y: this.cy(), vx: -this.face * 1.6, vy: -2.2, t: 0 };
      Audio.sfx('detach');
      Gfx.flash(PAL.hart, 0.35, 0.2);
      world.parts.burst(this.cx(), this.cy(), 22, { color: PAL.hartGlow, glow: true, smax: 3.4 });
    } else if (this.hartObj && C.dist(this.cx(), this.cy(), this.hartObj.x, this.hartObj.y) < 28) {
      this.hartDetached = false; this.hartObj = null;
      Audio.sfx('attach');
      world.parts.burst(this.cx(), this.cy(), 18, { color: PAL.hart, glow: true, smax: 3 });
    } else Audio.sfx('deny');
  };

  Player.prototype.hurt = function (n, world, kx) {
    if (this.invuln > 0 || this.dead) return false;
    this.hp -= n; this.invuln = 1.0; this.hurtT = 0.3;
    this.vx = (kx || -this.face) * 3.2; this.vy = -3.0;
    this.combo = 0;
    Audio.sfx('hurt'); Gfx.shake(3, 0.2); Gfx.flash(PAL.raRed, 0.25, 0.18);
    world.parts.burst(this.cx(), this.cy(), 14, { color: PAL.raRed, glow: true, smax: 3 });
    if (this.hp <= 0) { this.hp = 0; this.kill(world); }
    return true;
  };
  Player.prototype.kill = function (world) {
    if (this.dead) return;
    this.dead = true; this.deathT = 0; this.vy = -5; this.vx = -this.face * 2;
    Audio.sfx('gameover'); Gfx.shake(5, 0.5);
    world.parts.burst(this.cx(), this.cy(), 40, { color: PAL.hart, glow: true, smax: 4, lmax: 1.2 });
  };

  Player.prototype.draw = function (cam, world) {
    var fx = Math.round(this.cx() - cam.x), fy = Math.round(this.y + this.h - cam.y);
    if (this.dead) {
      // he goes the way he goes: black fragments, and the core last
      var t = Math.min(1, this.deathT / 1.4);
      for (var i = 0; i < 22; i++) {
        var a = i * 1.7 + this.deathT * 2, r = t * (18 + (i % 5) * 7);
        Gfx.rectA(fx + Math.cos(a) * r, fy - 16 + Math.sin(a) * r * 0.8,
                  3, 3, i % 3 ? '#141924' : PAL.steel, 1 - t);
      }
      Gfx.glow(fx, fy - 16, 26 * (1 - t), PAL.hart, 0.6 * (1 - t));
      return;
    }
    if (this.invuln > 0 && Math.floor(this.invuln * 20) % 2 === 0) return;

    if (world) contactShadow(this, world, cam);

    var pose = poseOf(this);
    var trail = this.dashT > 0 || Math.abs(this.vx) > 3.4;
    if (trail) {
      for (var k = 1; k <= 3; k++) {
        global.RA.spr.draw(sheets().gone, pose[0], pose[1],
          fx - this.face * k * 5, fy, this.face, { alpha: 0.16 * (4 - k) / 3 });
      }
    }
    global.RA.spr.draw(sheets().gone, pose[0], pose[1], fx, fy, this.face,
      { flash: this.hurtT > 0 ? '#ffffff' : null });

    // the H.A.R.T. throws real light while it is in his chest
    if (!this.hartDetached) {
      var lv = C.clamp(this.hart / this.hartMax, 0.2, 1);
      var pulse = 0.75 + 0.25 * Math.sin(this.anim * 0.9);
      Gfx.glow(fx, fy - 20, (13 + lv * 9) * pulse, PAL.hart, 0.38 * lv);
      Gfx.glow(fx, fy - 20, 5, PAL.hartGlow, 0.5 * lv);
    }
    if (this.charge > 0.55) {
      var cxp = fx + this.face * 13;
      Gfx.glow(cxp, fy - 18, 9 + Math.sin(this.anim * 3) * 3, PAL.hartGlow, 0.8);
      Gfx.ring(cxp, fy - 18, 7 + Math.sin(this.anim * 2) * 2, PAL.hart, 1, 0.7);
    }
    if (this.dashT > 0) Gfx.glow(fx, fy - 16, 22, PAL.hart, 0.4);
  };

  /* the detached H.A.R.T., lying on the floor being important */
  Player.prototype.drawHart = function (cam, world) {
    if (!this.hartObj) return;
    var o = this.hartObj;
    var x = Math.round(o.x - cam.x), y = Math.round(o.y - cam.y);
    var p = 0.6 + 0.4 * Math.sin(o.t * 5);
    Gfx.glow(x, y, 16 + p * 10, PAL.hart, 0.6);
    global.RA.spr.drawProp('hartShard', x, y + Math.sin(o.t * 2) * 1.5);
    Gfx.ring(x, y, 11 + p * 5, PAL.hart, 1, 0.45);
    Gfx.ring(x, y, 17 + p * 9, PAL.hart, 1, 0.18);
  };
  Player.prototype.updateHart = function (dt, world) {
    var o = this.hartObj; if (!o) return;
    o.t += dt;
    o.vy += 0.4; o.x += o.vx; o.y += o.vy; o.vx *= 0.96;
    var r = { x: o.x - 3, y: o.y - 3, w: 6, h: 6 };
    if (world.solidRect(r)) { o.y -= o.vy; o.vy = 0; o.vx *= 0.6; }
    if (Math.random() < 0.3) {
      world.parts.spawn({ x: o.x, y: o.y, vx: C.rand(-.3, .3), vy: C.rand(-.6, -.1),
        life: 0.5, size: 2, color: PAL.hart, glow: true, grav: 0 });
    }
  };

  /* ================= SHOTS ================= */
  function Shot(o) {
    this.x = o.x; this.y = o.y; this.w = o.w || 6; this.h = o.h || 4;
    this.vx = o.vx || 0; this.vy = o.vy || 0;
    this.dmg = o.dmg || 6; this.owner = o.owner || 'enemy';
    this.color = o.color || PAL.raRed; this.life = o.life || 2;
    this.pierce = !!o.pierce; this.big = !!o.big; this.remove = false;
    this.hitList = []; this.antiHart = !!o.antiHart; this.homing = o.homing || 0;
    this.t = 0;
  }
  Shot.prototype.update = function (dt, world, player) {
    this.t += dt;
    if (this.homing && player && !player.dead) {
      var dx = player.cx() - this.x, dy = player.cy() - this.y, d = Math.hypot(dx, dy) || 1;
      this.vx += (dx / d) * this.homing; this.vy += (dy / d) * this.homing;
      var sp = Math.hypot(this.vx, this.vy), mx = 5.2;
      if (sp > mx) { this.vx = this.vx / sp * mx; this.vy = this.vy / sp * mx; }
    }
    this.x += this.vx; this.y += this.vy;
    this.life -= dt;
    if (this.life <= 0) this.remove = true;
    if (!this.antiHart && world.solidRect({ x: this.x, y: this.y, w: this.w, h: this.h })) {
      world.parts.burst(this.x, this.y, 6, { color: this.color, glow: true, smax: 2, lmax: 0.3 });
      if (!this.pierce) this.remove = true;
    }
    if (Math.random() < 0.6) {
      world.parts.spawn({ x: this.x + this.w / 2, y: this.y + this.h / 2, vx: 0, vy: 0,
        life: 0.22, size: this.big ? 3 : 2, color: this.color, glow: true, grav: 0 });
    }
  };
  Shot.prototype.draw = function (cam) {
    var x = Math.round(this.x - cam.x), y = Math.round(this.y - cam.y);
    Gfx.glow(x + this.w / 2, y + this.h / 2, this.big ? 16 : 9, this.color, 0.55);
    Gfx.rect(x, y, this.w, this.h, this.color);
    Gfx.rect(x + 1, y + 1, this.w - 2, this.h - 2, '#ffffff');
  };

  /* ================= PICKUPS ================= */
  function Pickup(x, y, kind) {
    this.x = x + 2; this.y = y + 2; this.w = 12; this.h = 12;
    this.kind = kind; this.t = Math.random() * 6; this.remove = false;
  }
  Pickup.prototype.update = function (dt) { this.t += dt; };
  Pickup.prototype.draw = function (cam) {
    var x = Math.round(this.x - cam.x + 6);
    var y = Math.round(this.y - cam.y + 6 + Math.sin(this.t * 2.4) * 2.5);
    var p = 0.5 + 0.5 * Math.sin(this.t * 3);
    if (this.kind === 'hart') {
      Gfx.glow(x, y, 13 + p * 4, PAL.hart, 0.45);
      global.RA.spr.drawProp('hartShard', x, y);
    } else if (this.kind === 'repair') {
      Gfx.glow(x, y, 12, PAL.green, 0.35);
      global.RA.spr.drawProp('repairCell', x, y);
      Gfx.rectA(x - 4, y - 1, 8, 2, PAL.green, 0.9);
      Gfx.rectA(x - 1, y - 4, 2, 8, PAL.green, 0.9);
    } else {
      Gfx.glow(x, y, 15 + p * 6, PAL.gold, 0.4 + p * 0.2);
      global.RA.spr.drawProp('dataShard', x, y);
      Gfx.ring(x, y, 9 + p * 4, PAL.gold, 1, 0.45);
      Gfx.ring(x, y, 14 + p * 8, PAL.gold, 1, 0.18);
    }
  };

  /* ================= ENEMIES ================= */
  /* Random Access Sentry — the game's stock foot soldier */
  function Sentry(x, y) {
    Actor.call(this, x + 2, y - 8, 12, 24);
    this.type = 'sentry'; this.hp = this.maxhp = 22; this.score = 120;
    this.face = -1; this.lungeT = 0; this.cool = C.rand(0.4, 1.4);
  }
  Sentry.prototype = Object.create(Actor.prototype);
  Sentry.prototype.update = function (dt, world, player) {
    this.anim += dt * 10;
    if (this.hurtT > 0) this.hurtT -= dt;
    this.vy = Math.min(this.vy + 0.46, 12);
    var dx = player.cx() - this.cx(), adx = Math.abs(dx);
    var see = adx < 190 && Math.abs(player.cy() - this.cy()) < 60 && !player.dead;

    if (this.lungeT > 0) { this.lungeT -= dt; }
    else if (see) {
      this.face = dx > 0 ? 1 : -1;
      this.cool -= dt;
      if (adx < 46 && this.cool <= 0 && this.onGround) {
        this.lungeT = 0.45; this.cool = 1.3; this.vx = this.face * 4.2; this.vy = -2.6;
      } else if (adx > 26) this.vx = C.approach(this.vx, this.face * 1.25, 0.3);
      else this.vx = C.approach(this.vx, 0, 0.3);
    } else {
      this.vx = C.approach(this.vx, this.face * 0.6, 0.15);
      var probe = { x: this.x + this.face * 10, y: this.y + this.h + 2, w: 4, h: 4 };
      if (this.hitWall || !world.solidRect(probe)) { this.face *= -1; this.hitWall = false; }
    }
    this.onGround = false;
    world.move(this, this.vx, this.vy);
    if (this.onGround) this.vx *= 0.86;
  };
  Sentry.prototype.draw = function (cam, world) {
    var fx = Math.round(this.cx() - cam.x), fy = Math.round(this.y + this.h - cam.y);
    if (world) contactShadow(this, world, cam);
    var pose = poseOf(this);
    global.RA.spr.draw(sheets().sentry, pose[0], pose[1], fx, fy, this.face,
      { flash: this.hurtT > 0 ? '#ffd7d7' : null });
    Gfx.glow(fx, fy - 22, 7, PAL.raRed, 0.35);
  };

  /* RA-Drone — patrols the air, drops on you */
  function Drone(x, y) {
    Actor.call(this, x + 2, y, 14, 12);
    this.type = 'drone'; this.hp = this.maxhp = 14; this.score = 150;
    this.home = y + 6; this.t = C.rand(0, 6); this.diveT = 0; this.cool = C.rand(1, 3);
  }
  Drone.prototype = Object.create(Actor.prototype);
  Drone.prototype.update = function (dt, world, player) {
    this.t += dt; this.anim += dt * 12;
    if (this.hurtT > 0) this.hurtT -= dt;
    var dx = player.cx() - this.cx(), dy = player.cy() - this.cy();
    var near = Math.abs(dx) < 200 && !player.dead;
    if (this.diveT > 0) {
      this.diveT -= dt;
      this.x += this.vx; this.y += this.vy;
      if (world.solidRect(this)) {
        this.diveT = 0; this.vy = 0;
        world.parts.burst(this.cx(), this.cy(), 8, { color: PAL.raRed, glow: true });
        this.y -= 6;
      }
    } else if (near) {
      this.face = dx > 0 ? 1 : -1;
      this.x += C.clamp(dx * 0.012, -1.5, 1.5);
      this.y = C.lerp(this.y, this.home + Math.sin(this.t * 2) * 10, 0.05);
      this.cool -= dt;
      if (this.cool <= 0 && Math.abs(dx) < 90 && dy > 8) {
        this.cool = C.rand(2.2, 3.6); this.diveT = 0.9;
        var d = Math.hypot(dx, dy) || 1;
        this.vx = dx / d * 4.4; this.vy = dy / d * 4.4;
        Audio.sfx('dash');
      }
    } else {
      this.x += Math.sin(this.t) * 0.6;
      this.y = this.home + Math.sin(this.t * 2) * 8;
    }
  };
  Drone.prototype.draw = function (cam) {
    var cxp = Math.round(this.cx() - cam.x), cyp = Math.round(this.cy() - cam.y);
    var s = Math.sin(this.anim * 2) * 2;
    Gfx.glow(cxp, cyp, this.diveT > 0 ? 18 : 12, PAL.raRed, this.diveT > 0 ? 0.55 : 0.3);
    global.RA.spr.drawProp('droneWing', cxp - 9, cyp + s, { flip: -1 });
    global.RA.spr.drawProp('droneWing', cxp + 9, cyp - s);
    global.RA.spr.drawProp('drone', cxp, cyp, { flip: this.face });
    if (this.hurtT > 0) {
      Gfx.rectA(cxp - 8, cyp - 4, 16, 8, '#ffffff', 0.7);
    }
    if (this.diveT > 0) {
      Gfx.rectA(cxp - this.vx * 3, cyp - this.vy * 3, 2, 2, PAL.raRed, 0.6);
    }
  };

  /* Akashi Mask — moves on the motion-capture Akashi recorded */
  function Mask(x, y) {
    Actor.call(this, x + 2, y - 8, 12, 24);
    this.type = 'mask'; this.hp = this.maxhp = 26; this.score = 220;
    this.cool = C.rand(0.6, 1.6); this.blinkT = 0; this.strikeT = 0;
  }
  Mask.prototype = Object.create(Actor.prototype);
  Mask.prototype.update = function (dt, world, player) {
    this.anim += dt * 12;
    if (this.hurtT > 0) this.hurtT -= dt;
    if (this.blinkT > 0) this.blinkT -= dt;
    this.vy = Math.min(this.vy + 0.46, 12);
    var dx = player.cx() - this.cx(), adx = Math.abs(dx);
    if (!player.dead && adx < 220) {
      this.face = dx > 0 ? 1 : -1;
      this.cool -= dt;
      if (this.strikeT > 0) { this.strikeT -= dt; this.vx = this.face * 3.4; }
      else if (this.cool <= 0) {
        if (adx > 70 && this.blinkT <= 0) {                 // short-range blink
          this.blinkT = 0.35; this.cool = 1.6;
          world.parts.burst(this.cx(), this.cy(), 12, { color: PAL.magenta, glow: true });
          var nx = this.x + this.face * 56;
          var probe = { x: nx, y: this.y, w: this.w, h: this.h };
          if (!world.solidRect(probe)) this.x = nx;
          world.parts.burst(this.cx(), this.cy(), 12, { color: PAL.magenta, glow: true });
        } else if (adx < 60 && this.onGround) {
          this.strikeT = 0.35; this.cool = 1.1; this.vy = -3.2; Audio.sfx('punch');
        }
      } else this.vx = C.approach(this.vx, this.face * 1.6, 0.3);
    } else this.vx = C.approach(this.vx, 0, 0.2);
    this.onGround = false;
    world.move(this, this.vx, this.vy);
    if (this.onGround) this.vx *= 0.8;
  };
  Mask.prototype.draw = function (cam, world) {
    var fx = Math.round(this.cx() - cam.x), fy = Math.round(this.y + this.h - cam.y);
    if (world) contactShadow(this, world, cam);
    var pose = poseOf(this);
    if (this.blinkT > 0) {
      Gfx.glow(fx, fy - 16, 20, PAL.magenta, 0.5);
      for (var k = 1; k <= 2; k++) {
        global.RA.spr.draw(sheets().mask, pose[0], pose[1],
          fx - this.face * k * 9, fy, this.face, { alpha: 0.22 / k });
      }
    }
    global.RA.spr.draw(sheets().mask, pose[0], pose[1], fx, fy, this.face,
      { flash: this.hurtT > 0 ? '#ffffff' : null });
    Gfx.glow(fx, fy - 24, 8, PAL.magenta, 0.35);
  };

  /* Firewall Turret — bolted to the floor, unimpressed */
  function Turret(x, y) {
    Actor.call(this, x + 2, y + 4, 12, 12);
    this.type = 'turret'; this.hp = this.maxhp = 18; this.score = 100;
    this.cool = C.rand(0.5, 1.5); this.aim = 0;
  }
  Turret.prototype = Object.create(Actor.prototype);
  Turret.prototype.update = function (dt, world, player) {
    this.anim += dt * 4;
    if (this.hurtT > 0) this.hurtT -= dt;
    var dx = player.cx() - this.cx(), dy = player.cy() - this.cy();
    if (Math.abs(dx) < 240 && !player.dead) {
      this.face = dx > 0 ? 1 : -1;
      this.aim = Math.atan2(dy, dx);
      this.cool -= dt;
      if (this.cool <= 0) {
        this.cool = C.rand(1.4, 2.2);
        world.spawnShot({ x: this.cx() - 3, y: this.cy() - 2,
          vx: Math.cos(this.aim) * 3.4, vy: Math.sin(this.aim) * 3.4,
          w: 6, h: 4, dmg: 8, owner: 'enemy', color: PAL.raRed, life: 2.4 });
        Audio.sfx('blast');
      }
    }
  };
  Turret.prototype.draw = function (cam) {
    var cxp = Math.round(this.cx() - cam.x), cyp = Math.round(this.cy() - cam.y);
    var bx = cxp + Math.cos(this.aim) * 9, by = cyp - 2 + Math.sin(this.aim) * 9;
    Gfx.line(cxp, cyp - 2, bx, by, '#3d4a5f', 3);
    Gfx.line(cxp, cyp - 2, bx, by, PAL.raRed, 1);
    global.RA.spr.drawProp('turret', cxp, cyp);
    if (this.hurtT > 0) Gfx.rectA(cxp - 6, cyp - 4, 12, 8, '#ffffff', 0.7);
    Gfx.glow(bx, by, 6, PAL.raRed, 0.4 + (this.cool < 0.4 ? 0.4 : 0));
  };

  /* ================= RA.ONE INCURSION =================
     The film's most common complaint is that its villain is barely in it.
     So he interrupts you mid-level: phases in, asks his one question,
     takes a swing, phases out. He cannot be killed here — a player can
     only be killed in the third level, and so can he. */
  function Incursion(x, y, game) {
    Actor.call(this, x, y, 22, 40);
    this.type = 'incursion';
    this.game = game;
    this.phase = 'in'; this.pt = 0; this.hits = 0;
    this.cool = 0.9; this.act = null; this.actT = 0;
    this.anim = 0; this.face = -1; this.score = 0;
    this.invulnerable = true; this.contact = 11;
  }
  Incursion.prototype = Object.create(Actor.prototype);
  Incursion.prototype.constructor = Incursion;

  Incursion.prototype.damage = function (n, world) {
    // you cannot hurt him, but you can make him lose interest
    this.hits++;
    this.hurtT = 0.1;
    world.parts.burst(this.cx(), this.cy(), 6, { color: PAL.steelLite, smax: 2, lmax: 0.3 });
    if (this.hits === 1 && this.game) this.game.toast('HE CANNOT BE KILLED HERE', PAL.steelLite);
    if (this.hits > 9 && this.phase === 'act') { this.phase = 'out'; this.pt = 0; }
    return false;
  };

  Incursion.prototype.update = function (dt, world, player) {
    this.pt += dt; this.anim += dt * 8;
    if (this.hurtT > 0) this.hurtT -= dt;
    var dx = player.cx() - this.cx();
    this.face = dx > 0 ? 1 : -1;

    if (this.phase === 'in') {
      if (this.pt > 0.7) { this.phase = 'act'; this.pt = 0; }
      return;
    }
    if (this.phase === 'out') {
      if (this.pt > 0.5) this.remove = true;
      return;
    }

    // act
    if (this.pt > 7.5) { this.phase = 'out'; this.pt = 0; return; }
    this.vy = Math.min(this.vy + 0.46, 12);
    if (this.act === 'rush') {
      this.actT -= dt;
      this.vx = this.face * 5.6;
      if (this.actT <= 0 || this.hitWall) { this.act = null; this.hitWall = false; this.cool = 1.1; }
    } else if (this.act === 'bolt') {
      this.actT -= dt;
      if (this.actT <= 0) {
        Audio.sfx('blast');
        for (var i = -1; i <= 1; i++) {
          var a = Math.atan2(player.cy() - this.cy(), player.cx() - this.cx()) + i * 0.22;
          world.spawnShot({ x: this.cx(), y: this.cy(), vx: Math.cos(a) * 4.2, vy: Math.sin(a) * 4.2,
            w: 8, h: 5, dmg: 9, owner: 'enemy', color: PAL.raRed, life: 2.2 });
        }
        this.act = null; this.cool = 1.2;
      }
    } else {
      this.vx = C.approach(this.vx, Math.abs(dx) > 90 ? this.face * 1.8 : 0, 0.25);
      this.cool -= dt;
      if (this.cool <= 0) {
        if (Math.abs(dx) < 130 && Math.random() < 0.45) { this.act = 'rush'; this.actT = 0.5; }
        else { this.act = 'bolt'; this.actT = 0.35; }
      }
    }
    this.onGround = false;
    world.move(this, this.vx, this.vy);
    if (this.onGround && !this.act) this.vx *= 0.9;
  };

  Incursion.prototype.draw = function (cam, world) {
    var fx = Math.round(this.cx() - cam.x), fy = Math.round(this.y + this.h - cam.y);
    var a = 1;
    if (this.phase === 'in') a = C.clamp(this.pt / 0.7, 0, 1);
    if (this.phase === 'out') a = 1 - C.clamp(this.pt / 0.5, 0, 1);
    if (a < 1) {
      // materialising: torn scanlines resolving into a body
      for (var i = 0; i < 10; i++) {
        Gfx.rectA(fx - 20 + Math.random() * 40, fy - Math.random() * 44,
                  18, 2, PAL.raSeam, 0.5 * (1 - a));
      }
    }
    if (world && a > 0.9) contactShadow(this, world, cam);
    var pose = this.act === 'rush' ? ['run', Math.floor(this.anim)]
             : (this.act === 'bolt' ? ['cast', 1] : ['idle', Math.floor(this.anim * 0.35)]);
    global.RA.bosses.drawRa(fx, fy, {
      face: this.face, anim: pose[0], frame: pose[1],
      hurt: this.hurtT > 0, alpha: a, trail: this.act === 'rush'
    });
  };

  global.RA.ent = {
    World: World, Player: Player, Shot: Shot, Pickup: Pickup,
    Sentry: Sentry, Drone: Drone, Mask: Mask, Turret: Turret, Incursion: Incursion,
    Actor: Actor, sheets: sheets, poseOf: poseOf, contactShadow: contactShadow
  };
})(window);
