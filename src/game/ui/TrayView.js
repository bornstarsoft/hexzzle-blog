import { axialToPixel } from '../core/HexCoordinates.js';
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
    this.lastPieceSize = 22;
  }

  render({ tray, selectedIndex }) {
    this.graphics.clear();
    this.hitAreas = [];

    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const gap = width < 460 ? 8 : 14;
    const totalWidth = Math.min(width - 28, 520);
    const pieceWidth = (totalWidth - gap * 2) / 3;
    const pieceHeight = width < 460 ? 88 : 108;
    const bottomOffset = width < 460 ? 96 : width < 700 ? 86 : width < 900 ? 122 : 62;
    const startX = (width - totalWidth) / 2;
    const y = height - pieceHeight - bottomOffset;
    const pieceSize = width < 460 ? 19 : 22;

    for (let index = 0; index < 3; index += 1) {
      const x = startX + index * (pieceWidth + gap);
      const piece = tray[index];
      const selected = index === selectedIndex;

      this.hitAreas[index] = { x, y, width: pieceWidth, height: pieceHeight };
      this.slotCenters[index] = { x: x + pieceWidth / 2, y: y + pieceHeight / 2 };
      this.lastPieceSize = pieceSize;
      this.graphics.fillStyle(selected && piece ? 0xdff5ea : 0xffffff, piece ? 0.96 : 0.48);
      this.graphics.lineStyle(selected && piece ? 3 : 1.5, selected && piece ? 0x18756b : 0xd8e4dc, piece ? 1 : 0.7);
      this.graphics.fillRoundedRect(x, y, pieceWidth, pieceHeight, 8);
      this.graphics.strokeRoundedRect(x, y, pieceWidth, pieceHeight, 8);

      if (piece) {
        this.drawPiece(piece, this.slotCenters[index].x, this.slotCenters[index].y, pieceSize);
      } else {
        this.graphics.fillStyle(0xd8e4dc, 0.34);
        this.graphics.fillCircle(this.slotCenters[index].x, this.slotCenters[index].y, 8);
      }
    }
  }

  drawPiece(piece, centerX, centerY, size) {
    const points = piece.cells.map((cell) => axialToPixel({ q: cell.dq, r: cell.dr }, size));
    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const minY = Math.min(...points.map((point) => point.y));
    const maxY = Math.max(...points.map((point) => point.y));
    const offsetX = centerX - (minX + maxX) / 2;
    const offsetY = centerY - (minY + maxY) / 2;

    piece.cells.forEach((cell, index) => {
      drawHex(this.graphics, points[index].x + offsetX, points[index].y + offsetY, size, {
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

  getPieceSize() {
    return this.lastPieceSize;
  }
}
