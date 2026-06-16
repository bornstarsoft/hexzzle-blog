import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createDragGhostState,
  updateDragGhostCenter
} from '../core/DragGhostTracker.js';

test('creates the drag ghost from pointer coordinates instead of tray or board coordinates', () => {
  const state = createDragGhostState({
    pointer: { id: 9, x: 120, y: 600 },
    pieceIndex: 2,
    offset: { x: 0, y: -32 },
    trayOrigin: { x: 320, y: 700 },
    previewAnchor: { q: 0, r: 0 }
  });

  assert.equal(state.pointerId, 9);
  assert.equal(state.pieceIndex, 2);
  assert.deepEqual(state.pointerPoint, { x: 120, y: 600 });
  assert.deepEqual(state.pointerOffset, { x: 0, y: -32 });
  assert.deepEqual(state.ghostPosition, { x: 120, y: 568 });
  assert.deepEqual(state.ghostCenter, { x: 120, y: 568 });
});

test('updates the drag ghost from current pointer coordinates only', () => {
  const state = createDragGhostState({
    pointer: { id: 9, x: 120, y: 600 },
    pieceIndex: 0,
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
});
