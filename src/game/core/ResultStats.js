import { BALANCE_VERSION, RULE_VERSION } from './GameVersions.js';

export function createFinalResultStats({
  scoreSnapshot = {},
  bestScore = 0,
  piecesPlaced = 0,
  durationSec = 0,
  createdAt = new Date().toISOString(),
  localRecords = [],
  localRecordRank = null,
  isNewBest = false
} = {}) {
  const bestStack = toNumber(scoreSnapshot.bestStack ?? scoreSnapshot.longestGroup);

  return {
    score: toNumber(scoreSnapshot.score),
    bestScore: toNumber(bestScore),
    totalBlooms: toNumber(scoreSnapshot.totalBlooms),
    bestChain: toNumber(scoreSnapshot.bestChain),
    longestGroup: bestStack,
    bestStack,
    overblooms: toNumber(scoreSnapshot.overblooms),
    piecesPlaced: toNumber(piecesPlaced),
    durationSec: toNumber(durationSec),
    createdAt,
    ruleVersion: RULE_VERSION,
    balanceVersion: BALANCE_VERSION,
    localRecords,
    localRecordRank,
    isNewBest: Boolean(isNewBest)
  };
}

function toNumber(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}
