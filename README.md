# RA.ONE — LUCIFER PROTOCOL

An unofficial, non-commercial arcade fan tribute to **Ra.One** (2011).

The film is about a video game. So this is that video game — the one Shekhar Subramanium
shipped, the one Prateek logged into as **LUCIFER**, the one Ra.One walked out of. Three levels,
a H.A.R.T. in your chest, one bullet, ten copies and a single shadow.

No engine, no build step, no dependencies, no asset files. The characters are pixel art authored
in code, posed on a 2D skeleton and baked into offscreen canvases at boot; the whole frame gets a
real bright-pass bloom; and every note you hear is synthesised live in the browser.

```
open index.html          # that's it
```

Or play the single-file build: `dist/raone-lucifer-protocol.html`.

---

## Controls

| | |
|---|---|
| Move | `←` `→` / `A` `D` |
| Jump (double jump) | `Space` / `Z` |
| Melee — 3-hit combo | `X` / `J` |
| H.A.R.T. blast | `C` / `K` — **hold** for the charged beam |
| Dash | `Shift` / `L` |
| **Detach your H.A.R.T.** | `H` — level 3 only, and it is the whole point |
| Drop through a platform | `↓` + jump |
| Pause / Codex / Mute | `Esc` · `Tab` · `M` |

On a touch device an on-screen pad appears automatically.

---

## The three levels

**LEVEL 1 — BARRON INDUSTRIES, LONDON.** The launch floor, the night the villain got out.
Random Access sentries, RA-drones, Akashi Masks moving on the motion capture Akashi recorded.
Ra.One watches from the rooftops and phases in twice to ask where Lucifer is — you cannot kill him
there, and he knows it. Boss: **Ra.One v1.0**, who is stronger than you, because the designer's
son insisted.

**LEVEL 2 — MUMBAI LOCAL, INBOUND TO CST.** A runaway train with no brakes and a clock.
Coach roofs, gaps between them, live gantries at exactly the height of a full jump. The train
sets a floor on your pace, not a ceiling — outrun it if you can.
Boss: **Ra.One v2.0**, who wears your face and blocks whatever you hit him with last.
Alternate fist and blast, or you will not scratch him.

**LEVEL 3 — THE THIRD LEVEL.** The only level where a player can die, played by the film's rules:

1. He cannot be damaged. Break his guard until he draws the gun.
2. The **anti-H.A.R.T. gun holds one bullet**, and it only kills a player whose **H.A.R.T. is
   attached**. Press `H`. Let him waste it on a body it cannot kill. Detached, you are slower,
   you have no blast, and your integrity bleeds — that is the trade.
3. He splits into **ten copies**. Only the original casts a shadow. You will need your H.A.R.T.
   back to finish him, so put it on again while ten of him are shooting at you.

---

## The Codex

Hidden **Data Shards** are scattered through the levels. Each one unlocks a locked Codex entry —
cast, crew, the in-universe rules, the budget, the VFX, the songs, the 2011 tie-in game. The
research behind all of it is in [`docs/MOVIE-RESEARCH.md`](docs/MOVIE-RESEARCH.md), with sources.

Design notes, and the full table of *film detail → game mechanic*, are in
[`docs/GAME-DESIGN.md`](docs/GAME-DESIGN.md).

---

## Repository layout

```
index.html              plays straight from the filesystem
src/style.css           the cabinet shell: bezel, scanlines, vignette
src/engine/core.js      maths, palette, renderer, particles, camera
src/engine/input.js     keyboard + touch, latched so no tap is dropped
src/engine/audio.js     chiptune synth + SFX, all WebAudio, no files
src/engine/sprites.js   the asset pipeline: pixel maps posed on a 2D rig and
                        baked to offscreen canvases at boot, with auto-outline
                        and rim-light passes
src/data/lore.js        the Codex and the story cards
src/game/levels.js      the three maps, stamped by a small DSL
src/game/entities.js    tile collision, G.One, the enemies
src/game/bosses.js      Ra.One v1.0, v2.0, v3.0
src/game/hud.js         parallax backdrops, tile painting, HUD
src/game/main.js        state machine, rules glue, the loop
tools/build.mjs         node tools/build.mjs -> dist/
tools/spritesheet.html  dev tool: every baked animation frame, at 3x
docs/                   film research + design notes
```

## Development

```bash
node tools/build.mjs     # regenerate dist/
npx http-server -p 8123  # or just open index.html
```

There is no test runner; the game was verified by driving it in headless Chromium — every level
reached, every boss engaged, every phase of the Level 3 rules exercised, with zero console errors.

---

## Credit where it is due

Inspired by **Ra.One** (2011), directed by Anubhav Sinha, produced by Gauri Khan for Red Chillies
Entertainment, starring Shah Rukh Khan, Kareena Kapoor, Arjun Rampal and Armaan Verma, with music
by Vishal–Shekhar.

This is a fan project made out of affection. It is **not affiliated with or endorsed by** the
rights holders. It uses **no** footage, audio, artwork, script or code from the film, its
soundtrack, or the official *RA.ONE: The Game* (Sony Computer Entertainment / Trine Games, 2011).
Character and place names are used to refer to the film. Everything you see and hear here was
generated by the code in this repository.
