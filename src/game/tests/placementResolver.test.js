import test from 'node:test';
import assert from 'node:assert/strict';

import { HexBoardModel } from '../core/HexBoardModel.js';
import { findBestPlacementAnchor } from '../core/PlacementResolver.js';

test('returns the tapped anchor when the selected piece fits there', () => {
  const board = new HexBoardModel(3);
  const piece = {
    cells: [{ dq: 0, dr: 0, color: 'red' }]
  };

  assert.deepEqual(findBestPlacementAnchor(board, piece, { q: 0, r: 0 }), { q: 0, r: 0 });
});

test('chooses the nearest valid anchor when the tapped anchor is occupied', () => {
  const board = new HexBoardModel(3);
  const piece = {
    cells: [{ dq: 0, dr: 0, color: 'red' }]
  };

  board.setCell({ q: 0, r: 0 }, 'green');
  board.setCell({ q: 1, r: 0 }, 'green');
  board.setCell({ q: 1, r: -1 }, 'green');
  board.setCell({ q: -1, r: 0 }, 'green');
  board.setCell({ q: -1, r: 1 }, 'green');
  board.setCell({ q: 0, r: 1 }, 'green');

  assert.deepEqual(findBestPlacementAnchor(board, piece, { q: 0, r: 0 }), { q: 0, r: -1 });
});

test('returns null when no nearby anchor can fit the selected piece', () => {
  const board = new HexBoardModel(3);
  const piece = {
    cells: [{ dq: 0, dr: 0, color: 'red' }]
  };

  board.coordinates.forEach((coord) => board.setCell(coord, 'purple'));

  assert.equal(findBestPlacementAnchor(board, piece, { q: 0, r: 0 }), null);
});
