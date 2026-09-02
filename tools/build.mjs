/* Bundles the game into single self-contained files.
   node tools/build.mjs
     -> dist/raone-lucifer-protocol.html   standalone page (open it anywhere)
     -> dist/artifact.html                 body-only fragment for publishing */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(join(root, p), 'utf8');

const SCRIPTS = [
  'src/engine/core.js',
  'src/engine/input.js',
  'src/engine/audio.js',
  'src/engine/sprites.js',
  'src/data/lore.js',
  'src/game/levels.js',
  'src/game/entities.js',
  'src/game/bosses.js',
  'src/game/hud.js',
  'src/game/main.js'
];

const css = read('src/style.css');
const js = SCRIPTS.map(p => `/* ===== ${p} ===== */\n${read(p)}`).join('\n');

// pull the markup out of index.html, between <body> and the first <script>
const html = read('index.html');
const body = html
  .slice(html.indexOf('<body>') + 6, html.indexOf('<script src='))
  .trim();

const TITLE = 'Ra.One: Lucifer Protocol';
const DESC = 'An unofficial arcade fan tribute to Ra.One (2011): three levels, ' +
             'one H.A.R.T., one bullet, ten copies and a single shadow.';

const core = `<title>${TITLE}</title>
<style>
${css}
</style>

${body}

<script>
${js}
</script>`;

mkdirSync(join(root, 'dist'), { recursive: true });

writeFileSync(join(root, 'dist/raone-lucifer-protocol.html'),
`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<meta name="description" content="${DESC}">
${core.slice(0, core.indexOf('</style>') + 8)}
</head>
<body>
${core.slice(core.indexOf('</style>') + 8).trim()}
</body>
</html>
`);

writeFileSync(join(root, 'dist/artifact.html'), core + '\n');

console.log('built dist/raone-lucifer-protocol.html and dist/artifact.html');
