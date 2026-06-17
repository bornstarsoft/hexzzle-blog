import test from 'node:test';
import assert from 'node:assert/strict';

import { HexBoardModel } from '../core/HexBoardModel.js';

test('places a piece only when every target cell exists and is empty', () => {
  const board = new HexBoardModel(3);
  const piece = {
    cells: [
      { dq: 0, dr: 0, color: 'red' },
      { dq: 1, dr: 0, color: 'blue' }
    ]
  };

  assert.equal(board.canPlacePiece(piece, { q: 0, r: 0 }), true);
  board.placePiece(piece, { q: 0, r: 0 });
  assert.deepEqual(board.getCell({ q: 0, r: 0 }), { color: 'red', count: 1 });
  assert.deepEqual(board.getCell({ q: 1, r: 0 }), { color: 'blue', count: 1 });
  assert.equal(board.canPlacePiece(piece, { q: 0, r: 0 }), false);
  assert.equal(board.canPlacePiece(piece, { q: 3, r: 0 }), false);
});

test('board cell stores color and count', () => {
  const board = new HexBoardModel(3);

  board.setCell({ q: 0, r: 0 }, { color: 'green', count: 4 });

  assert.deepEqual(board.getCell({ q: 0, r: 0 }), { color: 'green', count: 4 });
  assert.equal(board.getCellColor({ q: 0, r: 0 }), 'green');
  assert.equal(board.getCellCount({ q: 0, r: 0 }), 4);
});

test('detects whether any tray piece can fit on the board', () => {
  const board = new HexBoardModel(3);
  const single = { cells: [{ dq: 0, dr: 0, color: 'red' }] };

  assert.equal(board.hasAnyFit([single]), true);

  board.coordinates.forEach((coord) => board.setCell(coord, 'purple'));

  assert.equal(board.hasAnyFit([single]), false);
});

test('counts empty cells for board-pressure generation', () => {
  const board = new HexBoardModel(3);

  assert.equal(board.getEmptyCellCount(), 37);
  board.setCell({ q: 0, r: 0 }, 'red');
  board.setCell({ q: 1, r: -1 }, 'blue');
  assert.equal(board.getEmptyCellCount(), 35);
});

test('snapshot and restore include occupied stack counts', () => {
  const board = new HexBoardModel(3);
  board.setCell({ q: 0, r: 0 }, { color: 'orange', count: 5 });
  const snapshot = board.snapshot();

  board.setCell({ q: 0, r: 0 }, 'green');
  board.restore(snapshot);

  assert.deepEqual(board.getCell({ q: 0, r: 0 }), { color: 'orange', count: 5 });
});
