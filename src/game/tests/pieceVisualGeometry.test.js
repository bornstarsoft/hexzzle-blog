import test from 'node:test';
import assert from 'node:assert/strict';

import { HexBoardModel } from '../core/HexBoardModel.js';
import { PieceGenerator } from '../core/PieceGenerator.js';
import {
  getClampedCenteredPiecePoint,
  getCenteredPieceAnchorPoint,
  getPieceAxialOffsetsFromAnchor,
  getPieceCellCentersForAnchor,
  getPieceCellCentersForCenteredPiece,
  getPieceVisualOuterBoundsFromOffsets,
  getPiecePixelOffsetsFromAnchor,
  getMaxCellCenterDelta
} from '../core/PieceVisualGeometry.js';
import {
  createDragGhostState,
  getDragGhostCellCenters
} from '../core/DragGhostTracker.js';

const hexSize = 32;
const anchorPoint = { x: 180, y: 140 };
const boardAnchor = { q: 0, r: 0 };

const pieces = [
  {
    name: 'duo line',
    cells: [
      { dq: 0, dr: 0, color: 'red' },
      { dq: 1, dr: 0, color: 'red' }
    ]
  },
  {
    name: 'triple diagonal line',
    cells: [
      { dq: 0, dr: 2, color: 'blue' },
      { dq: 1, dr: 1, color: 'blue' },
      { dq: 2, dr: 0, color: 'blue' }
    ]
  },
  {
    name: 'triple bend',
    cells: [
      { dq: 0, dr: 1, color: 'green' },
      { dq: 1, dr: 0, color: 'green' },
      { dq: 1, dr: 1, color: 'green' }
    ]
  },
  {
    name: 'quad hook',
    cells: [
      { dq: 0, dr: 0, color: 'orange' },
      { dq: 1, dr: 0, color: 'orange' },
      { dq: 1, dr: -1, color: 'blue' },
      { dq: 2, dr: -1, color: 'blue' }
    ]
  }
];

for (const piece of pieces) {
  test(`${piece.name} ghost and preview cell centers match for the same anchor`, () => {
    const dragState = createDragGhostState({
      pointer: { id: 4, x: anchorPoint.x, y: anchorPoint.y + 32 },
      pieceIndex: 0,
      piece,
      boardCellSize: hexSize,
      offset: { x: 0, y: -32 }
    });
    const ghostCenters = getDragGhostCellCenters(dragState);
    const previewCenters = getPieceCellCentersForAnchor(anchorPoint, piece, hexSize);

    assert.equal(getMaxCellCenterDelta(ghostCenters, previewCenters), 0);
    assert.deepEqual(ghostCenters[0], {
      index: 0,
      dq: 0,
      dr: 0,
      color: piece.cells[0].color,
      x: anchorPoint.x,
      y: anchorPoint.y
    });
  });
}

test('all generated variants use first cell as canonical anchor offset', () => {
  const generator = new PieceGenerator();

  for (const variant of generator.variants) {
    const piece = {
      name: variant.name,
      cells: variant.offsets.map((offset) => ({ ...offset, color: 'red' }))
    };
    const offsets = getPieceAxialOffsetsFromAnchor(piece);

    assert.deepEqual(offsets[0], { index: 0, dq: 0, dr: 0, color: 'red' });
  }
});

test('tray centering moves the whole canonical piece group without changing relative offsets', () => {
  const piece = pieces[2];
  const slotCenter = { x: 240, y: 420 };
  const trayAnchor = getCenteredPieceAnchorPoint(slotCenter, piece, hexSize);
  const trayCenters = getPieceCellCentersForCenteredPiece(slotCenter, piece, hexSize);
  const canonicalOffsets = getPiecePixelOffsetsFromAnchor(piece, hexSize);

  trayCenters.forEach((center, index) => {
    assert.equal(Math.round(center.x - trayAnchor.x), Math.round(canonicalOffsets[index].x));
    assert.equal(Math.round(center.y - trayAnchor.y), Math.round(canonicalOffsets[index].y));
  });
});

test('clamped tray centering keeps long quad pieces visible without changing cell offsets', () => {
  const piece = {
    name: 'quad line',
    cells: [
      { dq: 0, dr: 0, color: 'yellow' },
      { dq: 1, dr: 0, color: 'yellow' },
      { dq: 2, dr: 0, color: 'yellow' },
      { dq: 3, dr: 0, color: 'yellow' }
    ]
  };
  const mobileHexSize = 20.8;
  const clampedCenter = getClampedCenteredPiecePoint(
    { x: 64, y: 420 },
    piece,
    mobileHexSize,
    { left: 3, right: 378, top: 360, bottom: 478 }
  );
  const anchor = getCenteredPieceAnchorPoint(clampedCenter, piece, mobileHexSize);
  const offsets = getPiecePixelOffsetsFromAnchor(piece, mobileHexSize);
  const outer = getPieceVisualOuterBoundsFromOffsets(offsets, mobileHexSize);

  assert.ok(anchor.x + outer.left >= 3);
  assert.ok(anchor.x + outer.right <= 378);
  offsets.forEach((offset, index) => {
    const center = getPieceCellCentersForCenteredPiece(clampedCenter, piece, mobileHexSize)[index];
    assert.equal(Math.round(center.x - anchor.x), Math.round(offset.x));
    assert.equal(Math.round(center.y - anchor.y), Math.round(offset.y));
  });
});

test('final placement targets use the same canonical axial offsets as preview', () => {
  const board = new HexBoardModel(3);
  const piece = pieces[1];
  const offsets = getPieceAxialOffsetsFromAnchor(piece);
  const targets = board.getTargets(piece, boardAnchor);

  assert.deepEqual(targets.map(({ q, r }) => ({ q, r })), offsets.map((offset) => ({
    q: boardAnchor.q + offset.dq,
    r: boardAnchor.r + offset.dr
  })));
  assert.deepEqual(
    (({ q, r, color }) => ({ q, r, color }))(targets[0]),
    { q: 0, r: 0, color: 'blue' }
  );
});
