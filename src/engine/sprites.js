/* =============================================================
   engine/sprites.js — the asset pipeline.

   There are no image files in this project and there cannot be
   (the page ships as one file). So the art is authored as pixel
   maps, assembled on a 2D skeleton, and BAKED into offscreen
   canvases once at boot: pose the rig, composite the parts, run
   an auto-outline and a rim-light pass over the result, keep the
   canvas. At runtime every character is a single drawImage.

   Authoring a part: rows of characters, one char per pixel.
     '.' transparent   '1' light   '2' mid   '3' dark
     '5' glow          '6' glow hot   '7' deep shadow
   Palettes are swapped per character, which is how the same rig
   gives us G.One, a Random Access sentry and an Akashi Mask —
   fitting, since in the fiction they are all avatars off one
   motion-capture rig anyway.
   ============================================================= */
(function (global) {
  'use strict';
  var RA = global.RA, C = RA.core;
  var D2R = Math.PI / 180;

  /* ---------------- palettes ---------------- */
  var PALETTES = {
    gone:   { '1': '#f4f9ff', '2': '#c6d3e6', '3': '#6d7e99', '4': '#39465c',
              '5': '#38d8ff', '6': '#c4f6ff', '7': '#0b1220' },
    goneLo: { '1': '#c9d6e8', '2': '#9dacc4', '3': '#55637c', '4': '#2b3648',
              '5': '#1f89ad', '6': '#61b9d4', '7': '#0b1220' },
    raone:  { '1': '#39405280', '2': '#262c3a', '3': '#151a24', '4': '#0d1119',
              '5': '#ff2f45', '6': '#ffd0d6', '7': '#05070c' },
    sentry: { '1': '#8f9db5', '2': '#5c6a82', '3': '#333e52', '4': '#1d2534',
              '5': '#ff3a4e', '6': '#ffc2c8', '7': '#080c14' },
    mask:   { '1': '#6d5a82', '2': '#4a3a5c', '3': '#2c2238', '4': '#181222',
              '5': '#ff3fd0', '6': '#ffcdf3', '7': '#0a0610' },
    ghost:  { '1': '#2a3346', '2': '#212a3a', '3': '#19202c', '4': '#131923',
              '5': '#3a4a66', '6': '#5a6d8c', '7': '#0a0e16' }
  };
  // raone '1' carried an alpha by mistake in authoring; keep it opaque
  PALETTES.raone['1'] = '#394052';

  /* ---------------- part art ---------------- */
  var ART = {
    /* --- shared humanoid limbs, cut to game scale: a character
           stands about two tiles tall, which is what a 16px world wants --- */
    upperArm: [
      '3333',
      '3113',
      '3223',
      '3113',
      '3223',
      '.33.'
    ],
    foreArm: [
      '.33.',
      '3113',
      '3223',
      '3113',
      '3553',
      '.33.'
    ],
    thigh: [
      '33333',
      '31113',
      '32213',
      '31113',
      '31113',
      '32213',
      '.333.'
    ],
    shin: [
      '.333.',
      '31113',
      '32213',
      '31113',
      '31113',
      '35553',
      '33333',
      '31113',
      '.333.'
    ],
    pelvis: [
      '33333333',
      '32111123',
      '32222223',
      '.333333.'
    ],

    /* --- G.One: helmet with a lit visor, core in the chest --- */
    goneHead: [
      '...3333...',
      '.33111133.',
      '3111111113',
      '3315555513',
      '3316666613',
      '3111111113',
      '.31111113.',
      '..333333..',
      '....22....'
    ],
    goneTorso: [
      '..33333333..',
      '.3111111113.',
      '311111111113',
      '311155551113',
      '311156651113',
      '311155551113',
      '311111111113',
      '321111111123',
      '332211112233',
      '.3322222233.',
      '..33333333..'
    ],

    /* --- Ra.One: no face, a scan band where one should be, and
           a cape that reads wider than the body --- */
    raHead: [
      '...3333...',
      '.33222233.',
      '3222222223',
      '3325555523',
      '3322222223',
      '3222222223',
      '.32222223.',
      '..333333..',
      '....22....'
    ],
    raTorso: [
      '..3333333333..',
      '.332222222233.',
      '33222222222233',
      '32221111122223',
      '32215555512223',
      '32215665512223',
      '32215555512223',
      '32221111122223',
      '33222222222233',
      '.332222222233.',
      '..3333333333..',
      '...32222223...'
    ],
    raCape: [
      '...3333333333...',
      '..333333333333..',
      '.33333333333333.',
      '3333333333333333',
      '3333333333333333',
      '3334444444443333',
      '3333333333333333',
      '3333333333333333',
      '3333333333333333',
      '.33333333333333.',
      '.33333333333333.',
      '..333333333333..',
      '..3333333333 3..',
      '..3.3.333.3.3...',
      '.3..3..3..3..3..'
    ],

    /* --- enemy heads --- */
    sentryHead: [
      '...3333...',
      '.33222233.',
      '3222222223',
      '3321555523',
      '3322222223',
      '3222222223',
      '.32222223.',
      '..333333..',
      '....22....'
    ],
    maskHead: [
      '...3333...',
      '.33111133.',
      '3111111113',
      '3155555513',
      '3115555113',
      '3111111113',
      '.31551113.',
      '..333333..',
      '....22....'
    ],

    /* --- non-rigged props --- */
    drone: [
      '....333333....',
      '..3311111133..',
      '.331222222133.',
      '33122222222133',
      '.331255552133.',
      '..3312222133..',
      '....333333....'
    ],
    droneWing: [
      '3333',
      '3113',
      '.33.'
    ],
    turret: [
      '..33333333..',
      '.3311111133.',
      '331222222133',
      '331255552133',
      '331222222133',
      '333333333333',
      '.3322222233.',
      '..33333333..'
    ],
    hartShard: [
      '....55....',
      '....65....',
      '..5.66.5..',
      '.556666555',
      '5566666655',
      '.556666555',
      '..5.66.5..',
      '....65....',
      '....55....'
    ],
    repairCell: [
      '..333333..',
      '.31111113.',
      '3115115113',
      '3111111113',
      '3555555553',
      '3111111113',
      '3115115113',
      '.31111113.',
      '..333333..'
    ],
    dataShard: [
      '..3333..',
      '.311113.',
      '31555513',
      '31511513',
      '31511513',
      '31555513',
      '.311113.',
      '..3333..'
    ]
  };

  /* ---------------- pixel painting ---------------- */
  function hexToRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function canvas(w, h) {
    var cv = document.createElement('canvas');
    cv.width = Math.max(1, w | 0); cv.height = Math.max(1, h | 0);
    var cx = cv.getContext('2d');
    cx.imageSmoothingEnabled = false;
    return cv;
  }
  function paint(art, pal) {
    var h = art.length, w = art[0].length;
    var cv = canvas(w, h), cx = cv.getContext('2d');
    var img = cx.createImageData(w, h), d = img.data;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var ch = art[y][x];
        if (ch === '.' || !pal[ch]) continue;
        var rgb = hexToRgb(pal[ch]), i = (y * w + x) * 4;
        d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = 255;
      }
    }
    cx.putImageData(img, 0, 0);
    return cv;
  }

  /* one outline pass + one rim-light pass turns assembled parts
     into something that reads as a single drawn character */
  function finish(cv, outline, rim) {
    var w = cv.width, h = cv.height, cx = cv.getContext('2d');
    var img = cx.getImageData(0, 0, w, h), d = img.data;
    var src = new Uint8ClampedArray(d);
    var oc = hexToRgb(outline), rc = rim ? hexToRgb(rim) : null;
    function a(x, y) {
      if (x < 0 || y < 0 || x >= w || y >= h) return 0;
      return src[(y * w + x) * 4 + 3];
    }
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4;
        if (src[i + 3] === 0) {
          // silhouette outline
          if (a(x - 1, y) || a(x + 1, y) || a(x, y - 1) || a(x, y + 1)) {
            d[i] = oc[0]; d[i + 1] = oc[1]; d[i + 2] = oc[2]; d[i + 3] = 235;
          }
        } else if (rc && !a(x, y - 1)) {
          // top-lit rim: mix 45% toward the rim colour
          d[i] = d[i] + (rc[0] - d[i]) * 0.45;
          d[i + 1] = d[i + 1] + (rc[1] - d[i + 1]) * 0.45;
          d[i + 2] = d[i + 2] + (rc[2] - d[i + 2]) * 0.45;
        }
      }
    }
    cx.putImageData(img, 0, 0);
    return cv;
  }

  /* ---------------- the rig ---------------- */
  /* pose format, all angles in degrees, 0 = limb hanging straight down:
     { dy, torso, head, armB:[shoulder,elbow], armF:[...],
       legB:[hip,knee], legF:[...] }                                    */
  function P(dy, torso, head, aB, aF, lB, lF) {
    return { dy: dy, torso: torso, head: head, armB: aB, armF: aF, legB: lB, legF: lF };
  }

  var ANIMS = {
    idle: [
      P(0, 2, -1, [6, 8], [-6, 10], [1, -1], [-1, 1]),
      P(1, 3, 0, [8, 10], [-4, 12], [1, 0], [-1, 2])
    ],
    run: [
      P(0, 9, -4, [-40, -34], [34, -22], [26, -52], [-38, 12]),
      P(1, 8, -3, [-18, -28], [14, -16], [22, -18], [-12, 38]),
      P(0, 7, -2, [10, -22], [-12, -12], [-4, -6], [18, -12]),
      P(0, 9, -4, [34, -22], [-38, -32], [-38, 12], [26, -52]),
      P(1, 8, -3, [14, -16], [-18, -28], [-12, 38], [22, -18]),
      P(0, 7, -2, [-12, -12], [10, -22], [18, -12], [-4, -6])
    ],
    jump: [P(-1, -8, 5, [-96, -30], [-84, -34], [16, -46], [-28, 44])],
    fall: [P(1, 6, -6, [-58, -20], [-66, -26], [-20, -12], [22, -22])],
    punch: [
      P(0, -12, -6, [46, -60], [64, -78], [8, -8], [-14, 10]),
      P(0, 16, 4, [58, -50], [-96, 6], [12, -12], [-24, 16])
    ],
    dash: [P(2, -26, 12, [116, -30], [104, -26], [46, -34], [62, -40])],
    hurt: [P(-1, -20, -14, [-72, -40], [-84, -30], [-16, 22], [24, -18])],
    aim:  [P(0, -4, 0, [22, -18], [-92, -4], [6, -6], [-10, 8])],
    cast: [
      P(0, -8, -4, [30, -40], [-70, -50], [8, -8], [-12, 10]),
      P(0, -2, -2, [26, -30], [-100, -8], [10, -10], [-14, 12])
    ]
  };

  function bakeRig(def) {
    var pal = PALETTES[def.palette];
    var parts = {
      head: paint(ART[def.head], pal),
      torso: paint(ART[def.torso], pal),
      upperArm: paint(ART.upperArm, pal),
      foreArm: paint(ART.foreArm, pal),
      thigh: paint(ART.thigh, pal),
      shin: paint(ART.shin, pal),
      cape: def.cape ? paint(ART[def.cape], pal) : null,
      pelvis: paint(ART.pelvis, pal)
    };
    var palBack = PALETTES[def.backPalette || def.palette];
    var back = {
      upperArm: paint(ART.upperArm, palBack),
      foreArm: paint(ART.foreArm, palBack),
      thigh: paint(ART.thigh, palBack),
      shin: paint(ART.shin, palBack)
    };

    var W = def.w || 34, H = def.h || 46;
    var hipX = W / 2, hipY = def.hipY || 30;
    var tH = parts.torso.height, tW = parts.torso.width;
    var shoulderY = -tH + 3, shoulderX = tW / 2 - 1;
    var out = {};

    function limb(cx, upper, fore, ang) {
      cx.save();
      cx.rotate(ang[0] * D2R);
      cx.drawImage(upper, -upper.width / 2, -1);
      cx.translate(0, upper.height - 2);
      cx.rotate(ang[1] * D2R);
      cx.drawImage(fore, -fore.width / 2, -1);
      cx.restore();
    }

    for (var name in ANIMS) {
      out[name] = ANIMS[name].map(function (p) {
        var cv = canvas(W, H), cx = cv.getContext('2d');
        cx.imageSmoothingEnabled = false;
        cx.translate(hipX, hipY + p.dy);

        // cape hangs behind everything
        if (parts.cape) {
          cx.save();
          cx.rotate((p.torso * 0.6) * D2R);
          cx.drawImage(parts.cape, -parts.cape.width / 2, -tH + 2);
          cx.restore();
        }
        // back leg, back arm
        cx.save(); cx.translate(-2, 0);
        limb(cx, back.thigh, back.shin, p.legB);
        cx.restore();

        cx.save();
        cx.rotate(p.torso * D2R);
        cx.translate(-shoulderX + 1, shoulderY);
        limb(cx, back.upperArm, back.foreArm, p.armB);
        cx.restore();

        // pelvis covers the hip joins whatever the legs are doing
        cx.drawImage(parts.pelvis, -parts.pelvis.width / 2, -3);

        // torso + head
        cx.save();
        cx.rotate(p.torso * D2R);
        cx.drawImage(parts.torso, -tW / 2, -tH);
        cx.save();
        cx.translate(0, -tH + 2);
        cx.rotate(p.head * D2R);
        cx.drawImage(parts.head, -parts.head.width / 2, -parts.head.height + 2);
        cx.restore();
        cx.restore();

        // front leg, front arm
        cx.save(); cx.translate(2, 0);
        limb(cx, parts.thigh, parts.shin, p.legF);
        cx.restore();

        cx.save();
        cx.rotate(p.torso * D2R);
        cx.translate(shoulderX - 1, shoulderY);
        limb(cx, parts.upperArm, parts.foreArm, p.armF);
        cx.restore();

        return finish(cv, def.outline || '#05070d', def.rim);
      });
    }
    out.w = W; out.h = H;
    out.footY = hipY + (parts.thigh.height + parts.shin.height - 4);
    return out;
  }

  function bakeProp(artName, palName, opts) {
    opts = opts || {};
    var cv = paint(ART[artName], PALETTES[palName]);
    return finish(cv, opts.outline || '#05070d', opts.rim);
  }

  /* ---------------- the library ---------------- */
  var SHEETS = {}, PROPS = {}, ready = false;

  function build() {
    if (ready) return SHEETS;
    SHEETS.gone = bakeRig({
      palette: 'gone', backPalette: 'goneLo',
      head: 'goneHead', torso: 'goneTorso',
      w: 28, h: 40, hipY: 21, outline: '#070c16', rim: '#ffffff'
    });
    SHEETS.raone = bakeRig({
      palette: 'raone', head: 'raHead', torso: 'raTorso', cape: 'raCape',
      w: 36, h: 48, hipY: 25, outline: '#02040a', rim: '#7d8aa6'
    });
    SHEETS.sentry = bakeRig({
      palette: 'sentry', head: 'sentryHead', torso: 'goneTorso',
      w: 28, h: 40, hipY: 21, outline: '#04070e', rim: '#b9c6da'
    });
    SHEETS.mask = bakeRig({
      palette: 'mask', head: 'maskHead', torso: 'goneTorso',
      w: 28, h: 40, hipY: 21, outline: '#06030c', rim: '#c99ee0'
    });
    SHEETS.ghost = bakeRig({
      palette: 'ghost', head: 'raHead', torso: 'raTorso', cape: 'raCape',
      w: 36, h: 48, hipY: 25, outline: '#070b14', rim: '#3d4a63'
    });

    PROPS.drone = bakeProp('drone', 'sentry', { rim: '#aebbd0' });
    PROPS.droneWing = bakeProp('droneWing', 'sentry');
    PROPS.turret = bakeProp('turret', 'sentry', { rim: '#aebbd0' });
    PROPS.hartShard = bakeProp('hartShard', 'gone');
    PROPS.repairCell = bakeProp('repairCell', 'gone');
    PROPS.dataShard = bakeProp('dataShard', 'gone');

    ready = true;
    return SHEETS;
  }

  /* draw a baked frame, anchored at the character's feet */
  function draw(sheet, anim, frame, x, y, flip, opts) {
    opts = opts || {};
    var frames = sheet[anim] || sheet.idle;
    var cv = frames[Math.abs(Math.floor(frame)) % frames.length];
    var cx = C.Gfx.ctx;
    cx.save();
    if (opts.alpha !== undefined) cx.globalAlpha = opts.alpha;
    // anchored at the feet, horizontally centred — so turning around
    // does not shift the character by a frame width
    var sc = opts.scale || 1;
    cx.translate(Math.round(x - sheet.w * sc / 2), Math.round(y - sheet.footY * sc));
    if (sc !== 1) cx.scale(sc, sc);
    if (flip < 0) { cx.scale(-1, 1); cx.translate(-sheet.w, 0); }
    if (opts.flash) {
      // white-hot silhouette on the frame you land a hit
      cx.drawImage(cv, 0, 0);
      cx.globalCompositeOperation = 'source-atop';
      cx.fillStyle = opts.flash;
      cx.globalAlpha = (opts.alpha === undefined ? 1 : opts.alpha) * 0.85;
      cx.fillRect(0, 0, sheet.w, sheet.h);
    } else {
      cx.drawImage(cv, 0, 0);
    }
    cx.restore();
  }

  function drawProp(name, x, y, opts) {
    opts = opts || {};
    var cv = PROPS[name];
    if (!cv) return;
    var cx = C.Gfx.ctx;
    cx.save();
    if (opts.alpha !== undefined) cx.globalAlpha = opts.alpha;
    cx.translate(Math.round(x - cv.width / 2), Math.round(y - cv.height / 2));
    if (opts.flip < 0) { cx.scale(-1, 1); cx.translate(-cv.width, 0); }
    cx.drawImage(cv, 0, 0);
    cx.restore();
  }

  RA.spr = {
    build: build, draw: draw, drawProp: drawProp,
    sheets: SHEETS, props: PROPS, palettes: PALETTES,
    paint: paint, finish: finish, canvas: canvas, ART: ART
  };
})(window);
