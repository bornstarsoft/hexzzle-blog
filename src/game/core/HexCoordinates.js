export const HEX_DIRECTIONS = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 }
];

export function axialKey({ q, r }) {
  return `${q},${r}`;
}

export function axialAdd(a, b) {
  return {
    q: a.q + (b.q ?? b.dq ?? 0),
    r: a.r + (b.r ?? b.dr ?? 0)
  };
}

export function isValidAxial({ q, r }, radius = 3) {
  const s = -q - r;
  return Math.max(Math.abs(q), Math.abs(r), Math.abs(s)) <= radius;
}

export function getHexesInRadius(radius = 3) {
  const cells = [];

  for (let q = -radius; q <= radius; q += 1) {
    for (let r = -radius; r <= radius; r += 1) {
      const coord = { q, r };
      if (isValidAxial(coord, radius)) {
        cells.push(coord);
      }
    }
  }

  return cells;
}

export function axialToPixel({ q, r }, size) {
  return {
    x: size * Math.sqrt(3) * (q + r / 2),
    y: size * 1.5 * r
  };
}

export function pixelToAxial({ x, y }, size) {
  const q = (Math.sqrt(3) / 3 * x - 1 / 3 * y) / size;
  const r = (2 / 3 * y) / size;
  return roundAxial({ q, r });
}

export function roundAxial({ q, r }) {
  let cubeQ = q;
  let cubeR = r;
  let cubeS = -q - r;

  let roundedQ = Math.round(cubeQ);
  let roundedR = Math.round(cubeR);
  let roundedS = Math.round(cubeS);

  const qDiff = Math.abs(roundedQ - cubeQ);
  const rDiff = Math.abs(roundedR - cubeR);
  const sDiff = Math.abs(roundedS - cubeS);

  if (qDiff > rDiff && qDiff > sDiff) {
    roundedQ = -roundedR - roundedS;
  } else if (rDiff > sDiff) {
    roundedR = -roundedQ - roundedS;
  } else {
    roundedS = -roundedQ - roundedR;
  }

  return { q: roundedQ, r: roundedR };
}

export function rotateOffset(offset) {
  return {
    dq: cleanZero(offset.dq + offset.dr),
    dr: cleanZero(-offset.dq)
  };
}

export function rotateOffsets(offsets) {
  const variants = [];
  let current = offsets.map((offset) => ({ ...offset }));

  for (let i = 0; i < 6; i += 1) {
    variants.push(current.map((offset) => ({ ...offset })));
    current = current.map(rotateOffset);
  }

  return variants;
}

export function normalizeOffsets(offsets) {
  const minQ = Math.min(...offsets.map((offset) => offset.dq));
  const minR = Math.min(...offsets.map((offset) => offset.dr));

  return offsets
    .map((offset) => ({
      ...offset,
      dq: offset.dq - minQ,
      dr: offset.dr - minR
    }))
    .sort((a, b) => (a.dq - b.dq) || (a.dr - b.dr));
}

function cleanZero(value) {
  return Object.is(value, -0) ? 0 : value;
}
