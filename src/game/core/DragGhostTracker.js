import { axialToPixel } from './HexCoordinates.js';

export const DEFAULT_DRAG_GHOST_OFFSET = { x: 0, y: -32 };

export function createDragGhostState({
  pointer,
  pieceIndex,
  piece = null,
  boardCellSize = 0,
  anchorCellIndex = 0,
  offset = DEFAULT_DRAG_GHOST_OFFSET
}) {
  const pointerPoint = getPointerPoint(pointer);
  const ghostPosition = getGhostCenterFromPointer(pointer, offset);
  const cellLocalOffsets = getPieceCellLocalOffsets(piece, boardCellSize);
  const anchorLocalOffset = getPieceAnchorLocalOffset(piece, boardCellSize, anchorCellIndex);
  const ghostAnchorPoint = getGhostAnchorPoint(ghostPosition, anchorLocalOffset);

  return {
    pointerId: pointer?.id,
    pieceIndex,
    boardCellSize,
    anchorCellIndex,
    cellLocalOffsets,
    anchorLocalOffset,
    pointerPoint,
    pointerOffset: { ...offset },
    offset: { ...offset },
    ghostPosition,
    ghostCenter: ghostPosition,
    ghostAnchorPoint
  };
}

export function updateDragGhostCenter(state, { pointer }) {
  if (!state || !pointer || (state.pointerId !== undefined && pointer.id !== state.pointerId)) {
    return state;
  }

  const pointerPoint = getPointerPoint(pointer);
  const offset = state.pointerOffset ?? state.offset;
  const ghostPosition = getGhostCenterFromPointer(pointer, offset);
  const anchorLocalOffset = state.anchorLocalOffset ?? { x: 0, y: 0 };
  const ghostAnchorPoint = getGhostAnchorPoint(ghostPosition, anchorLocalOffset);

  return {
    ...state,
    pointerPoint,
    pointerOffset: { ...offset },
    ghostPosition,
    ghostCenter: ghostPosition,
    ghostAnchorPoint
  };
}

export function getGhostCenterFromPointer(pointer, offset = DEFAULT_DRAG_GHOST_OFFSET) {
  return {
    x: pointer.x + offset.x,
    y: pointer.y + offset.y
  };
}

export function getGhostAnchorPoint(ghostPosition, anchorLocalOffset = { x: 0, y: 0 }) {
  return {
    x: ghostPosition.x + (anchorLocalOffset.x ?? 0),
    y: ghostPosition.y + (anchorLocalOffset.y ?? 0)
  };
}

export function getPieceAnchorLocalOffset(piece, boardCellSize, anchorCellIndex = 0) {
  return getPieceCellLocalOffsets(piece, boardCellSize)[anchorCellIndex] ?? { x: 0, y: 0 };
}

export function getPieceCellLocalOffsets(piece, boardCellSize) {
  if (!piece?.cells?.length || !Number.isFinite(boardCellSize) || boardCellSize <= 0) {
    return [];
  }

  const points = piece.cells.map((cell) => axialToPixel({ q: cell.dq, r: cell.dr }, boardCellSize));
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  const offsetX = -(minX + maxX) / 2;
  const offsetY = -(minY + maxY) / 2;

  return piece.cells.map((cell, index) => ({
    dq: cell.dq,
    dr: cell.dr,
    x: points[index].x + offsetX,
    y: points[index].y + offsetY
  }));
}

function getPointerPoint(pointer) {
  return {
    x: pointer.x,
    y: pointer.y
  };
}
