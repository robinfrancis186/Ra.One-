# LUCIFER PROTOCOL — design notes

## The premise

*Ra.One* is a film about a video game whose villain will not accept an unfinished turn. Almost
every superhero-film tie-in throws that away and ships a generic brawler. The premise here is the
opposite: **build the game the film is actually about**, and let its fiction be the mechanics.

So the design rule was simple — if it is a rule in the film, it is a rule in the game, and if it
is not in the film, it needs a very good reason to exist.

## The core loop

Run right, hit things, read the boss, survive. Deliberately old: a 640×360 buffer, integer
scaling, scanlines, three lives, a nine-second CONTINUE countdown, a score you can chase and a
hi-score that persists. The nostalgia target is not 2011 — it's standing in front of a cabinet.

### G.One's kit

| Move | Why it exists |
|---|---|
| 3-hit melee combo | Reach and damage grow with the combo, so pressure is rewarded |
| H.A.R.T. blast | Costs energy; the resource that makes the level-3 detach hurt |
| Charged beam (hold) | 40 energy, pierces — the only reliable answer to the ten copies |
| Double jump | The film's hero flies; the game needs air control and gap recovery |
| Dash | I-frames. The escape valve that keeps boss patterns fair |
| **Detach H.A.R.T.** | The film's actual solution to an unwinnable fight |

### The H.A.R.T. as an economy

The film says two useful things: the H.A.R.T. is where the powers come from, and it gets stronger
each level. So it is the energy meter, its capacity rises per level (100 → 130 → 160), and in
level 3 it becomes a physical object you can put down. Detached: no blast, slower, and integrity
bleeds at 3/second. Attached: everything works, and a single bullet can kill you.

That is the whole third act expressed as a resource.

## Level design

### Level 1 — Barron Industries
Teaching level. Wide floors, generous platforms, two atrium pits with a mid-air catwalk so a
missed jump is punished but not fatal. Enemy order introduces one idea at a time: sentries
(ground pressure) → drones (air) → turrets (zoning) → Akashi Masks (blink + burst). Boss v1.0 has
three legible tells — charge, slam, volley — and enrages at 50%.

### Level 2 — the runaway local
The film's set piece is a train with no brakes, so the level scrolls whether you move or not.
Critically, the scroll is a **floor** on your pace, not a ceiling: run ahead of it and the camera
follows you. Falling behind the left edge is chip damage, not instant death — the punishment is
the clock, which is the film's punishment too.

Gaps between coaches are 3–4 tiles: clearable with a committed jump, fatal if you drift. Live
gantries sit at exactly the height of a full jump, so the level teaches you when *not* to jump.

Boss v2.0 is the shapeshifter. He periodically copies your last attack type and blocks it (85%
reduction), which means the fight is won by alternating fist and blast instead of mashing one.
He also throws your own blast back from two mirror images, which is what a mimic should do.

### Level 3 — the third level
Three phases, straight from the film's rules:

1. **PROVOKE** — he is immune. Hits chip a guard meter instead of health. You cannot win yet, and
   the HUD says so. Meanwhile he rushes, fires radial arcs, and reads your mind: a mind-control
   pulse inverts your controls for 2.4 seconds.
2. **ONE BULLET** — he draws the anti-H.A.R.T. gun and takes a long, obvious, laser-sighted aim.
   The bullet homes. Dodging is not the answer; **detaching is**. Attached when it lands = dead,
   no matter your health. Detached = the round passes through and is spent forever. If he somehow
   misses, he recalls the round, because he is a program and he has all night.
3. **TEN COPIES** — ten identical Ra.Ones. Only the original casts a shadow, so every copy stands
   in the same pool of light and exactly one of them interrupts it. Hit a copy and it bursts,
   costs you health, and the pack reshuffles on a timer. Hit the original and it takes real
   damage. And since the charged beam needs your H.A.R.T., you have to put it back on and finish
   the fight as a target that can be killed.

Phase 2 into phase 3 is the design in miniature: the game asks you to *disarm yourself* to
survive, then *rearm* to win.

## Feel

- Fixed 1/60 timestep with an accumulator, so physics never varies with refresh rate.
- Coyote time (0.11s) and a jump buffer (0.12s) — the two forgiveness windows every platformer
  needs and most fan games forget.
- Variable jump height, hit-stop on connect (45–60ms), screen shake, i-frame blink, freeze-frame
  on boss hits.
- Input is **latched**: a press is queued on keydown and consumed once, so a 1ms tap can never
  fall between two frames.

## Answering the audience, not just the film

The most consistent complaint in eleven years of reviews is not the script — it is that
**Ra.One is barely in the film he is named after.** The design responds to that directly:

- He **watches from the backdrop** of levels 1 and 2, standing on a rooftop or a coach end in a
  darker palette of his own sprite sheet, turning to face you as you pass, two red pinpricks
  finding you across the middle distance.
- He **interrupts twice a level.** An incursion phases him in beside you, he asks his one
  question — WHERE IS LUCIFER? — takes a rush or a bolt fan, and phases out. You cannot kill him
  there, and the game says so: *a player can only be killed in the third level*. That was already
  the film's rule; here it also fixes the pacing.
- He is **the entire third act**, in three phases, instead of a boss bar at the end of a corridor.

The other thing audiences agree on is that the film looks better than it has any right to. So the
art got the same treatment as the rules.

## The art pipeline

There are no image files, and there cannot be — the game ships as a single HTML file. So the art
is **authored as pixel maps and baked at boot**:

1. **Parts.** Head, torso, pelvis, upper arm, forearm, thigh, shin and cape are authored as rows
   of characters, one character per pixel, against a palette of seven keys.
2. **Palettes.** The same limb art paints G.One, a Random Access sentry, an Akashi Mask and a
   background ghost, which is thematically honest: in the fiction they *are* avatars off one
   motion-capture rig.
3. **A 2D skeleton.** Nine animations — idle, run (6 frames), jump, fall, punch, dash, hurt, aim,
   cast — are defined as joint angles, then composited through nested canvas transforms with
   smoothing off, so rotated pixels stay chunky rather than blurring.
4. **Two post passes per frame.** An auto-outline walks the baked frame and darkens every
   transparent pixel touching the silhouette; a rim-light pass mixes 45% of a light colour into
   every pixel whose neighbour above is empty. Those two passes are most of the difference
   between "assembled parts" and "a drawn character".
5. **Bake once, blit forever.** Every frame of every character is an offscreen canvas by the time
   the title screen appears. At runtime a character is a single `drawImage`.

Tiles are baked the same way — panel faces, seams, rivets, deterministic grime, a lit top lip and
the dark band beneath it that sells the thickness.

**Bloom** runs over the whole frame: a bright-pass (`brightness(1.05) contrast(3.4) blur(2px)`)
into a third-resolution buffer, composited back with `lighter` at 45%. Every glow, muzzle flash
and neon edge gets real light out of it. It is applied to the world and *then* the HUD is drawn
on top, so the interface stays crisp while the world glows. A drifting grain tile finishes it.
Measured at a steady 59fps in headless Chromium.

## Presentation

Backdrops are five parallax layers each, drawn from deterministic noise so nothing crawls between
frames, with a scrim between backdrop and playfield so the city is never mistaken for something
you can stand on.

- **London**: two skyline bands with lit windows and blinking aircraft warning lights, the Barron
  Industries slab with its spine of light and its sign, interior mullions sliding past in the near
  ground, rain at two speeds, and floor fog.
- **Mumbai**: a warm violet night, catenary poles whipping past, sparks off the rails — and
  **Chhatrapati Shivaji Terminus growing out of the haze as the clock runs down**, dome, turrets,
  lit clock face and all. The film's second half is a countdown to that building, so the backdrop
  counts down with it.
- **The grid**: a wireframe horizon with a scan pulse running out to it, falling data columns, and
  **the ten heads of Raavan** in the sky, blinking, above the fight where he becomes ten.

Audio is a small WebAudio tracker: square/triangle/sawtooth voices, filtered-noise drums, and
patterns written in a Phrygian-dominant (Bhairav-flavoured) scale — original music with a filmi
colour, since reproducing the actual soundtrack was never an option.

## Where the film ends up in the game

| Film detail | Mechanic |
|---|---|
| Three levels; the villain is stronger by design | Three levels; Ra.One outclasses you in all of them |
| H.A.R.T. = Hertz Amplifying Resonance Transmitter | Energy meter, and a detachable object |
| The H.A.R.T. strengthens each level | Capacity 100 → 130 → 160 |
| Death only in level 3, only by the one-bullet anti-H.A.R.T. gun, only if attached | Phase 2, exactly |
| The trick: take the shot with it detached | Press `H` at the right moment |
| Ten copies; only the original casts a shadow | Phase 3, exactly |
| Ra.One is faceless and shape-shifts | Faceless sprite; v2.0 wears your colours |
| Ra.One reads and controls minds | Inverted-controls pulse |
| Akashi supplied the motion capture | "Akashi Mask" enemies |
| Lucifer's interrupted turn | The premise, and your player name |
| The runaway local; CST | Level 2 and its clock |
| G.One learns by watching (the Chitti cameo) | The Codex: the game teaches you the film |
| The H.A.R.T. is left behind; Prateek reboots him | The ending and the epilogue |

## Things deliberately left out

- **Songs.** No melody from the soundtrack is quoted. A "Chammak Challo" rhythm minigame was
  tempting and would have been a copyright problem, so it stayed a Codex entry.
- **Likenesses.** Nobody is drawn as a real actor. G.One is a bone-white figure with a cyan core.
- **A shop / upgrades / a level select.** Arcade games do not have a metagame; they have a
  hi-score and one more try.
