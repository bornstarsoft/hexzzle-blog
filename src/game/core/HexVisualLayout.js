const MIN_HEX_VISUAL_SIZE = 20;
const MAX_HEX_VISUAL_SIZE = 36;
const BOARD_RADIUS = 3;
const BOARD_HALF_HEIGHT_FACTOR = BOARD_RADIUS * 1.5 + 1;
const BOARD_HALF_WIDTH_FACTOR = Math.sqrt(3) * (BOARD_RADIUS + 0.5);
const MAX_TRAY_PIECE_LINE_WIDTH_FACTOR = 3 * Math.sqrt(3);

export function getHexVisualSize({ width, height }) {
  const safeWidth = Math.max(320, width || 0);
  const safeHeight = Math.max(500, height || 0);
  const boardWidthLimit = (safeWidth - 12) / (BOARD_HALF_WIDTH_FACTOR * 2);
  const trayWidthLimit = getTrayPieceCapacity(safeWidth);
  let size = Math.min(MAX_HEX_VISUAL_SIZE, boardWidthLimit, trayWidthLimit);

  for (let pass = 0; pass < 5; pass += 1) {
    const tray = getTrayLayout({ width: safeWidth, height: safeHeight, hexSize: size });
    const availableBoardHeight = tray.y - getBoardTopReserve(safeWidth) - getBoardTrayGap(safeWidth);
    const boardHeightLimit = availableBoardHeight / (BOARD_HALF_HEIGHT_FACTOR * 2);
    size = Math.min(size, boardHeightLimit);
  }

  return Math.max(MIN_HEX_VISUAL_SIZE, size);
}

export function getGameVisualLayout({ width, height }) {
  const safeWidth = Math.max(320, width || 0);
  const safeHeight = Math.max(500, height || 0);
  const hexSize = getHexVisualSize({ width: safeWidth, height: safeHeight });
  const tray = getTrayLayout({ width: safeWidth, height: safeHeight, hexSize });
  const board = getBoardLayout({ width: safeWidth, height: safeHeight, hexSize, tray });

  return {
    width: safeWidth,
    height: safeHeight,
    hexSize,
    board,
    tray,
    boardTrayGap: getBoardTrayGap(safeWidth)
  };
}

export function getBoardLayout({ width, height, hexSize, tray = null }) {
  const safeWidth = Math.max(320, width || 0);
  const safeHeight = Math.max(500, height || 0);
  const resolvedTray = tray ?? getTrayLayout({ width: safeWidth, height: safeHeight, hexSize });
  const top = getBoardTopReserve(safeWidth);
  const bottom = resolvedTray.y - getBoardTrayGap(safeWidth);
  const halfHeight = getBoardHalfHeight(hexSize);
  const minCenterY = top + halfHeight;
  const maxCenterY = bottom - halfHeight;
  const centeredY = top + (bottom - top) / 2;
  const centerY = clamp(centeredY, minCenterY, Math.max(minCenterY, maxCenterY));

  return {
    centerX: safeWidth / 2,
    centerY,
    hexSize,
    top,
    bottom
  };
}

export function getBoardBounds(boardLayout) {
  const halfWidth = getBoardHalfWidth(boardLayout.hexSize);
  const halfHeight = getBoardHalfHeight(boardLayout.hexSize);

  return {
    left: boardLayout.centerX - halfWidth,
    right: boardLayout.centerX + halfWidth,
    top: boardLayout.centerY - halfHeight,
    bottom: boardLayout.centerY + halfHeight
  };
}

export function getTrayBounds(trayLayout) {
  return {
    left: trayLayout.startX,
    right: trayLayout.startX + trayLayout.totalWidth,
    top: trayLayout.y,
    bottom: trayLayout.y + trayLayout.pieceHeight
  };
}

export function getBoardTopReserve(width) {
  return width < 520 ? 48 : 58;
}

export function getBoardTrayReserve(width) {
  if (width < 460) {
    return 156;
  }

  if (width < 700) {
    return 164;
  }

  return 170;
}

export function getBoardTrayGap(width) {
  return width < 520 ? 14 : 18;
}

export function getTrayLayout({ width, height, hexSize }) {
  const gap = getTrayGap(width);
  const totalWidth = getTrayTotalWidth(width);
  const pieceWidth = (totalWidth - gap * 2) / 3;
  const pieceHeight = Math.max(getMinimumTraySlotHeight(width), hexSize * 5.1);
  const bottomOffset = getTrayBottomOffset(width);
  const startX = (width - totalWidth) / 2;
  const y = Math.max(0, height - pieceHeight - bottomOffset);

  return {
    slotCount: 3,
    gap,
    totalWidth,
    pieceWidth,
    pieceHeight,
    startX,
    y,
    bottomOffset
  };
}

export function getTrayPieceHexSize(hexSize) {
  return hexSize;
}

export function getGhostHexSize(hexSize) {
  return hexSize;
}

export function getPreviewHexSize(hexSize) {
  return hexSize;
}

export function getInvalidFeedbackHexSize(hexSize) {
  return hexSize;
}

export function getInvalidPreviewMarker() {
  return 'none';
}

export function getMaxTrayPieceVisualWidth(hexSize) {
  return MAX_TRAY_PIECE_LINE_WIDTH_FACTOR * hexSize;
}

export function shouldShowOpenAnchorHints({ selectedPiece, isDragging, debugDragEnabled }) {
  return Boolean(selectedPiece) && !isDragging && Boolean(debugDragEnabled);
}

function getBoardHalfWidth(hexSize) {
  return BOARD_HALF_WIDTH_FACTOR * hexSize;
}

function getBoardHalfHeight(hexSize) {
  return BOARD_HALF_HEIGHT_FACTOR * hexSize;
}

function getTrayPieceCapacity(width) {
  return Math.max(0, (getTraySlotWidth(width) - 4) / MAX_TRAY_PIECE_LINE_WIDTH_FACTOR);
}

function getTraySlotWidth(width) {
  const gap = getTrayGap(width);
  return (getTrayTotalWidth(width) - gap * 2) / 3;
}

function getTrayTotalWidth(width) {
  if (width < 520) {
    return Math.max(0, width - 8);
  }

  if (width < 900) {
    return Math.min(width - 32, 600);
  }

  return 620;
}

function getTrayGap(width) {
  return width < 520 ? 2 : 10;
}

function getMinimumTraySlotHeight(width) {
  if (width < 460) {
    return 112;
  }

  if (width < 700) {
    return 124;
  }

  return 132;
}

function getTrayBottomOffset(width) {
  if (width < 460) {
    return 46;
  }

  if (width < 700) {
    return 52;
  }

  if (width < 900) {
    return 72;
  }

  return 56;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
