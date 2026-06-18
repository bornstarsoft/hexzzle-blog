import {
  getGameVisualLayout,
  getTrayPieceHexSize
} from '../core/HexVisualLayout.js';
import { FALLBACK_TILE_COLOR, TILE_COLORS } from '../core/ColorPalette.js';
import {
  getClampedCenteredPiecePoint,
  getCenteredPieceAnchorPoint,
  getPieceCellCentersForCenteredPiece
} from '../core/PieceVisualGeometry.js';
import { drawHex } from './HoneycombBoardView.js';
import { drawStackPointMarkers } from './StackPointMarkerView.js';

export class TrayView {
  constructor(scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.hitAreas = [];
    this.slotCenters = [];
    this.pieceCenters = [];
    this.lastPieceSize = 0;
    this.markerGroup = scene.add.group();
  }

  render({ tray, selectedIndex, draggingIndex = null }) {
    this.graphics.clear();
    this.markerGroup.clear(true, true);
    this.hitAreas = [];
    this.pieceCenters = [];

    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const visualLayout = getGameVisualLayout({ width, height });
    const layout = visualLayout.tray;
    const pieceSize = getTrayPieceHexSize(visualLayout.hexSize);

    for (let index = 0; index < 3; index += 1) {
      const x = layout.startX + index * (layout.pieceWidth + layout.gap);
      const piece = tray[index];
      const visualState = getTraySlotVisualState({
        piece,
        selected: index === selectedIndex,
        dragging: index === draggingIndex
      });

      this.hitAreas[index] = { x, y: layout.y, width: layout.pieceWidth, height: layout.pieceHeight };
      this.slotCenters[index] = { x: x + layout.pieceWidth / 2, y: layout.y + layout.pieceHeight / 2 };
      this.pieceCenters[index] = this.slotCenters[index];
      this.lastPieceSize = pieceSize;
      this.graphics.fillStyle(visualState.fill, visualState.fillAlpha);
      this.graphics.lineStyle(visualState.lineWidth, visualState.line, visualState.lineAlpha);
      this.graphics.fillRoundedRect(x, layout.y, layout.pieceWidth, layout.pieceHeight, 8);
      this.graphics.strokeRoundedRect(x, layout.y, layout.pieceWidth, layout.pieceHeight, 8);

      if (piece && visualState.drawPiece) {
        const pieceCenter = getClampedCenteredPiecePoint(this.slotCenters[index], piece, pieceSize, {
          left: 3,
          right: width - 3,
          top: layout.y + 2,
          bottom: layout.y + layout.pieceHeight - 2
        });
        this.pieceCenters[index] = pieceCenter;
        this.drawPiece(piece, pieceCenter.x, pieceCenter.y, pieceSize);
      } else if (visualState.drawLiftPlaceholder) {
        this.graphics.fillStyle(0x18756b, 0.12);
        this.graphics.fillCircle(this.slotCenters[index].x, this.slotCenters[index].y, 11);
        this.graphics.lineStyle(2, 0x18756b, 0.24);
        this.graphics.strokeCircle(this.slotCenters[index].x, this.slotCenters[index].y, 15);
      } else {
        this.graphics.fillStyle(0xd8e4dc, 0.34);
        this.graphics.fillCircle(this.slotCenters[index].x, this.slotCenters[index].y, 8);
      }
    }
  }

  drawPiece(piece, centerX, centerY, size) {
    const centers = getPieceCellCentersForCenteredPiece({ x: centerX, y: centerY }, piece, size);

    centers.forEach((cell) => {
      drawHex(this.graphics, cell.x, cell.y, size, {
        fill: TILE_COLORS[cell.color] ?? FALLBACK_TILE_COLOR,
        alpha: 0.94,
        line: 0xffffff,
        lineAlpha: 0.9
      });
    });

    this.drawStackPointMarkers(piece, centers, size);
  }

  drawStackPointMarkers(piece, centers, size) {
    drawStackPointMarkers(this.scene, {
      piece,
      centers,
      size,
      depth: 13,
      group: this.markerGroup
    });
  }

  getPieceIndexAt(pointer) {
    const index = this.hitAreas.findIndex((area) => (
      pointer.x >= area.x &&
      pointer.x <= area.x + area.width &&
      pointer.y >= area.y &&
      pointer.y <= area.y + area.height
    ));

    return index === -1 ? null : index;
  }

  getSlotCenter(index) {
    return this.slotCenters[index] ? { ...this.slotCenters[index] } : null;
  }

  getPieceAnchorPoint(index, piece) {
    const center = this.pieceCenters[index] ?? this.getSlotCenter(index);
    if (!center || !piece) {
      return null;
    }

    return getCenteredPieceAnchorPoint(center, piece, this.lastPieceSize);
  }

  getPieceSize() {
    return this.lastPieceSize;
  }
}

export function getTraySlotVisualState({ piece, selected = false, dragging = false } = {}) {
  const used = !piece;
  const lifted = Boolean(piece && dragging);
  const active = Boolean(piece && selected && !lifted);

  return {
    drawSlot: true,
    drawPiece: Boolean(piece && !lifted),
    drawLiftPlaceholder: lifted,
    selected: active,
    used,
    fill: active ? 0xdff5ea : 0xffffff,
    fillAlpha: used ? 0.48 : lifted ? 0.72 : 0.96,
    line: active ? 0x18756b : lifted ? 0x18756b : 0xd8e4dc,
    lineAlpha: used ? 0.7 : lifted ? 0.58 : 1,
    lineWidth: active ? 3 : lifted ? 2.2 : 1.5
  };
}
