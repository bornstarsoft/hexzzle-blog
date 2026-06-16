import { axialToPixel, pixelToAxial } from '../core/HexCoordinates.js';

const COLOR_MAP = {
  red: 0xef5a5a,
  blue: 0x2f80ed,
  yellow: 0xf2c94c,
  green: 0x3fbf7f,
  purple: 0x8f65d9,
  orange: 0xf2994a
};

export class HoneycombBoardView {
  constructor(scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics();
    this.overlay = scene.add.graphics();
    this.textGroup = scene.add.group();
    this.layout = {
      centerX: 0,
      centerY: 0,
      hexSize: 30
    };
  }

  render({ board, selectedPiece, hoverCoord, previewValid, showOpenAnchors }) {
    this.board = board;
    this.updateLayout();
    this.graphics.clear();
    this.overlay.clear();

    board.coordinates.forEach((coord) => {
      const color = board.getCell(coord);
      const point = this.toScreen(coord);
      drawHex(this.graphics, point.x, point.y, this.layout.hexSize, {
        fill: color ? COLOR_MAP[color] : 0xffffff,
        alpha: color ? 0.92 : 0.78,
        line: color ? 0xffffff : 0xd8e4dc,
        lineAlpha: color ? 0.85 : 1
      });
    });

    if (selectedPiece && showOpenAnchors) {
      this.drawOpenAnchorHints(board, selectedPiece);
    }

    if (selectedPiece && hoverCoord) {
      this.drawPreview(selectedPiece, hoverCoord, previewValid);
    }
  }

  updateLayout() {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const topReserve = width < 520 ? 48 : 58;
    const trayReserve = width < 520 ? 132 : 150;
    const hexSize = Math.max(
      21,
      Math.min(36, width / 12.4, (height - topReserve - trayReserve) / 10)
    );

    this.layout = {
      centerX: width / 2,
      centerY: topReserve + (height - topReserve - trayReserve) * 0.46,
      hexSize
    };
  }

  toScreen(coord) {
    const point = axialToPixel(coord, this.layout.hexSize);
    return {
      x: this.layout.centerX + point.x,
      y: this.layout.centerY + point.y
    };
  }

  coordFromPointer(pointer, { tolerance = 0.75 } = {}) {
    if (!this.board) {
      return null;
    }

    const local = {
      x: pointer.x - this.layout.centerX,
      y: pointer.y - this.layout.centerY
    };
    const coord = pixelToAxial(local, this.layout.hexSize);
    const nearestCoord = this.board.hasCoord(coord) ? coord : this.findNearestCoord(pointer);
    if (!nearestCoord) {
      return null;
    }

    const center = this.toScreen(nearestCoord);
    const distance = Math.hypot(pointer.x - center.x, pointer.y - center.y);
    const allowedDistance = this.layout.hexSize * tolerance;

    return distance <= allowedDistance ? nearestCoord : null;
  }

  findNearestCoord(pointer) {
    let nearest = null;
    let nearestDistance = Infinity;

    this.board.coordinates.forEach((coord) => {
      const center = this.toScreen(coord);
      const distance = Math.hypot(pointer.x - center.x, pointer.y - center.y);
      if (distance < nearestDistance) {
        nearest = coord;
        nearestDistance = distance;
      }
    });

    return nearest;
  }

  drawOpenAnchorHints(board, piece) {
    board.coordinates.forEach((coord) => {
      if (!board.canPlacePiece(piece, coord)) {
        return;
      }

      const point = this.toScreen(coord);
      this.overlay.fillStyle(0x18756b, 0.12);
      this.overlay.fillCircle(point.x, point.y, Math.max(4, this.layout.hexSize * 0.14));
    });
  }

  drawPreview(piece, anchor, isValid) {
    const fill = isValid ? 0x18756b : 0xef5a5a;
    const line = isValid ? 0x0f5b55 : 0x9b3131;

    piece.cells.forEach((cell) => {
      const point = this.toScreen({
        q: anchor.q + cell.dq,
        r: anchor.r + cell.dr
      });
      drawHex(this.overlay, point.x, point.y, this.layout.hexSize * 0.92, {
        fill,
        alpha: isValid ? 0.22 : 0.2,
        line,
        lineAlpha: 0.92
      });
    });
  }

  showInvalid(anchor, piece, duration) {
    if (!anchor || !piece) {
      return;
    }

    const flash = this.scene.add.graphics();
    piece.cells.forEach((cell) => {
      const point = this.toScreen({
        q: anchor.q + cell.dq,
        r: anchor.r + cell.dr
      });
      drawHex(flash, point.x, point.y, this.layout.hexSize * 0.95, {
        fill: 0xef5a5a,
        alpha: 0.18,
        line: 0xef5a5a,
        lineAlpha: 0.75
      });
    });
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration,
      onComplete: () => flash.destroy()
    });
  }

  showBloom(result) {
    const cells = result.scans.flatMap((scan) => scan.flatMap((group) => (
      group.cells.map((coord) => ({ ...coord, color: group.color }))
    )));
    const bloom = this.scene.add.graphics();

    cells.forEach((cell) => {
      const point = this.toScreen(cell);
      drawHex(bloom, point.x, point.y, this.layout.hexSize * 1.06, {
        fill: COLOR_MAP[cell.color] ?? 0xf2c94c,
        alpha: 0.46,
        line: 0xffffff,
        lineAlpha: 0.9
      });
    });

    this.scene.tweens.add({
      targets: bloom,
      alpha: 0,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: this.scene.configData.gameFeel?.bloomAnimationMs ?? 350,
      ease: 'Sine.easeOut',
      onComplete: () => bloom.destroy()
    });
  }

  showScorePop(anchor, label) {
    const point = this.toScreen(anchor);
    const text = this.scene.add.text(point.x, point.y - this.layout.hexSize, label, {
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: '18px',
      fontStyle: '700',
      color: '#17352e',
      backgroundColor: 'rgba(255,255,255,0.82)',
      padding: { x: 8, y: 4 }
    }).setOrigin(0.5);

    this.scene.tweens.add({
      targets: text,
      y: text.y - 24,
      alpha: 0,
      duration: 620,
      ease: 'Sine.easeOut',
      onComplete: () => text.destroy()
    });
  }
}

export function drawHex(graphics, x, y, size, { fill, alpha = 1, line, lineAlpha = 1 }) {
  const points = Array.from({ length: 6 }, (_, index) => {
    const angle = Math.PI / 180 * (60 * index - 30);
    return {
      x: x + size * Math.cos(angle),
      y: y + size * Math.sin(angle)
    };
  });

  graphics.fillStyle(fill, alpha);
  graphics.fillPoints(points, true);
  graphics.lineStyle(Math.max(1.4, size * 0.06), line, lineAlpha);
  graphics.strokePoints(points, true);
}
