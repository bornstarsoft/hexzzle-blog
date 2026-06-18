import test from 'node:test';
import assert from 'node:assert/strict';

import { TILE_COLORS } from '../core/ColorPalette.js';

function toRgb(color) {
  return {
    r: (color >> 16) & 255,
    g: (color >> 8) & 255,
    b: color & 255
  };
}

function colorDistance(a, b) {
  const left = toRgb(a);
  const right = toRgb(b);
  return Math.hypot(left.r - right.r, left.g - right.g, left.b - right.b);
}

test('orange is clearly distinct from yellow in the shared tile palette', () => {
  assert.notEqual(TILE_COLORS.orange, TILE_COLORS.yellow);
  assert.ok(colorDistance(TILE_COLORS.orange, TILE_COLORS.yellow) >= 90);

  const orange = toRgb(TILE_COLORS.orange);
  const yellow = toRgb(TILE_COLORS.yellow);
  assert.ok(orange.r > orange.g);
  assert.ok(orange.r > yellow.r - 20);
  assert.ok(orange.g < yellow.g - 60);
  assert.ok(orange.b < yellow.b);
});

test('shared tile palette exposes every playable color', () => {
  assert.deepEqual(Object.keys(TILE_COLORS), ['red', 'blue', 'yellow', 'green', 'purple', 'orange']);
});
