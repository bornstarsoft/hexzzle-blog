import { normalizeOffsets, rotateOffsets } from './HexCoordinates.js';
import { createPiece } from './PieceModel.js';

export const COLOR_IDS = ['red', 'blue', 'yellow', 'green', 'purple', 'orange'];

export const DEFAULT_DIFFICULTY_CONFIG = {
  startColors: 4,
  addFifthColorAtScore: 3000,
  addFifthColorAfterBlooms: 8,
  addSixthColorAtScore: 999999,
  addSixthColorAfterBlooms: 999999,
  fifthColorGraceTrayRefills: 6,
  graceSmallPieceBias: 0.65,
  graceSameColorBias: 0.58,
  graceNewColorChance: 0.18
};

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
    this.fifthColorUnlocked = false;
    this.fifthColorGraceRemaining = 0;
  }

  getDifficultyConfig() {
    return {
      ...DEFAULT_DIFFICULTY_CONFIG,
      ...(this.config.difficulty ?? {})
    };
  }

  getActiveColors(progress = {}) {
    const difficulty = this.getDifficultyConfig();
    const { score, blooms } = normalizeProgress(progress);
    const startColors = difficulty.startColors;
    let count = startColors;

    if (
      meetsThreshold(score, difficulty.addFifthColorAtScore) &&
      meetsThreshold(blooms, difficulty.addFifthColorAfterBlooms)
    ) {
      count = Math.max(count, 5);
    }

    if (
      meetsThreshold(score, difficulty.addSixthColorAtScore) &&
      meetsThreshold(blooms, difficulty.addSixthColorAfterBlooms)
    ) {
      count = Math.max(count, 6);
    }

    return COLOR_IDS.slice(0, Math.min(count, COLOR_IDS.length));
  }

  generateTray({ score = 0, placements = 0, blooms = 0 } = {}) {
    const activeColors = this.getActiveColors({ score, blooms });
    const graceActive = this.updateFifthColorGrace(activeColors);
    const tray = Array.from({ length: 3 }, () => this.generatePiece({
      score,
      placements,
      blooms,
      activeColors,
      graceActive
    }));

    if (graceActive) {
      this.fifthColorGraceRemaining = Math.max(0, this.fifthColorGraceRemaining - 1);
    }

    return tray;
  }

  generatePiece({
    score = 0,
    placements = 0,
    blooms = 0,
    activeColors = null,
    graceActive = false
  } = {}) {
    const colors = activeColors ?? this.getActiveColors({ score, blooms });
    const difficulty = this.getDifficultyConfig();
    const usefulEarlyBias = placements < 5 ? 0.62 : 0.36;
    const sameColorBias = graceActive ? clamp01(difficulty.graceSameColorBias) : usefulEarlyBias;
    const variant = this.pickVariant({ placements, graceActive });
    const sameColorPiece = this.random() < sameColorBias || variant.offsets.length === 1;
    const mainColor = this.pickColor(colors, { graceActive });
    const cells = variant.offsets.map((offset) => ({
      ...offset,
      color: sameColorPiece ? mainColor : this.pickColor(colors, { graceActive })
    }));

    this.pieceCounter += 1;

    return createPiece({
      id: `piece-${Date.now()}-${this.pieceCounter}`,
      name: variant.name,
      cells
    });
  }

  pickVariant({ placements = 0, graceActive = false } = {}) {
    const weightedVariants = this.variants.map((variant) => ({
      variant,
      weight: this.getVariantWeight(variant, { placements, graceActive })
    }));
    const totalWeight = weightedVariants.reduce((sum, item) => sum + item.weight, 0);
    let cursor = this.random() * totalWeight;

    for (const item of weightedVariants) {
      cursor -= item.weight;
      if (cursor <= 0) {
        return item.variant;
      }
    }

    return weightedVariants.at(-1).variant;
  }

  getVariantWeight(variant, { placements = 0, graceActive = false } = {}) {
    const cellCount = variant.offsets.length;

    if (graceActive) {
      const smallPieceBias = clamp01(this.getDifficultyConfig().graceSmallPieceBias);

      if (cellCount === 1) {
        return 1 + smallPieceBias * 4.6;
      }

      if (cellCount === 2) {
        return 1 + smallPieceBias * 3.4;
      }

      return 1;
    }

    if (placements < 5 && cellCount <= 2) {
      return 2.6;
    }

    return 1;
  }

  pickColor(activeColors, { graceActive = false } = {}) {
    const difficulty = this.getDifficultyConfig();

    if (graceActive && activeColors.length >= 5) {
      const newColorChance = clamp01(difficulty.graceNewColorChance);
      const newColor = activeColors[4];
      const baseColors = activeColors.slice(0, 4);

      if (this.random() < newColorChance) {
        return newColor;
      }

      return baseColors[Math.floor(this.random() * baseColors.length)];
    }

    return activeColors[Math.floor(this.random() * activeColors.length)];
  }

  updateFifthColorGrace(activeColors) {
    if (activeColors.length < 5) {
      return false;
    }

    if (!this.fifthColorUnlocked) {
      this.fifthColorUnlocked = true;
      this.fifthColorGraceRemaining = Math.max(0, this.getDifficultyConfig().fifthColorGraceTrayRefills);
    }

    return this.fifthColorGraceRemaining > 0;
  }

  snapshot() {
    return {
      pieceCounter: this.pieceCounter,
      fifthColorUnlocked: this.fifthColorUnlocked,
      fifthColorGraceRemaining: this.fifthColorGraceRemaining
    };
  }

  restore(snapshot = {}) {
    this.pieceCounter = snapshot.pieceCounter ?? this.pieceCounter;
    this.fifthColorUnlocked = snapshot.fifthColorUnlocked ?? this.fifthColorUnlocked;
    this.fifthColorGraceRemaining = snapshot.fifthColorGraceRemaining ?? this.fifthColorGraceRemaining;
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

function normalizeProgress(progress) {
  if (typeof progress === 'number') {
    return { score: progress, blooms: 0 };
  }

  return {
    score: progress.score ?? 0,
    blooms: progress.blooms ?? 0
  };
}

function meetsThreshold(value, threshold) {
  if (threshold === false || threshold === null || threshold === undefined) {
    return false;
  }

  return value >= threshold;
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value ?? 0));
}
