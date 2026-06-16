export function createTraySelectionState({ activePieceIndex = null } = {}) {
  return { activePieceIndex };
}

export function selectTrayPiece(state, tray, index) {
  if (!hasTrayPiece(tray, index)) {
    return { ...state };
  }

  return {
    ...state,
    activePieceIndex: index
  };
}

export function getActiveTrayPiece(state, tray) {
  const index = state?.activePieceIndex;
  return hasTrayPiece(tray, index) ? tray[index] : null;
}

export function useActiveTrayPiece({ tray, activePieceIndex }) {
  if (!hasTrayPiece(tray, activePieceIndex)) {
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

export function clearActivePieceAfterPlacement(state) {
  return {
    ...state,
    activePieceIndex: null
  };
}

export function keepActivePieceAfterInvalidPlacement(state) {
  return { ...state };
}

function hasTrayPiece(tray, index) {
  return Number.isInteger(index) && index >= 0 && index < tray.length && Boolean(tray[index]);
}
