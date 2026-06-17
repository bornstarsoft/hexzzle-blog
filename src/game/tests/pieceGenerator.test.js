import test from 'node:test';
import assert from 'node:assert/strict';

import { PieceGenerator } from '../core/PieceGenerator.js';

const TUNED_DIFFICULTY = {
  startColors: 4,
  addFifthColorAtScore: 2200,
  addFifthColorAfterBlooms: 5,
  addSixthColorAtScore: 6500,
  addSixthColorAfterBlooms: 18,
  maxActiveColors: 6,
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
  lateMinSingleWeight: 24,
  lateMinDuoWeight: 40,
  lateMaxTripleWeight: 36,
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
  crowdedSingleBoost: 10,
  crowdedDuoBoost: 10,
  crowdedTriplePenalty: 20,
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
  assert.deepEqual(generator.getActiveColors({ score: 2199, blooms: 5 }), ['red', 'blue', 'yellow', 'green']);
  assert.deepEqual(generator.getActiveColors({ score: 2200, blooms: 4 }), ['red', 'blue', 'yellow', 'green']);
  assert.deepEqual(generator.getActiveColors({ score: 2200, blooms: 5 }), ['red', 'blue', 'yellow', 'green', 'purple']);
});

test('unlocks the sixth color only in late MVP progression', () => {
  const generator = createGenerator({ random: () => 0.99 });

  assert.deepEqual(generator.getActiveColors({ score: 6499, blooms: 18 }), ['red', 'blue', 'yellow', 'green', 'purple']);
  assert.deepEqual(generator.getActiveColors({ score: 6500, blooms: 17 }), ['red', 'blue', 'yellow', 'green', 'purple']);
  assert.deepEqual(generator.getActiveColors({ score: 6500, blooms: 18 }), ['red', 'blue', 'yellow', 'green', 'purple', 'orange']);
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

test('first tray phase heavily favors single and duo pieces', () => {
  const generator = createGenerator({ random: () => 0.5 });
  const profile = generator.getTrayProfile({ score: 0, placements: 0, blooms: 0, emptyCells: 37 });

  assert.equal(profile.phase, 'early');
  assert.equal(profile.weights.single, 45);
  assert.equal(profile.weights.duo, 45);
  assert.equal(profile.weights.triple, 10);
  assert.equal(profile.minSmallPieces, 2);
});

test('early trays enforce at least two small pieces', () => {
  const generator = createGenerator({ random: () => 0.99 });
  const tray = generator.generateTray({ score: 0, placements: 0, blooms: 0, emptyCells: 37 });

  assert.ok(countSmallPieces(tray) >= 2);
});

test('growth and mid trays enforce at least one small piece', () => {
  const growth = createGenerator({ random: () => 0.99 });
  growth.trayRefillCount = 8;
  const growthTray = growth.generateTray({ score: 1600, placements: 18, blooms: 4, emptyCells: 25 });

  const mid = createGenerator({ random: () => 0.99 });
  mid.trayRefillCount = 12;
  const midTray = mid.generateTray({ score: 3600, placements: 28, blooms: 10, emptyCells: 22 });

  assert.equal(growth.getTrayProfile({ score: 1600, placements: 18, blooms: 4, emptyCells: 25 }).phase, 'growth');
  assert.equal(mid.getTrayProfile({ score: 3600, placements: 28, blooms: 10, emptyCells: 22 }).phase, 'mid');
  assert.ok(countSmallPieces(growthTray) >= 1);
  assert.ok(countSmallPieces(midTray) >= 1);
});

test('late trays keep minimum single and duo weights and cap triple weight', () => {
  const generator = createGenerator({ random: () => 0.99 });
  generator.trayRefillCount = 20;
  const profile = generator.getTrayProfile({ score: 8000, placements: 60, blooms: 20, emptyCells: 20 });

  assert.equal(profile.phase, 'late');
  assert.equal(profile.weights.single, 24);
  assert.equal(profile.weights.duo, 40);
  assert.equal(profile.weights.triple, 36);
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

  const grace = generator.getTrayProfile({ score: 4000, placements: 40, blooms: 9, emptyCells: 20, gracePhase: 'purpleGrace' });
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

  generator.generateTray({ score: 2200, placements: 8, blooms: 5, emptyCells: 28 });
  assert.equal(generator.fifthColorUnlocked, true);
  assert.equal(generator.fifthColorGraceRemaining, 1);

  generator.generateTray({ score: 2400, placements: 9, blooms: 6, emptyCells: 25 });
  assert.equal(generator.fifthColorGraceRemaining, 0);
});

test('starts an orange grace period when the sixth color unlocks', () => {
  const generator = createGenerator({
    random: () => 0,
    difficulty: {
      orangeGraceTrayCount: 2
    }
  });

  generator.generateTray({ score: 2200, placements: 20, blooms: 5, emptyCells: 28 });
  assert.equal(generator.sixthColorUnlocked, false);
  assert.equal(generator.sixthColorGraceRemaining, 0);

  generator.generateTray({ score: 6500, placements: 50, blooms: 18, emptyCells: 24 });
  assert.equal(generator.sixthColorUnlocked, true);
  assert.equal(generator.sixthColorGraceRemaining, 1);

  generator.generateTray({ score: 6900, placements: 52, blooms: 19, emptyCells: 22 });
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
  const tray = generator.generateTray({ score: 6500, placements: 50, blooms: 18, emptyCells: 24 });
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
  const tray = generator.generateTray({ score: 2200, placements: 30, blooms: 5, emptyCells: 26 });
  const purplePieces = tray.filter((piece) => piece.cells.some((cell) => cell.color === 'purple')).length;

  assert.ok(purplePieces <= 2);
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
