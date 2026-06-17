const MIN_HEX_VISUAL_SIZE = 20;
const MAX_HEX_VISUAL_SIZE = 36;
const MAX_TRAY_PIECE_LINE_WIDTH_FACTOR = 3 * Math.sqrt(3);

export function getHexVisualSize({ width, height }) {
  const safeWidth = Math.max(320, width || 0);
  const safeHeight = Math.max(500, height || 0);
  const topReserve = getBoardTopReserve(safeWidth);
  const trayReserve = getBoardTrayReserve(safeWidth);
  const boardWidthLimit = safeWidth / 12.4;
  const boardHeightLimit = (safeHeight - topReserve - trayReserve) / 10;
  const trayWidthLimit = getTrayPieceCapacity(safeWidth);
  const size = Math.min(MAX_HEX_VISUAL_SIZE, boardWidthLimit, boardHeightLimit, trayWidthLimit);

  return Math.max(MIN_HEX_VISUAL_SIZE, size);
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
    return 58;
  }

  if (width < 700) {
    return 64;
  }

  if (width < 900) {
    return 94;
  }

  return 56;
}
