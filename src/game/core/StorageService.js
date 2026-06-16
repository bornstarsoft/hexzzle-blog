const BEST_SCORE_KEY = 'hexzzle.bestScore';
const SOUND_KEY = 'hexzzle.soundEnabled';

export class StorageService {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
  }

  getBestScore() {
    return Number(this.storage?.getItem(BEST_SCORE_KEY) ?? 0);
  }

  saveBestScore(score) {
    const best = Math.max(this.getBestScore(), score);
    this.storage?.setItem(BEST_SCORE_KEY, String(best));
    return best;
  }

  getSoundEnabled() {
    return this.storage?.getItem(SOUND_KEY) === 'true';
  }

  setSoundEnabled(enabled) {
    this.storage?.setItem(SOUND_KEY, enabled ? 'true' : 'false');
  }
}
