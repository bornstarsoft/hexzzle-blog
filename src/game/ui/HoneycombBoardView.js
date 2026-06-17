import { axialToPixel, pixelToAxial } from '../core/HexCoordinates.js';
import {
  getBoardTopReserve,
  getBoardTrayReserve,
  getHexVisualSize,
  getInvalidFeedbackHexSize,
  getPreviewHexSize
} from '../core/HexVisualLayout.js';

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

  render({ board, selectedPiece, hoverCoord, previewValid, previewTargets = [], showOpenAnchors }) {
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
      this.drawPreview(selectedPiece, hoverCoord, previewValid, previewTargets);
    }
  }

  updateLayout() {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const topReserve = getBoardTopReserve(width);
    const trayReserve = getBoardTrayReserve(width);
    const hexSize = getHexVisualSize({ width, height });

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
    return this.coordFromPoint(pointer, { tolerance });
  }

  coordFromPoint(point, { tolerance = 0.75 } = {}) {
    if (!this.board) {
      return null;
    }

    const local = {
      x: point.x - this.layout.centerX,
      y: point.y - this.layout.centerY
    };
    const coord = pixelToAxial(local, this.layout.hexSize);
    const nearestCoord = this.board.hasCoord(coord) ? coord : this.findNearestCoord(point);
    if (!nearestCoord) {
      return null;
    }

    const center = this.toScreen(nearestCoord);
    const distance = Math.hypot(point.x - center.x, point.y - center.y);
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

  drawPreview(piece, anchor, isValid, targets = []) {
    const fill = isValid ? 0x18756b : 0xef5a5a;
    const line = isValid ? 0x0f5b55 : 0x9b3131;
    const previewHexSize = getPreviewHexSize(this.layout.hexSize);
    const targetByOffset = new Map(targets.map((target) => [
      `${target.q},${target.r}`,
      target
    ]));

    piece.cells.forEach((cell) => {
      const coord = {
        q: anchor.q + cell.dq,
        r: anchor.r + cell.dr
      };
      const target = targetByOffset.get(`${coord.q},${coord.r}`);
      const point = this.toScreen(coord);
      const targetBlocked = target?.blocked || target?.exists === false;
      drawHex(this.overlay, point.x, point.y, previewHexSize, {
        fill,
        alpha: isValid ? 0.3 : targetBlocked ? 0.36 : 0.28,
        line: targetBlocked ? 0x7f1d1d : line,
        lineAlpha: isValid ? 0.95 : 1
      });
    });
  }

  showInvalid(anchor, piece, duration) {
    if (!anchor || !piece) {
      return;
    }

    const flash = this.scene.add.graphics();
    flash.setDepth(45);
    piece.cells.forEach((cell) => {
      const point = this.toScreen({
        q: anchor.q + cell.dq,
        r: anchor.r + cell.dr
      });
      drawHex(flash, point.x, point.y, getInvalidFeedbackHexSize(this.layout.hexSize), {
        fill: 0xef5a5a,
        alpha: 0.32,
        line: 0xef5a5a,
        lineAlpha: 0.95
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
    if (cells.length === 0) {
      return;
    }

    const duration = Math.min(550, Math.max(350, this.scene.configData.gameFeel?.bloomAnimationMs ?? 460));
    const center = getCellCenter(cells.map((cell) => this.toScreen(cell)));
    const label = this.scene.add.text(center.x, center.y - this.layout.hexSize * 0.6, createBloomLabel(result), {
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: `${Math.round(Math.max(22, this.layout.hexSize * 0.82))}px`,
      fontStyle: '800',
      color: '#0f5b55',
      backgroundColor: 'rgba(255,255,255,0.88)',
      padding: { x: 10, y: 5 }
    }).setOrigin(0.5).setDepth(75).setScale(0.9);

    this.scene.tweens.add({
      targets: label,
      y: label.y - this.layout.hexSize * 0.8,
      alpha: 0,
      scale: 1.12,
      duration,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy()
    });

    cells.forEach((cell, index) => {
      const point = this.toScreen(cell);
      const color = COLOR_MAP[cell.color] ?? 0xf2c94c;
      const bloom = this.scene.add.container(point.x, point.y).setDepth(62).setScale(0.82);
      const hex = this.scene.add.graphics();
      const ring = this.scene.add.graphics();
      const sparkle = this.scene.add.graphics();

      drawHex(hex, 0, 0, this.layout.hexSize * 1.02, {
        fill: color,
        alpha: 0.55,
        line: 0xffffff,
        lineAlpha: 0.95
      });

      ring.lineStyle(Math.max(2, this.layout.hexSize * 0.07), 0xffffff, 0.8);
      ring.strokeCircle(0, 0, this.layout.hexSize * 0.82);

      sparkle.fillStyle(0xffffff, 0.9);
      for (let petal = 0; petal < 6; petal += 1) {
        const angle = Math.PI / 3 * petal;
        sparkle.fillCircle(
          Math.cos(angle) * this.layout.hexSize * 0.58,
          Math.sin(angle) * this.layout.hexSize * 0.58,
          Math.max(2.2, this.layout.hexSize * 0.08)
        );
      }

      bloom.add([hex, ring, sparkle]);
      const delay = Math.min(150, index * 18);
      this.scene.tweens.add({
        targets: bloom,
        alpha: 0,
        scaleX: 1.36,
        scaleY: 1.36,
        duration,
        delay,
        ease: 'Cubic.easeOut',
        onComplete: () => bloom.destroy()
      });
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
    }).setOrigin(0.5).setDepth(76);

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

function getCellCenter(points) {
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length
  };
}

function createBloomLabel(result) {
  if (result.chainCount > 1) {
    return `Chain x${result.chainCount}`;
  }

  if (result.groupsCleared > 1) {
    return 'Double Bloom!';
  }

  return 'Bloom!';
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
