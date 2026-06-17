import {
  getGameVisualLayout,
  getTrayPieceHexSize
} from '../core/HexVisualLayout.js';
import {
  getCenteredPieceAnchorPoint,
  getPieceCellCentersForCenteredPiece
} from '../core/PieceVisualGeometry.js';
import { drawHex } from './HoneycombBoardView.js';

const COLOR_MAP = {
  red: 0xef5a5a,
  blue: 0x2f80ed,
  yellow: 0xf2c94c,
  green: 0x3fbf7f,
  purple: 0x8f65d9,
  orange: 0xf2994a
};

export class TrayView {
  constructor(scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.hitAreas = [];
    this.slotCenters = [];
    this.lastPieceSize = 0;
  }

  render({ tray, selectedIndex }) {
    this.graphics.clear();
    this.hitAreas = [];

    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const visualLayout = getGameVisualLayout({ width, height });
    const layout = visualLayout.tray;
    const pieceSize = getTrayPieceHexSize(visualLayout.hexSize);

    for (let index = 0; index < 3; index += 1) {
      const x = layout.startX + index * (layout.pieceWidth + layout.gap);
      const piece = tray[index];
      const selected = index === selectedIndex;

      this.hitAreas[index] = { x, y: layout.y, width: layout.pieceWidth, height: layout.pieceHeight };
      this.slotCenters[index] = { x: x + layout.pieceWidth / 2, y: layout.y + layout.pieceHeight / 2 };
      this.lastPieceSize = pieceSize;
      this.graphics.fillStyle(selected && piece ? 0xdff5ea : 0xffffff, piece ? 0.96 : 0.48);
      this.graphics.lineStyle(selected && piece ? 3 : 1.5, selected && piece ? 0x18756b : 0xd8e4dc, piece ? 1 : 0.7);
      this.graphics.fillRoundedRect(x, layout.y, layout.pieceWidth, layout.pieceHeight, 8);
      this.graphics.strokeRoundedRect(x, layout.y, layout.pieceWidth, layout.pieceHeight, 8);

      if (piece) {
        this.drawPiece(piece, this.slotCenters[index].x, this.slotCenters[index].y, pieceSize);
      } else {
        this.graphics.fillStyle(0xd8e4dc, 0.34);
        this.graphics.fillCircle(this.slotCenters[index].x, this.slotCenters[index].y, 8);
      }
    }
  }

  drawPiece(piece, centerX, centerY, size) {
    getPieceCellCentersForCenteredPiece({ x: centerX, y: centerY }, piece, size).forEach((cell) => {
      drawHex(this.graphics, cell.x, cell.y, size, {
        fill: COLOR_MAP[cell.color] ?? 0xf2c94c,
        alpha: 0.94,
        line: 0xffffff,
        lineAlpha: 0.9
      });
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
    const center = this.getSlotCenter(index);
    if (!center || !piece) {
      return null;
    }

    return getCenteredPieceAnchorPoint(center, piece, this.lastPieceSize);
  }

  getPieceSize() {
    return this.lastPieceSize;
  }
}
