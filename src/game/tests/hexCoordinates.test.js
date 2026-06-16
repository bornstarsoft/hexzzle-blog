import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HEX_DIRECTIONS,
  axialKey,
  getHexesInRadius,
  isValidAxial,
  rotateOffsets
} from '../core/HexCoordinates.js';

test('radius 3 honeycomb contains exactly 37 valid axial cells', () => {
  const cells = getHexesInRadius(3);
  const keys = new Set(cells.map(axialKey));

  assert.equal(cells.length, 37);
  assert.equal(keys.size, 37);
  assert.ok(cells.every((cell) => isValidAxial(cell, 3)));
  assert.ok(keys.has('0,0'));
  assert.ok(keys.has('3,0'));
  assert.ok(keys.has('-3,0'));
  assert.ok(!keys.has('4,0'));
});

test('hex directions contain the six axial neighbors', () => {
  assert.deepEqual(HEX_DIRECTIONS, [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 }
  ]);
});

test('rotates piece offsets through six stable variants', () => {
  const variants = rotateOffsets([
    { dq: 0, dr: 0 },
    { dq: 1, dr: 0 },
    { dq: 0, dr: 1 }
  ]);

  assert.equal(variants.length, 6);
  assert.deepEqual(variants[0], [
    { dq: 0, dr: 0 },
    { dq: 1, dr: 0 },
    { dq: 0, dr: 1 }
  ]);
  assert.deepEqual(variants[1], [
    { dq: 0, dr: 0 },
    { dq: 1, dr: -1 },
    { dq: 1, dr: 0 }
  ]);
});
