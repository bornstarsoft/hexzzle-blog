import { HEX_DIRECTIONS, axialAdd, axialKey, getHexesInRadius } from './HexCoordinates.js';

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

  setCell(coord, color) {
    const key = axialKey(coord);
    if (!this.cells.has(key)) {
      throw new Error(`Invalid board coordinate: ${key}`);
    }
    this.cells.set(key, color);
  }

  clearCell(coord) {
    this.setCell(coord, null);
  }

  isEmpty(coord) {
    return this.hasCoord(coord) && this.getCell(coord) === null;
  }

  getTargets(piece, anchor) {
    return piece.cells.map((cell) => ({
      q: anchor.q + cell.dq,
      r: anchor.r + cell.dr,
      color: cell.color
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
      this.setCell(target, target.color);
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
      color: this.getCell(coord)
    }));
  }
}
