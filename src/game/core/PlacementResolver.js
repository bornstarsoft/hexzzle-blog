import { HEX_DIRECTIONS, axialAdd, axialKey } from './HexCoordinates.js';

export function findBestPlacementAnchor(board, piece, preferredAnchor, maxRadius = 2) {
  return resolvePlacementPreview(board, piece, preferredAnchor, maxRadius).placementAnchor;
}

export function resolvePlacementPreview(board, piece, preferredAnchor, maxRadius = 2) {
  if (!piece || !preferredAnchor || !board.hasCoord(preferredAnchor)) {
    return createPreviewState({ previewAnchor: null });
  }

  const candidates = getCandidateAnchors(preferredAnchor, maxRadius)
    .filter((coord) => board.hasCoord(coord));
  const placementAnchor = candidates.find((coord) => board.canPlacePiece(piece, coord)) ?? null;
  const previewAnchor = placementAnchor ?? preferredAnchor;

  return createPreviewState({
    valid: Boolean(placementAnchor),
    placementAnchor,
    previewAnchor,
    targets: getPreviewTargets(board, piece, previewAnchor)
  });
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

function createPreviewState({
  valid = false,
  placementAnchor = null,
  previewAnchor = null,
  targets = []
} = {}) {
  return {
    valid,
    placementAnchor,
    previewAnchor,
    targets
  };
}

function getPreviewTargets(board, piece, anchor) {
  if (!piece || !anchor) {
    return [];
  }

  return board.getTargets(piece, anchor).map((target) => {
    const exists = board.hasCoord(target);
    const empty = exists && board.getCell(target) === null;

    return {
      ...target,
      exists,
      empty,
      blocked: exists && !empty
    };
  });
}
