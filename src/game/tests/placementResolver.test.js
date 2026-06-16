import test from 'node:test';
import assert from 'node:assert/strict';

import { HexBoardModel } from '../core/HexBoardModel.js';
import {
  findBestPlacementAnchor,
  resolvePlacementPreview,
  resolveReleasePlacementAnchor
} from '../core/PlacementResolver.js';

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

test('preview stays on the local blocked anchor instead of jumping to a nearby valid anchor', () => {
  const board = new HexBoardModel(3);
  const piece = {
    cells: [{ dq: 0, dr: 0, color: 'red' }]
  };

  board.setCell({ q: 0, r: 0 }, 'green');
  const preview = resolvePlacementPreview(board, piece, { q: 0, r: 0 }, 2);

  assert.equal(preview.valid, false);
  assert.equal(preview.placementAnchor, null);
  assert.deepEqual(preview.previewAnchor, { q: 0, r: 0 });
  assert.deepEqual(preview.candidateAnchor, { q: 0, r: 0 });
  assert.equal(preview.invalidReason, 'blocked');
  assert.equal(preview.targets.some((target) => target.blocked), true);
  assert.deepEqual(findBestPlacementAnchor(board, piece, { q: 0, r: 0 }, 2), { q: 1, r: 0 });
});

test('returns red invalid preview state when no candidate can place the piece', () => {
  const board = new HexBoardModel(3);
  const piece = {
    cells: [
      { dq: 0, dr: 0, color: 'red' },
      { dq: 1, dr: 0, color: 'red' },
      { dq: 2, dr: 0, color: 'red' }
    ]
  };

  board.coordinates.forEach((coord) => board.setCell(coord, 'purple'));
  const preview = resolvePlacementPreview(board, piece, { q: 2, r: 0 }, 2);

  assert.equal(preview.valid, false);
  assert.equal(preview.placementAnchor, null);
  assert.deepEqual(preview.previewAnchor, { q: 2, r: 0 });
  assert.equal(preview.targets.some((target) => target.blocked || !target.exists), true);
});

test('release placement refuses blocked local preview instead of using fallback', () => {
  const board = new HexBoardModel(3);
  const piece = {
    cells: [{ dq: 0, dr: 0, color: 'red' }]
  };

  board.setCell({ q: 0, r: 0 }, 'green');
  const preview = resolvePlacementPreview(board, piece, { q: 0, r: 0 });

  assert.equal(preview.invalidReason, 'blocked');
  assert.equal(resolveReleasePlacementAnchor(board, piece, preview, {
    fallbackAnchor: { q: 1, r: 0 },
    maxRadius: 1
  }), null);
});

test('release fallback may find a nearby valid anchor without changing preview rendering', () => {
  const board = new HexBoardModel(3);
  const piece = {
    cells: [{ dq: 0, dr: 0, color: 'red' }]
  };
  const preview = resolvePlacementPreview(board, piece, null);

  assert.equal(preview.previewAnchor, null);
  assert.equal(preview.invalidReason, 'no-anchor');
  assert.deepEqual(resolveReleasePlacementAnchor(board, piece, preview, {
    fallbackAnchor: { q: 0, r: 0 },
    maxRadius: 1
  }), { q: 0, r: 0 });
});
