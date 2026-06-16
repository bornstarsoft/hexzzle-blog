import Phaser from 'phaser';

import { BloomResolver } from '../core/BloomResolver.js';
import { HexBoardModel } from '../core/HexBoardModel.js';
import { axialToPixel } from '../core/HexCoordinates.js';
import { resolvePlacementPreview } from '../core/PlacementResolver.js';
import { PieceGenerator } from '../core/PieceGenerator.js';
import { cloneTray } from '../core/PieceModel.js';
import { ScoreModel } from '../core/ScoreModel.js';
import { StorageService } from '../core/StorageService.js';
import {
  clearActivePieceAfterPlacement,
  createTraySelectionState,
  getActiveTrayPiece,
  keepActivePieceAfterInvalidPlacement,
  selectTrayPiece,
  useActiveTrayPiece
} from '../core/TraySelectionState.js';
import { HoneycombBoardView, drawHex } from '../ui/HoneycombBoardView.js';
import { TrayView } from '../ui/TrayView.js';

const COLOR_MAP = {
  red: 0xef5a5a,
  blue: 0x2f80ed,
  yellow: 0xf2c94c,
  green: 0x3fbf7f,
  purple: 0x8f65d9,
  orange: 0xf2994a
};

const DRAG_MOVE_THRESHOLD = 8;

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
    this.selectionState = createTraySelectionState();
    this.dragState = null;
    this.previewState = null;
    this.placements = 0;
    this.undoSnapshot = null;
    this.isGameOver = false;
    this.inputLockedUntil = 0;
    this.hoverCoord = null;
    this.statusMessage = 'Tap a piece, then tap the board.';

    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.on('pointerup', this.handlePointerUp, this);
    this.input.on('pointerupoutside', this.handlePointerUp, this);
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
    if (this.isGameOver || this.isInputLocked() || !this.hasTrayPieces()) {
      return;
    }

    if (this.dragState) {
      this.updateDrag(pointer);
      return;
    }

    const piece = getActiveTrayPiece(this.selectionState, this.tray);
    if (!piece) {
      return;
    }

    const anchor = this.getNearestBoardAnchor(pointer, { tolerance: this.getPreviewTolerance() });
    this.previewState = this.resolvePreview(piece, anchor);
    this.hoverCoord = this.previewState.previewAnchor;
    this.redraw();
  }

  handlePointerDown(pointer) {
    if (this.isGameOver || this.isInputLocked()) {
      return;
    }

    const trayIndex = this.trayView.getPieceIndexAt(pointer);
    if (trayIndex !== null) {
      this.startTrayInteraction(trayIndex, pointer);
      return;
    }

    const coord = this.getNearestBoardAnchor(pointer, { tolerance: this.getTouchTolerance() });
    if (!coord) {
      this.emitStatus('Tap closer to the Honeycomb Board.');
      return;
    }

    this.placeActivePiece(coord);
  }

  handlePointerUp(pointer) {
    if (!this.dragState || this.dragState.returning) {
      return;
    }

    const state = this.dragState;
    if (pointer.id !== undefined && state.pointerId !== undefined && pointer.id !== state.pointerId) {
      return;
    }

    if (!state.moved) {
      this.destroyDragGhost(state);
      this.dragState = null;
      this.previewState = null;
      this.hoverCoord = null;
      this.emitStatus(`Piece ${state.slotIndex + 1} selected. Tap the board.`);
      this.redraw();
      return;
    }

    this.updateDrag(pointer);
    const preview = this.previewState;

    if (preview?.valid) {
      this.destroyDragGhost(state);
      this.dragState = null;
      this.placeActivePiece(preview.placementAnchor);
      return;
    }

    this.selectionState = keepActivePieceAfterInvalidPlacement(this.selectionState);
    this.boardView.showInvalid(
      preview?.previewAnchor ?? this.hoverCoord,
      state.piece,
      this.configData.gameFeel?.invalidFeedbackMs ?? 180
    );
    this.emitStatus('Not there. Try an open honeycomb space.');
    this.playTone(180, 0.04);
    this.animateGhostBackToTray(state);
  }

  selectTrayPiece(index) {
    const nextState = selectTrayPiece(this.selectionState, this.tray, index);
    if (nextState.activePieceIndex === this.selectionState.activePieceIndex && !this.tray[index]) {
      return;
    }

    this.selectionState = nextState;
    this.previewState = null;
    this.hoverCoord = null;
    this.emitStatus(`Piece ${index + 1} selected. Tap the board.`);
    this.redraw();
  }

  startTrayInteraction(index, pointer) {
    if (!this.tray[index] || this.dragState) {
      return;
    }

    this.selectionState = selectTrayPiece(this.selectionState, this.tray, index);
    const piece = getActiveTrayPiece(this.selectionState, this.tray);
    if (!piece) {
      return;
    }

    const trayOrigin = this.trayView.getSlotCenter(index) ?? { x: pointer.x, y: pointer.y };
    this.dragState = {
      slotIndex: index,
      pointerId: pointer.id,
      piece,
      trayOrigin,
      dragOffset: this.getDragOffset(),
      ghostSize: this.getGhostPieceSize(),
      ghost: null,
      moved: false,
      returning: false,
      startPoint: { x: pointer.x, y: pointer.y }
    };
    this.previewState = null;
    this.hoverCoord = null;
    this.emitStatus(`Piece ${index + 1} selected.`);
    this.redraw();
  }

  placeActivePiece(preferredAnchor) {
    const piece = getActiveTrayPiece(this.selectionState, this.tray);

    if (!piece) {
      this.emitStatus('Choose a piece first.');
      return;
    }

    const preview = this.resolvePreview(piece, preferredAnchor);
    this.previewState = preview;
    this.hoverCoord = preview.previewAnchor;

    if (!preview.valid) {
      this.boardView.showInvalid(preferredAnchor, piece, this.configData.gameFeel?.invalidFeedbackMs ?? 180);
      this.selectionState = keepActivePieceAfterInvalidPlacement(this.selectionState);
      this.emitStatus('Not there. Try an open honeycomb space.');
      this.playTone(180, 0.04);
      this.redraw();
      return;
    }

    this.undoSnapshot = this.createUndoSnapshot();
    const anchor = preview.placementAnchor;
    this.board.placePiece(piece, anchor);
    this.placements += 1;
    const placePoints = this.scoreModel.addPlacement(piece.cells.length);
    this.redraw();
    this.boardView.showScorePop(anchor, `+${placePoints}`);
    this.playTone(440, 0.05);

    const bloomResult = this.resolver.resolve(this.board);
    if (bloomResult.totalCleared > 0) {
      const bloomPoints = this.scoreModel.addBloomResult(bloomResult);
      this.boardView.showBloom(bloomResult);
      this.boardView.showScorePop(anchor, `+${bloomPoints}`);
      this.lockInputFor(this.configData.gameFeel?.bloomAnimationMs ?? 480);
      this.playTone(660, 0.08);
      this.emitStatus(createBloomMessage(bloomResult));
    } else {
      this.emitStatus('Nice placement.');
    }

    const used = useActiveTrayPiece({
      tray: this.tray,
      activePieceIndex: this.selectionState.activePieceIndex
    });
    this.tray = used.tray;
    this.selectionState = clearActivePieceAfterPlacement(used);
    this.previewState = null;
    this.hoverCoord = null;

    if (!this.hasTrayPieces()) {
      this.tray = this.generator.generateTray({
        score: this.scoreModel.score,
        placements: this.placements
      });
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
    this.selectionState = createTraySelectionState({
      activePieceIndex: this.undoSnapshot.activePieceIndex
    });
    this.clearDragState();
    this.previewState = null;
    this.hoverCoord = null;
    this.placements = this.undoSnapshot.placements;
    this.scoreModel.restore(this.undoSnapshot.score);
    this.undoSnapshot = null;
    this.isGameOver = false;
    this.inputLockedUntil = 0;
    this.emitStatus('Move undone.');
    this.redraw();
    this.emitStats();
  }

  restartGame() {
    this.board = new HexBoardModel(3);
    this.scoreModel = new ScoreModel(this.configData.score);
    this.generator = new PieceGenerator({ config: this.configData });
    this.tray = this.generator.generateTray({ score: 0, placements: 0 });
    this.selectionState = createTraySelectionState();
    this.clearDragState();
    this.previewState = null;
    this.placements = 0;
    this.undoSnapshot = null;
    this.isGameOver = false;
    this.inputLockedUntil = 0;
    this.hoverCoord = null;
    this.emitStatus('New game started. Tap a piece, then tap the board.');
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
      activePieceIndex: this.selectionState.activePieceIndex,
      placements: this.placements,
      score: this.scoreModel.snapshot()
    };
  }

  redraw() {
    if (!this.boardView || !this.trayView) {
      return;
    }

    const piece = getActiveTrayPiece(this.selectionState, this.tray);
    const preview = piece && this.hoverCoord
      ? this.resolvePreview(piece, this.hoverCoord)
      : this.previewState;
    this.boardView.render({
      board: this.board,
      selectedPiece: piece,
      hoverCoord: preview?.previewAnchor ?? this.hoverCoord,
      previewValid: Boolean(preview?.valid),
      previewTargets: preview?.targets ?? [],
      showOpenAnchors: Boolean(piece)
    });
    this.trayView.render({
      tray: this.tray,
      selectedIndex: this.selectionState.activePieceIndex
    });
  }

  hasTrayPieces() {
    return this.tray.some(Boolean);
  }

  resolvePreview(piece, anchor) {
    return resolvePlacementPreview(this.board, piece, anchor, 2);
  }

  getNearestBoardAnchor(point, { tolerance }) {
    return this.boardView.coordFromPoint(point, { tolerance });
  }

  getPreviewTolerance() {
    return this.scale.width < 520 ? 1.85 : 1.35;
  }

  getTouchTolerance() {
    return this.scale.width < 520 ? 1.15 : 0.82;
  }

  updateDrag(pointer) {
    const state = this.dragState;
    if (!state || state.returning) {
      return;
    }

    const distance = Math.hypot(pointer.x - state.startPoint.x, pointer.y - state.startPoint.y);
    if (!state.moved && distance < DRAG_MOVE_THRESHOLD) {
      return;
    }

    state.moved = true;
    state.ghost ??= this.createDragGhost(state);

    const anchorPoint = this.getDragAnchorPoint(pointer, state);
    this.drawDragGhost(state, anchorPoint);

    const anchor = this.getNearestBoardAnchor(anchorPoint, { tolerance: this.getPreviewTolerance() });
    this.previewState = this.resolvePreview(state.piece, anchor);
    this.hoverCoord = this.previewState.previewAnchor;

    if (this.previewState.valid) {
      this.emitStatus('Release to place.');
    } else if (this.previewState.previewAnchor) {
      this.emitStatus('Not there. Try an open honeycomb space.');
    } else {
      this.emitStatus('Drag over the Honeycomb Board.');
    }

    this.redraw();
  }

  getDragAnchorPoint(pointer, state) {
    return {
      x: pointer.x + state.dragOffset.x,
      y: pointer.y + state.dragOffset.y
    };
  }

  getDragOffset() {
    return {
      x: 0,
      y: this.scale.width < 520 ? -40 : -30
    };
  }

  getGhostPieceSize() {
    return this.scale.width < 520 ? 24 : 28;
  }

  createDragGhost(state) {
    const ghost = this.add.graphics();
    ghost.setDepth(100);
    ghost.setAlpha(0.92);
    state.ghost = ghost;
    this.drawDragGhost(state, state.trayOrigin);
    return ghost;
  }

  drawDragGhost(state, center) {
    if (!state.ghost) {
      return;
    }

    state.ghostCenter = { x: center.x, y: center.y };
    state.ghost.clear();
    drawPieceOnGraphics(state.ghost, state.piece, center.x, center.y, state.ghostSize, 0.9);
  }

  animateGhostBackToTray(state) {
    if (!state || state.returning) {
      return;
    }

    state.returning = true;
    this.previewState = null;
    this.hoverCoord = null;
    this.redraw();

    if (!state.ghost) {
      this.dragState = null;
      return;
    }

    const start = getDragGhostCenter(state);
    const target = this.trayView.getSlotCenter(state.slotIndex) ?? state.trayOrigin;
    const tweenTarget = { x: start.x, y: start.y, alpha: 0.92 };

    this.tweens.add({
      targets: tweenTarget,
      x: target.x,
      y: target.y,
      alpha: 0.34,
      duration: 210,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        state.ghost.setAlpha(tweenTarget.alpha);
        this.drawDragGhost(state, tweenTarget);
      },
      onComplete: () => {
        this.destroyDragGhost(state);
        if (this.dragState === state) {
          this.dragState = null;
        }
        this.redraw();
      }
    });
  }

  destroyDragGhost(state = this.dragState) {
    if (state?.ghost) {
      this.tweens.killTweensOf(state.ghost);
      state.ghost.destroy();
      state.ghost = null;
    }
  }

  clearDragState() {
    this.destroyDragGhost();
    this.dragState = null;
  }

  isInputLocked() {
    return this.time.now < this.inputLockedUntil;
  }

  lockInputFor(duration) {
    this.inputLockedUntil = Math.max(this.inputLockedUntil, this.time.now + duration);
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

function getDragGhostCenter(state) {
  return state.ghostCenter ?? state.trayOrigin;
}

function drawPieceOnGraphics(graphics, piece, centerX, centerY, size, alpha = 1) {
  const points = piece.cells.map((cell) => axialToPixel({ q: cell.dq, r: cell.dr }, size));
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  const offsetX = centerX - (minX + maxX) / 2;
  const offsetY = centerY - (minY + maxY) / 2;

  piece.cells.forEach((cell, index) => {
    drawHex(graphics, points[index].x + offsetX, points[index].y + offsetY, size, {
      fill: COLOR_MAP[cell.color] ?? 0xf2c94c,
      alpha,
      line: 0xffffff,
      lineAlpha: 0.96
    });
  });
}
