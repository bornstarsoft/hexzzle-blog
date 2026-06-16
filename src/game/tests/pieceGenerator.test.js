import test from 'node:test';
import assert from 'node:assert/strict';

import { PieceGenerator } from '../core/PieceGenerator.js';

test('generates a tray with 3 pieces using the active color count', () => {
  const generator = new PieceGenerator({
    random: () => 0,
    config: {
      difficulty: {
        startColors: 4,
        addFifthColorAtScore: 1200,
        addSixthColorAtScore: 3500
      }
    }
  });

  const tray = generator.generateTray({ score: 0, placements: 0 });

  assert.equal(tray.length, 3);
  assert.ok(tray.every((piece) => piece.cells.length >= 1 && piece.cells.length <= 3));
  assert.ok(tray.flatMap((piece) => piece.cells).every((cell) => ['red', 'blue', 'yellow', 'green'].includes(cell.color)));
});

test('adds fifth and sixth colors at score thresholds', () => {
  const generator = new PieceGenerator({
    random: () => 0.99,
    config: {
      difficulty: {
        startColors: 4,
        addFifthColorAtScore: 1200,
        addSixthColorAtScore: 3500
      }
    }
  });

  assert.deepEqual(generator.getActiveColors(1199), ['red', 'blue', 'yellow', 'green']);
  assert.deepEqual(generator.getActiveColors(1200), ['red', 'blue', 'yellow', 'green', 'purple']);
  assert.deepEqual(generator.getActiveColors(3500), ['red', 'blue', 'yellow', 'green', 'purple', 'orange']);
});
