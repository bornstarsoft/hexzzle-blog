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

test('result popup default view uses compact mobile markup', () => {
  assert.match(embed, /class="result-card result-card--compact"/);
  assert.match(embed, /class="result-label-full">Best Stack/);
  assert.match(embed, /class="result-label-short" aria-hidden="true">Stack/);
  assert.match(embed, /class="result-label-full">Overblooms/);
  assert.match(embed, /class="result-label-short" aria-hidden="true">Over/);
  assert.match(embed, /class="hexzzle-status result-panel__share-status"/);
  assert.match(gameCss, /\.result-panel__share-status:empty\s*\{[^}]*display:\s*none/s);
  assert.match(gameCss, /@media\s*\(max-width:\s*520px\)\s*\{[\s\S]*\.result-panel__dialog\s*\{[\s\S]*overflow-y:\s*hidden/s);
  assert.match(gameCss, /@media\s*\(max-width:\s*520px\)\s*\{[\s\S]*\.result-panel__actions\s*\{[\s\S]*grid-template-columns:\s*1\.25fr 1fr 1fr/s);
});

test('result records are hidden by default and open as a compact drawer', () => {
  assert.match(embed, /class="result-records result-records--drawer"[^>]*data-result-records-section[^>]*hidden/);
  assert.match(gameCss, /\.result-records\[hidden\]\s*\{[^}]*display:\s*none/s);
  assert.match(gameCss, /\.result-records--drawer\s*\{[^}]*max-height:/s);
  assert.match(gameCss, /\.result-records__list\s*\{[^}]*overflow-y:\s*auto/s);
});
