export function canSelectTrayPiece({
  isGameOver = false,
  isResultOpen = false
} = {}) {
  return !isGameOver && !isResultOpen;
}

export function canStartTrayDrag({
  isGameOver = false,
  isResultOpen = false,
  hasPiece = false,
  isDragging = false
} = {}) {
  return canSelectTrayPiece({ isGameOver, isResultOpen })
    && hasPiece
    && !isDragging;
}

export function canCommitDrop({
  isGameOver = false,
  isResultOpen = false,
  hasPiece = false,
  isBoardAnimating = false,
  logicalBoardSettled = true
} = {}) {
  return canSelectTrayPiece({ isGameOver, isResultOpen })
    && hasPiece
    && !shouldQueueDropDuringAnimation({ isBoardAnimating, logicalBoardSettled });
}

export function shouldQueueDropDuringAnimation({
  isBoardAnimating = false,
  logicalBoardSettled = true
} = {}) {
  return Boolean(isBoardAnimating && !logicalBoardSettled);
}
