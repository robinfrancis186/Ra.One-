/* =============================================================
   data/lore.js — the CODEX.
   Every entry is a real detail from the 2011 film. Entries marked
   `shard: true` are locked until you find their Data Shard in a
   level, so the film unfolds as you play.
   ============================================================= */
(function (global) {
  'use strict';

  var CODEX = [
    /* ---------------- DOSSIER ---------------- */
    { cat: 'DOSSIER', title: 'SHEKHAR SUBRAMANIUM',
      body: 'Game designer at Barron Industries, London. Played by Shah Rukh Khan. A Tamil ' +
            'father with a long run of commercial flops behind him, given one last chance to ' +
            'ship a hit. He lends his own face to the hero avatar, G.One. Killed by Ra.One after ' +
            'claiming to be Lucifer to protect his son.' },
    { cat: 'DOSSIER', title: 'G.ONE',
      body: 'The hero avatar. "Good One" — and it sounds like JEEVAN, Hindi for life. Wears ' +
            'Shekhar\'s face. Superhuman strength and speed, energy projection from the H.A.R.T., ' +
            'and an adaptive intelligence: he learns by watching. He is deliberately built weaker ' +
            'than his enemy.' },
    { cat: 'DOSSIER', title: 'RA.ONE',
      body: 'RANDOM ACCESS VERSION 1.0. The team kept the name once they noticed it also reads ' +
            'as RAVAN, the demon king of the Ramayana. Played by Arjun Rampal. Designed faceless ' +
            'on purpose, because he can be anyone.', shard: true },
    { cat: 'DOSSIER', title: 'RA.ONE — CAPABILITIES',
      body: 'Shape-shifting. Mind reading, thought control and brainwashing. Electrical ' +
            'discharge. Superhuman strength, speed, hearing, stamina, reflexes, memory and ' +
            'regeneration. Super-intelligence. Every one of them exceeds G.One — by design.', shard: true },
    { cat: 'DOSSIER', title: 'PRATEEK / "LUCIFER"',
      body: 'Shekhar\'s son, played by Armaan Verma. He is the one who demands a villain more ' +
            'powerful than the hero. He logs into the launch build under the handle LUCIFER, ' +
            'reaches Level 2 — and is interrupted mid-turn. That unfinished turn is the reason ' +
            'for everything that follows.' },
    { cat: 'DOSSIER', title: 'SONIA SUBRAMANIUM',
      body: 'Shekhar\'s wife, played by Kareena Kapoor — a Punjabi married into a Tamil family. ' +
            'Ra.One hypnotises her, takes her form to abduct Prateek, and puts the real Sonia on ' +
            'a runaway Mumbai local.' },
    { cat: 'DOSSIER', title: 'AKASHI',
      body: 'Played by Tom Wu. Shekhar\'s colleague, who performs the motion capture that gives ' +
            'the game characters their movement. He interrupts Lucifer\'s turn — and becomes ' +
            'Ra.One\'s first victim when he cannot say where Lucifer is.', shard: true },
    { cat: 'DOSSIER', title: 'JENNY NAYAR',
      body: 'Played by Shahana Goswami. Programs the game, and demonstrates the Barron Industries ' +
            'technology that lets a digital object cross into the real world over a wireless ' +
            'transmission. It is her computer G.One walks out of.' },
    { cat: 'DOSSIER', title: 'BARRON',
      body: 'Head of Barron Industries, played by Dalip Tahil. The London studio where the game ' +
            'is built, and where the transfer technology is unveiled.' },
    { cat: 'DOSSIER', title: 'CHITTI',
      body: 'Rajinikanth appears as Chitti, the robot from ENTHIRAN / ROBOT, in a cameo mid-brawl. ' +
            'G.One watches him and adapts — a joke about the hero\'s learning routine, and a ' +
            'straight tribute.', shard: true },

    /* ---------------- THE GAME ---------------- */
    { cat: 'THE GAME', title: 'RULE 1 — THREE LEVELS',
      body: 'The game has exactly three levels. The villain is stronger than the hero at every ' +
            'one of them, because the designer\'s son asked for it that way.' },
    { cat: 'THE GAME', title: 'RULE 2 — THE H.A.R.T.',
      body: 'HERTZ AMPLIFYING RESONANCE TRANSMITTER. The device every player carries; the glowing ' +
            'core in the chest. It is the source of all their powers.' },
    { cat: 'THE GAME', title: 'RULE 3 — ESCALATION',
      body: 'The power of the H.A.R.T. increases with every level. So does everything it is ' +
            'pointed at.' },
    { cat: 'THE GAME', title: 'RULE 4 — THE ONE BULLET', boss: true,
      body: 'A player can be killed only in the third level, only by the anti-H.A.R.T. gun, and ' +
            'only while his H.A.R.T. is ATTACHED. The gun holds exactly one bullet. Fire it at a ' +
            'player whose H.A.R.T. is detached and it is spent forever.', shard: true },
    { cat: 'THE GAME', title: 'THE TRICK', boss: true,
      body: 'G.One and Prateek let Ra.One take his shot — with the H.A.R.T. detached. The single ' +
            'round passes through a target it cannot kill. Ra.One, disarmed and enraged, splits ' +
            'into ten copies of himself.', shard: true },
    { cat: 'THE GAME', title: 'THE SHADOW', boss: true,
      body: 'Ten identical Ra.Ones, and no way to tell them apart — until they see it: only the ' +
            'original casts a shadow. The copies are light with nothing behind them.', shard: true },
    { cat: 'THE GAME', title: 'RAVAN, TEN TIMES',
      body: 'Shah Rukh Khan on the design: Ra.One is "the modern, new-age technology version ' +
            'of our mythological Raavan, who was a mixture of ten different evil characters." ' +
            'That is why the villain has no face, and it is why there are exactly ten of him at ' +
            'the end. The ten heads are watching you in the third level.', shard: true },
    { cat: 'THE GAME', title: 'THE CROSSING',
      body: 'Ra.One is not hacked out or summoned. He uses the Barron transfer technology to walk ' +
            'out of the game over a wireless signal, into the real world, hunting a login name.' },

    /* ---------------- THE FILM ---------------- */
    { cat: 'THE FILM', title: 'RELEASE',
      body: 'RA.ONE. Released 26 October 2011, Diwali. Directed by Anubhav Sinha, produced by ' +
            'Gauri Khan for Red Chillies Entertainment. Hindi, with Tamil and Telugu dubs.' },
    { cat: 'THE FILM', title: 'THE BUDGET',
      body: 'Around Rs 150 crore including publicity — roughly US$32 million at the time, and ' +
            'one of the most expensive Indian films ever made when it released. About a third of ' +
            'it went on visual effects alone.' },
    { cat: 'THE FILM', title: 'THE VFX',
      body: 'Roughly 1,200 artists across 16 studios, coordinated by Red Chillies VFX. The film ' +
            'took over three years to make and pushed Indian VFX and stereoscopic 3D forward in ' +
            'one very expensive shove.', shard: true },
    { cat: 'THE FILM', title: 'THE CAMPAIGN',
      body: 'About Rs 52 crore on marketing: a nine-month campaign of brand tie-ups, merchandise, ' +
            'video games and viral marketing. For a generation of Indian kids, Ra.One was ' +
            'everywhere before it was anywhere.' },
    { cat: 'THE FILM', title: 'BOX OFFICE',
      body: 'Over Rs 207 crore. Second highest-grossing Bollywood film of 2011 worldwide, third ' +
            'domestically, and the holder of several opening-weekend records.' },
    { cat: 'THE FILM', title: 'WHAT PEOPLE SAID',
      body: 'The reception was loudly split. Praised: the visual effects, the action, the music, ' +
            'and the performances — plenty of viewers still call it the best-looking Indian ' +
            'sci-fi of its moment. Criticised: the script, the plot holes, and a middle stretch ' +
            'that sags. And one complaint comes up more than any other — that Arjun Rampal\'s ' +
            'Ra.One, the best thing in the film, is barely in it.' },
    { cat: 'THE FILM', title: 'LOCATIONS',
      body: 'Principal photography began March 2010 across India and the United Kingdom. London ' +
            'for Barron Industries; Mumbai for the second half — including the runaway local and ' +
            'the wrecking of Chhatrapati Shivaji Terminus.' },
    { cat: 'THE FILM', title: 'THE 2011 TIE-IN',
      body: 'RA.ONE: THE GAME, published by Sony Computer Entertainment for PS2 and PS3 around ' +
            '5 October 2011, developed by Trine Games. A prequel: eleven characters, twenty 3D ' +
            'arenas, melee combos and ranged weapons, in Story, Brawl and Challenge modes. ' +
            'This project is not that game — this one is the arcade cabinet it should have had.', shard: true },

    /* ---------------- SOUND ---------------- */
    { cat: 'SOUND', title: 'VISHAL-SHEKHAR',
      body: 'Soundtrack by Vishal-Shekhar, released 21 September 2011 by T-Series. Fifteen ' +
            'tracks. The score is a huge part of why the film stuck.' },
    { cat: 'SOUND', title: 'CHAMMAK CHALLO',
      body: 'Akon and Hamsika Iyer. G.One\'s first dance number, performed with deliberately ' +
            'robotic movement. It is also the sequence where Ra.One finds Prateek, takes Sonia\'s ' +
            'form, and cuts in.' },
    { cat: 'SOUND', title: 'CRIMINAL',
      body: 'Akon, Vishal Dadlani and Shruti Pathak.' },
    { cat: 'SOUND', title: 'DILDAARA (STAND BY ME)',
      body: 'Shafqat Amanat Ali, Vishal Dadlani, Shekhar Ravjiani and Clinton Cerejo.' },
    { cat: 'SOUND', title: 'RAFTAAREIN / BHARE NAINA',
      body: 'RAFTAAREIN: Vishal Dadlani and Shekhar Ravjiani. BHARE NAINA: the same pair with ' +
            'Nandini Srikar.' },
    { cat: 'SOUND', title: 'THIS CABINET\'S MUSIC',
      body: 'Everything you can hear in LUCIFER PROTOCOL is generated live by the browser — ' +
            'square, triangle and sawtooth oscillators, plus filtered noise for drums. The ' +
            'melodies are original, written in a Phrygian-dominant (Bhairav-flavoured) scale. ' +
            'No audio file is loaded, and nothing from the soundtrack is reproduced.' },

    /* ---------------- CABINET ---------------- */
    { cat: 'CABINET', title: 'FAN TRIBUTE',
      body: 'LUCIFER PROTOCOL is an unofficial, non-commercial fan game. No footage, audio, art ' +
            'or code from the film or its tie-in game is used. Every sprite here is drawn with ' +
            'rectangles at runtime.' },
    { cat: 'CABINET', title: 'THE COMPLAINT WE FIXED',
      body: 'Since the thing audiences wanted more of was the villain, he is not saved for the ' +
            'end here. He watches you from the rooftops and the coach ends across the whole ' +
            'level. Twice a level he phases in beside you, asks where Lucifer is, takes a swing ' +
            'and leaves — and you cannot kill him, because a player can only be killed in the ' +
            'third level. That rule was already in the film. We just pointed it at the pacing.' },
    { cat: 'CABINET', title: 'HOW THE ART IS MADE',
      body: 'There are no image files. Characters are pixel maps assembled on a 2D skeleton and ' +
            'baked into offscreen canvases at boot — pose the rig, composite the parts, run an ' +
            'auto-outline and a rim-light pass, keep the frame. At runtime a character is one ' +
            'drawImage. Tiles are baked the same way. The glow is a real bright-pass bloom over ' +
            'the whole frame, which is why light behaves like light.' },
    { cat: 'CABINET', title: 'WHY IT LOOKS LIKE THIS',
      body: '640x360 internal resolution, integer-scaled, scanlines on top. Not because 2011 ' +
            'looked like this — because being eleven and standing in front of a cabinet did.' },
    { cat: 'CABINET', title: 'DATA SHARDS',
      body: 'Each level hides Data Shards. Every shard you pick up unlocks a locked Codex entry. ' +
            'They are placed where a curious player goes and a hurrying one does not.' }
  ];

  /* Story cards — the film's beats, told between levels. */
  var STORY = {
    intro: {
      title: 'BARRON INDUSTRIES / LONDON',
      lines: [
        'A designer with nothing but flops behind him is given',
        'one last chance to ship a hit.',
        '',
        'His son sets the brief: THE VILLAIN MUST BE STRONGER',
        'THAN THE HERO. So he builds one.',
        '',
        'Three levels. A H.A.R.T. in every chest.',
        'And a villain with no face, because he can wear any.'
      ]
    },
    l1: {
      title: 'LEVEL 1 — THE LAUNCH FLOOR',
      lines: [
        'A player logged in as LUCIFER. He reached Level 2.',
        'Then someone pulled him away mid-turn.',
        '',
        'Ra.One does not accept an unfinished turn.',
        'He has used the transfer signal to walk out of the game,',
        'and he is asking everyone in this building one question:',
        '',
        'WHERE IS LUCIFER?'
      ]
    },
    l2: {
      title: 'LEVEL 2 — MUMBAI LOCAL',
      lines: [
        'Akashi is dead. Shekhar is dead — he said he was Lucifer,',
        'and the ID scan called the lie.',
        '',
        'Ra.One has taken Sonia\'s form and taken the boy.',
        'The real Sonia is on a local with no brakes,',
        'running for Chhatrapati Shivaji Terminus.',
        '',
        'Get to the front of the train. Nothing else matters.'
      ]
    },
    l3: {
      title: 'LEVEL 3 — THE THIRD LEVEL',
      lines: [
        'This is the only level where a player can die.',
        '',
        'The anti-H.A.R.T. gun holds ONE bullet.',
        'It kills only a player whose H.A.R.T. is ATTACHED.',
        '',
        'He is stronger than you. He was always stronger than you.',
        'You were not built to beat him.',
        'You were built to outthink him.',
        '',
        'PRESS H TO DETACH YOUR H.A.R.T.'
      ]
    },
    win: {
      title: 'GAME OVER — HIS, NOT YOURS',
      lines: [
        'Ten copies. Ten identical shapes. One shadow.',
        '',
        'You took the real one, and took his remains,',
        'and that is what finishes you too.',
        '',
        'Tell the boy his father loved him.',
        'Tell him his father is always with him.',
        '',
        'The body goes back to the virtual world.',
        'The H.A.R.T. stays behind.'
      ]
    },
    epilogue: {
      title: 'LONDON — SEVERAL MONTHS LATER',
      lines: [
        'A boy who is very good with a machine sits down',
        'in front of one.',
        '',
        'The H.A.R.T. is still here. That was always enough.',
        '',
        'RESTORING G.ONE ...',
        '',
        'PLAYER LUCIFER — PRESS START'
      ]
    }
  };

  global.RA = global.RA || {};
  global.RA.CODEX = CODEX;
  global.RA.STORY = STORY;
})(window);
