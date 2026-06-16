import { build } from 'esbuild';

await build({
  entryPoints: ['src/game/main.js'],
  bundle: true,
  minify: true,
  sourcemap: false,
  target: ['es2020'],
  format: 'iife',
  globalName: 'HexzzleGame',
  outfile: 'static/game/hexzzle/hexzzle-game.js',
  legalComments: 'none'
});
