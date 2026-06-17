import test from 'node:test';
import assert from 'node:assert/strict';

import { ScoreModel } from '../core/ScoreModel.js';

test('scores Bloom Stack merge progress and bloom bonus', () => {
  const score = new ScoreModel({
    placeCell: 1,
    mergeBase: 10,
    stackProgressBonus: 5,
    bloomBase: 120,
    extraStackBonus: 30,
    multiBloomBonus: 75,
    chainMultiplierStep: 0.5,
    maxChainMultiplier: 2
  });

  const points = score.addBloomResult({
    merges: [{ totalCount: 5 }],
    scans: [[{ totalCount: 8 }]],
    groupsCleared: 1,
    chainCount: 1,
    longestGroup: 8
  });

  assert.equal(points, 255);
  assert.equal(score.score, 255);
  assert.equal(score.totalBlooms, 1);
  assert.equal(score.longestGroup, 8);
});
