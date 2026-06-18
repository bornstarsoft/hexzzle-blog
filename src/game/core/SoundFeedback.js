const DEFAULT_GAIN = 0.065;

export function createSoundUnlockCues() {
  return [
    createCue({ frequency: 520, duration: 0.045, gain: 0.05, type: 'triangle' }),
    createCue({ frequency: 720, duration: 0.055, delay: 0.045, gain: 0.052, type: 'sine' })
  ];
}

export function createPlacementSoundCues() {
  return [
    createCue({ frequency: 390, duration: 0.04, gain: 0.058, type: 'triangle' }),
    createCue({ frequency: 560, duration: 0.055, delay: 0.035, gain: 0.066, type: 'sine' })
  ];
}

export function createInvalidSoundCues() {
  return [
    createCue({ frequency: 190, duration: 0.035, gain: 0.018, type: 'sine' })
  ];
}

export function createGatherSoundCues(result) {
  const sources = (result?.gatherPlans ?? []).flatMap((plan, planIndex) => (
    (plan.gatherOrder ?? [])
      .filter((source) => !isSameCoord(source, plan.targetCell ?? plan.target))
      .map((source, sourceIndex) => ({
        planIndex,
        sourceIndex,
        count: source.count ?? 1
      }))
  ));

  return sources.map((source, order) => createCue({
    frequency: 500 + Math.min(order, 8) * 34 + Math.min(source.count - 1, 4) * 18,
    duration: 0.038,
    delay: 0.035 + source.planIndex * 0.035 + source.sourceIndex * 0.06,
    gain: 0.044,
    type: 'triangle'
  }));
}

export function createBloomSoundCues(result) {
  const bestCount = Math.max(0, ...(result?.gatherPlans ?? [])
    .filter((plan) => plan.willBloom)
    .map((plan) => plan.totalCount ?? 0));
  const over = Math.max(0, bestCount - 6);
  const cues = [
    createCue({ frequency: 620, duration: 0.075, gain: 0.07, type: 'triangle' }),
    createCue({ frequency: 840, duration: 0.09, delay: 0.065, gain: 0.064, type: 'sine' }),
    createCue({ frequency: 1040, duration: 0.115, delay: 0.135, gain: 0.058, type: 'sine' })
  ];

  for (let index = 0; index < Math.min(over, 3); index += 1) {
    cues.push(createCue({
      frequency: 1180 + index * 120,
      duration: 0.055,
      delay: 0.225 + index * 0.045,
      gain: 0.042,
      type: 'triangle'
    }));
  }

  return cues;
}

function createCue({ frequency, duration, delay = 0, gain = DEFAULT_GAIN, type = 'sine' }) {
  return {
    frequency,
    duration,
    delay,
    gain,
    type
  };
}

function isSameCoord(a, b) {
  return Boolean(a && b && a.q === b.q && a.r === b.r);
}
