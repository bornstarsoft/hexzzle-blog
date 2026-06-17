import { normalizeOffsets, rotateOffsets } from './HexCoordinates.js';
import { createPiece } from './PieceModel.js';

export const COLOR_IDS = ['red', 'blue', 'yellow', 'green', 'purple', 'orange'];

export const DEFAULT_DIFFICULTY_CONFIG = {
  startColors: 4,
  addFifthColorAtScore: 1800,
  addFifthColorAfterBlooms: 3,
  addSixthColorAtScore: 5000,
  addSixthColorAfterBlooms: 10,
  maxActiveColors: 6,
  tutorialTrayCount: 3,
  midScoreStart: 3000,
  midBloomStart: 6,
  lateScoreStart: 8000,
  lateBloomStart: 16,
  latePressureEmptyCells: 14,
  tutorialSingleWeight: 40,
  tutorialDuoWeight: 45,
  tutorialTripleWeight: 15,
  earlySingleWeight: 28,
  earlyDuoWeight: 44,
  earlyTripleWeight: 28,
  midSingleWeight: 22,
  midDuoWeight: 40,
  midTripleWeight: 38,
  lateMinSingleWeight: 18,
  lateMinDuoWeight: 37,
  lateMaxTripleWeight: 45,
  purpleGraceTrayCount: 6,
  purpleGraceSingleWeight: 35,
  purpleGraceDuoWeight: 45,
  purpleGraceTripleWeight: 20,
  orangeGraceTrayCount: 8,
  orangeGraceSingleWeight: 38,
  orangeGraceDuoWeight: 44,
  orangeGraceTripleWeight: 18,
  graceSameColorBias: 0.58,
  graceNewColorChance: 0.18,
  purpleGraceNewColorChance: 0.18,
  orangeGraceNewColorChance: 0.14,
  purpleGraceMaxNewColorPieces: 2,
  orangeGraceMaxNewColorPieces: 2,
  crowdedEmptyCellThreshold: 10,
  criticalEmptyCellThreshold: 7,
  criticalSmallPieceGuarantee: 2,
  severeEmptyCellThreshold: 5,
  crowdedSingleBoost: 10,
  crowdedDuoBoost: 10,
  crowdedTriplePenalty: 20,
  severeSingleBoost: 18,
  severeDuoBoost: 20,
  severeTriplePenalty: 38,
  stackOpportunityChanceEarly: 0.15,
  stackOpportunityChanceMid: 0.25,
  stackOpportunityChanceLate: 0.3,
  maxOpportunityPiecesPerTray: 1,
  trayRegenerationAttempts: 5,
  preventNoFitTrayWhenPossible: true,
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
    this.sixthColorUnlocked = false;
    this.sixthColorGraceRemaining = 0;
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
    const maxActiveColors = Math.min(difficulty.maxActiveColors ?? COLOR_IDS.length, COLOR_IDS.length);
    const startColors = Math.min(difficulty.startColors, maxActiveColors);
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

    return COLOR_IDS.slice(0, Math.min(count, maxActiveColors, COLOR_IDS.length));
  }

  generateTray({ score = 0, placements = 0, blooms = 0, emptyCells = null, board = null } = {}) {
    const activeColors = this.getActiveColors({ score, blooms });
    const gracePhase = this.updateColorGrace(activeColors);
    const graceActive = Boolean(gracePhase);
    const colorBudget = this.createGraceColorBudget(activeColors, gracePhase);
    const profile = this.getTrayProfile({ score, placements, blooms, emptyCells, gracePhase, activeColors });
    const opportunity = this.createStackOpportunity({ board, activeColors, phase: profile.phase });
    const tray = [];
    let smallCount = 0;
    let tripleCount = 0;

    for (let index = 0; index < 3; index += 1) {
      const opportunityColor = this.getOpportunityColorForSlot(opportunity, index);
      const sizeClass = this.pickSizeClass(profile.weights, {
        slotsRemaining: 3 - index,
        smallCount,
        tripleCount,
        minSmallPieces: profile.minSmallPieces,
        maxTriplePieces: profile.maxTriplePieces,
        forcedSizeClass: opportunityColor ? this.getOpportunitySizeClass(opportunity) : null
      });
      const piece = this.generatePiece({
        score,
        placements,
        blooms,
        activeColors,
        graceActive,
        gracePhase,
        colorBudget,
        sizeClass,
        opportunityColor
      });

      tray.push(piece);
      if (isSmallSizeClass(sizeClass)) {
        smallCount += 1;
      } else {
        tripleCount += 1;
      }
    }

    if (gracePhase === 'purpleGrace') {
      this.fifthColorGraceRemaining = Math.max(0, this.fifthColorGraceRemaining - 1);
    }

    if (gracePhase === 'orangeGrace') {
      this.sixthColorGraceRemaining = Math.max(0, this.sixthColorGraceRemaining - 1);
    }

    this.trayRefillCount += 1;

    return this.ensureTrayHasFit({
      tray,
      board,
      activeColors,
      score,
      placements,
      blooms,
      emptyCells
    });
  }

  generatePiece({
    score = 0,
    placements = 0,
    blooms = 0,
    activeColors = null,
    graceActive = false,
    gracePhase = null,
    colorBudget = null,
    opportunityColor = null,
    sizeClass = null,
    emptyCells = null
  } = {}) {
    const colors = activeColors ?? this.getActiveColors({ score, blooms });
    const difficulty = this.getDifficultyConfig();
    const activeGracePhase = gracePhase ?? (graceActive ? 'purpleGrace' : null);
    const usefulEarlyBias = placements < 5 ? 0.62 : 0.36;
    const sameColorBias = activeGracePhase ? clamp01(difficulty.graceSameColorBias) : usefulEarlyBias;
    const profile = this.getTrayProfile({ score, placements, blooms, emptyCells, gracePhase: activeGracePhase });
    const variant = this.pickVariant({ sizeClass, weights: profile.weights });
    const sameColorPiece = Boolean(opportunityColor) || this.random() < sameColorBias || variant.offsets.length === 1;
    const mainColor = opportunityColor ?? this.pickColor(colors, { gracePhase: activeGracePhase, colorBudget });
    const cells = variant.offsets.map((offset) => ({
      ...offset,
      color: sameColorPiece ? mainColor : this.pickColor(colors, { gracePhase: activeGracePhase, colorBudget })
    }));
    this.registerGraceNewColorUse(cells, colorBudget);

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
    maxTriplePieces = 2,
    forcedSizeClass = null
  } = {}) {
    if (forcedSizeClass) {
      return forcedSizeClass;
    }

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

  getTrayProfile({ score = 0, placements = 0, blooms = 0, emptyCells = null, graceActive = false, gracePhase = null, activeColors = null } = {}) {
    const difficulty = this.getDifficultyConfig();
    const resolvedGracePhase = gracePhase ?? (graceActive ? 'purpleGrace' : null);
    const phase = this.getTrayPhase({ score, placements, blooms, emptyCells, activeColors, gracePhase: resolvedGracePhase });
    const weights = this.getPieceSizeWeights({ phase, emptyCells });
    const critical = Number.isFinite(emptyCells) && emptyCells <= difficulty.criticalEmptyCellThreshold;
    const minSmallPieces = critical
      ? Math.max(1, difficulty.criticalSmallPieceGuarantee ?? 2)
      : phase === 'tutorial' ? 2 : 1;
    const maxTriplePieces = difficulty.allowAllTripleTrays ? 3 : 2;

    return {
      phase,
      weights,
      minSmallPieces,
      maxTriplePieces
    };
  }

  getTrayPhase({ score = 0, placements = 0, blooms = 0, emptyCells = null, activeColors = null, graceActive = false, gracePhase = null } = {}) {
    const difficulty = this.getDifficultyConfig();
    const resolvedGracePhase = gracePhase ?? (graceActive ? 'purpleGrace' : null);
    const activeColorCount = activeColors?.length ?? this.getActiveColors({ score, blooms }).length;

    if (resolvedGracePhase) {
      return resolvedGracePhase;
    }

    if (this.trayRefillCount < this.getTutorialTrayCount(difficulty)) {
      return 'tutorial';
    }

    if (
      score >= this.getLateScoreStart(difficulty) ||
      blooms >= this.getLateBloomStart(difficulty) ||
      (activeColorCount >= 6 && Number.isFinite(emptyCells) && emptyCells <= difficulty.latePressureEmptyCells)
    ) {
      return 'late';
    }

    if (
      score >= this.getMidScoreStart(difficulty) ||
      blooms >= this.getMidBloomStart(difficulty)
    ) {
      return 'mid';
    }

    return 'earlyChallenge';
  }

  getPieceSizeWeights({ phase = 'early', emptyCells = null } = {}) {
    const difficulty = this.getDifficultyConfig();
    const weightsByPhase = {
      early: {
        single: difficulty.earlySingleWeight,
        duo: difficulty.earlyDuoWeight,
        triple: difficulty.earlyTripleWeight
      },
      tutorial: {
        single: difficulty.tutorialSingleWeight ?? difficulty.earlySingleWeight,
        duo: difficulty.tutorialDuoWeight ?? difficulty.earlyDuoWeight,
        triple: difficulty.tutorialTripleWeight ?? difficulty.earlyTripleWeight
      },
      earlyChallenge: {
        single: difficulty.earlySingleWeight,
        duo: difficulty.earlyDuoWeight,
        triple: difficulty.earlyTripleWeight
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
      orangeGrace: {
        single: difficulty.orangeGraceSingleWeight,
        duo: difficulty.orangeGraceDuoWeight,
        triple: difficulty.orangeGraceTripleWeight
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

    if (Number.isFinite(emptyCells) && emptyCells <= difficulty.severeEmptyCellThreshold) {
      weights.single += difficulty.severeSingleBoost;
      weights.duo += difficulty.severeDuoBoost;
      weights.triple = Math.max(0, weights.triple - difficulty.severeTriplePenalty);
    }

    return normalizeWeights(weights);
  }

  getVariantWeight(variant, options = {}) {
    const profile = this.getTrayProfile(options);
    return profile.weights[getVariantSizeClass(variant)] ?? 0;
  }

  pickColor(activeColors, { graceActive = false, gracePhase = null, colorBudget = null } = {}) {
    const activeGracePhase = gracePhase ?? (graceActive ? 'purpleGrace' : null);
    const newColor = this.getGraceNewColor(activeColors, activeGracePhase);

    if (newColor) {
      const newColorChance = this.getGraceNewColorChance(activeGracePhase);
      const baseColors = activeColors.filter((color) => color !== newColor);
      const canUseNewColor = !colorBudget || colorBudget.newColorPieces < colorBudget.maxNewColorPieces;

      if (canUseNewColor && this.random() < newColorChance) {
        return newColor;
      }

      return baseColors[Math.floor(this.random() * baseColors.length)];
    }

    return activeColors[Math.floor(this.random() * activeColors.length)];
  }

  createGraceColorBudget(activeColors, gracePhase) {
    const graceColor = this.getGraceNewColor(activeColors, gracePhase);

    if (!graceColor) {
      return null;
    }

    return {
      graceColor,
      maxNewColorPieces: this.getGraceMaxNewColorPieces(gracePhase),
      newColorPieces: 0
    };
  }

  registerGraceNewColorUse(cells, colorBudget) {
    if (!colorBudget) {
      return;
    }

    if (cells.some((cell) => cell.color === colorBudget.graceColor)) {
      colorBudget.newColorPieces += 1;
    }
  }

  getGraceNewColor(activeColors, gracePhase) {
    if (gracePhase === 'orangeGrace' && activeColors.length >= 6) {
      return activeColors[5];
    }

    if (gracePhase === 'purpleGrace' && activeColors.length >= 5) {
      return activeColors[4];
    }

    return null;
  }

  getGraceNewColorChance(gracePhase) {
    const difficulty = this.getDifficultyConfig();

    if (gracePhase === 'orangeGrace') {
      return clamp01(difficulty.orangeGraceNewColorChance ?? difficulty.graceNewColorChance);
    }

    if (gracePhase === 'purpleGrace') {
      return clamp01(difficulty.purpleGraceNewColorChance ?? difficulty.graceNewColorChance);
    }

    return 1;
  }

  getGraceMaxNewColorPieces(gracePhase) {
    const difficulty = this.getDifficultyConfig();

    if (gracePhase === 'orangeGrace') {
      return Math.max(0, difficulty.orangeGraceMaxNewColorPieces ?? 2);
    }

    if (gracePhase === 'purpleGrace') {
      return Math.max(0, difficulty.purpleGraceMaxNewColorPieces ?? 2);
    }

    return 3;
  }

  updateColorGrace(activeColors) {
    if (activeColors.length < 5) {
      return false;
    }

    if (!this.fifthColorUnlocked) {
      this.fifthColorUnlocked = true;
      this.fifthColorGraceRemaining = Math.max(0, this.getDifficultyConfig().purpleGraceTrayCount);
    }

    if (activeColors.length >= 6) {
      this.fifthColorGraceRemaining = 0;

      if (!this.sixthColorUnlocked) {
        this.sixthColorUnlocked = true;
        this.sixthColorGraceRemaining = Math.max(0, this.getDifficultyConfig().orangeGraceTrayCount);
      }

      return this.sixthColorGraceRemaining > 0 ? 'orangeGrace' : false;
    }

    return this.fifthColorGraceRemaining > 0 ? 'purpleGrace' : false;
  }

  createStackOpportunity({ board = null, activeColors = [], phase = 'tutorial' } = {}) {
    const usefulStacks = this.getUsefulStackColors(board, activeColors);
    const maxPieces = this.getDifficultyConfig().maxOpportunityPiecesPerTray;

    if (!board || usefulStacks.length === 0 || maxPieces <= 0) {
      return null;
    }

    const chance = this.getStackOpportunityChance(phase);
    if (chance <= 0 || this.random() >= chance) {
      return null;
    }

    return {
      color: usefulStacks[0].color,
      count: usefulStacks[0].count,
      slot: 0,
      maxPieces,
      usedPieces: 0
    };
  }

  getUsefulStackColors(board, activeColors) {
    if (!board) {
      return [];
    }

    const activeColorSet = new Set(activeColors);
    const byColor = new Map();

    board.coordinates.forEach((coord) => {
      const cell = board.getCell(coord);
      if (!cell || cell.count < 3 || cell.count > 5 || !activeColorSet.has(cell.color)) {
        return;
      }

      const current = byColor.get(cell.color);
      if (!current || cell.count > current.count) {
        byColor.set(cell.color, { color: cell.color, count: cell.count });
      }
    });

    return [...byColor.values()].sort((a, b) => b.count - a.count || COLOR_IDS.indexOf(a.color) - COLOR_IDS.indexOf(b.color));
  }

  getStackOpportunityChance(phase) {
    const difficulty = this.getDifficultyConfig();

    if (phase === 'late' || phase === 'orangeGrace') {
      return clamp01(difficulty.stackOpportunityChanceLate);
    }

    if (phase === 'mid' || phase === 'purpleGrace') {
      return clamp01(difficulty.stackOpportunityChanceMid);
    }

    if (phase === 'earlyChallenge') {
      return clamp01(difficulty.stackOpportunityChanceEarly);
    }

    return 0;
  }

  getOpportunityColorForSlot(opportunity, slotIndex) {
    if (!opportunity || slotIndex !== opportunity.slot || opportunity.usedPieces >= opportunity.maxPieces) {
      return null;
    }

    opportunity.usedPieces += 1;
    return opportunity.color;
  }

  getOpportunitySizeClass(opportunity) {
    if (!opportunity) {
      return null;
    }

    return opportunity.count >= 4 ? 'single' : 'duo';
  }

  ensureTrayHasFit({ tray, board, activeColors, score, placements, blooms, emptyCells }) {
    const difficulty = this.getDifficultyConfig();

    if (!difficulty.preventNoFitTrayWhenPossible || !board || board.hasAnyFit(tray) || board.getEmptyCellCount() <= 0) {
      return tray;
    }

    for (let attempt = 0; attempt < difficulty.trayRegenerationAttempts; attempt += 1) {
      const replacement = this.generateFittingSmallPiece({ board, activeColors, score, placements, blooms, emptyCells });
      if (replacement && board.hasAnyFit([replacement])) {
        return [replacement, ...tray.slice(1)];
      }
    }

    return tray;
  }

  generateFittingSmallPiece({ board, activeColors, score, placements, blooms, emptyCells }) {
    const opportunityColor = this.getUsefulStackColors(board, activeColors)[0]?.color;
    const color = opportunityColor ?? activeColors[0] ?? COLOR_IDS[0];
    const single = this.createSinglePiece(color);

    if (board.hasAnyFit([single])) {
      return single;
    }

    return this.generatePiece({
      score,
      placements,
      blooms,
      activeColors,
      emptyCells,
      sizeClass: 'duo',
      opportunityColor: color
    });
  }

  createSinglePiece(color) {
    this.pieceCounter += 1;

    return createPiece({
      id: `piece-${Date.now()}-${this.pieceCounter}`,
      name: 'single-fit',
      cells: [{ dq: 0, dr: 0, color }]
    });
  }

  getTutorialTrayCount(difficulty) {
    return difficulty.tutorialTrayCount ?? difficulty.earlyTrayCount ?? 3;
  }

  getMidScoreStart(difficulty) {
    return difficulty.midScoreStart ?? difficulty.growthScoreLimit ?? 3000;
  }

  getMidBloomStart(difficulty) {
    return difficulty.midBloomStart ?? difficulty.growthBloomLimit ?? 6;
  }

  getLateScoreStart(difficulty) {
    return difficulty.lateScoreStart ?? difficulty.midScoreLimit ?? 8000;
  }

  getLateBloomStart(difficulty) {
    return difficulty.lateBloomStart ?? difficulty.midBloomLimit ?? 16;
  }

  snapshot() {
    return {
      pieceCounter: this.pieceCounter,
      fifthColorUnlocked: this.fifthColorUnlocked,
      fifthColorGraceRemaining: this.fifthColorGraceRemaining,
      sixthColorUnlocked: this.sixthColorUnlocked,
      sixthColorGraceRemaining: this.sixthColorGraceRemaining,
      trayRefillCount: this.trayRefillCount
    };
  }

  restore(snapshot = {}) {
    this.pieceCounter = snapshot.pieceCounter ?? this.pieceCounter;
    this.fifthColorUnlocked = snapshot.fifthColorUnlocked ?? this.fifthColorUnlocked;
    this.fifthColorGraceRemaining = snapshot.fifthColorGraceRemaining ?? this.fifthColorGraceRemaining;
    this.sixthColorUnlocked = snapshot.sixthColorUnlocked ?? this.sixthColorUnlocked;
    this.sixthColorGraceRemaining = snapshot.sixthColorGraceRemaining ?? this.sixthColorGraceRemaining;
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
