import { HEX_DIRECTIONS, axialAdd, axialKey, getHexesInRadius } from './HexCoordinates.js';
import { getPieceStackPointMarkers } from './BloomStackResolver.js';
import { getPieceAxialOffsetsFromAnchor } from './PieceVisualGeometry.js';

export class HexBoardModel {
  constructor(radius = 3) {
    this.radius = radius;
    this.coordinates = getHexesInRadius(radius);
    this.cells = new Map(this.coordinates.map((coord) => [axialKey(coord), null]));
  }

  hasCoord(coord) {
    return this.cells.has(axialKey(coord));
  }

  getCell(coord) {
    return this.cells.get(axialKey(coord)) ?? null;
  }

  getCellColor(coord) {
    return this.getCell(coord)?.color ?? null;
  }

  getCellCount(coord) {
    return this.getCell(coord)?.count ?? 0;
  }

  setCell(coord, value) {
    const key = axialKey(coord);
    if (!this.cells.has(key)) {
      throw new Error(`Invalid board coordinate: ${key}`);
    }
    this.cells.set(key, normalizeCellValue(value));
  }

  clearCell(coord) {
    this.setCell(coord, null);
  }

  isEmpty(coord) {
    return this.hasCoord(coord) && this.getCell(coord) === null;
  }

  getTargets(piece, anchor) {
    const stackPointIndexes = new Set(getPieceStackPointMarkers(piece).map((marker) => marker.index));

    return getPieceAxialOffsetsFromAnchor(piece).map((offset) => ({
      q: anchor.q + offset.dq,
      r: anchor.r + offset.dr,
      color: offset.color,
      pieceCellIndex: offset.index,
      stackPoint: stackPointIndexes.has(offset.index)
    }));
  }

  canPlacePiece(piece, anchor) {
    return this.getTargets(piece, anchor).every((target) => (
      this.hasCoord(target) && this.getCell(target) === null
    ));
  }

  placePiece(piece, anchor) {
    if (!this.canPlacePiece(piece, anchor)) {
      return false;
    }

    this.getTargets(piece, anchor).forEach((target) => {
      this.setCell(target, { color: target.color, count: 1 });
    });

    return true;
  }

  getNeighbors(coord) {
    return HEX_DIRECTIONS
      .map((direction) => axialAdd(coord, direction))
      .filter((neighbor) => this.hasCoord(neighbor));
  }

  hasAnyFit(tray) {
    return tray.filter(Boolean).some((piece) => (
      this.coordinates.some((coord) => this.canPlacePiece(piece, coord))
    ));
  }

  getEmptyCellCount() {
    return this.coordinates.reduce((count, coord) => (
      this.getCell(coord) === null ? count + 1 : count
    ), 0);
  }

  snapshot() {
    return {
      radius: this.radius,
      cells: Array.from(this.cells.entries())
    };
  }

  restore(snapshot) {
    this.radius = snapshot.radius;
    this.coordinates = getHexesInRadius(snapshot.radius);
    this.cells = new Map(snapshot.cells);
  }

  toJSON() {
    return this.coordinates.map((coord) => ({
      ...coord,
      color: this.getCellColor(coord),
      count: this.getCellCount(coord)
    }));
  }
}

function normalizeCellValue(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return { color: value, count: 1 };
  }

  return {
    color: value.color,
    count: Math.max(1, Number(value.count) || 1)
  };
}
