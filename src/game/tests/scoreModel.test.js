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

test('uses tunable per-overbloom bonus for stack counts above 6', () => {
  const score = new ScoreModel({
    bloomBase: 120,
    extraStackBonusPerOver: 40
  });

  const points = score.addBloomResult({
    merges: [],
    scans: [[{ totalCount: 8 }]],
    groupsCleared: 1,
    chainCount: 1,
    longestGroup: 8
  });

  assert.equal(points, 200);
  assert.equal(score.snapshot().overblooms, 1);
  assert.equal(score.snapshot().bestStack, 8);
});

test('falls back to legacy extraStackBonus when per-over value is not configured', () => {
  const score = new ScoreModel({
    bloomBase: 120,
    extraStackBonus: 25
  });

  const points = score.addBloomResult({
    merges: [],
    scans: [[{ totalCount: 8 }]],
    groupsCleared: 1,
    chainCount: 1,
    longestGroup: 8
  });

  assert.equal(points, 170);
});
