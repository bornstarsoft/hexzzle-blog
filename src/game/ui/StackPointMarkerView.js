import { getPieceStackPointMarkers } from '../core/BloomStackResolver.js';

export function getStackPointMarkerCenters(piece, centers) {
  return getPieceStackPointMarkers(piece).map((marker) => {
    const center = centers.find((cell) => cell.index === marker.index);
    if (!center) {
      return null;
    }

    return {
      ...marker,
      x: center.x,
      y: center.y
    };
  }).filter(Boolean);
}

export function drawStackPointMarkers(scene, {
  piece,
  centers,
  size,
  depth = 13,
  alpha = 1,
  group = null
}) {
  const markers = getStackPointMarkerCenters(piece, centers).map((marker) => {
    const text = scene.add.text(
      marker.x + size * 0.32,
      marker.y - size * 0.34,
      marker.label,
      {
        fontFamily: 'Inter, Arial, sans-serif',
        fontSize: `${Math.round(Math.max(14, size * 0.62))}px`,
        fontStyle: '800',
        color: '#ffffff',
        stroke: '#17352e',
        strokeThickness: Math.max(2, Math.round(size * 0.11))
      }
    ).setOrigin(0.5).setDepth(depth).setAlpha(alpha);

    group?.add(text);
    return text;
  });

  return markers;
}
