import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const siteCss = readFileSync('assets/css/main.css', 'utf8');
const gameCss = readFileSync('static/game/hexzzle/hexzzle-game.css', 'utf8');

test('mobile game panel keeps narrow scrollable side gutters', () => {
  assert.match(siteCss, /--game-card-width-mobile:\s*min\(97vw,\s*calc\(100%\s*-\s*12px\)\)/);
});

test('touch blocking is scoped to the actual canvas surface', () => {
  assert.doesNotMatch(siteCss, /\b(?:html|body|main|#main-content)\s*\{[^}]*touch-action:\s*none/s);
  assert.doesNotMatch(gameCss, /\.hexzzle-shell\s*\{[^}]*touch-action:\s*none/s);
  assert.match(gameCss, /\.hexzzle-canvas\s*\{[^}]*touch-action:\s*none/s);
  assert.match(gameCss, /\.hexzzle-canvas canvas\s*\{[^}]*touch-action:\s*none/s);
});
