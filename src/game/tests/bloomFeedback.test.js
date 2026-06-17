import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createBloomFeedbackLabel,
  getBloomAnimationOrigins
} from '../core/BloomFeedback.js';

test('Bloom feedback label escalates for counts above 6', () => {
  assert.equal(createBloomFeedbackLabel({ groupsCleared: 1, chainCount: 1, blooms: [{ totalCount: 6 }] }), 'Bloom!');
  assert.equal(createBloomFeedbackLabel({ groupsCleared: 1, chainCount: 1, blooms: [{ totalCount: 7 }] }), 'Bloom x7');
  assert.equal(createBloomFeedbackLabel({ groupsCleared: 1, chainCount: 1, blooms: [{ totalCount: 8 }] }), 'Bloom x8');
});

test('Bloom animation origins use one final target per bloom plan', () => {
  const origins = getBloomAnimationOrigins({
    blooms: [{
      color: 'blue',
      totalCount: 7,
      targetCell: { q: 1, r: 0 },
      cells: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
        { q: 2, r: 0 }
      ]
    }]
  });

  assert.deepEqual(origins, [{ q: 1, r: 0, color: 'blue', totalCount: 7 }]);
});
