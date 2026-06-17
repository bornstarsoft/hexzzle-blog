import test from 'node:test';
import assert from 'node:assert/strict';

import { PieceGenerator } from '../core/PieceGenerator.js';

const TUNED_DIFFICULTY = {
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
  assert.deepEqual(generator.getActiveColors({ score: 2999, blooms: 8 }), ['red', 'blue', 'yellow', 'green']);
  assert.deepEqual(generator.getActiveColors({ score: 3000, blooms: 7 }), ['red', 'blue', 'yellow', 'green']);
  assert.deepEqual(generator.getActiveColors({ score: 3000, blooms: 8 }), ['red', 'blue', 'yellow', 'green', 'purple']);
});

test('keeps the sixth color out of normal MVP progression', () => {
  const generator = createGenerator({ random: () => 0.99 });

  assert.deepEqual(generator.getActiveColors({ score: 50000, blooms: 100 }), ['red', 'blue', 'yellow', 'green', 'purple']);
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
  assert.equal(profile.weights.single, 20);
  assert.equal(profile.weights.duo, 35);
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

  const grace = generator.getTrayProfile({ score: 4000, placements: 40, blooms: 9, emptyCells: 20, graceActive: true });
  const mid = generator.getTrayProfile({ score: 4000, placements: 40, blooms: 9, emptyCells: 20, graceActive: false });

  assert.equal(grace.phase, 'purpleGrace');
  assert.equal(grace.weights.single, 35);
  assert.equal(grace.weights.duo, 45);
  assert.equal(grace.weights.triple, 20);
  assert.ok(grace.weights.triple < mid.weights.triple);
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

  generator.generateTray({ score: 3000, placements: 8, blooms: 8, emptyCells: 28 });
  assert.equal(generator.fifthColorUnlocked, true);
  assert.equal(generator.fifthColorGraceRemaining, 1);

  generator.generateTray({ score: 3200, placements: 9, blooms: 9, emptyCells: 25 });
  assert.equal(generator.fifthColorGraceRemaining, 0);
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
