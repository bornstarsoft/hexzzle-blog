import {
  getPieceCellCentersForAnchor,
  getPiecePixelOffsetsFromAnchor
} from './PieceVisualGeometry.js';

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
  const ghostAnchorPoint = { ...ghostPosition };

  return {
    pointerId: pointer?.id,
    pieceIndex,
    piece,
    boardCellSize,
    anchorCellIndex,
    cellLocalOffsets,
    anchorLocalOffset,
    pointerPoint,
    pointerOffset: { ...offset },
    offset: { ...offset },
    ghostPosition,
    ghostCenter: ghostPosition,
    ghostAnchorPoint,
    cellCenters: getPieceCellCentersForAnchor(ghostAnchorPoint, piece, boardCellSize)
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
  const ghostAnchorPoint = { ...ghostPosition };

  return {
    ...state,
    pointerPoint,
    pointerOffset: { ...offset },
    ghostPosition,
    ghostCenter: ghostPosition,
    ghostAnchorPoint,
    cellCenters: getPieceCellCentersForAnchor(ghostAnchorPoint, state.piece, state.boardCellSize)
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
  return getPiecePixelOffsetsFromAnchor(piece, boardCellSize);
}

export function getDragGhostCellCenters(state) {
  return state?.cellCenters ?? getPieceCellCentersForAnchor(
    state?.ghostAnchorPoint ?? state?.ghostPosition ?? { x: 0, y: 0 },
    state?.piece,
    state?.boardCellSize
  );
}

function getPointerPoint(pointer) {
  return {
    x: pointer.x,
    y: pointer.y
  };
}
