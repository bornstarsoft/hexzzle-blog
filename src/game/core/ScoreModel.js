export const DEFAULT_SCORE_CONFIG = {
  placeCell: 1,
  bloomBase: 100,
  extraCellBonus: 25,
  multiBloomBonus: 75,
  chainMultiplierStep: 0.5,
  maxChainMultiplier: 2
};

export class ScoreModel {
  constructor(config = DEFAULT_SCORE_CONFIG) {
    this.config = { ...DEFAULT_SCORE_CONFIG, ...config };
    this.score = 0;
    this.totalBlooms = 0;
    this.bestChain = 0;
    this.longestGroup = 0;
  }

  addPlacement(cellCount) {
    const points = cellCount * this.config.placeCell;
    this.score += points;
    return points;
  }

  addBloomResult(result) {
    let points = 0;

    result.scans.forEach((groups, scanIndex) => {
      const chainMultiplier = Math.min(
        1 + scanIndex * this.config.chainMultiplierStep,
        this.config.maxChainMultiplier
      );
      const multiBonus = Math.max(0, groups.length - 1) * this.config.multiBloomBonus;
      const scanPoints = groups.reduce((sum, group) => {
        const extraCells = Math.max(0, group.cells.length - 6);
        return sum + this.config.bloomBase + extraCells * this.config.extraCellBonus;
      }, multiBonus);

      points += Math.round(scanPoints * chainMultiplier);
    });

    this.score += points;
    this.totalBlooms += result.groupsCleared;
    this.bestChain = Math.max(this.bestChain, result.chainCount);
    this.longestGroup = Math.max(this.longestGroup, result.longestGroup);

    return points;
  }

  snapshot() {
    return {
      score: this.score,
      totalBlooms: this.totalBlooms,
      bestChain: this.bestChain,
      longestGroup: this.longestGroup
    };
  }

  restore(snapshot) {
    this.score = snapshot.score;
    this.totalBlooms = snapshot.totalBlooms;
    this.bestChain = snapshot.bestChain;
    this.longestGroup = snapshot.longestGroup;
  }
}
