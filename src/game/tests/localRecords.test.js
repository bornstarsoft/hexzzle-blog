import test from 'node:test';
import assert from 'node:assert/strict';

import {
  addLocalRecord,
  compareLocalRecords,
  createLocalRecord,
  getEmptyLocalRecordsState
} from '../core/LocalRecordsService.js';
import {
  BALANCE_VERSION,
  RULE_VERSION
} from '../core/GameVersions.js';
import { StorageService } from '../core/StorageService.js';

test('creates local records with result stats and version metadata only', () => {
  const record = createLocalRecord({
    score: 12840,
    totalBlooms: 14,
    bestStack: 8,
    overblooms: 3,
    piecesPlaced: 42,
    durationSec: 301,
    nickname: 'not stored'
  }, { createdAt: '2026-06-18T00:00:00.000Z' });

  assert.deepEqual(record, {
    score: 12840,
    blooms: 14,
    bestStack: 8,
    overblooms: 3,
    piecesPlaced: 42,
    durationSec: 301,
    createdAt: '2026-06-18T00:00:00.000Z',
    ruleVersion: RULE_VERSION,
    balanceVersion: BALANCE_VERSION
  });
  assert.equal(Object.hasOwn(record, 'nickname'), false);
});

test('stores top 10 local records sorted by score and tie breakers', () => {
  let state = getEmptyLocalRecordsState();
  const results = [
    { score: 1000, totalBlooms: 8, bestStack: 6, overblooms: 0 },
    { score: 1200, totalBlooms: 7, bestStack: 6, overblooms: 0 },
    { score: 1200, totalBlooms: 9, bestStack: 6, overblooms: 0 },
    { score: 1200, totalBlooms: 9, bestStack: 8, overblooms: 0 },
    { score: 1200, totalBlooms: 9, bestStack: 8, overblooms: 2 }
  ];

  results.forEach((result, index) => {
    state = addLocalRecord(state, result, {
      createdAt: `2026-06-18T00:00:0${index}.000Z`
    }).state;
  });
  for (let index = 0; index < 8; index += 1) {
    state = addLocalRecord(state, {
      score: 900 - index,
      totalBlooms: index,
      bestStack: 5,
      overblooms: 0
    }, { createdAt: `2026-06-18T00:01:0${index}.000Z` }).state;
  }

  assert.equal(state.records.length, 10);
  assert.deepEqual(state.records[0], {
    score: 1200,
    blooms: 9,
    bestStack: 8,
    overblooms: 2,
    piecesPlaced: 0,
    durationSec: 0,
    createdAt: '2026-06-18T00:00:04.000Z',
    ruleVersion: RULE_VERSION,
    balanceVersion: BALANCE_VERSION
  });
  assert.equal(state.records.at(-1).score, 896);
});

test('local record tie breaker prefers earlier createdAt after stats match', () => {
  const earlier = createLocalRecord({ score: 500, totalBlooms: 2, bestStack: 6, overblooms: 0 }, {
    createdAt: '2026-06-18T00:00:00.000Z'
  });
  const later = createLocalRecord({ score: 500, totalBlooms: 2, bestStack: 6, overblooms: 0 }, {
    createdAt: '2026-06-18T00:00:01.000Z'
  });

  assert.ok(compareLocalRecords(earlier, later) < 0);
});

test('empty local records state is friendly and stable', () => {
  assert.deepEqual(getEmptyLocalRecordsState(), { records: [] });
});

test('storage keeps best score compatible while saving local records', () => {
  const backingStore = new Map();
  const storage = new StorageService({
    getItem: (key) => backingStore.get(key) ?? null,
    setItem: (key, value) => backingStore.set(key, value)
  });

  storage.saveBestScore(500);
  const summary = storage.saveLocalRecord({
    score: 700,
    totalBlooms: 4,
    bestStack: 6,
    overblooms: 0,
    piecesPlaced: 12
  }, { createdAt: '2026-06-18T00:00:00.000Z' });

  assert.equal(storage.getBestScore(), 500);
  assert.equal(summary.state.records.length, 1);
  assert.equal(storage.getLocalRecordsState().records[0].score, 700);
});
