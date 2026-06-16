export function createShareText({
  score,
  totalBlooms,
  bestChain,
  longestGroup,
  url
}) {
  return [
    'Hexzzle 🐝',
    `Score: ${formatNumber(score)}`,
    `Blooms: ${totalBlooms}`,
    `Best Chain: x${bestChain}`,
    `Best Group: ${longestGroup}`,
    '🌸🌸🌸🌸⬡',
    `Play: ${url}`
  ].join('\n');
}

export async function shareResult(stats, navigatorRef = globalThis.navigator) {
  const url = stats.url ?? globalThis.location?.href ?? 'https://hexzzle.com/play/';
  const text = createShareText({ ...stats, url });
  const shareData = {
    title: 'Hexzzle',
    text,
    url
  };

  if (navigatorRef?.share) {
    await navigatorRef.share(shareData);
    return { method: 'web-share', text };
  }

  await navigatorRef?.clipboard?.writeText(text);
  return { method: 'clipboard', text };
}

function formatNumber(value) {
  return Number(value).toLocaleString('en-US');
}
