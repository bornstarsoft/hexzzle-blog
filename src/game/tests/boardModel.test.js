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
  assert.equal(board.getCell({ q: 0, r: 0 }), 'red');
  assert.equal(board.getCell({ q: 1, r: 0 }), 'blue');
  assert.equal(board.canPlacePiece(piece, { q: 0, r: 0 }), false);
  assert.equal(board.canPlacePiece(piece, { q: 3, r: 0 }), false);
});

test('detects whether any tray piece can fit on the board', () => {
  const board = new HexBoardModel(3);
  const single = { cells: [{ dq: 0, dr: 0, color: 'red' }] };

  assert.equal(board.hasAnyFit([single]), true);

  board.coordinates.forEach((coord) => board.setCell(coord, 'purple'));

  assert.equal(board.hasAnyFit([single]), false);
});

test('snapshot and restore include occupied cells', () => {
  const board = new HexBoardModel(3);
  board.setCell({ q: 0, r: 0 }, 'orange');
  const snapshot = board.snapshot();

  board.setCell({ q: 0, r: 0 }, 'green');
  board.restore(snapshot);

  assert.equal(board.getCell({ q: 0, r: 0 }), 'orange');
});
