export const DEFAULT_DRAG_GHOST_OFFSET = { x: 0, y: -32 };

export function createDragGhostState({
  pointer,
  pieceIndex,
  offset = DEFAULT_DRAG_GHOST_OFFSET
}) {
  return {
    pointerId: pointer?.id,
    pieceIndex,
    offset: { ...offset },
    ghostCenter: getGhostCenterFromPointer(pointer, offset)
  };
}

export function updateDragGhostCenter(state, { pointer }) {
  if (!state || !pointer || (state.pointerId !== undefined && pointer.id !== state.pointerId)) {
    return state;
  }

  return {
    ...state,
    ghostCenter: getGhostCenterFromPointer(pointer, state.offset)
  };
}

export function getGhostCenterFromPointer(pointer, offset = DEFAULT_DRAG_GHOST_OFFSET) {
  return {
    x: pointer.x + offset.x,
    y: pointer.y + offset.y
  };
}
