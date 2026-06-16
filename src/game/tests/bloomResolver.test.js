import test from 'node:test';
import assert from 'node:assert/strict';

import { HexBoardModel } from '../core/HexBoardModel.js';
import { BloomResolver } from '../core/BloomResolver.js';

test('clears one connected same-color group of 6 cells', () => {
  const board = new HexBoardModel(3);
  const connected = [
    { q: 0, r: 0 },
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 }
  ];

  connected.forEach((coord) => board.setCell(coord, 'blue'));

  const result = new BloomResolver().resolve(board);

  assert.equal(result.totalCleared, 6);
  assert.equal(result.groupsCleared, 1);
  assert.equal(result.longestGroup, 6);
  assert.equal(result.chainCount, 1);
  assert.ok(connected.every((coord) => board.getCell(coord) === null));
});

test('does not clear scattered same-color cells totaling 6', () => {
  const board = new HexBoardModel(3);
  const scattered = [
    { q: -3, r: 0 },
    { q: -2, r: 2 },
    { q: 0, r: -3 },
    { q: 0, r: 3 },
    { q: 2, r: -2 },
    { q: 3, r: 0 }
  ];

  scattered.forEach((coord) => board.setCell(coord, 'green'));

  const result = new BloomResolver().resolve(board);

  assert.equal(result.totalCleared, 0);
  assert.equal(result.groupsCleared, 0);
  assert.ok(scattered.every((coord) => board.getCell(coord) === 'green'));
});

test('clears larger groups and multiple bloom groups in one scan', () => {
  const board = new HexBoardModel(3);
  const redGroup = [
    { q: 0, r: 0 },
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 }
  ];
  const yellowGroup = [
    { q: 3, r: -3 },
    { q: 2, r: -2 },
    { q: 1, r: -2 },
    { q: 1, r: -3 },
    { q: 2, r: -3 },
    { q: 3, r: -2 }
  ];

  redGroup.forEach((coord) => board.setCell(coord, 'red'));
  yellowGroup.forEach((coord) => board.setCell(coord, 'yellow'));

  const result = new BloomResolver().resolve(board);

  assert.equal(result.totalCleared, 13);
  assert.equal(result.groupsCleared, 2);
  assert.equal(result.longestGroup, 7);
  assert.equal(result.chainCount, 1);
});
