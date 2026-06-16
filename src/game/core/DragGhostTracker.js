export const DEFAULT_DRAG_GHOST_OFFSET = { x: 0, y: -32 };

export function createDragGhostState({
  pointer,
  pieceIndex,
  offset = DEFAULT_DRAG_GHOST_OFFSET
}) {
  const pointerPoint = getPointerPoint(pointer);
  const ghostPosition = getGhostCenterFromPointer(pointer, offset);

  return {
    pointerId: pointer?.id,
    pieceIndex,
    pointerPoint,
    pointerOffset: { ...offset },
    offset: { ...offset },
    ghostPosition,
    ghostCenter: ghostPosition
  };
}

export function updateDragGhostCenter(state, { pointer }) {
  if (!state || !pointer || (state.pointerId !== undefined && pointer.id !== state.pointerId)) {
    return state;
  }

  const pointerPoint = getPointerPoint(pointer);
  const offset = state.pointerOffset ?? state.offset;
  const ghostPosition = getGhostCenterFromPointer(pointer, offset);

  return {
    ...state,
    pointerPoint,
    pointerOffset: { ...offset },
    ghostPosition,
    ghostCenter: ghostPosition
  };
}

export function getGhostCenterFromPointer(pointer, offset = DEFAULT_DRAG_GHOST_OFFSET) {
  return {
    x: pointer.x + offset.x,
    y: pointer.y + offset.y
  };
}

function getPointerPoint(pointer) {
  return {
    x: pointer.x,
    y: pointer.y
  };
}
