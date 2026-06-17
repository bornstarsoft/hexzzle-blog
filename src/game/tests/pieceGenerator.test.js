import test from 'node:test';
import assert from 'node:assert/strict';

import { HexBoardModel } from '../core/HexBoardModel.js';
import { PieceGenerator } from '../core/PieceGenerator.js';

const TUNED_DIFFICULTY = {
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

test('generates a tray with exactly 3 pieces using the active color count', () => {
  const generator = createGenerator({ random: () => 0 });
  const tray = generator.generateTray({ score: 0, placements: 0, blooms: 0, emptyCells: 37 });

  assert.equal(tray.length, 3);
  assert.ok(tray.every((piece) => piece.cells.length >= 1 && piece.cells.length <= 3));
  assert.ok(tray.flatMap((piece) => piece.cells).every((cell) => ['red', 'blue', 'yellow', 'green'].includes(cell.color)));
});

test('starts with 4 colors and unlocks the fifth color only after score and bloom thresholds', () => {
  const generator = createGenerator({ random: () => 0.99 });

  assert.deepEqual(generator.getActiveColors({ score: 0, blooms: 0 }), ['red', 'blue', 'yellow', 'green']);
  assert.deepEqual(generator.getActiveColors({ score: 1799, blooms: 3 }), ['red', 'blue', 'yellow', 'green']);
  assert.deepEqual(generator.getActiveColors({ score: 1800, blooms: 2 }), ['red', 'blue', 'yellow', 'green']);
  assert.deepEqual(generator.getActiveColors({ score: 1800, blooms: 3 }), ['red', 'blue', 'yellow', 'green', 'purple']);
});

test('unlocks the sixth color only in late MVP progression', () => {
  const generator = createGenerator({ random: () => 0.99 });

  assert.deepEqual(generator.getActiveColors({ score: 4999, blooms: 10 }), ['red', 'blue', 'yellow', 'green', 'purple']);
  assert.deepEqual(generator.getActiveColors({ score: 5000, blooms: 9 }), ['red', 'blue', 'yellow', 'green', 'purple']);
  assert.deepEqual(generator.getActiveColors({ score: 5000, blooms: 10 }), ['red', 'blue', 'yellow', 'green', 'purple', 'orange']);
});

test('caps active color progression at six colors', () => {
  const generator = createGenerator({
    random: () => 0.99,
    difficulty: {
      startColors: 7,
      maxActiveColors: 6
    }
  });

  assert.deepEqual(generator.getActiveColors({ score: 999999, blooms: 999999 }), ['red', 'blue', 'yellow', 'green', 'purple', 'orange']);
});

test('tutorial phase lasts only the first three tray refills', () => {
  const generator = createGenerator({ random: () => 0.5 });
  const profile = generator.getTrayProfile({ score: 0, placements: 0, blooms: 0, emptyCells: 37 });

  assert.equal(profile.phase, 'tutorial');
  assert.equal(profile.weights.single, 40);
  assert.equal(profile.weights.duo, 45);
  assert.equal(profile.weights.triple, 15);
  assert.equal(profile.minSmallPieces, 2);

  generator.trayRefillCount = 3;
  const challenge = generator.getTrayProfile({ score: 1200, placements: 9, blooms: 2, emptyCells: 30 });

  assert.equal(challenge.phase, 'earlyChallenge');
  assert.equal(challenge.minSmallPieces, 1);
});

test('early trays enforce at least two small pieces', () => {
  const generator = createGenerator({ random: () => 0.99 });
  const tray = generator.generateTray({ score: 0, placements: 0, blooms: 0, emptyCells: 37 });

  assert.ok(countSmallPieces(tray) >= 2);
});

test('early challenge and mid trays enforce at least one small piece', () => {
  const earlyChallenge = createGenerator({ random: () => 0.99 });
  earlyChallenge.trayRefillCount = 4;
  const earlyTray = earlyChallenge.generateTray({ score: 1800, placements: 14, blooms: 3, emptyCells: 25 });

  const mid = createGenerator({ random: () => 0.99 });
  mid.trayRefillCount = 8;
  const midTray = mid.generateTray({ score: 4200, placements: 28, blooms: 8, emptyCells: 22 });

  assert.equal(earlyChallenge.getTrayProfile({ score: 1800, placements: 14, blooms: 3, emptyCells: 25 }).phase, 'earlyChallenge');
  assert.equal(mid.getTrayProfile({ score: 4200, placements: 28, blooms: 8, emptyCells: 22 }).phase, 'mid');
  assert.ok(countSmallPieces(earlyTray) >= 1);
  assert.ok(countSmallPieces(midTray) >= 1);
});

test('early challenge has more triple presence than tutorial', () => {
  const generator = createGenerator({ random: () => 0.5 });
  const tutorial = generator.getTrayProfile({ score: 0, placements: 0, blooms: 0, emptyCells: 37 });
  generator.trayRefillCount = 3;
  const earlyChallenge = generator.getTrayProfile({ score: 1600, placements: 12, blooms: 3, emptyCells: 28 });

  assert.equal(earlyChallenge.phase, 'earlyChallenge');
  assert.ok(earlyChallenge.weights.triple > tutorial.weights.triple);
  assert.equal(earlyChallenge.weights.single, 28);
  assert.equal(earlyChallenge.weights.duo, 44);
  assert.equal(earlyChallenge.weights.triple, 28);
});

test('late trays keep minimum single and duo weights and cap triple weight', () => {
  const generator = createGenerator({ random: () => 0.99 });
  generator.trayRefillCount = 20;
  const profile = generator.getTrayProfile({ score: 8000, placements: 60, blooms: 20, emptyCells: 20 });

  assert.equal(profile.phase, 'late');
  assert.equal(profile.weights.single, 18);
  assert.equal(profile.weights.duo, 37);
  assert.equal(profile.weights.triple, 45);
  assert.equal(profile.minSmallPieces, 1);
});

test('all-triple trays are prevented in MVP', () => {
  const generator = createGenerator({ random: () => 0.99 });
  generator.trayRefillCount = 20;
  const tray = generator.generateTray({ score: 9000, placements: 70, blooms: 22, emptyCells: 20 });

  assert.ok(countTriplePieces(tray) <= 2);
  assert.ok(countSmallPieces(tray) >= 1);
});

test('crowded board increases small piece weighting', () => {
  const generator = createGenerator({ random: () => 0.5 });
  generator.trayRefillCount = 20;

  const normal = generator.getPieceSizeWeights({ phase: 'late', emptyCells: 20 });
  const crowded = generator.getPieceSizeWeights({ phase: 'late', emptyCells: 10 });

  assert.equal(crowded.single, normal.single + 10);
  assert.equal(crowded.duo, normal.duo + 10);
  assert.equal(crowded.triple, normal.triple - 20);
});

test('critical low empty cells force at least two small pieces', () => {
  const generator = createGenerator({ random: () => 0.99 });
  generator.trayRefillCount = 20;
  const tray = generator.generateTray({ score: 9000, placements: 70, blooms: 22, emptyCells: 7 });

  assert.ok(countSmallPieces(tray) >= 2);
});

test('purple unlock grace uses easier weights and reduces triple rate', () => {
  const generator = createGenerator({ random: () => 0.5 });
  generator.trayRefillCount = 20;

  const grace = generator.getTrayProfile({ score: 2500, placements: 25, blooms: 5, emptyCells: 20, gracePhase: 'purpleGrace' });
  const mid = generator.getTrayProfile({ score: 4000, placements: 40, blooms: 9, emptyCells: 20, graceActive: false });

  assert.equal(grace.phase, 'purpleGrace');
  assert.equal(grace.weights.single, 35);
  assert.equal(grace.weights.duo, 45);
  assert.equal(grace.weights.triple, 20);
  assert.ok(grace.weights.triple < mid.weights.triple);
});

test('orange unlock grace uses easier weights and reduces triple rate', () => {
  const generator = createGenerator({ random: () => 0.5 });
  generator.trayRefillCount = 24;

  const grace = generator.getTrayProfile({ score: 7000, placements: 70, blooms: 20, emptyCells: 20, gracePhase: 'orangeGrace' });
  const late = generator.getTrayProfile({ score: 7000, placements: 70, blooms: 20, emptyCells: 20, graceActive: false });

  assert.equal(grace.phase, 'orangeGrace');
  assert.equal(grace.weights.single, 38);
  assert.equal(grace.weights.duo, 44);
  assert.equal(grace.weights.triple, 18);
  assert.ok(grace.weights.triple < late.weights.triple);
});

test('starts a short small-piece grace period when the fifth color unlocks', () => {
  const generator = createGenerator({
    random: () => 0,
    difficulty: {
      purpleGraceTrayCount: 2
    }
  });

  generator.generateTray({ score: 0, placements: 8, blooms: 0, emptyCells: 37 });
  assert.equal(generator.fifthColorUnlocked, false);
  assert.equal(generator.fifthColorGraceRemaining, 0);

  generator.generateTray({ score: 1800, placements: 8, blooms: 3, emptyCells: 28 });
  assert.equal(generator.fifthColorUnlocked, true);
  assert.equal(generator.fifthColorGraceRemaining, 1);

  generator.generateTray({ score: 2200, placements: 9, blooms: 4, emptyCells: 25 });
  assert.equal(generator.fifthColorGraceRemaining, 0);
});

test('starts an orange grace period when the sixth color unlocks', () => {
  const generator = createGenerator({
    random: () => 0,
    difficulty: {
      orangeGraceTrayCount: 2
    }
  });

  generator.generateTray({ score: 1800, placements: 20, blooms: 3, emptyCells: 28 });
  assert.equal(generator.sixthColorUnlocked, false);
  assert.equal(generator.sixthColorGraceRemaining, 0);

  generator.generateTray({ score: 5000, placements: 50, blooms: 10, emptyCells: 24 });
  assert.equal(generator.sixthColorUnlocked, true);
  assert.equal(generator.sixthColorGraceRemaining, 1);

  generator.generateTray({ score: 5400, placements: 52, blooms: 11, emptyCells: 22 });
  assert.equal(generator.sixthColorGraceRemaining, 0);
});

test('orange grace limits new color flooding across a tray', () => {
  const generator = createGenerator({
    random: () => 0,
    difficulty: {
      orangeGraceMaxNewColorPieces: 2
    }
  });

  generator.trayRefillCount = 24;
  const tray = generator.generateTray({ score: 5000, placements: 50, blooms: 10, emptyCells: 24 });
  const orangePieces = tray.filter((piece) => piece.cells.some((cell) => cell.color === 'orange')).length;

  assert.ok(orangePieces <= 2);
});

test('purple grace limits new color flooding across a tray', () => {
  const generator = createGenerator({
    random: () => 0,
    difficulty: {
      purpleGraceMaxNewColorPieces: 2
    }
  });

  generator.trayRefillCount = 18;
  const tray = generator.generateTray({ score: 1800, placements: 30, blooms: 3, emptyCells: 26 });
  const purplePieces = tray.filter((piece) => piece.cells.some((cell) => cell.color === 'purple')).length;

  assert.ok(purplePieces <= 2);
});

test('critical board pressure strongly prefers small pieces', () => {
  const generator = createGenerator({ random: () => 0.99 });
  generator.trayRefillCount = 20;
  const tray = generator.generateTray({ score: 9000, placements: 90, blooms: 20, emptyCells: 5 });
  const weights = generator.getPieceSizeWeights({ phase: 'late', emptyCells: 5 });

  assert.ok(weights.single >= 36);
  assert.ok(weights.duo >= 57);
  assert.ok(weights.triple <= 7);
  assert.ok(countSmallPieces(tray) >= 2);
});

test('generated tray has at least one fitting piece when a small fit is possible', () => {
  const board = createNearlyFullBoard([{ q: 0, r: 0 }]);
  const generator = createGenerator({ random: () => 0.99 });
  generator.trayRefillCount = 20;
  const tray = generator.generateTray({
    score: 9000,
    placements: 90,
    blooms: 20,
    emptyCells: board.getEmptyCellCount(),
    board
  });

  assert.equal(board.getEmptyCellCount(), 1);
  assert.equal(board.hasAnyFit(tray), true);
  assert.ok(tray.some((piece) => piece.cells.length === 1));
});

test('stack opportunity generation can target useful stack colors without guaranteeing Bloom', () => {
  const board = new HexBoardModel(3);
  board.setCell({ q: 0, r: 0 }, { color: 'purple', count: 4 });
  board.setCell({ q: 2, r: -1 }, { color: 'orange', count: 2 });
  const generator = createGenerator({
    random: () => 0,
    difficulty: {
      stackOpportunityChanceMid: 1,
      maxOpportunityPiecesPerTray: 1
    }
  });
  generator.trayRefillCount = 8;
  generator.fifthColorUnlocked = true;
  generator.fifthColorGraceRemaining = 0;
  const tray = generator.generateTray({
    score: 4000,
    placements: 40,
    blooms: 8,
    emptyCells: board.getEmptyCellCount(),
    board
  });
  const opportunityPieces = tray.filter((piece) => piece.cells.some((cell) => cell.color === 'purple'));

  assert.equal(opportunityPieces.length, 1);
  assert.ok(opportunityPieces[0].cells.length <= 2);
});

test('generated trays never use a seventh color', () => {
  const generator = createGenerator({ random: () => 0.99 });
  generator.trayRefillCount = 30;
  const tray = generator.generateTray({ score: 50000, placements: 200, blooms: 80, emptyCells: 20 });
  const colors = new Set(tray.flatMap((piece) => piece.cells.map((cell) => cell.color)));

  assert.ok(colors.size <= 6);
  assert.ok([...colors].every((color) => ['red', 'blue', 'yellow', 'green', 'purple', 'orange'].includes(color)));
});

function createGenerator({ random = Math.random, difficulty = {} } = {}) {
  return new PieceGenerator({
    random,
    config: {
      difficulty: {
        ...TUNED_DIFFICULTY,
        ...difficulty
      }
    }
  });
}

function countSmallPieces(tray) {
  return tray.filter((piece) => piece.cells.length <= 2).length;
}

function countTriplePieces(tray) {
  return tray.filter((piece) => piece.cells.length === 3).length;
}

function createNearlyFullBoard(emptyCoords = []) {
  const board = new HexBoardModel(3);
  const emptyKeys = new Set(emptyCoords.map((coord) => `${coord.q},${coord.r}`));

  board.coordinates.forEach((coord, index) => {
    if (!emptyKeys.has(`${coord.q},${coord.r}`)) {
      board.setCell(coord, { color: index % 2 === 0 ? 'red' : 'blue', count: 1 });
    }
  });

  return board;
}
