import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createBloomSoundCues,
  createGatherSoundCues,
  createPlacementSoundCues,
  createSoundUnlockCues
} from '../core/SoundFeedback.js';

test('placement sound cue is short and audible', () => {
  const cues = createPlacementSoundCues();

  assert.ok(cues.length >= 2);
  assert.ok(cues.every((cue) => cue.duration <= 0.09));
  assert.ok(cues.some((cue) => cue.gain >= 0.055));
});

test('gather sound cues step through source tile arrivals', () => {
  const cues = createGatherSoundCues({
    gatherPlans: [
      {
        targetCell: { q: 0, r: 0 },
        gatherOrder: [
          { q: 1, r: 0, count: 1 },
          { q: 0, r: 1, count: 1 }
        ]
      }
    ]
  });

  assert.equal(cues.length, 2);
  assert.ok(cues[1].delay > cues[0].delay);
  assert.ok(cues[1].frequency > cues[0].frequency);
});

test('bloom sound cue rewards over-6 blooms without becoming long', () => {
  const normal = createBloomSoundCues({
    gatherPlans: [{ totalCount: 6, willBloom: true }]
  });
  const over = createBloomSoundCues({
    gatherPlans: [{ totalCount: 8, willBloom: true }]
  });

  assert.ok(normal.length >= 3);
  assert.ok(over.length > normal.length);
  assert.ok(Math.max(...over.map((cue) => cue.delay + cue.duration)) <= 0.45);
});

test('sound unlock cue provides a clear toggle confirmation', () => {
  const cues = createSoundUnlockCues();

  assert.ok(cues.length >= 2);
  assert.ok(cues.every((cue) => cue.gain > 0));
});
