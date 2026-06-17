import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getBoardBounds,
  getGameVisualLayout,
  getGhostHexSize,
  getHexVisualSize,
  getInvalidFeedbackHexSize,
  getInvalidPreviewMarker,
  getMaxTrayPieceVisualWidth,
  getPreviewHexSize,
  getTrayBounds,
  getTrayLayout,
  getTrayPieceHexSize,
  shouldShowOpenAnchorHints
} from '../core/HexVisualLayout.js';

test('tray, ghost, and preview hex cells share the board visual size', () => {
  const boardHexSize = getHexVisualSize({ width: 390, height: 548 });

  assert.equal(getTrayPieceHexSize(boardHexSize), boardHexSize);
  assert.equal(getGhostHexSize(boardHexSize), boardHexSize);
  assert.equal(getPreviewHexSize(boardHexSize), boardHexSize);
  assert.equal(getInvalidFeedbackHexSize(boardHexSize), boardHexSize);
});

test('mobile tray slots fit a board-size four-cell line without shrinking tray pieces', () => {
  for (const width of [360, 390, 430]) {
    const boardHexSize = getHexVisualSize({ width, height: 548 });
    const tray = getTrayLayout({ width, height: 548, hexSize: boardHexSize });
    const fourCellLineWidth = 4 * Math.sqrt(3) * boardHexSize;

    assert.equal(tray.slotCount, 3);
    assert.ok(getMaxTrayPieceVisualWidth(boardHexSize) >= fourCellLineWidth);
    assert.ok(fourCellLineWidth <= tray.pieceWidth);
  }
});

test('invalid placement preview uses red hex cells without an O marker', () => {
  assert.equal(getInvalidPreviewMarker(), 'none');
});

test('board and tray layouts stay separated at target viewports', () => {
  const cases = [
    { width: 360, height: 548 },
    { width: 390, height: 548 },
    { width: 430, height: 548 },
    { width: 768, height: 620 },
    { width: 1120, height: 620 }
  ];

  for (const viewport of cases) {
    const layout = getGameVisualLayout(viewport);
    const board = getBoardBounds(layout.board);
    const tray = getTrayBounds(layout.tray);

    assert.ok(
      board.bottom + layout.boardTrayGap <= tray.top,
      `board/tray overlap at ${viewport.width}x${viewport.height}`
    );
  }
});

test('open anchor center dots are hidden outside debug drag mode', () => {
  assert.equal(shouldShowOpenAnchorHints({
    selectedPiece: { id: 'piece' },
    isDragging: false,
    debugDragEnabled: false
  }), false);
  assert.equal(shouldShowOpenAnchorHints({
    selectedPiece: { id: 'piece' },
    isDragging: false,
    debugDragEnabled: true
  }), true);
  assert.equal(shouldShowOpenAnchorHints({
    selectedPiece: { id: 'piece' },
    isDragging: true,
    debugDragEnabled: true
  }), false);
});
