import { getBloomStackPlans } from './BloomStackResolver.js';

export function resolveLocalPlacementPreview(board, piece, localAnchor) {
  return createLocalPlacementState(board, piece, localAnchor);
}

export function resolveLocalPlacementDrop(board, piece, localAnchor) {
  return createLocalPlacementState(board, piece, localAnchor);
}

function createLocalPlacementState(board, piece, localAnchor) {
  if (!piece) {
    return createPlacementState({ invalidReason: 'no-piece' });
  }

  if (!localAnchor) {
    return createPlacementState({ invalidReason: 'no-anchor' });
  }

  const targets = getPreviewTargets(board, piece, localAnchor);
  const valid = board.hasCoord(localAnchor) && board.canPlacePiece(piece, localAnchor);
  const stackHints = valid
    ? getBloomStackPlans(board, {
      placedCells: targets,
      anchor: localAnchor
    }).filter((plan) => plan.totalCount > 1)
    : [];

  return createPlacementState({
    valid,
    localAnchor,
    previewAnchor: localAnchor,
    placementAnchor: valid ? localAnchor : null,
    invalidReason: valid ? null : getInvalidReason(board, localAnchor, targets),
    targets,
    stackHints
  });
}

function createPlacementState({
  valid = false,
  localAnchor = null,
  previewAnchor = null,
  placementAnchor = null,
  invalidReason = null,
  targets = [],
  stackHints = []
} = {}) {
  return {
    valid,
    localAnchor,
    previewAnchor,
    placementAnchor,
    invalidReason,
    targets,
    stackHints
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

function getInvalidReason(board, localAnchor, targets) {
  if (!board.hasCoord(localAnchor) || targets.some((target) => !target.exists)) {
    return 'out-of-board';
  }

  if (targets.some((target) => target.blocked)) {
    return 'occupied';
  }

  return 'invalid';
}
