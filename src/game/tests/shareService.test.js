import test from 'node:test';
import assert from 'node:assert/strict';

import { CANONICAL_PLAY_URL, createShareText, shareResult } from '../core/ShareService.js';

test('creates compact classic mode share text with result stats and play URL', () => {
  const text = createShareText({
    score: 12840,
    totalBlooms: 14,
    bestStack: 8,
    overblooms: 3,
    url: 'https://hexzzle.com/play/'
  });

  assert.equal(text, [
    'Hexzzle 🐝',
    'Score: 12,840',
    'Blooms: 14',
    'Best Stack: 8',
    'Overblooms: 3',
    'Play: https://hexzzle.com/play/'
  ].join('\n'));
});

test('uses the production play URL as the canonical share target', () => {
  assert.equal(CANONICAL_PLAY_URL, 'https://hexzzle.com/play/');
});

test('falls back to clipboard copy when Web Share is unavailable', async () => {
  let copiedText = '';
  const result = await shareResult({
    score: 12840,
    totalBlooms: 14,
    bestStack: 8,
    overblooms: 3
  }, {
    clipboard: {
      writeText: async (text) => {
        copiedText = text;
      }
    }
  });

  assert.equal(result.method, 'clipboard');
  assert.match(copiedText, /Play: https:\/\/hexzzle\.com\/play\//);
  assert.doesNotMatch(copiedText, /pages\.dev|preview|game\/hexzzle/);
});
