import { HEX_DIRECTIONS, axialAdd, axialKey } from './HexCoordinates.js';

export function findBestPlacementAnchor(board, piece, preferredAnchor, maxRadius = 2) {
  if (!piece || !preferredAnchor || !board.hasCoord(preferredAnchor)) {
    return null;
  }

  const candidates = getCandidateAnchors(preferredAnchor, maxRadius)
    .filter((coord) => board.hasCoord(coord));

  return candidates.find((coord) => board.canPlacePiece(piece, coord)) ?? null;
}

export function getCandidateAnchors(center, maxRadius = 2) {
  const seen = new Set();
  const candidates = [];
  const queue = [{ coord: center, distance: 0 }];

  while (queue.length > 0) {
    const item = queue.shift();
    const key = axialKey(item.coord);

    if (seen.has(key) || item.distance > maxRadius) {
      continue;
    }

    seen.add(key);
    candidates.push(item.coord);

    if (item.distance === maxRadius) {
      continue;
    }

    HEX_DIRECTIONS.forEach((direction) => {
      queue.push({
        coord: axialAdd(item.coord, direction),
        distance: item.distance + 1
      });
    });
  }

  return candidates;
}
