import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createDragGhostState,
  getDragGhostCellCenters,
  getGhostAnchorPoint,
  getPieceAnchorLocalOffset,
  getPieceCellLocalOffsets,
  updateDragGhostCenter
} from '../core/DragGhostTracker.js';

const duoLinePiece = {
  cells: [
    { dq: 0, dr: 0, color: 'red' },
    { dq: 1, dr: 0, color: 'red' }
  ]
};

test('creates the drag ghost from pointer coordinates instead of tray or board coordinates', () => {
  const state = createDragGhostState({
    pointer: { id: 9, x: 120, y: 600 },
    pieceIndex: 2,
    piece: duoLinePiece,
    boardCellSize: 32,
    offset: { x: 0, y: -32 },
    trayOrigin: { x: 320, y: 700 },
    legacyCellSize: 18,
    previewAnchor: { q: 0, r: 0 }
  });

  assert.equal(state.pointerId, 9);
  assert.equal(state.pieceIndex, 2);
  assert.deepEqual(state.pointerPoint, { x: 120, y: 600 });
  assert.deepEqual(state.pointerOffset, { x: 0, y: -32 });
  assert.deepEqual(state.ghostPosition, { x: 120, y: 568 });
  assert.deepEqual(state.ghostCenter, { x: 120, y: 568 });
  assert.equal(state.boardCellSize, 32);
  assert.equal(state.anchorLocalOffset.x, 0);
  assert.equal(state.anchorLocalOffset.y, 0);
  assert.equal(Math.round(state.ghostAnchorPoint.x), 120);
  assert.equal(Math.round(state.ghostAnchorPoint.y), 568);
  assert.deepEqual(getDragGhostCellCenters(state)[0], {
    index: 0,
    dq: 0,
    dr: 0,
    color: 'red',
    x: 120,
    y: 568
  });
});

test('updates the drag ghost from current pointer coordinates only', () => {
  const state = createDragGhostState({
    pointer: { id: 9, x: 120, y: 600 },
    pieceIndex: 0,
    piece: duoLinePiece,
    boardCellSize: 32,
    offset: { x: 0, y: -32 }
  });

  const next = updateDragGhostCenter(state, {
    pointer: { id: 9, x: 250, y: 430 },
    trayOrigin: { x: 40, y: 730 },
    previewAnchor: { q: 2, r: -1 }
  });

  assert.deepEqual(next.pointerPoint, { x: 250, y: 430 });
  assert.deepEqual(next.ghostPosition, { x: 250, y: 398 });
  assert.deepEqual(next.ghostCenter, { x: 250, y: 398 });
  assert.equal(Math.round(next.ghostAnchorPoint.x), 250);
  assert.equal(Math.round(next.ghostAnchorPoint.y), 398);
});

test('computes piece anchor local offset from canonical first-cell anchor', () => {
  const boardScaleOffset = getPieceAnchorLocalOffset(duoLinePiece, 32);
  const smallerVisualOffset = getPieceAnchorLocalOffset(duoLinePiece, 18);

  assert.equal(Math.round(boardScaleOffset.x), 0);
  assert.equal(boardScaleOffset.y, 0);
  assert.equal(Math.round(smallerVisualOffset.x), 0);
});

test('drag ghost board-scale anchor maps from ghost center plus anchor offset', () => {
  const offset = getPieceAnchorLocalOffset(duoLinePiece, 32);
  const anchorPoint = getGhostAnchorPoint({ x: 180, y: 220 }, offset);

  assert.equal(Math.round(anchorPoint.x), 180);
  assert.equal(anchorPoint.y, 220);
});

test('piece cell local offsets use canonical anchor-relative board geometry', () => {
  const offsets = getPieceCellLocalOffsets(duoLinePiece, 32);

  assert.equal(offsets.length, 2);
  assert.equal(Math.round(offsets[0].x), 0);
  assert.equal(Math.round(offsets[1].x), 55);
  assert.equal(offsets[0].y, 0);
  assert.equal(offsets[1].y, 0);
});
