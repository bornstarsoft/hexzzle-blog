export const CANONICAL_PLAY_URL = 'https://hexzzle.com/play/';

export function createShareText({
  score,
  totalBlooms,
  bestStack,
  longestGroup,
  overblooms,
  url
}) {
  return [
    'Hexzzle 🐝',
    `Score: ${formatNumber(score)}`,
    `Blooms: ${totalBlooms}`,
    `Best Stack: ${bestStack ?? longestGroup ?? 0}`,
    `Overblooms: ${overblooms ?? 0}`,
    `Play: ${url}`
  ].join('\n');
}

export async function shareResult(stats, navigatorRef = globalThis.navigator) {
  const url = stats.url ?? CANONICAL_PLAY_URL;
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
