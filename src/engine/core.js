/* =============================================================
   RA.ONE — LUCIFER PROTOCOL
   engine/core.js — maths, palette, renderer, particles, camera
   ============================================================= */
(function (global) {
  'use strict';

  var VIEW_W = 640, VIEW_H = 360, TILE = 16;

  /* ---------- maths ---------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function approach(v, target, step) {
    if (v < target) return Math.min(v + step, target);
    if (v > target) return Math.max(v - step, target);
    return v;
  }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function aabb(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }
  function dist(ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }

  /* ---------- palette ----------
     Movie-derived: G.One is white/graphite with cyan H.A.R.T. light,
     Ra.One is black/graphite with hot white-blue seams and red scan-eyes. */
  var PAL = {
    void:      '#05060b',
    deep:      '#0a0f1c',
    grid:      '#12203a',
    steel:     '#28374f',
    steelLite: '#42556f',
    white:     '#eef4ff',
    bone:      '#c8d4e6',
    hart:      '#38d8ff',
    hartDeep:  '#0b7fb5',
    hartGlow:  '#a8f2ff',
    ra:        '#1e232e',
    raSeam:    '#dfe9ff',
    raRed:     '#ff2f45',
    amber:     '#ffb400',
    gold:      '#ffdf5a',
    saffron:   '#ff7a1a',
    green:     '#3ef08a',
    magenta:   '#ff3fd0',
    shadow:    'rgba(0,0,0,0.45)'
  };

  /* ---------- renderer ---------- */
  var Gfx = {
    canvas: null, ctx: null,
    shakeT: 0, shakeMag: 0, shakeX: 0, shakeY: 0,
    flashT: 0, flashColor: '#ffffff', flashAlpha: 0,

    init: function (canvas) {
      this.canvas = canvas;
      canvas.width = VIEW_W; canvas.height = VIEW_H;
      this.ctx = canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;
      this.initPost();
      this.resize();
      global.addEventListener('resize', this.resize.bind(this));
      return this;
    },

    /* ---------- post-processing ----------
       A bright-pass + blur composited back additively. Every glow, every
       neon edge, every muzzle flash gets real bloom out of it, which is
       most of the difference between "shapes on a background" and "light". */
    initPost: function () {
      this.postOn = true;
      this.bloomScale = 3;
      var bw = Math.ceil(VIEW_W / this.bloomScale), bh = Math.ceil(VIEW_H / this.bloomScale);
      this.bloomCv = document.createElement('canvas');
      this.bloomCv.width = bw; this.bloomCv.height = bh;
      this.bloomCtx = this.bloomCv.getContext('2d');
      this.bloomAmt = 0.45;

      // one tile of static, shifted every frame — analog noise for free
      var g = document.createElement('canvas');
      g.width = 128; g.height = 128;
      var gc = g.getContext('2d');
      var img = gc.createImageData(128, 128), d = img.data;
      for (var i = 0; i < 128 * 128; i++) {
        var v = Math.random() * 255;
        d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v;
        d[i * 4 + 3] = 14;
      }
      gc.putImageData(img, 0, 0);
      this.grainCv = g;
    },

    post: function () {
      if (!this.postOn || this.postDone) return;
      this.postDone = true;
      var c = this.ctx, b = this.bloomCtx;
      var bw = this.bloomCv.width, bh = this.bloomCv.height;
      try {
        b.setTransform(1, 0, 0, 1, 0, 0);
        b.globalCompositeOperation = 'source-over';
        b.clearRect(0, 0, bw, bh);
        b.filter = 'brightness(1.05) contrast(3.4) blur(2px)';
        b.drawImage(this.canvas, 0, 0, bw, bh);
        b.filter = 'none';
        c.save();
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = this.bloomAmt;
        c.imageSmoothingEnabled = true;
        c.drawImage(this.bloomCv, 0, 0, VIEW_W, VIEW_H);
        c.imageSmoothingEnabled = false;
        c.restore();
      } catch (e) { this.postOn = false; }

      // grain, drifting so it never looks like a stuck texture
      c.save();
      c.globalAlpha = 0.34;
      var ox = -Math.floor(Math.random() * 128), oy = -Math.floor(Math.random() * 128);
      for (var x = ox; x < VIEW_W; x += 128) {
        for (var y = oy; y < VIEW_H; y += 128) c.drawImage(this.grainCv, x, y);
      }
      c.restore();
    },

    resize: function () {
      var wrap = this.canvas.parentElement;
      if (!wrap) return;
      var aw = wrap.clientWidth || VIEW_W, ah = wrap.clientHeight || VIEW_H;
      var scale = Math.min(aw / VIEW_W, ah / VIEW_H);
      if (scale > 1) scale = Math.max(1, Math.floor(scale * 2) / 2); // half-steps keep it crisp
      this.canvas.style.width = Math.round(VIEW_W * scale) + 'px';
      this.canvas.style.height = Math.round(VIEW_H * scale) + 'px';
    },

    shake: function (mag, time) {
      if (mag > this.shakeMag || this.shakeT <= 0) { this.shakeMag = mag; this.shakeT = time; }
    },
    flash: function (color, alpha, time) {
      this.flashColor = color; this.flashAlpha = alpha; this.flashT = time;
    },
    updateFx: function (dt) {
      if (this.shakeT > 0) {
        this.shakeT -= dt;
        var f = Math.max(0, this.shakeT);
        this.shakeX = rand(-1, 1) * this.shakeMag * f;
        this.shakeY = rand(-1, 1) * this.shakeMag * f;
        if (this.shakeT <= 0) { this.shakeX = this.shakeY = 0; this.shakeMag = 0; }
      }
      if (this.flashT > 0) this.flashT -= dt;
    },

    begin: function () {
      var c = this.ctx;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.fillStyle = PAL.void;
      c.fillRect(0, 0, VIEW_W, VIEW_H);
      this.postDone = false;
      c.translate(Math.round(this.shakeX), Math.round(this.shakeY));
    },
    end: function () {
      var c = this.ctx;
      c.setTransform(1, 0, 0, 1, 0, 0);
      this.post();
      if (this.flashT > 0) {
        c.globalAlpha = clamp(this.flashAlpha * this.flashT * 6, 0, 1);
        c.fillStyle = this.flashColor;
        c.fillRect(0, 0, VIEW_W, VIEW_H);
        c.globalAlpha = 1;
      }
    },

    /* primitives */
    rect: function (x, y, w, h, color) {
      var c = this.ctx; c.fillStyle = color;
      c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    },
    rectA: function (x, y, w, h, color, alpha) {
      var c = this.ctx; c.globalAlpha = alpha; this.rect(x, y, w, h, color); c.globalAlpha = 1;
    },
    line: function (x1, y1, x2, y2, color, w) {
      var c = this.ctx;
      c.strokeStyle = color; c.lineWidth = w || 1;
      c.beginPath(); c.moveTo(x1 + 0.5, y1 + 0.5); c.lineTo(x2 + 0.5, y2 + 0.5); c.stroke();
    },
    circle: function (x, y, r, color) {
      var c = this.ctx; c.fillStyle = color;
      c.beginPath(); c.arc(Math.round(x), Math.round(y), r, 0, Math.PI * 2); c.fill();
    },
    ring: function (x, y, r, color, w, alpha) {
      var c = this.ctx;
      c.globalAlpha = alpha === undefined ? 1 : alpha;
      c.strokeStyle = color; c.lineWidth = w || 1;
      c.beginPath(); c.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2); c.stroke();
      c.globalAlpha = 1;
    },
    /* soft additive bloom — the H.A.R.T. glow */
    glow: function (x, y, r, color, alpha) {
      var c = this.ctx;
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = alpha === undefined ? 0.5 : alpha;
      var g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
      c.restore();
    },

    /* text — chunky monospace, drawn into the low-res buffer so it pixel-scales */
    text: function (str, x, y, opt) {
      opt = opt || {};
      var c = this.ctx;
      var size = opt.size || 8;
      c.font = (opt.bold === false ? '' : 'bold ') + size + 'px "Courier New", ui-monospace, monospace';
      c.textAlign = opt.align || 'left';
      c.textBaseline = 'top';
      if (opt.shadow !== false) {
        c.fillStyle = opt.shadowColor || 'rgba(0,0,0,0.85)';
        c.fillText(str, Math.round(x) + 1, Math.round(y) + 1);
      }
      if (opt.glow) { c.save(); c.shadowColor = opt.glow; c.shadowBlur = 8; }
      c.fillStyle = opt.color || PAL.white;
      c.globalAlpha = opt.alpha === undefined ? 1 : opt.alpha;
      c.fillText(str, Math.round(x), Math.round(y));
      c.globalAlpha = 1;
      if (opt.glow) c.restore();
    },
    textWidth: function (str, size) {
      var c = this.ctx;
      c.font = 'bold ' + (size || 8) + 'px "Courier New", ui-monospace, monospace';
      return c.measureText(str).width;
    },
    /* word-wrap helper for the codex */
    wrap: function (str, size, maxW) {
      var words = String(str).split(' '), lines = [], cur = '';
      for (var i = 0; i < words.length; i++) {
        var t = cur ? cur + ' ' + words[i] : words[i];
        if (this.textWidth(t, size) > maxW && cur) { lines.push(cur); cur = words[i]; }
        else cur = t;
      }
      if (cur) lines.push(cur);
      return lines;
    }
  };

  /* ---------- particles ---------- */
  function Particles() { this.list = []; }
  Particles.prototype.spawn = function (o) {
    this.list.push({
      x: o.x, y: o.y, vx: o.vx || 0, vy: o.vy || 0,
      life: o.life || 0.5, max: o.life || 0.5,
      size: o.size || 2, color: o.color || PAL.hart,
      grav: o.grav === undefined ? 0.1 : o.grav,
      drag: o.drag === undefined ? 1 : o.drag,
      glow: !!o.glow, ring: !!o.ring, spin: o.spin || 0
    });
  };
  Particles.prototype.burst = function (x, y, n, o) {
    o = o || {};
    for (var i = 0; i < n; i++) {
      var a = o.angle === undefined ? rand(0, Math.PI * 2) : o.angle + rand(-o.spread || -0.6, o.spread || 0.6);
      var s = rand(o.smin === undefined ? 0.6 : o.smin, o.smax === undefined ? 3 : o.smax);
      this.spawn({
        x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: rand(o.lmin || 0.25, o.lmax || 0.7), size: o.size || randInt(1, 3),
        color: o.color || PAL.hart, grav: o.grav, drag: o.drag, glow: o.glow
      });
    }
  };
  Particles.prototype.update = function (dt) {
    for (var i = this.list.length - 1; i >= 0; i--) {
      var p = this.list[i];
      p.x += p.vx; p.y += p.vy;
      p.vy += p.grav; p.vx *= p.drag; p.vy *= p.drag;
      p.life -= dt;
      if (p.life <= 0) this.list.splice(i, 1);
    }
  };
  Particles.prototype.draw = function (cam) {
    for (var i = 0; i < this.list.length; i++) {
      var p = this.list[i], t = clamp(p.life / p.max, 0, 1);
      var x = p.x - cam.x, y = p.y - cam.y;
      if (p.glow) Gfx.glow(x, y, p.size * 3, p.color, 0.35 * t);
      Gfx.rectA(x - p.size / 2, y - p.size / 2, p.size, p.size, p.color, t);
    }
  };
  Particles.prototype.clear = function () { this.list.length = 0; };

  /* ---------- camera ---------- */
  function Camera(w, h) {
    this.x = 0; this.y = 0; this.w = w; this.h = h;
    this.boundsW = w; this.boundsH = h; this.lockX = false;
  }
  Camera.prototype.follow = function (target, snap) {
    if (this.lockX) return;
    var tx = clamp(target.x + target.w / 2 - this.w / 2, 0, Math.max(0, this.boundsW - this.w));
    var ty = clamp(target.y + target.h / 2 - this.h / 2 + 20, 0, Math.max(0, this.boundsH - this.h));
    if (snap) { this.x = tx; this.y = ty; }
    else { this.x = lerp(this.x, tx, 0.12); this.y = lerp(this.y, ty, 0.08); }
  };
  Camera.prototype.clampX = function () {
    this.x = clamp(this.x, 0, Math.max(0, this.boundsW - this.w));
  };

  global.RA = global.RA || {};
  global.RA.core = {
    VIEW_W: VIEW_W, VIEW_H: VIEW_H, TILE: TILE,
    PAL: PAL, Gfx: Gfx, Particles: Particles, Camera: Camera,
    clamp: clamp, lerp: lerp, approach: approach, rand: rand, randInt: randInt,
    pick: pick, aabb: aabb, dist: dist
  };
})(window);
