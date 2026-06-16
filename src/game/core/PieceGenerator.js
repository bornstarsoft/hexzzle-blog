import { normalizeOffsets, rotateOffsets } from './HexCoordinates.js';
import { createPiece } from './PieceModel.js';

export const COLOR_IDS = ['red', 'blue', 'yellow', 'green', 'purple', 'orange'];

export const PIECE_TEMPLATES = [
  {
    name: 'single',
    offsets: [{ dq: 0, dr: 0 }]
  },
  {
    name: 'duoLine',
    offsets: [
      { dq: 0, dr: 0 },
      { dq: 1, dr: 0 }
    ]
  },
  {
    name: 'tripleLine',
    offsets: [
      { dq: 0, dr: 0 },
      { dq: 1, dr: 0 },
      { dq: 2, dr: 0 }
    ]
  },
  {
    name: 'tripleBend',
    offsets: [
      { dq: 0, dr: 0 },
      { dq: 1, dr: 0 },
      { dq: 0, dr: 1 }
    ]
  }
];

export class PieceGenerator {
  constructor({ random = Math.random, config = {} } = {}) {
    this.random = random;
    this.config = config;
    this.pieceCounter = 0;
    this.variants = buildPieceVariants();
  }

  getActiveColors(score = 0) {
    const difficulty = this.config.difficulty ?? {};
    const startColors = difficulty.startColors ?? 4;
    let count = startColors;

    if (score >= (difficulty.addFifthColorAtScore ?? 1200)) {
      count = Math.max(count, 5);
    }

    if (score >= (difficulty.addSixthColorAtScore ?? 3500)) {
      count = Math.max(count, 6);
    }

    return COLOR_IDS.slice(0, Math.min(count, COLOR_IDS.length));
  }

  generateTray({ score = 0, placements = 0 } = {}) {
    return Array.from({ length: 3 }, () => this.generatePiece({ score, placements }));
  }

  generatePiece({ score = 0, placements = 0 } = {}) {
    const activeColors = this.getActiveColors(score);
    const usefulEarlyBias = placements < 5 ? 0.62 : 0.36;
    const weightedVariants = placements < 5
      ? this.variants.filter((variant) => variant.offsets.length <= 2).concat(this.variants)
      : this.variants;
    const variant = weightedVariants[Math.floor(this.random() * weightedVariants.length)];
    const sameColorPiece = this.random() < usefulEarlyBias || variant.offsets.length === 1;
    const mainColor = this.pickColor(activeColors);
    const cells = variant.offsets.map((offset) => ({
      ...offset,
      color: sameColorPiece ? mainColor : this.pickColor(activeColors)
    }));

    this.pieceCounter += 1;

    return createPiece({
      id: `piece-${Date.now()}-${this.pieceCounter}`,
      name: variant.name,
      cells
    });
  }

  pickColor(activeColors) {
    return activeColors[Math.floor(this.random() * activeColors.length)];
  }
}

function buildPieceVariants() {
  const variants = [];
  const seen = new Set();

  PIECE_TEMPLATES.forEach((template) => {
    rotateOffsets(template.offsets).forEach((offsets, rotationIndex) => {
      const normalized = normalizeOffsets(offsets);
      const key = `${template.name}:${normalized.map((offset) => `${offset.dq},${offset.dr}`).join('|')}`;

      if (!seen.has(key)) {
        seen.add(key);
        variants.push({
          name: `${template.name}-${rotationIndex}`,
          offsets: normalized
        });
      }
    });
  });

  return variants;
}
