export function selectTrayPiece(state, tray, index) {
  if (!Number.isInteger(index) || index < 0 || index >= tray.length || !tray[index]) {
    return { ...state };
  }

  return {
    ...state,
    activePieceIndex: index
  };
}

export function clearActivePieceAfterPlacement(state) {
  return {
    ...state,
    activePieceIndex: null
  };
}

export function keepActivePieceAfterInvalidPlacement(state) {
  return { ...state };
}

export function useActiveTrayPiece({ tray, activePieceIndex }) {
  if (!Number.isInteger(activePieceIndex) || !tray[activePieceIndex]) {
    return {
      tray: tray.slice(),
      activePieceIndex
    };
  }

  const nextTray = tray.slice();
  nextTray[activePieceIndex] = null;

  return {
    tray: nextTray,
    activePieceIndex: null
  };
}
