import { HEX_DIRECTIONS, axialAdd, axialKey } from './HexCoordinates.js';

export function findBestPlacementAnchor(board, piece, preferredAnchor, maxRadius = 2) {
  if (!piece || !preferredAnchor || !board.hasCoord(preferredAnchor)) {
    return null;
  }

  return getCandidateAnchors(preferredAnchor, maxRadius)
    .filter((coord) => board.hasCoord(coord))
    .find((coord) => board.canPlacePiece(piece, coord)) ?? null;
}

export function resolvePlacementPreview(board, piece, preferredAnchor) {
  if (!piece || !preferredAnchor || !board.hasCoord(preferredAnchor)) {
    return createPreviewState({ invalidReason: 'no-anchor' });
  }

  const targets = getPreviewTargets(board, piece, preferredAnchor);
  const valid = board.canPlacePiece(piece, preferredAnchor);

  return createPreviewState({
    valid,
    placementAnchor: valid ? preferredAnchor : null,
    candidateAnchor: preferredAnchor,
    previewAnchor: preferredAnchor,
    invalidReason: valid ? null : getInvalidReason(targets),
    targets
  });
}

export function resolveReleasePlacementAnchor(
  board,
  piece,
  preview,
  { fallbackAnchor = null, maxRadius = 1 } = {}
) {
  if (preview?.valid) {
    return preview.placementAnchor;
  }

  if (preview?.invalidReason === 'blocked' || preview?.invalidReason === 'out-of-board') {
    return null;
  }

  const localAnchor = preview?.candidateAnchor ?? fallbackAnchor;
  if (!localAnchor) {
    return null;
  }

  return findBestPlacementAnchor(board, piece, localAnchor, maxRadius);
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
  candidateAnchor = null,
  previewAnchor = null,
  invalidReason = null,
  targets = []
} = {}) {
  return {
    valid,
    placementAnchor,
    candidateAnchor,
    previewAnchor,
    invalidReason,
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

function getInvalidReason(targets) {
  if (targets.some((target) => target.blocked)) {
    return 'blocked';
  }

  if (targets.some((target) => !target.exists)) {
    return 'out-of-board';
  }

  return 'invalid';
}
