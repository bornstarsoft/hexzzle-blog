export const DEFAULT_SCORE_CONFIG = {
  placeCell: 1,
  mergeBase: 10,
  stackProgressBonus: 5,
  bloomBase: 120,
  extraStackBonusPerOver: 30,
  extraStackBonus: 30,
  multiBloomBonus: 75,
  chainMultiplierStep: 0.5,
  maxChainMultiplier: 2
};

export class ScoreModel {
  constructor(config = DEFAULT_SCORE_CONFIG) {
    this.hasExplicitExtraStackBonusPerOver = Object.hasOwn(config, 'extraStackBonusPerOver');
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

    result.merges?.forEach((merge) => {
      points += merge.totalCount * this.config.mergeBase;
      points += merge.totalCount * this.config.stackProgressBonus;
    });

    result.scans.forEach((groups, scanIndex) => {
      const chainMultiplier = Math.min(
        1 + scanIndex * this.config.chainMultiplierStep,
        this.config.maxChainMultiplier
      );
      const multiBonus = Math.max(0, groups.length - 1) * this.config.multiBloomBonus;
      const scanPoints = groups.reduce((sum, group) => {
        const extraStack = Math.max(0, group.totalCount - 6);
        return sum + this.config.bloomBase + extraStack * this.getExtraStackBonusPerOver();
      }, multiBonus);

      points += Math.round(scanPoints * chainMultiplier);
    });

    this.score += points;
    this.totalBlooms += result.groupsCleared;
    this.bestChain = Math.max(this.bestChain, result.chainCount);
    this.longestGroup = Math.max(this.longestGroup, result.longestGroup);

    return points;
  }

  getExtraStackBonusPerOver() {
    return this.hasExplicitExtraStackBonusPerOver
      ? this.config.extraStackBonusPerOver
      : this.config.extraStackBonus;
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
