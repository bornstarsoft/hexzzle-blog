import Phaser from 'phaser';

import { BloomResolver } from '../core/BloomResolver.js';
import { HexBoardModel } from '../core/HexBoardModel.js';
import { PieceGenerator } from '../core/PieceGenerator.js';
import { cloneTray } from '../core/PieceModel.js';
import { ScoreModel } from '../core/ScoreModel.js';
import { StorageService } from '../core/StorageService.js';
import { HoneycombBoardView } from '../ui/HoneycombBoardView.js';
import { TrayView } from '../ui/TrayView.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
  }

  init(data) {
    this.configData = data.config ?? {};
  }

  create() {
    this.storage = new StorageService();
    this.soundEnabled = this.storage.getSoundEnabled();
    this.audioContext = null;
    this.board = new HexBoardModel(3);
    this.generator = new PieceGenerator({ config: this.configData });
    this.resolver = new BloomResolver();
    this.scoreModel = new ScoreModel(this.configData.score);
    this.boardView = new HoneycombBoardView(this);
    this.trayView = new TrayView(this);
    this.tray = this.generator.generateTray({ score: 0, placements: 0 });
    this.selectedIndex = 0;
    this.placements = 0;
    this.undoSnapshot = null;
    this.isGameOver = false;
    this.hoverCoord = null;
    this.statusMessage = 'Choose a Hive Piece, then place it on the Honeycomb Board.';

    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerdown', this.handlePointerDown, this);
    this.scale.on('resize', this.redraw, this);

    this.input.keyboard?.on('keydown-ONE', () => this.selectTrayPiece(0));
    this.input.keyboard?.on('keydown-TWO', () => this.selectTrayPiece(1));
    this.input.keyboard?.on('keydown-THREE', () => this.selectTrayPiece(2));
    this.input.keyboard?.on('keydown-U', () => this.undoMove());
    this.input.keyboard?.on('keydown-R', () => this.restartGame());

    this.redraw();
    this.emitStats();
    this.emitStatus(this.statusMessage);
  }

  handlePointerMove(pointer) {
    if (this.isGameOver || this.tray.length === 0) {
      return;
    }

    this.hoverCoord = this.boardView.coordFromPointer(pointer);
    this.redraw();
  }

  handlePointerDown(pointer) {
    if (this.isGameOver) {
      return;
    }

    const trayIndex = this.trayView.getPieceIndexAt(pointer);
    if (trayIndex !== null) {
      this.selectTrayPiece(trayIndex);
      return;
    }

    const coord = this.boardView.coordFromPointer(pointer);
    if (!coord) {
      return;
    }

    this.placeSelectedPiece(coord);
  }

  selectTrayPiece(index) {
    if (!this.tray[index]) {
      return;
    }

    this.selectedIndex = index;
    this.emitStatus(`Hive Piece ${index + 1} selected.`);
    this.redraw();
  }

  placeSelectedPiece(anchor) {
    const piece = this.tray[this.selectedIndex];

    if (!piece) {
      return;
    }

    if (!this.board.canPlacePiece(piece, anchor)) {
      this.boardView.showInvalid(anchor, piece, this.configData.gameFeel?.invalidFeedbackMs ?? 180);
      this.emitStatus('Not there. Try an open honeycomb space.');
      this.playTone(180, 0.04);
      return;
    }

    this.undoSnapshot = this.createUndoSnapshot();
    this.board.placePiece(piece, anchor);
    this.placements += 1;
    const placePoints = this.scoreModel.addPlacement(piece.cells.length);
    this.boardView.showScorePop(anchor, `+${placePoints}`);
    this.playTone(440, 0.05);

    const bloomResult = this.resolver.resolve(this.board);
    if (bloomResult.totalCleared > 0) {
      const bloomPoints = this.scoreModel.addBloomResult(bloomResult);
      this.boardView.showBloom(bloomResult);
      this.boardView.showScorePop(anchor, `+${bloomPoints}`);
      this.playTone(660, 0.08);
      this.emitStatus(createBloomMessage(bloomResult));
    } else {
      this.emitStatus('Nice placement.');
    }

    this.tray.splice(this.selectedIndex, 1);
    if (this.tray.length === 0) {
      this.tray = this.generator.generateTray({
        score: this.scoreModel.score,
        placements: this.placements
      });
      this.selectedIndex = 0;
    } else {
      this.selectedIndex = Math.min(this.selectedIndex, this.tray.length - 1);
    }

    this.checkGameOver();
    this.redraw();
    this.emitStats();
  }

  checkGameOver() {
    if (this.board.hasAnyFit(this.tray)) {
      return;
    }

    this.isGameOver = true;
    const bestScore = this.storage.saveBestScore(this.scoreModel.score);
    const result = {
      ...this.scoreModel.snapshot(),
      bestScore,
      canUndo: Boolean(this.undoSnapshot),
      soundEnabled: this.soundEnabled
    };

    this.emitStatus('Game over. Your Bloom score is ready to share.');
    this.emitStats();
    window.dispatchEvent(new CustomEvent('hexzzle:game-over', { detail: result }));
  }

  undoMove() {
    if (!this.undoSnapshot) {
      return;
    }

    this.board.restore(this.undoSnapshot.board);
    this.tray = cloneTray(this.undoSnapshot.tray);
    this.selectedIndex = this.undoSnapshot.selectedIndex;
    this.placements = this.undoSnapshot.placements;
    this.scoreModel.restore(this.undoSnapshot.score);
    this.undoSnapshot = null;
    this.isGameOver = false;
    this.emitStatus('Move undone.');
    this.redraw();
    this.emitStats();
  }

  restartGame() {
    this.board = new HexBoardModel(3);
    this.scoreModel = new ScoreModel(this.configData.score);
    this.generator = new PieceGenerator({ config: this.configData });
    this.tray = this.generator.generateTray({ score: 0, placements: 0 });
    this.selectedIndex = 0;
    this.placements = 0;
    this.undoSnapshot = null;
    this.isGameOver = false;
    this.hoverCoord = null;
    this.emitStatus('New game started.');
    this.redraw();
    this.emitStats();
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    this.storage.setSoundEnabled(this.soundEnabled);
    this.emitStats();
    if (this.soundEnabled) {
      this.playTone(520, 0.05);
    }
    return this.soundEnabled;
  }

  createUndoSnapshot() {
    return {
      board: this.board.snapshot(),
      tray: cloneTray(this.tray),
      selectedIndex: this.selectedIndex,
      placements: this.placements,
      score: this.scoreModel.snapshot()
    };
  }

  redraw() {
    if (!this.boardView || !this.trayView) {
      return;
    }

    const piece = this.tray[this.selectedIndex] ?? null;
    const previewValid = piece && this.hoverCoord ? this.board.canPlacePiece(piece, this.hoverCoord) : null;
    this.boardView.render({
      board: this.board,
      selectedPiece: piece,
      hoverCoord: this.hoverCoord,
      previewValid
    });
    this.trayView.render({
      tray: this.tray,
      selectedIndex: this.selectedIndex
    });
  }

  emitStats() {
    window.dispatchEvent(new CustomEvent('hexzzle:stats', {
      detail: {
        ...this.scoreModel.snapshot(),
        bestScore: Math.max(this.storage.getBestScore(), this.scoreModel.score),
        canUndo: Boolean(this.undoSnapshot),
        soundEnabled: this.soundEnabled
      }
    }));
  }

  emitStatus(message) {
    this.statusMessage = message;
    window.dispatchEvent(new CustomEvent('hexzzle:status', {
      detail: { message }
    }));
  }

  playTone(frequency, duration) {
    if (!this.soundEnabled) {
      return;
    }

    const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    this.audioContext ??= new AudioContextClass();
    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    gain.gain.value = 0.035;
    oscillator.connect(gain).connect(this.audioContext.destination);
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + duration);
  }
}

function createBloomMessage(result) {
  if (result.chainCount > 1) {
    return `Chain x${result.chainCount}`;
  }

  if (result.groupsCleared > 1) {
    return 'Double Bloom!';
  }

  return 'Bloom!';
}
