import { axialToPixel, pixelToAxial } from '../core/HexCoordinates.js';
import {
  getGameVisualLayout,
  getInvalidFeedbackHexSize,
  getPreviewHexSize
} from '../core/HexVisualLayout.js';
import {
  getPieceAxialOffsetsFromAnchor,
  getPieceCellCentersForAnchor
} from '../core/PieceVisualGeometry.js';

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

  render({ board, selectedPiece, hoverCoord, previewValid, previewTargets = [], previewStackHints = [], showOpenAnchors }) {
    this.board = board;
    this.updateLayout();
    this.graphics.clear();
    this.overlay.clear();
    this.textGroup.clear(true, true);

    board.coordinates.forEach((coord) => {
      const cell = board.getCell(coord);
      const color = cell?.color;
      const point = this.toScreen(coord);
      drawHex(this.graphics, point.x, point.y, this.layout.hexSize, {
        fill: color ? COLOR_MAP[color] : 0xffffff,
        alpha: color ? 0.92 : 0.78,
        line: color ? 0xffffff : 0xd8e4dc,
        lineAlpha: color ? 0.85 : 1
      });

      if (cell?.count > 1) {
        this.drawStackCount(point, cell.count);
      }
    });

    if (selectedPiece && showOpenAnchors) {
      this.drawOpenAnchorHints(board, selectedPiece);
    }

    if (selectedPiece && hoverCoord) {
      this.drawPreview(selectedPiece, hoverCoord, previewValid, previewTargets);
      if (previewValid) {
        this.drawStackHints(previewStackHints);
      }
    }
  }

  updateLayout() {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const layout = getGameVisualLayout({ width, height });

    this.layout = {
      centerX: layout.board.centerX,
      centerY: layout.board.centerY,
      hexSize: layout.hexSize
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

    const anchorPoint = this.toScreen(anchor);
    const centers = getPieceCellCentersForAnchor(anchorPoint, piece, previewHexSize);
    const offsets = getPieceAxialOffsetsFromAnchor(piece);

    centers.forEach((cell, index) => {
      const offset = offsets[index];
      const coord = {
        q: anchor.q + offset.dq,
        r: anchor.r + offset.dr
      };
      const target = targetByOffset.get(`${coord.q},${coord.r}`);
      const targetBlocked = target?.blocked || target?.exists === false;
      drawHex(this.overlay, cell.x, cell.y, previewHexSize, {
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
    const size = getInvalidFeedbackHexSize(this.layout.hexSize);
    const anchorPoint = this.toScreen(anchor);
    getPieceCellCentersForAnchor(anchorPoint, piece, size).forEach((cell) => {
      drawHex(flash, cell.x, cell.y, size, {
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

  showGather(result, { duration = 320, settleDelay = 120, onComplete = () => {} } = {}) {
    const plans = result.gatherPlans ?? [];
    if (plans.length === 0) {
      onComplete();
      return;
    }

    const overlays = [];
    let maxDelay = 0;

    plans.forEach((plan, planIndex) => {
      const targetPoint = this.toScreen(plan.targetCell);
      const color = COLOR_MAP[plan.color] ?? 0xf2c94c;
      const target = this.scene.add.container(targetPoint.x, targetPoint.y).setDepth(68).setAlpha(0).setScale(0.84);
      const targetHex = this.scene.add.graphics();
      drawHex(targetHex, 0, 0, this.layout.hexSize * 1.04, {
        fill: color,
        alpha: 0.72,
        line: 0xffffff,
        lineAlpha: 0.95
      });
      const targetLabel = this.scene.add.text(0, 0, String(plan.totalCount), {
        fontFamily: 'Inter, Arial, sans-serif',
        fontSize: `${Math.round(Math.max(16, this.layout.hexSize * 0.64))}px`,
        fontStyle: '800',
        color: '#17352e',
        stroke: '#ffffff',
        strokeThickness: Math.max(2, Math.round(this.layout.hexSize * 0.08))
      }).setOrigin(0.5);

      target.add([targetHex, targetLabel]);
      overlays.push(target);

      this.scene.tweens.add({
        targets: target,
        alpha: 1,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: Math.min(180, duration * 0.55),
        delay: Math.min(80, planIndex * 28 + duration * 0.56),
        ease: 'Back.easeOut'
      });

      plan.sourceCells.forEach((source, sourceIndex) => {
        const sourcePoint = this.toScreen(source);
        const isTarget = isSameCoord(source, plan.targetCell);
        const delay = Math.min(150, planIndex * 35 + sourceIndex * 28);
        maxDelay = Math.max(maxDelay, delay);

        if (isTarget) {
          this.drawTargetReceivePulse(targetPoint, color, delay, duration, overlays);
          return;
        }

        const cover = this.scene.add.graphics().setDepth(61);
        drawHex(cover, sourcePoint.x, sourcePoint.y, this.layout.hexSize * 1.02, {
          fill: 0xf7fbf8,
          alpha: 0.86,
          line: 0xd8e4dc,
          lineAlpha: 0.92
        });
        overlays.push(cover);

        const traveller = this.createTravellingStackTile(sourcePoint, color, source.count);
        overlays.push(traveller);
        this.scene.tweens.add({
          targets: traveller,
          x: targetPoint.x,
          y: targetPoint.y,
          angle: sourceIndex % 2 === 0 ? 15 : -15,
          scaleX: 0.48,
          scaleY: 0.48,
          alpha: 0.18,
          duration,
          delay,
          ease: 'Cubic.easeInOut',
          onComplete: () => traveller.destroy()
        });
      });
    });

    this.scene.time.delayedCall(duration + settleDelay + maxDelay, () => {
      overlays.forEach((overlay) => {
        if (overlay?.active) {
          overlay.destroy();
        }
      });
      onComplete();
    });
  }

  showMerge(result) {
    this.showGather(result);
  }

  createTravellingStackTile(point, color, count) {
    const tile = this.scene.add.container(point.x, point.y).setDepth(69).setScale(0.98);
    const hex = this.scene.add.graphics();
    drawHex(hex, 0, 0, this.layout.hexSize * 1.02, {
      fill: color,
      alpha: 0.94,
      line: 0xffffff,
      lineAlpha: 0.95
    });
    tile.add(hex);

    if (count > 1) {
      tile.add(this.scene.add.text(0, 0, String(count), {
        fontFamily: 'Inter, Arial, sans-serif',
        fontSize: `${Math.round(Math.max(13, this.layout.hexSize * 0.5))}px`,
        fontStyle: '800',
        color: '#17352e',
        stroke: '#ffffff',
        strokeThickness: 2
      }).setOrigin(0.5));
    }

    return tile;
  }

  drawTargetReceivePulse(point, color, delay, duration, overlays) {
    const pulse = this.scene.add.container(point.x, point.y).setDepth(67).setAlpha(0.5);
    const hex = this.scene.add.graphics();
    drawHex(hex, 0, 0, this.layout.hexSize * 1.06, {
      fill: color,
      alpha: 0.2,
      line: 0xffffff,
      lineAlpha: 0.92
    });
    pulse.add(hex);
    overlays.push(pulse);
    this.scene.tweens.add({
      targets: pulse,
      alpha: 0,
      scaleX: 1.22,
      scaleY: 1.22,
      duration: Math.min(260, duration),
      delay,
      ease: 'Sine.easeOut'
    });
  }

  showLegacyMergePulse(result) {
    result.merges.forEach((merge) => {
      const point = this.toScreen(merge.target);
      const pulse = this.scene.add.container(point.x, point.y).setDepth(63);
      const hex = this.scene.add.graphics();
      drawHex(hex, 0, 0, this.layout.hexSize * 1.04, {
        fill: COLOR_MAP[merge.color] ?? 0xf2c94c,
        alpha: 0.24,
        line: 0xffffff,
        lineAlpha: 0.95
      });
      pulse.add(hex);
      const label = this.scene.add.text(point.x, point.y - this.layout.hexSize * 1.05, `${merge.totalCount}/6`, {
        fontFamily: 'Inter, Arial, sans-serif',
        fontSize: `${Math.round(Math.max(16, this.layout.hexSize * 0.56))}px`,
        fontStyle: '800',
        color: '#17352e',
        backgroundColor: 'rgba(255,255,255,0.86)',
        padding: { x: 7, y: 3 }
      }).setOrigin(0.5).setDepth(76);

      this.scene.tweens.add({
        targets: pulse,
        alpha: 0,
        scaleX: 1.18,
        scaleY: 1.18,
        duration: this.scene.configData.gameFeel?.mergeAnimationMs ?? 240,
        ease: 'Sine.easeOut',
        onComplete: () => pulse.destroy()
      });
      this.scene.tweens.add({
        targets: label,
        y: label.y - 18,
        alpha: 0,
        duration: 420,
        ease: 'Sine.easeOut',
        onComplete: () => label.destroy()
      });
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

  drawStackCount(point, count) {
    const text = this.scene.add.text(point.x, point.y, String(count), {
      fontFamily: 'Inter, Arial, sans-serif',
      fontSize: `${Math.round(Math.max(14, this.layout.hexSize * 0.58))}px`,
      fontStyle: '800',
      color: '#17352e',
      stroke: '#ffffff',
      strokeThickness: Math.max(2, Math.round(this.layout.hexSize * 0.08))
    }).setOrigin(0.5).setDepth(34);

    this.textGroup.add(text);
  }

  drawStackHints(hints) {
    hints.forEach((hint) => {
      const point = this.toScreen(hint.target);
      const label = this.scene.add.text(point.x, point.y - this.layout.hexSize * 1.08, hint.hint, {
        fontFamily: 'Inter, Arial, sans-serif',
        fontSize: `${Math.round(Math.max(13, this.layout.hexSize * 0.46))}px`,
        fontStyle: '800',
        color: hint.action === 'bloom' ? '#0f5b55' : '#17352e',
        backgroundColor: 'rgba(255,255,255,0.88)',
        padding: { x: 6, y: 3 }
      }).setOrigin(0.5).setDepth(56);

      this.textGroup.add(label);
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

function isSameCoord(a, b) {
  return Boolean(a && b && a.q === b.q && a.r === b.r);
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
