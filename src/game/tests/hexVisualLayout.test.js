import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getBoardBounds,
  getBoardTopReserve,
  getBoardTrayGap,
  getGameVisualLayout,
  getGhostHexSize,
  getHexVisualSize,
  getInvalidFeedbackHexSize,
  getInvalidPreviewMarker,
  getMaxTrayPieceVisualWidth,
  getPreviewHexSize,
  getTrayBounds,
  getTrayLayout,
  getTrayPieceAllowanceWidth,
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
    assert.ok(fourCellLineWidth <= getTrayPieceAllowanceWidth(tray));
    assert.ok(getTrayPieceAllowanceWidth(tray) - tray.pieceWidth <= 20);
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

test('small mobile layout uses compact board and tray reserves', () => {
  for (const width of [360, 390, 393, 430]) {
    const layout = getGameVisualLayout({ width, height: 500 });

    assert.ok(getBoardTopReserve(width) <= 34, `board top reserve too large at ${width}px`);
    assert.ok(getBoardTrayGap(width) <= 10, `board/tray gap too large at ${width}px`);
    assert.ok(layout.tray.bottomOffset >= 32, `tray safe bottom reserve too small at ${width}px`);
    assert.ok(layout.tray.bottomOffset <= 40, `tray bottom reserve wastes space at ${width}px`);
  }
});

test('mobile board uses more of the side-gutter game panel without clipping tray', () => {
  const cases = [
    { viewportWidth: 360, panelHeight: 498 },
    { viewportWidth: 390, panelHeight: 538 },
    { viewportWidth: 393, panelHeight: 517 },
    { viewportWidth: 430, panelHeight: 548 }
  ];

  for (const item of cases) {
    const panelWidth = Math.round(item.viewportWidth * 0.97);
    const layout = getGameVisualLayout({ width: panelWidth, height: item.panelHeight });
    const board = getBoardBounds(layout.board);
    const tray = getTrayBounds(layout.tray);
    const boardWidthRatio = (board.right - board.left) / panelWidth;

    assert.ok(boardWidthRatio >= 0.64, `mobile board ratio too small at ${item.viewportWidth}px`);
    assert.ok(board.bottom + layout.boardTrayGap <= tray.top, `board/tray overlap at ${item.viewportWidth}px`);
    assert.ok(tray.bottom <= item.panelHeight - 30, `tray safe reserve too small at ${item.viewportWidth}px`);
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
