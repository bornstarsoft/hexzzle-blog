import { axialKey } from './HexCoordinates.js';

const DEFAULT_THRESHOLD = 6;

export class BloomStackResolver {
  constructor({ threshold = DEFAULT_THRESHOLD } = {}) {
    this.threshold = threshold;
  }

  plan(board, { placedCells = [], anchor = null } = {}) {
    return createBloomStackResolution(board, {
      placedCells,
      anchor,
      threshold: this.threshold
    });
  }

  apply(board, resolution) {
    applyBloomStackResolution(board, resolution);
    return resolution;
  }

  resolve(board, { placedCells = [], anchor = null } = {}) {
    return this.apply(board, this.plan(board, { placedCells, anchor }));
  }
}

export function createBloomStackResolution(board, { placedCells = [], anchor = null, threshold = DEFAULT_THRESHOLD } = {}) {
  const plans = getBloomStackPlans(board, {
    placedCells,
    anchor,
    threshold
  });
  const merges = plans.filter((plan) => plan.action === 'merge' && (plan.cells.length > 1 || plan.totalCount > 1));
  const blooms = plans.filter((plan) => plan.action === 'bloom');
  const gatherPlans = plans.filter((plan) => plan.sourceCells.length > 1 || plan.totalCount > 1);
  const longestGroup = Math.max(0, ...plans.map((plan) => plan.totalCount));

  return {
    plans,
    gatherPlans,
    merges,
    blooms,
    scans: blooms.length > 0 ? [blooms] : [],
    totalCleared: blooms.reduce((sum, bloom) => sum + bloom.totalCount, 0),
    groupsCleared: blooms.length,
    longestGroup,
    chainCount: blooms.length > 0 ? 1 : 0
  };
}

export function applyBloomStackResolution(board, resolution) {
  resolution.plans.forEach((plan) => {
    if (plan.action === 'bloom') {
      plan.cells.forEach((coord) => board.clearCell(coord));
      return;
    }

    if (plan.cells.length <= 1 && plan.totalCount <= 1) {
      return;
    }

    board.setCell(plan.target, {
      color: plan.color,
      count: plan.totalCount
    });
    plan.cells.forEach((coord) => {
      if (!isSameCoord(coord, plan.target)) {
        board.clearCell(coord);
      }
    });
  });
}

export function getBloomStackPlans(board, { placedCells = [], anchor = null, threshold = DEFAULT_THRESHOLD } = {}) {
  const orderedPlacedCells = placedCells
    .filter((cell) => board.hasCoord(cell))
    .map((cell, index) => ({ ...cell, index, count: 1 }));
  const placedByKey = new Map(orderedPlacedCells.map((cell) => [axialKey(cell), cell]));
  const resolvedComponents = new Set();
  const plans = [];

  orderedPlacedCells.forEach((placedCell) => {
    const component = floodFillColorComponent(board, placedCell, placedCell.color, placedByKey);
    const componentKey = getComponentKey(component.cells);

    if (resolvedComponents.has(componentKey)) {
      return;
    }

    resolvedComponents.add(componentKey);
    const target = stripCoord(chooseMergeTarget(component.cells, {
      board,
      placedCells: orderedPlacedCells,
      placedByKey,
      anchor
    }));
    const totalCount = component.cells.reduce((sum, coord) => sum + getCellCount(board, coord, placedByKey), 0);
    const sourceCells = orderSourceCells(component.cells, target, board, placedByKey).map((coord) => ({
      ...stripCoord(coord),
      color: placedCell.color,
      count: getCellCount(board, coord, placedByKey),
      placed: placedByKey.has(axialKey(coord)),
      stackPoint: Boolean(placedByKey.get(axialKey(coord))?.stackPoint)
    }));

    plans.push({
      action: totalCount >= threshold ? 'bloom' : 'merge',
      color: placedCell.color,
      cells: component.cells,
      target,
      targetCell: target,
      sourceCells,
      sourceCounts: sourceCells.map((cell) => cell.count),
      totalCount,
      threshold,
      willBloom: totalCount >= threshold,
      placedCells: component.cells.filter((coord) => placedByKey.has(axialKey(coord))),
      hint: totalCount >= threshold ? 'Bloom!' : `${totalCount}/${threshold}`
    });
  });

  return plans;
}

export function getPieceStackPointMarkers(piece) {
  const counts = new Map();
  const firstIndexByColor = new Map();

  piece?.cells?.forEach((cell, index) => {
    counts.set(cell.color, (counts.get(cell.color) ?? 0) + 1);
    if (!firstIndexByColor.has(cell.color)) {
      firstIndexByColor.set(cell.color, index);
    }
  });

  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .slice(0, 2)
    .map(([color, count]) => ({
      color,
      count,
      index: firstIndexByColor.get(color),
      label: '+'
    }));
}

export function chooseMergeTarget(cells, { board, placedCells = [], placedByKey = new Map(), anchor = null } = {}) {
  const placedInComponent = placedCells.filter((placedCell) => (
    cells.some((coord) => isSameCoord(coord, placedCell))
  ));
  const stackPointInComponent = placedInComponent.filter((placedCell) => placedCell.stackPoint);

  if (stackPointInComponent.length > 0) {
    return stackPointInComponent
      .slice()
      .sort((a, b) => {
        const distanceDelta = axialDistance(a, anchor) - axialDistance(b, anchor);
        return distanceDelta || a.index - b.index;
      })[0];
  }

  if (placedInComponent.length > 0) {
    return placedInComponent
      .slice()
      .sort((a, b) => {
        const distanceDelta = axialDistance(a, anchor) - axialDistance(b, anchor);
        return distanceDelta || a.index - b.index;
      })[0];
  }

  return cells
    .slice()
    .sort((a, b) => {
      const countDelta = getCellCount(board, b, placedByKey) - getCellCount(board, a, placedByKey);
      return countDelta || axialKey(a).localeCompare(axialKey(b));
    })[0];
}

function floodFillColorComponent(board, start, color, placedByKey) {
  const stack = [start];
  const visited = new Set();
  const cells = [];

  while (stack.length > 0) {
    const coord = stack.pop();
    const key = axialKey(coord);

    if (visited.has(key) || getCellColor(board, coord, placedByKey) !== color) {
      continue;
    }

    visited.add(key);
    cells.push({ q: coord.q, r: coord.r });

    board.getNeighbors(coord).forEach((neighbor) => {
      if (!visited.has(axialKey(neighbor)) && getCellColor(board, neighbor, placedByKey) === color) {
        stack.push(neighbor);
      }
    });
  }

  return { color, cells };
}

function getCellColor(board, coord, placedByKey) {
  const placed = placedByKey.get(axialKey(coord));
  return placed?.color ?? board.getCellColor(coord);
}

function getCellCount(board, coord, placedByKey) {
  const placed = placedByKey.get(axialKey(coord));
  return placed ? 1 : board.getCellCount(coord);
}

function getComponentKey(cells) {
  return cells.map((cell) => axialKey(cell)).sort().join('|');
}

function orderSourceCells(cells, target, board, placedByKey) {
  return cells
    .slice()
    .sort((a, b) => {
      const targetDelta = Number(!isSameCoord(a, target)) - Number(!isSameCoord(b, target));
      const stackDelta = Number(!placedByKey.get(axialKey(a))?.stackPoint) - Number(!placedByKey.get(axialKey(b))?.stackPoint);
      const placedDelta = Number(!placedByKey.has(axialKey(a))) - Number(!placedByKey.has(axialKey(b)));
      const countDelta = getCellCount(board, b, placedByKey) - getCellCount(board, a, placedByKey);

      return targetDelta || stackDelta || placedDelta || countDelta || axialKey(a).localeCompare(axialKey(b));
    });
}

function axialDistance(a, b) {
  if (!a || !b) {
    return Number.MAX_SAFE_INTEGER;
  }

  const as = -a.q - a.r;
  const bs = -b.q - b.r;

  return Math.max(
    Math.abs(a.q - b.q),
    Math.abs(a.r - b.r),
    Math.abs(as - bs)
  );
}

function isSameCoord(a, b) {
  return Boolean(a && b && a.q === b.q && a.r === b.r);
}

function stripCoord(coord) {
  return { q: coord.q, r: coord.r };
}
