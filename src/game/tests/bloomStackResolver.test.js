import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BloomStackResolver,
  chooseMergeTarget,
  getBloomStackPlans,
  getPieceDuplicateBadges
} from '../core/BloomStackResolver.js';
import { HexBoardModel } from '../core/HexBoardModel.js';

test('adjacent same-color cells merge into one stack', () => {
  const board = new HexBoardModel(3);
  const placedCells = [
    { q: 0, r: 0, color: 'red' },
    { q: 1, r: 0, color: 'red' }
  ];
  placedCells.forEach((cell) => board.setCell(cell, { color: cell.color, count: 1 }));

  const result = new BloomStackResolver().resolve(board, { placedCells, anchor: { q: 0, r: 0 } });

  assert.equal(result.merges.length, 1);
  assert.equal(board.getCellCount({ q: 0, r: 0 }), 2);
  assert.equal(board.getCell({ q: 1, r: 0 }), null);
});

test('two stacks of same color connected by a placed piece merge', () => {
  const board = new HexBoardModel(3);
  board.setCell({ q: -1, r: 0 }, { color: 'blue', count: 2 });
  board.setCell({ q: 1, r: 0 }, { color: 'blue', count: 2 });
  const placedCells = [{ q: 0, r: 0, color: 'blue' }];
  board.setCell(placedCells[0], { color: 'blue', count: 1 });

  const result = new BloomStackResolver().resolve(board, { placedCells, anchor: { q: 0, r: 0 } });

  assert.equal(result.merges[0].totalCount, 5);
  assert.equal(board.getCellCount({ q: 0, r: 0 }), 5);
  assert.equal(board.getCell({ q: -1, r: 0 }), null);
  assert.equal(board.getCell({ q: 1, r: 0 }), null);
});

test('disconnected same-color stacks do not merge', () => {
  const board = new HexBoardModel(3);
  board.setCell({ q: -3, r: 0 }, { color: 'green', count: 3 });
  const placedCells = [{ q: 0, r: 0, color: 'green' }];
  board.setCell(placedCells[0], { color: 'green', count: 1 });

  const result = new BloomStackResolver().resolve(board, { placedCells, anchor: { q: 0, r: 0 } });

  assert.equal(result.merges.length, 0);
  assert.equal(board.getCellCount({ q: -3, r: 0 }), 3);
  assert.equal(board.getCellCount({ q: 0, r: 0 }), 1);
});

test('total count 5 remains as stack count 5', () => {
  const board = new HexBoardModel(3);
  board.setCell({ q: 0, r: 0 }, { color: 'purple', count: 4 });
  const placedCells = [{ q: 1, r: 0, color: 'purple' }];
  board.setCell(placedCells[0], { color: 'purple', count: 1 });

  const result = new BloomStackResolver().resolve(board, { placedCells, anchor: { q: 1, r: 0 } });

  assert.equal(result.groupsCleared, 0);
  assert.equal(board.getCellCount({ q: 1, r: 0 }), 5);
  assert.equal(board.getCell({ q: 0, r: 0 }), null);
});

test('total count 6 blooms and clears', () => {
  const board = new HexBoardModel(3);
  board.setCell({ q: 0, r: 0 }, { color: 'yellow', count: 5 });
  const placedCells = [{ q: 1, r: 0, color: 'yellow' }];
  board.setCell(placedCells[0], { color: 'yellow', count: 1 });

  const result = new BloomStackResolver().resolve(board, { placedCells, anchor: { q: 1, r: 0 } });

  assert.equal(result.groupsCleared, 1);
  assert.equal(result.totalCleared, 6);
  assert.equal(result.longestGroup, 6);
  assert.equal(board.getCell({ q: 0, r: 0 }), null);
  assert.equal(board.getCell({ q: 1, r: 0 }), null);
});

test('total count 8 blooms and records extra stack size', () => {
  const board = new HexBoardModel(3);
  board.setCell({ q: 0, r: 0 }, { color: 'orange', count: 5 });
  board.setCell({ q: 1, r: -1 }, { color: 'orange', count: 2 });
  const placedCells = [{ q: 1, r: 0, color: 'orange' }];
  board.setCell(placedCells[0], { color: 'orange', count: 1 });

  const result = new BloomStackResolver().resolve(board, { placedCells, anchor: { q: 1, r: 0 } });

  assert.equal(result.blooms[0].totalCount, 8);
  assert.equal(result.longestGroup, 8);
  assert.equal(result.totalCleared, 8);
});

test('mixed colors resolve separately', () => {
  const board = new HexBoardModel(3);
  board.setCell({ q: -1, r: 0 }, { color: 'red', count: 2 });
  board.setCell({ q: 2, r: -1 }, { color: 'blue', count: 2 });
  const placedCells = [
    { q: 0, r: 0, color: 'red' },
    { q: 1, r: -1, color: 'blue' }
  ];
  placedCells.forEach((cell) => board.setCell(cell, { color: cell.color, count: 1 }));

  const result = new BloomStackResolver().resolve(board, { placedCells, anchor: { q: 0, r: 0 } });

  assert.equal(result.merges.length, 2);
  assert.equal(board.getCellCount({ q: 0, r: 0 }), 3);
  assert.equal(board.getCellCount({ q: 1, r: -1 }), 3);
});

test('deterministic merge target prefers placed cell nearest to anchor', () => {
  const board = new HexBoardModel(3);
  const cells = [
    { q: 0, r: 0 },
    { q: 1, r: 0 },
    { q: 2, r: 0 }
  ];
  const placedCells = [
    { q: 2, r: 0, color: 'red', index: 1 },
    { q: 1, r: 0, color: 'red', index: 0 }
  ];

  assert.deepEqual(
    stripExtra(chooseMergeTarget(cells, {
      board,
      placedCells,
      placedByKey: new Map(placedCells.map((cell) => [`${cell.q},${cell.r}`, cell])),
      anchor: { q: 1, r: 0 }
    })),
    { q: 1, r: 0 }
  );
});

test('same-color cells inside one placed piece merge', () => {
  const board = new HexBoardModel(3);
  const placedCells = [
    { q: 0, r: 0, color: 'blue' },
    { q: 1, r: 0, color: 'blue' },
    { q: 2, r: 0, color: 'blue' }
  ];
  placedCells.forEach((cell) => board.setCell(cell, { color: 'blue', count: 1 }));

  new BloomStackResolver().resolve(board, { placedCells, anchor: { q: 0, r: 0 } });

  assert.equal(board.getCellCount({ q: 0, r: 0 }), 3);
  assert.equal(board.getCell({ q: 1, r: 0 }), null);
  assert.equal(board.getCell({ q: 2, r: 0 }), null);
});

test('stack resolver only affects components touched by placement', () => {
  const board = new HexBoardModel(3);
  board.setCell({ q: -3, r: 1 }, { color: 'red', count: 2 });
  board.setCell({ q: -2, r: 1 }, { color: 'red', count: 2 });
  const placedCells = [{ q: 0, r: 0, color: 'blue' }];
  board.setCell(placedCells[0], { color: 'blue', count: 1 });

  new BloomStackResolver().resolve(board, { placedCells, anchor: { q: 0, r: 0 } });

  assert.equal(board.getCellCount({ q: -3, r: 1 }), 2);
  assert.equal(board.getCellCount({ q: -2, r: 1 }), 2);
});

test('preview plans expose 5/6 and Bloom hints', () => {
  const board = new HexBoardModel(3);
  board.setCell({ q: 0, r: 0 }, { color: 'green', count: 4 });

  const five = getBloomStackPlans(board, {
    placedCells: [{ q: 1, r: 0, color: 'green' }],
    anchor: { q: 1, r: 0 }
  });
  const bloom = getBloomStackPlans(board, {
    placedCells: [
      { q: 1, r: 0, color: 'green' },
      { q: 1, r: -1, color: 'green' }
    ],
    anchor: { q: 1, r: 0 }
  });

  assert.equal(five[0].hint, '5/6');
  assert.equal(bloom[0].hint, 'Bloom!');
});

test('tray duplicate badge data returns x2 and x3 only when relevant', () => {
  const badges = getPieceDuplicateBadges({
    cells: [
      { color: 'blue' },
      { color: 'blue' },
      { color: 'red' }
    ]
  });
  const noBadges = getPieceDuplicateBadges({
    cells: [
      { color: 'red' },
      { color: 'blue' },
      { color: 'green' }
    ]
  });
  const tripleBadge = getPieceDuplicateBadges({
    cells: [
      { color: 'purple' },
      { color: 'purple' },
      { color: 'purple' }
    ]
  });

  assert.deepEqual(badges, [{ color: 'blue', count: 2, label: '\u00d72' }]);
  assert.deepEqual(noBadges, []);
  assert.deepEqual(tripleBadge, [{ color: 'purple', count: 3, label: '\u00d73' }]);
});

function stripExtra(coord) {
  return { q: coord.q, r: coord.r };
}
