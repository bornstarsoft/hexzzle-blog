import { normalizeOffsets, rotateOffsets } from './HexCoordinates.js';
import { createPiece } from './PieceModel.js';

export const COLOR_IDS = ['red', 'blue', 'yellow', 'green', 'purple', 'orange'];

export const DEFAULT_DIFFICULTY_CONFIG = {
  startColors: 4,
  addFifthColorAtScore: 3000,
  addFifthColorAfterBlooms: 8,
  addSixthColorAtScore: 999999,
  addSixthColorAfterBlooms: 999999,
  earlyTrayCount: 6,
  earlyScoreLimit: 800,
  earlyBloomLimit: 3,
  growthScoreLimit: 2500,
  growthBloomLimit: 8,
  midScoreLimit: 5000,
  midBloomLimit: 16,
  earlySingleWeight: 45,
  earlyDuoWeight: 45,
  earlyTripleWeight: 10,
  growthSingleWeight: 35,
  growthDuoWeight: 45,
  growthTripleWeight: 20,
  midSingleWeight: 25,
  midDuoWeight: 45,
  midTripleWeight: 30,
  lateMinSingleWeight: 20,
  lateMinDuoWeight: 35,
  lateMaxTripleWeight: 45,
  purpleGraceTrayCount: 6,
  purpleGraceSingleWeight: 35,
  purpleGraceDuoWeight: 45,
  purpleGraceTripleWeight: 20,
  graceSameColorBias: 0.58,
  graceNewColorChance: 0.18,
  crowdedEmptyCellThreshold: 10,
  criticalEmptyCellThreshold: 7,
  crowdedSingleBoost: 10,
  crowdedDuoBoost: 10,
  crowdedTriplePenalty: 20,
  allowAllTripleTrays: false
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
    this.trayRefillCount = 0;
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

  generateTray({ score = 0, placements = 0, blooms = 0, emptyCells = null } = {}) {
    const activeColors = this.getActiveColors({ score, blooms });
    const graceActive = this.updateFifthColorGrace(activeColors);
    const profile = this.getTrayProfile({ score, placements, blooms, emptyCells, graceActive });
    const tray = [];
    let smallCount = 0;
    let tripleCount = 0;

    for (let index = 0; index < 3; index += 1) {
      const sizeClass = this.pickSizeClass(profile.weights, {
        slotsRemaining: 3 - index,
        smallCount,
        tripleCount,
        minSmallPieces: profile.minSmallPieces,
        maxTriplePieces: profile.maxTriplePieces
      });
      const piece = this.generatePiece({
        score,
        placements,
        blooms,
        activeColors,
        graceActive,
        sizeClass
      });

      tray.push(piece);
      if (isSmallSizeClass(sizeClass)) {
        smallCount += 1;
      } else {
        tripleCount += 1;
      }
    }

    if (graceActive) {
      this.fifthColorGraceRemaining = Math.max(0, this.fifthColorGraceRemaining - 1);
    }

    this.trayRefillCount += 1;

    return tray;
  }

  generatePiece({
    score = 0,
    placements = 0,
    blooms = 0,
    activeColors = null,
    graceActive = false,
    sizeClass = null,
    emptyCells = null
  } = {}) {
    const colors = activeColors ?? this.getActiveColors({ score, blooms });
    const difficulty = this.getDifficultyConfig();
    const usefulEarlyBias = placements < 5 ? 0.62 : 0.36;
    const sameColorBias = graceActive ? clamp01(difficulty.graceSameColorBias) : usefulEarlyBias;
    const profile = this.getTrayProfile({ score, placements, blooms, emptyCells, graceActive });
    const variant = this.pickVariant({ sizeClass, weights: profile.weights });
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

  pickVariant({ sizeClass = null, weights = null } = {}) {
    const resolvedSizeClass = sizeClass ?? this.pickSizeClass(weights ?? this.getTrayProfile().weights);
    const variants = this.variants.filter((variant) => getVariantSizeClass(variant) === resolvedSizeClass);

    return variants[Math.floor(this.random() * variants.length)] ?? this.variants[0];
  }

  pickSizeClass(weights, {
    slotsRemaining = 1,
    smallCount = 0,
    tripleCount = 0,
    minSmallPieces = 1,
    maxTriplePieces = 2
  } = {}) {
    if (smallCount + slotsRemaining <= minSmallPieces) {
      return this.pickWeightedSizeClass({
        single: weights.single,
        duo: weights.duo,
        triple: 0
      });
    }

    if (tripleCount >= maxTriplePieces) {
      return this.pickWeightedSizeClass({
        single: weights.single,
        duo: weights.duo,
        triple: 0
      });
    }

    return this.pickWeightedSizeClass(weights);
  }

  pickWeightedSizeClass(weights) {
    const normalized = normalizeWeights(weights);
    const totalWeight = normalized.single + normalized.duo + normalized.triple;
    let cursor = this.random() * totalWeight;

    for (const sizeClass of ['single', 'duo', 'triple']) {
      cursor -= normalized[sizeClass];
      if (cursor <= 0) {
        return sizeClass;
      }
    }

    return 'duo';
  }

  getTrayProfile({ score = 0, placements = 0, blooms = 0, emptyCells = null, graceActive = false } = {}) {
    const difficulty = this.getDifficultyConfig();
    const phase = this.getTrayPhase({ score, placements, blooms, graceActive });
    const weights = this.getPieceSizeWeights({ phase, emptyCells });
    const critical = Number.isFinite(emptyCells) && emptyCells <= difficulty.criticalEmptyCellThreshold;
    const minSmallPieces = critical || phase === 'early' ? 2 : 1;
    const maxTriplePieces = difficulty.allowAllTripleTrays ? 3 : 2;

    return {
      phase,
      weights,
      minSmallPieces,
      maxTriplePieces
    };
  }

  getTrayPhase({ score = 0, placements = 0, blooms = 0, graceActive = false } = {}) {
    const difficulty = this.getDifficultyConfig();

    if (graceActive) {
      return 'purpleGrace';
    }

    if (
      this.trayRefillCount < difficulty.earlyTrayCount ||
      score < difficulty.earlyScoreLimit ||
      blooms < difficulty.earlyBloomLimit
    ) {
      return 'early';
    }

    if (score < difficulty.growthScoreLimit || blooms < difficulty.growthBloomLimit) {
      return 'growth';
    }

    if (score < difficulty.midScoreLimit || blooms < difficulty.midBloomLimit) {
      return 'mid';
    }

    return 'late';
  }

  getPieceSizeWeights({ phase = 'early', emptyCells = null } = {}) {
    const difficulty = this.getDifficultyConfig();
    const weightsByPhase = {
      early: {
        single: difficulty.earlySingleWeight,
        duo: difficulty.earlyDuoWeight,
        triple: difficulty.earlyTripleWeight
      },
      growth: {
        single: difficulty.growthSingleWeight,
        duo: difficulty.growthDuoWeight,
        triple: difficulty.growthTripleWeight
      },
      mid: {
        single: difficulty.midSingleWeight,
        duo: difficulty.midDuoWeight,
        triple: difficulty.midTripleWeight
      },
      purpleGrace: {
        single: difficulty.purpleGraceSingleWeight,
        duo: difficulty.purpleGraceDuoWeight,
        triple: difficulty.purpleGraceTripleWeight
      },
      late: {
        single: difficulty.lateMinSingleWeight,
        duo: difficulty.lateMinDuoWeight,
        triple: difficulty.lateMaxTripleWeight
      }
    };
    const weights = { ...(weightsByPhase[phase] ?? weightsByPhase.early) };

    if (Number.isFinite(emptyCells) && emptyCells <= difficulty.crowdedEmptyCellThreshold) {
      weights.single += difficulty.crowdedSingleBoost;
      weights.duo += difficulty.crowdedDuoBoost;
      weights.triple = Math.max(0, weights.triple - difficulty.crowdedTriplePenalty);
    }

    return normalizeWeights(weights);
  }

  getVariantWeight(variant, options = {}) {
    const profile = this.getTrayProfile(options);
    return profile.weights[getVariantSizeClass(variant)] ?? 0;
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
      this.fifthColorGraceRemaining = Math.max(0, this.getDifficultyConfig().purpleGraceTrayCount);
    }

    return this.fifthColorGraceRemaining > 0;
  }

  snapshot() {
    return {
      pieceCounter: this.pieceCounter,
      fifthColorUnlocked: this.fifthColorUnlocked,
      fifthColorGraceRemaining: this.fifthColorGraceRemaining,
      trayRefillCount: this.trayRefillCount
    };
  }

  restore(snapshot = {}) {
    this.pieceCounter = snapshot.pieceCounter ?? this.pieceCounter;
    this.fifthColorUnlocked = snapshot.fifthColorUnlocked ?? this.fifthColorUnlocked;
    this.fifthColorGraceRemaining = snapshot.fifthColorGraceRemaining ?? this.fifthColorGraceRemaining;
    this.trayRefillCount = snapshot.trayRefillCount ?? this.trayRefillCount;
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

function normalizeWeights(weights) {
  return {
    single: Math.max(0, weights?.single ?? 0),
    duo: Math.max(0, weights?.duo ?? 0),
    triple: Math.max(0, weights?.triple ?? 0)
  };
}

function getVariantSizeClass(variant) {
  const cellCount = variant?.offsets?.length ?? 0;

  if (cellCount <= 1) {
    return 'single';
  }

  if (cellCount === 2) {
    return 'duo';
  }

  return 'triple';
}

function isSmallSizeClass(sizeClass) {
  return sizeClass === 'single' || sizeClass === 'duo';
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value ?? 0));
}
