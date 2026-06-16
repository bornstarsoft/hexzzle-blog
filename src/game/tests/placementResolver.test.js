import test from 'node:test';
import assert from 'node:assert/strict';

import { HexBoardModel } from '../core/HexBoardModel.js';
import {
  resolveLocalPlacementDrop,
  resolveLocalPlacementPreview
} from '../core/PlacementResolver.js';

test('valid local anchor previews and drops at the exact local anchor', () => {
  const board = new HexBoardModel(3);
  const piece = {
    cells: [{ dq: 0, dr: 0, color: 'red' }]
  };

  const preview = resolveLocalPlacementPreview(board, piece, { q: 0, r: 0 });
  const drop = resolveLocalPlacementDrop(board, piece, { q: 0, r: 0 });

  assert.equal(preview.valid, true);
  assert.deepEqual(preview.localAnchor, { q: 0, r: 0 });
  assert.deepEqual(preview.previewAnchor, { q: 0, r: 0 });
  assert.deepEqual(preview.placementAnchor, { q: 0, r: 0 });
  assert.equal(preview.invalidReason, null);
  assert.equal(drop.valid, true);
  assert.deepEqual(drop.placementAnchor, { q: 0, r: 0 });
});

test('blocked local anchor returns invalid preview at the same local anchor', () => {
  const board = new HexBoardModel(3);
  const piece = {
    cells: [{ dq: 0, dr: 0, color: 'red' }]
  };

  board.setCell({ q: 0, r: 0 }, 'green');
  const preview = resolveLocalPlacementPreview(board, piece, { q: 0, r: 0 });
  const drop = resolveLocalPlacementDrop(board, piece, { q: 0, r: 0 });

  assert.equal(preview.valid, false);
  assert.deepEqual(preview.localAnchor, { q: 0, r: 0 });
  assert.deepEqual(preview.previewAnchor, { q: 0, r: 0 });
  assert.equal(preview.placementAnchor, null);
  assert.equal(preview.invalidReason, 'occupied');
  assert.equal(preview.targets.some((target) => target.blocked), true);
  assert.equal(drop.valid, false);
  assert.equal(drop.placementAnchor, null);
  assert.equal(drop.invalidReason, 'occupied');
});

test('preview anchor never changes to a nearby valid anchor', () => {
  const board = new HexBoardModel(3);
  const piece = {
    cells: [{ dq: 0, dr: 0, color: 'red' }]
  };

  board.setCell({ q: 0, r: 0 }, 'green');
  const preview = resolveLocalPlacementPreview(board, piece, { q: 0, r: 0 });
  const drop = resolveLocalPlacementDrop(board, piece, { q: 0, r: 0 });

  assert.equal(board.canPlacePiece(piece, { q: 1, r: 0 }), true);
  assert.deepEqual(preview.previewAnchor, { q: 0, r: 0 });
  assert.notDeepEqual(preview.previewAnchor, { q: 1, r: 0 });
  assert.equal(drop.valid, false);
  assert.equal(drop.placementAnchor, null);
});

test('out-of-board local anchor shows red invalid targets without moving anchors', () => {
  const board = new HexBoardModel(3);
  const piece = {
    cells: [
      { dq: 0, dr: 0, color: 'red' },
      { dq: 1, dr: 0, color: 'red' },
      { dq: 2, dr: 0, color: 'red' }
    ]
  };

  const preview = resolveLocalPlacementPreview(board, piece, { q: 2, r: 0 });
  const drop = resolveLocalPlacementDrop(board, piece, { q: 2, r: 0 });

  assert.equal(preview.valid, false);
  assert.deepEqual(preview.previewAnchor, { q: 2, r: 0 });
  assert.equal(preview.invalidReason, 'out-of-board');
  assert.equal(preview.targets.some((target) => !target.exists), true);
  assert.equal(drop.valid, false);
  assert.equal(drop.placementAnchor, null);
  assert.equal(drop.invalidReason, 'out-of-board');
});

test('missing piece or anchor never places', () => {
  const board = new HexBoardModel(3);
  const piece = {
    cells: [{ dq: 0, dr: 0, color: 'red' }]
  };

  assert.equal(resolveLocalPlacementPreview(board, null, { q: 0, r: 0 }).invalidReason, 'no-piece');
  assert.equal(resolveLocalPlacementDrop(board, null, { q: 0, r: 0 }).valid, false);
  assert.equal(resolveLocalPlacementPreview(board, piece, null).invalidReason, 'no-anchor');
  assert.equal(resolveLocalPlacementDrop(board, piece, null).valid, false);
});
