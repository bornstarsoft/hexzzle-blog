import test from 'node:test';
import assert from 'node:assert/strict';

import { getStackPointMarkerCenters } from '../ui/StackPointMarkerView.js';

test('stack point marker centers attach plus markers to matching piece cells', () => {
  const piece = {
    cells: [
      { color: 'red' },
      { color: 'blue' },
      { color: 'red' }
    ]
  };
  const centers = [
    { index: 0, x: 10, y: 20 },
    { index: 1, x: 30, y: 20 },
    { index: 2, x: 50, y: 20 }
  ];

  assert.deepEqual(getStackPointMarkerCenters(piece, centers), [{
    color: 'red',
    count: 2,
    index: 0,
    label: '+',
    x: 10,
    y: 20
  }]);
});
