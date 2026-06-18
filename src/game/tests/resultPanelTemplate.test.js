import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const embed = readFileSync('layouts/partials/hexzzle-game-embed.html', 'utf8');

test('result popup includes local records controls and no public submit UI', () => {
  assert.match(embed, /Bloom Result/);
  assert.match(embed, /data-hexzzle-play-again/);
  assert.match(embed, /data-hexzzle-share/);
  assert.match(embed, /data-hexzzle-records/);
  assert.match(embed, /Local records are saved only on this device/);
  assert.doesNotMatch(embed, /Submit Score|Nickname|leaderboard\/submit|public ranking/i);
});
