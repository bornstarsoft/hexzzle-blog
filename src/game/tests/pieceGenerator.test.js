import test from 'node:test';
import assert from 'node:assert/strict';

import { PieceGenerator } from '../core/PieceGenerator.js';

const TUNED_DIFFICULTY = {
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

test('generates a tray with 3 pieces using the active color count', () => {
  const generator = new PieceGenerator({
    random: () => 0,
    config: {
      difficulty: TUNED_DIFFICULTY
    }
  });

  const tray = generator.generateTray({ score: 0, placements: 0, blooms: 0 });

  assert.equal(tray.length, 3);
  assert.ok(tray.every((piece) => piece.cells.length >= 1 && piece.cells.length <= 3));
  assert.ok(tray.flatMap((piece) => piece.cells).every((cell) => ['red', 'blue', 'yellow', 'green'].includes(cell.color)));
});

test('starts with 4 colors and unlocks the fifth color only after score and bloom thresholds', () => {
  const generator = new PieceGenerator({
    random: () => 0.99,
    config: {
      difficulty: TUNED_DIFFICULTY
    }
  });

  assert.deepEqual(generator.getActiveColors({ score: 0, blooms: 0 }), ['red', 'blue', 'yellow', 'green']);
  assert.deepEqual(generator.getActiveColors({ score: 2999, blooms: 8 }), ['red', 'blue', 'yellow', 'green']);
  assert.deepEqual(generator.getActiveColors({ score: 3000, blooms: 7 }), ['red', 'blue', 'yellow', 'green']);
  assert.deepEqual(generator.getActiveColors({ score: 3000, blooms: 8 }), ['red', 'blue', 'yellow', 'green', 'purple']);
});

test('keeps the sixth color out of normal MVP progression', () => {
  const generator = new PieceGenerator({
    random: () => 0.99,
    config: {
      difficulty: TUNED_DIFFICULTY
    }
  });

  assert.deepEqual(generator.getActiveColors({ score: 50000, blooms: 100 }), ['red', 'blue', 'yellow', 'green', 'purple']);
  assert.deepEqual(generator.getActiveColors({ score: 999999, blooms: 999999 }), ['red', 'blue', 'yellow', 'green', 'purple', 'orange']);
});

test('starts a short small-piece grace period when the fifth color unlocks', () => {
  const generator = new PieceGenerator({
    random: () => 0,
    config: {
      difficulty: {
        ...TUNED_DIFFICULTY,
        fifthColorGraceTrayRefills: 2
      }
    }
  });

  generator.generateTray({ score: 0, placements: 8, blooms: 0 });
  assert.equal(generator.fifthColorUnlocked, false);
  assert.equal(generator.fifthColorGraceRemaining, 0);

  generator.generateTray({ score: 3000, placements: 8, blooms: 8 });
  assert.equal(generator.fifthColorUnlocked, true);
  assert.equal(generator.fifthColorGraceRemaining, 1);

  generator.generateTray({ score: 3200, placements: 9, blooms: 9 });
  assert.equal(generator.fifthColorGraceRemaining, 0);
});

test('weights small pieces higher during the fifth-color grace period', () => {
  const generator = new PieceGenerator({
    config: {
      difficulty: TUNED_DIFFICULTY
    }
  });
  const single = generator.variants.find((variant) => variant.offsets.length === 1);
  const duo = generator.variants.find((variant) => variant.offsets.length === 2);
  const triple = generator.variants.find((variant) => variant.offsets.length === 3);

  assert.ok(generator.getVariantWeight(single, { placements: 8, graceActive: true }) > generator.getVariantWeight(triple, { placements: 8, graceActive: true }));
  assert.ok(generator.getVariantWeight(duo, { placements: 8, graceActive: true }) > generator.getVariantWeight(triple, { placements: 8, graceActive: true }));
});
