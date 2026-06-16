import test from 'node:test';
import assert from 'node:assert/strict';

import { createShareText } from '../core/ShareService.js';

test('creates compact classic mode share text with result stats and play URL', () => {
  const text = createShareText({
    score: 8420,
    totalBlooms: 12,
    bestChain: 3,
    longestGroup: 9,
    url: 'https://hexzzle.com/play/'
  });

  assert.equal(text, [
    'Hexzzle 🐝',
    'Score: 8,420',
    'Blooms: 12',
    'Best Chain: x3',
    'Best Group: 9',
    '🌸🌸🌸🌸⬡',
    'Play: https://hexzzle.com/play/'
  ].join('\n'));
});
