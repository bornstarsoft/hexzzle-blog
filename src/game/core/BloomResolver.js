import { axialKey } from './HexCoordinates.js';

export class BloomResolver {
  constructor({ threshold = 6, safetyCap = 10 } = {}) {
    this.threshold = threshold;
    this.safetyCap = safetyCap;
  }

  resolve(board) {
    const scans = [];
    let totalCleared = 0;
    let groupsCleared = 0;
    let longestGroup = 0;

    for (let loop = 0; loop < this.safetyCap; loop += 1) {
      const groups = this.findBloomGroups(board);
      if (groups.length === 0) {
        break;
      }

      scans.push(groups.map((group) => ({
        color: group.color,
        cells: group.cells.map((cell) => ({ ...cell }))
      })));

      groups.forEach((group) => {
        group.cells.forEach((coord) => board.clearCell(coord));
        totalCleared += group.cells.length;
        groupsCleared += 1;
        longestGroup = Math.max(longestGroup, group.cells.length);
      });
    }

    return {
      scans,
      totalCleared,
      groupsCleared,
      longestGroup,
      chainCount: scans.length
    };
  }

  findBloomGroups(board) {
    const visited = new Set();
    const bloomGroups = [];

    board.coordinates.forEach((coord) => {
      const key = axialKey(coord);
      const color = board.getCell(coord);

      if (!color || visited.has(key)) {
        return;
      }

      const group = this.floodFill(board, coord, color, visited);
      if (group.length >= this.threshold) {
        bloomGroups.push({ color, cells: group });
      }
    });

    return bloomGroups;
  }

  floodFill(board, start, color, visited) {
    const stack = [start];
    const group = [];

    while (stack.length > 0) {
      const coord = stack.pop();
      const key = axialKey(coord);

      if (visited.has(key) || board.getCell(coord) !== color) {
        continue;
      }

      visited.add(key);
      group.push(coord);

      board.getNeighbors(coord).forEach((neighbor) => {
        if (!visited.has(axialKey(neighbor)) && board.getCell(neighbor) === color) {
          stack.push(neighbor);
        }
      });
    }

    return group;
  }
}
