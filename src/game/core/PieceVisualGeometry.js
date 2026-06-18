import { axialToPixel } from './HexCoordinates.js';

export function getAnchorCell(piece) {
  return piece?.cells?.[0] ?? null;
}

export function getPieceAxialOffsetsFromAnchor(piece) {
  const anchor = getAnchorCell(piece);
  if (!anchor) {
    return [];
  }

  return piece.cells.map((cell, index) => ({
    index,
    dq: cell.dq - anchor.dq,
    dr: cell.dr - anchor.dr,
    color: cell.color
  }));
}

export function getPiecePixelOffsetsFromAnchor(piece, hexSize) {
  if (!Number.isFinite(hexSize) || hexSize <= 0) {
    return [];
  }

  return getPieceAxialOffsetsFromAnchor(piece).map((offset) => {
    const point = axialToPixel({ q: offset.dq, r: offset.dr }, hexSize);

    return {
      ...offset,
      x: point.x,
      y: point.y
    };
  });
}

export function getPieceVisualBoundsFromOffsets(offsets) {
  if (!offsets.length) {
    return {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      centerX: 0,
      centerY: 0
    };
  }

  const left = Math.min(...offsets.map((offset) => offset.x));
  const right = Math.max(...offsets.map((offset) => offset.x));
  const top = Math.min(...offsets.map((offset) => offset.y));
  const bottom = Math.max(...offsets.map((offset) => offset.y));

  return {
    left,
    right,
    top,
    bottom,
    centerX: (left + right) / 2,
    centerY: (top + bottom) / 2
  };
}

export function getPieceVisualOuterBoundsFromOffsets(offsets, hexSize) {
  const bounds = getPieceVisualBoundsFromOffsets(offsets);
  const halfWidth = Math.sqrt(3) * hexSize / 2;

  return {
    left: bounds.left - halfWidth,
    right: bounds.right + halfWidth,
    top: bounds.top - hexSize,
    bottom: bounds.bottom + hexSize,
    centerX: bounds.centerX,
    centerY: bounds.centerY
  };
}

export function getCenteredPieceAnchorPoint(centerPoint, piece, hexSize) {
  const bounds = getPieceVisualBoundsFromOffsets(getPiecePixelOffsetsFromAnchor(piece, hexSize));

  return {
    x: centerPoint.x - bounds.centerX,
    y: centerPoint.y - bounds.centerY
  };
}

export function getClampedCenteredPiecePoint(centerPoint, piece, hexSize, bounds) {
  if (!bounds || !piece) {
    return { ...centerPoint };
  }

  const offsets = getPiecePixelOffsetsFromAnchor(piece, hexSize);
  const visualBounds = getPieceVisualBoundsFromOffsets(offsets);
  const outerBounds = getPieceVisualOuterBoundsFromOffsets(offsets, hexSize);
  const point = { ...centerPoint };

  const actualLeft = () => point.x - visualBounds.centerX + outerBounds.left;
  const actualRight = () => point.x - visualBounds.centerX + outerBounds.right;
  const actualTop = () => point.y - visualBounds.centerY + outerBounds.top;
  const actualBottom = () => point.y - visualBounds.centerY + outerBounds.bottom;

  if (Number.isFinite(bounds.left) && actualLeft() < bounds.left) {
    point.x += bounds.left - actualLeft();
  }
  if (Number.isFinite(bounds.right) && actualRight() > bounds.right) {
    point.x -= actualRight() - bounds.right;
  }
  if (Number.isFinite(bounds.top) && actualTop() < bounds.top) {
    point.y += bounds.top - actualTop();
  }
  if (Number.isFinite(bounds.bottom) && actualBottom() > bounds.bottom) {
    point.y -= actualBottom() - bounds.bottom;
  }

  return point;
}

export function getPieceCellCentersForAnchor(anchorPoint, piece, hexSize) {
  return getPiecePixelOffsetsFromAnchor(piece, hexSize).map((offset) => ({
    index: offset.index,
    dq: offset.dq,
    dr: offset.dr,
    color: offset.color,
    x: anchorPoint.x + offset.x,
    y: anchorPoint.y + offset.y
  }));
}

export function getPieceCellCentersForCenteredPiece(centerPoint, piece, hexSize) {
  return getPieceCellCentersForAnchor(
    getCenteredPieceAnchorPoint(centerPoint, piece, hexSize),
    piece,
    hexSize
  );
}

export function getMaxCellCenterDelta(aCenters, bCenters) {
  if (aCenters.length !== bCenters.length) {
    return Infinity;
  }

  return aCenters.reduce((maxDelta, center, index) => {
    const other = bCenters[index];
    const delta = Math.hypot(center.x - other.x, center.y - other.y);

    return Math.max(maxDelta, delta);
  }, 0);
}
