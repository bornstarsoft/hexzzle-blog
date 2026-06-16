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
  }

  render({ tray, selectedIndex }) {
    this.graphics.clear();
    this.hitAreas = [];

    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const gap = width < 460 ? 8 : 14;
    const totalWidth = Math.min(width - 28, 520);
    const pieceWidth = (totalWidth - gap * 2) / 3;
    const pieceHeight = width < 460 ? 104 : 118;
    const startX = (width - totalWidth) / 2;
    const y = height - pieceHeight - 22;

    for (let index = 0; index < 3; index += 1) {
      const x = startX + index * (pieceWidth + gap);
      const piece = tray[index];
      const selected = index === selectedIndex;

      this.hitAreas[index] = { x, y, width: pieceWidth, height: pieceHeight };
      this.graphics.fillStyle(selected ? 0xdff5ea : 0xffffff, 0.96);
      this.graphics.lineStyle(selected ? 3 : 1.5, selected ? 0x18756b : 0xd8e4dc, 1);
      this.graphics.fillRoundedRect(x, y, pieceWidth, pieceHeight, 8);
      this.graphics.strokeRoundedRect(x, y, pieceWidth, pieceHeight, 8);

      if (piece) {
        this.drawPiece(piece, x + pieceWidth / 2, y + pieceHeight / 2, width < 460 ? 17 : 20);
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
}
