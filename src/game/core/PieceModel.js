export function createPiece({ id, name, cells }) {
  return {
    id,
    name,
    cells: cells.map((cell) => ({
      dq: cell.dq,
      dr: cell.dr,
      color: cell.color
    }))
  };
}

export function clonePiece(piece) {
  return createPiece(piece);
}

export function cloneTray(tray) {
  return tray.map(clonePiece);
}
