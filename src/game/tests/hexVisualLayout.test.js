import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getGhostHexSize,
  getHexVisualSize,
  getInvalidFeedbackHexSize,
  getInvalidPreviewMarker,
  getMaxTrayPieceVisualWidth,
  getPreviewHexSize,
  getTrayLayout,
  getTrayPieceHexSize
} from '../core/HexVisualLayout.js';

test('tray, ghost, and preview hex cells share the board visual size', () => {
  const boardHexSize = getHexVisualSize({ width: 390, height: 548 });

  assert.equal(getTrayPieceHexSize(boardHexSize), boardHexSize);
  assert.equal(getGhostHexSize(boardHexSize), boardHexSize);
  assert.equal(getPreviewHexSize(boardHexSize), boardHexSize);
  assert.equal(getInvalidFeedbackHexSize(boardHexSize), boardHexSize);
});

test('mobile tray slots fit a board-size three-cell line without shrinking tray pieces', () => {
  for (const width of [360, 390, 430]) {
    const boardHexSize = getHexVisualSize({ width, height: 548 });
    const tray = getTrayLayout({ width, height: 548, hexSize: boardHexSize });

    assert.equal(tray.slotCount, 3);
    assert.ok(getMaxTrayPieceVisualWidth(boardHexSize) <= tray.pieceWidth);
  }
});

test('invalid placement preview uses red hex cells without an O marker', () => {
  assert.equal(getInvalidPreviewMarker(), 'none');
});
