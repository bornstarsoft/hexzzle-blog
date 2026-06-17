export function getOverbloomCount(totalCount, threshold = 6) {
  return Math.max(0, Number(totalCount || 0) - threshold);
}

export function createBloomFeedbackLabel(result) {
  if (result.chainCount > 1) {
    return `Chain x${result.chainCount}`;
  }

  if (result.groupsCleared > 1) {
    return 'Double Bloom!';
  }

  const bestBloom = getBestBloom(result);
  if (bestBloom?.totalCount > 6) {
    return `Bloom x${bestBloom.totalCount}`;
  }

  return 'Bloom!';
}

export function getBloomAnimationOrigins(result) {
  return (result.blooms ?? []).map((bloom) => {
    const origin = bloom.bloomOrigins?.[0] ?? bloom.targetCell ?? bloom.target ?? bloom.cells?.[0];

    return {
      q: origin.q,
      r: origin.r,
      color: bloom.color,
      totalCount: bloom.totalCount
    };
  }).filter((origin) => Number.isFinite(origin.q) && Number.isFinite(origin.r));
}

function getBestBloom(result) {
  return (result.blooms ?? [])
    .slice()
    .sort((a, b) => (b.totalCount ?? 0) - (a.totalCount ?? 0))[0] ?? null;
}
