/* =============================================================
   engine/input.js — keyboard + touch, action-mapped
   ============================================================= */
(function (global) {
  'use strict';

  var MAP = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    Space: 'jump', KeyZ: 'jump',
    KeyX: 'hit', KeyJ: 'hit',
    KeyC: 'blast', KeyK: 'blast',
    ShiftLeft: 'dash', ShiftRight: 'dash', KeyL: 'dash',
    KeyH: 'hart',
    Enter: 'start', NumpadEnter: 'start',
    Escape: 'pause', KeyP: 'pause',
    Tab: 'codex',
    KeyM: 'mute'
  };

  var Input = {
    state: {}, last: {}, latch: {}, anyPressed: false, touch: false,
    buttons: [],

    init: function (canvas) {
      var self = this;
      global.addEventListener('keydown', function (e) {
        var a = MAP[e.code];
        if (a) {
          e.preventDefault();
          self.state[a] = true;
          if (!e.repeat) self.latch[a] = true;   // latch, so a 1ms tap is never lost
          self.anyPressed = true;
        }
        // free typing for the player-name entry
        self.lastKey = e.key;
        self.lastCode = e.code;
      });
      global.addEventListener('keyup', function (e) {
        var a = MAP[e.code];
        if (a) { e.preventDefault(); self.state[a] = false; }
      });
      global.addEventListener('blur', function () { self.state = {}; self.latch = {}; });
      this.initTouch(canvas);
      return this;
    },

    /* on-screen controls appear only if the device reports touch */
    initTouch: function (canvas) {
      if (!('ontouchstart' in global) && !navigator.maxTouchPoints) return;
      this.touch = true;
      var pad = document.getElementById('touchpad');
      if (!pad) return;
      pad.style.display = 'flex';
      var self = this;
      var els = pad.querySelectorAll('[data-act]');
      for (var i = 0; i < els.length; i++) {
        (function (el) {
          var act = el.getAttribute('data-act');
          function on(e) {
            e.preventDefault();
            self.state[act] = true; self.latch[act] = true;
            self.anyPressed = true; el.classList.add('on');
          }
          function off(e) { e.preventDefault(); self.state[act] = false; el.classList.remove('on'); }
          el.addEventListener('touchstart', on, { passive: false });
          el.addEventListener('touchend', off, { passive: false });
          el.addEventListener('touchcancel', off, { passive: false });
          el.addEventListener('mousedown', on);
          el.addEventListener('mouseup', off);
          el.addEventListener('mouseleave', off);
        })(els[i]);
      }
    },

    down: function (a) { return !!this.state[a]; },
    /* consumes the latch: one press == one trigger, however short the tap */
    pressed: function (a) {
      if (this.latch[a]) { this.latch[a] = false; return true; }
      return false;
    },
    released: function (a) { return !this.state[a] && !!this.last[a]; },
    anyStart: function () {
      return this.pressed('start') || this.pressed('jump') || this.pressed('hit');
    },
    endFrame: function () {
      this.last = {};
      for (var k in this.state) this.last[k] = this.state[k];
      this.latch = {};
      this.anyPressed = false;
      this.lastKey = null; this.lastCode = null;
    }
  };

  global.RA = global.RA || {};
  global.RA.Input = Input;
})(window);
