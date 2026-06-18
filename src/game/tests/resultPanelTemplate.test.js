import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const embed = readFileSync('layouts/partials/hexzzle-game-embed.html', 'utf8');
const gameCss = readFileSync('static/game/hexzzle/hexzzle-game.css', 'utf8');

test('result popup includes local records controls and no public submit UI', () => {
  assert.match(embed, /Bloom Result/);
  assert.match(embed, /data-hexzzle-play-again/);
  assert.match(embed, /data-hexzzle-share/);
  assert.match(embed, /data-hexzzle-records/);
  assert.match(embed, /Local records are saved only on this device/);
  assert.doesNotMatch(embed, /Submit Score|Nickname|leaderboard\/submit|public ranking/i);
});

test('result popup uses a high fixed overlay contract for mobile visibility', () => {
  assert.match(embed, /class="result-panel result-panel--overlay"/);
  assert.match(gameCss, /\.result-panel--overlay\s*\{[^}]*position:\s*fixed/s);
  assert.match(gameCss, /\.result-panel--overlay\s*\{[^}]*z-index:\s*10000/s);
  assert.match(gameCss, /\.result-panel--overlay\s*\{[^}]*safe-area-inset-top/s);
  assert.match(gameCss, /\.result-panel__dialog\s*\{[^}]*max-width:\s*420px/s);
  assert.match(gameCss, /\.result-records__list\[hidden\]/);
});
