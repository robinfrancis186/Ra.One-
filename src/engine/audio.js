/* =============================================================
   engine/audio.js — original chiptune + SFX, pure WebAudio.
   Melodies are written in a Phrygian-dominant (Bhairav-flavoured)
   scale: original music, but with an unmistakably filmi colour.
   Nothing here is sampled or transcribed from the soundtrack.
   ============================================================= */
(function (global) {
  'use strict';

  var SCALE = [0, 1, 4, 5, 7, 8, 11];           // 1 b2 3 4 5 b6 7
  function deg(d) {                              // scale degree -> semitones
    var oct = Math.floor(d / 7), i = ((d % 7) + 7) % 7;
    return SCALE[i] + 12 * oct;
  }
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  var A = {
    ctx: null, master: null, musicGain: null, sfxGain: null,
    muted: false, track: null, step: 0, nextTime: 0, timer: null, ready: false,

    init: function () {
      if (this.ctx) return this;
      var AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return this;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.9;
      this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.32;
      this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = 0.42;
      this.musicGain.connect(this.master); this.sfxGain.connect(this.master);
      this.master.connect(this.ctx.destination);
      this.ready = true;
      return this;
    },
    resume: function () {
      this.init();
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },
    toggleMute: function () {
      this.muted = !this.muted;
      if (this.master) this.master.gain.value = this.muted ? 0 : 0.9;
      return this.muted;
    },

    /* ---------- voices ---------- */
    tone: function (freq, t, dur, type, gain, dest, glide) {
      if (!this.ctx) return;
      var c = this.ctx, o = c.createOscillator(), g = c.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t);
      if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(20, glide), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(dest || this.sfxGain);
      o.start(t); o.stop(t + dur + 0.02);
    },
    noise: function (t, dur, gain, freq, q, dest) {
      if (!this.ctx) return;
      var c = this.ctx, n = Math.floor(c.sampleRate * dur);
      if (n <= 0) return;
      var buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      var src = c.createBufferSource(); src.buffer = buf;
      var f = c.createBiquadFilter(); f.type = 'bandpass';
      f.frequency.value = freq || 2200; f.Q.value = q || 1;
      var g = c.createGain(); g.gain.value = gain;
      src.connect(f); f.connect(g); g.connect(dest || this.sfxGain);
      src.start(t); src.stop(t + dur);
    },

    /* ---------- SFX ---------- */
    sfx: function (name) {
      if (!this.ctx || this.muted) return;
      var t = this.ctx.currentTime, s = this.sfxGain;
      switch (name) {
        case 'jump':    this.tone(300, t, 0.14, 'square', 0.16, s, 620); break;
        case 'land':    this.noise(t, 0.06, 0.10, 700, 1.2, s); break;
        case 'punch':   this.tone(180, t, 0.07, 'square', 0.16, s, 90);
                        this.noise(t, 0.05, 0.10, 1400, 1.4, s); break;
        case 'hitflesh':this.noise(t, 0.11, 0.16, 900, 0.9, s);
                        this.tone(120, t, 0.10, 'sawtooth', 0.10, s, 60); break;
        case 'blast':   this.tone(900, t, 0.16, 'square', 0.13, s, 260);
                        this.tone(1350, t, 0.10, 'triangle', 0.07, s, 400); break;
        case 'charge':  this.tone(200, t, 0.5, 'triangle', 0.07, s, 1200); break;
        case 'dash':    this.noise(t, 0.15, 0.10, 3000, 0.7, s);
                        this.tone(600, t, 0.12, 'triangle', 0.07, s, 1500); break;
        case 'hurt':    this.tone(220, t, 0.22, 'sawtooth', 0.18, s, 70);
                        this.noise(t, 0.16, 0.12, 400, 0.8, s); break;
        case 'pickup':  this.tone(mtof(84), t, 0.07, 'square', 0.13, s);
                        this.tone(mtof(91), t + 0.07, 0.10, 'square', 0.13, s); break;
        case 'codex':   this.tone(mtof(76), t, 0.08, 'triangle', 0.14, s);
                        this.tone(mtof(83), t + 0.08, 0.08, 'triangle', 0.14, s);
                        this.tone(mtof(88), t + 0.16, 0.16, 'triangle', 0.14, s); break;
        case 'menu':    this.tone(700, t, 0.04, 'square', 0.10, s); break;
        case 'select':  this.tone(520, t, 0.06, 'square', 0.13, s, 900); break;
        case 'deny':    this.tone(160, t, 0.16, 'square', 0.14, s, 110); break;
        case 'detach':  this.tone(1400, t, 0.30, 'sine', 0.14, s, 180);
                        this.noise(t, 0.25, 0.08, 500, 0.6, s); break;
        case 'attach':  this.tone(180, t, 0.30, 'sine', 0.14, s, 1400); break;
        case 'shot':    this.tone(1800, t, 0.05, 'square', 0.18, s, 200);
                        this.noise(t, 0.22, 0.20, 800, 0.5, s); break;
        case 'explode': this.noise(t, 0.6, 0.28, 300, 0.5, s);
                        this.tone(140, t, 0.5, 'sawtooth', 0.16, s, 40); break;
        case 'bossroar':this.tone(90, t, 0.9, 'sawtooth', 0.20, s, 45);
                        this.noise(t, 0.9, 0.14, 260, 0.4, s); break;
        case 'levelup': [0, 4, 7, 11, 14].forEach(function (n, i) {
                          A.tone(mtof(60 + n), t + i * 0.09, 0.22, 'square', 0.13, s);
                        }); break;
        case 'gameover':[0, -2, -4, -7].forEach(function (n, i) {
                          A.tone(mtof(60 + n), t + i * 0.22, 0.4, 'triangle', 0.14, s);
                        }); break;
      }
    },

    /* ---------- music ----------
       Each track: bpm, root (midi), and 16-step bass / 32-step lead /
       16-step drum patterns. Steps are 16th notes. */
    tracks: {
      title: {
        bpm: 92, root: 45,
        bass: [0, null, null, 0, null, null, 2, null, 3, null, null, 3, null, null, 0, null],
        lead: [7, null, 8, null, 9, null, 8, null, 7, null, null, null, 4, null, null, null,
               5, null, 4, null, 3, null, 4, null, 2, null, null, null, null, null, null, null],
        drums: ['.', '.', 'h', '.', 'k', '.', 'h', '.', '.', '.', 'h', '.', 's', '.', 'h', '.'],
        leadWave: 'triangle'
      },
      lvl1: {
        bpm: 132, root: 45,
        bass: [0, 0, null, 0, 0, null, 0, null, 3, 3, null, 3, 2, null, 2, null],
        lead: [7, 9, 8, 7, 5, null, 4, null, 3, 4, 5, null, 4, null, null, null,
               7, 9, 11, 9, 8, null, 7, null, 5, 4, 3, null, 2, null, 0, null],
        drums: ['k', '.', 'h', '.', 's', '.', 'h', '.', 'k', 'k', 'h', '.', 's', '.', 'h', 'h'],
        leadWave: 'square'
      },
      lvl2: {
        bpm: 156, root: 43,
        bass: [0, 0, 0, null, 0, 0, 0, null, 5, 5, 5, null, 4, 4, 4, null],
        lead: [11, null, 10, null, 9, null, 8, null, 7, 8, 9, null, 11, null, null, null,
               12, null, 11, null, 9, null, 8, null, 7, null, 5, null, 4, null, 3, null],
        drums: ['k', 'h', 'h', 'h', 's', 'h', 'h', 'h', 'k', 'h', 'k', 'h', 's', 'h', 'h', 'h'],
        leadWave: 'square'
      },
      lvl3: {
        bpm: 144, root: 41,
        bass: [0, null, 0, 0, null, 0, null, 0, 1, null, 1, 1, null, 1, null, null],
        lead: [0, null, 3, null, 4, null, 3, null, 2, null, 1, null, 0, null, null, null,
               4, null, 5, null, 6, null, 5, null, 4, null, 3, null, 2, null, 1, null],
        drums: ['k', '.', 'h', 'k', 's', '.', 'h', '.', 'k', '.', 'h', 'k', 's', 'h', 's', 'h'],
        leadWave: 'sawtooth'
      },
      boss: {
        bpm: 158, root: 40,
        bass: [0, 0, null, 0, 0, null, 1, null, 0, 0, null, 0, 4, null, 3, null],
        lead: [14, null, 13, null, 11, 10, 9, null, 7, null, 9, 11, null, 10, null, 9,
               7, null, 6, null, 4, 3, 2, null, 0, null, 2, 3, null, 4, null, null],
        drums: ['k', 'h', 's', 'h', 'k', 'h', 's', 'h', 'k', 'k', 's', 'h', 'k', 'h', 's', 's'],
        leadWave: 'square'
      },
      ending: {
        bpm: 80, root: 45,
        bass: [0, null, null, null, 3, null, null, null, 4, null, null, null, 2, null, null, null],
        lead: [4, null, null, 5, null, null, 4, null, 2, null, null, null, 0, null, null, null,
               2, null, null, 3, null, null, 2, null, 0, null, null, null, null, null, null, null],
        drums: ['.', '.', '.', '.', 'h', '.', '.', '.', '.', '.', '.', '.', 'h', '.', '.', '.'],
        leadWave: 'triangle'
      }
    },

    play: function (name) {
      this.init();
      if (!this.ctx) return;
      if (this.trackName === name) return;
      this.stop();
      this.trackName = name;
      this.track = this.tracks[name];
      if (!this.track) return;
      this.step = 0;
      this.nextTime = this.ctx.currentTime + 0.05;
      var self = this;
      this.timer = setInterval(function () { self.schedule(); }, 25);
    },
    stop: function () {
      if (this.timer) { clearInterval(this.timer); this.timer = null; }
      this.track = null; this.trackName = null;
    },

    schedule: function () {
      if (!this.track || !this.ctx) return;
      var stepDur = 60 / this.track.bpm / 4;
      var horizon = this.ctx.currentTime + 0.15;
      while (this.nextTime < horizon) {
        this.emitStep(this.step, this.nextTime, stepDur);
        this.nextTime += stepDur;
        this.step++;
      }
    },

    emitStep: function (step, t, sd) {
      var tr = this.track, g = this.musicGain;
      var b = tr.bass[step % tr.bass.length];
      if (b !== null && b !== undefined) {
        this.tone(mtof(tr.root + deg(b) - 12), t, sd * 2.4, 'triangle', 0.30, g);
        this.tone(mtof(tr.root + deg(b) - 24), t, sd * 2.0, 'sawtooth', 0.10, g);
      }
      var l = tr.lead[step % tr.lead.length];
      if (l !== null && l !== undefined) {
        var f = mtof(tr.root + 12 + deg(l));
        this.tone(f, t, sd * 1.9, tr.leadWave, 0.16, g);
        this.tone(f * 1.005, t, sd * 1.9, tr.leadWave, 0.07, g);   // detune shimmer
        this.tone(f * 2, t, sd * 0.9, 'triangle', 0.04, g);        // octave sparkle
      }
      var d = tr.drums[step % tr.drums.length];
      if (d === 'k') { this.tone(150, t, 0.13, 'sine', 0.34, g, 45); }
      else if (d === 's') { this.noise(t, 0.11, 0.18, 1700, 0.9, g); }
      else if (d === 'h') { this.noise(t, 0.035, 0.07, 8000, 0.6, g); }
    }
  };

  global.RA = global.RA || {};
  global.RA.Audio = A;
})(window);
