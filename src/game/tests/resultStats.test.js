import test from 'node:test';
import assert from 'node:assert/strict';

import { createFinalResultStats } from '../core/ResultStats.js';
import {
  BALANCE_VERSION,
  RULE_VERSION
} from '../core/GameVersions.js';

test('final result includes Bloom Stack stats and metadata', () => {
  const result = createFinalResultStats({
    scoreSnapshot: {
      score: 12840,
      totalBlooms: 14,
      bestChain: 1,
      longestGroup: 8,
      overblooms: 3
    },
    bestScore: 15000,
    piecesPlaced: 42,
    durationSec: 301,
    createdAt: '2026-06-18T00:00:00.000Z'
  });

  assert.equal(result.score, 12840);
  assert.equal(result.totalBlooms, 14);
  assert.equal(result.bestStack, 8);
  assert.equal(result.longestGroup, 8);
  assert.equal(result.overblooms, 3);
  assert.equal(result.piecesPlaced, 42);
  assert.equal(result.durationSec, 301);
  assert.equal(result.ruleVersion, RULE_VERSION);
  assert.equal(result.balanceVersion, BALANCE_VERSION);
});

test('final result normalizes missing optional values', () => {
  const result = createFinalResultStats({
    scoreSnapshot: { score: 100 },
    bestScore: 100
  });

  assert.equal(result.totalBlooms, 0);
  assert.equal(result.bestStack, 0);
  assert.equal(result.overblooms, 0);
  assert.equal(result.piecesPlaced, 0);
  assert.equal(result.durationSec, 0);
});
