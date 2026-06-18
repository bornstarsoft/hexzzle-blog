import { BALANCE_VERSION, RULE_VERSION } from './GameVersions.js';

export const LOCAL_RECORDS_KEY = 'hexzzle.localRecords.v1';
const MAX_LOCAL_RECORDS = 10;

export function getEmptyLocalRecordsState() {
  return { records: [] };
}

export function createLocalRecord(result = {}, { createdAt = new Date().toISOString() } = {}) {
  return {
    score: toInteger(result.score),
    blooms: toInteger(result.blooms ?? result.totalBlooms),
    bestStack: toInteger(result.bestStack ?? result.longestGroup),
    overblooms: toInteger(result.overblooms),
    piecesPlaced: toInteger(result.piecesPlaced),
    durationSec: toInteger(result.durationSec),
    createdAt,
    ruleVersion: RULE_VERSION,
    balanceVersion: BALANCE_VERSION
  };
}

export function addLocalRecord(state = getEmptyLocalRecordsState(), result = {}, options = {}) {
  const record = createLocalRecord(result, options);
  const records = [...normalizeRecords(state.records), record]
    .sort(compareLocalRecords)
    .slice(0, MAX_LOCAL_RECORDS);
  const rank = records.findIndex((candidate) => candidate === record) + 1 || null;

  return {
    state: { records },
    record,
    rank
  };
}

export function compareLocalRecords(a, b) {
  return (
    b.score - a.score ||
    b.blooms - a.blooms ||
    b.bestStack - a.bestStack ||
    b.overblooms - a.overblooms ||
    String(a.createdAt).localeCompare(String(b.createdAt))
  );
}

export class LocalRecordsService {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
  }

  getState() {
    return readRecordsState(this.storage?.getItem(LOCAL_RECORDS_KEY));
  }

  saveResult(result, options = {}) {
    const summary = addLocalRecord(this.getState(), result, options);
    this.storage?.setItem(LOCAL_RECORDS_KEY, JSON.stringify(summary.state));
    return summary;
  }
}

export function readRecordsState(rawValue) {
  if (!rawValue) {
    return getEmptyLocalRecordsState();
  }

  try {
    const parsed = JSON.parse(rawValue);
    return {
      records: normalizeRecords(parsed?.records)
        .sort(compareLocalRecords)
        .slice(0, MAX_LOCAL_RECORDS)
    };
  } catch (error) {
    return getEmptyLocalRecordsState();
  }
}

function normalizeRecords(records) {
  if (!Array.isArray(records)) {
    return [];
  }

  return records
    .filter((record) => record && typeof record === 'object')
    .map((record) => ({
      score: toInteger(record.score),
      blooms: toInteger(record.blooms),
      bestStack: toInteger(record.bestStack),
      overblooms: toInteger(record.overblooms),
      piecesPlaced: toInteger(record.piecesPlaced),
      durationSec: toInteger(record.durationSec),
      createdAt: typeof record.createdAt === 'string' ? record.createdAt : new Date(0).toISOString(),
      ruleVersion: typeof record.ruleVersion === 'string' ? record.ruleVersion : RULE_VERSION,
      balanceVersion: typeof record.balanceVersion === 'string' ? record.balanceVersion : BALANCE_VERSION
    }));
}

function toInteger(value) {
  return Number.isFinite(Number(value)) ? Math.max(0, Math.round(Number(value))) : 0;
}
