import Phaser from 'phaser';

import { BloomResolver } from '../core/BloomResolver.js';
import { axialToPixel } from '../core/HexCoordinates.js';
import { HexBoardModel } from '../core/HexBoardModel.js';
import { findBestPlacementAnchor } from '../core/PlacementResolver.js';
import { PieceGenerator } from '../core/PieceGenerator.js';
import { cloneTray } from '../core/PieceModel.js';
import { ScoreModel } from '../core/ScoreModel.js';
import { StorageService } from '../core/StorageService.js';
import {
  clearActivePieceAfterPlacement,
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

const DRAG_LIFT = { x: 0, y: -58 };
const DRAG_START_DISTANCE = 8;

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
    this.activePieceIndex = null;
    this.dragState = null;
    this.placements = 0;
    this.undoSnapshot = null;
    this.isGameOver = false;
    this.hoverCoord = null;
    this.statusMessage = 'Tap a piece, then tap the board.';

    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.on('pointerup', this.handlePointerUp, this);
    this.scale.on('resize', this.handleResize, this);

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
    if (this.isGameOver) {
      return;
    }

    if (this.dragState) {
      this.updateDrag(pointer);
      return;
    }

    if (this.activePieceIndex === null) {
      return;
    }

    this.hoverCoord = this.boardView.coordFromPointer(pointer, {
      tolerance: this.getHoverTolerance()
    });
    this.redraw();
  }

  handlePointerDown(pointer) {
    if (this.isGameOver) {
      return;
    }

    const trayIndex = this.trayView.getPieceIndexAt(pointer);
    if (trayIndex !== null) {
      this.startDrag(trayIndex, pointer);
      return;
    }

    if (this.activePieceIndex === null) {
      this.emitStatus('Choose a Hive Piece first.');
      return;
    }

    const coord = this.boardView.coordFromPointer(pointer, {
      tolerance: this.getTouchTolerance()
    });
    if (!coord) {
      this.emitStatus('Tap closer to the Honeycomb Board.');
      return;
    }

    this.placeActivePiece(coord);
  }

  handlePointerUp(pointer) {
    if (!this.dragState || this.dragState.returning || !this.isSamePointer(pointer)) {
      return;
    }

    const state = this.dragState;
    this.releasePointer(pointer);
    this.updateDrag(pointer, { final: true });

    if (!state.moved) {
      this.hoverCoord = null;
      this.emitStatus(`Piece ${state.slotIndex + 1} selected. Tap the board.`);
      this.animateGhostBackToTray(state);
      return;
    }

    const placement = this.getPlacementCandidateFromPoint(
      this.getDragGhostCenter(pointer),
      state.piece,
      this.getDragTolerance()
    );

    if (placement.anchor && this.placeActivePiece(placement.anchor)) {
      this.destroyDragGhost(state);
      this.dragState = null;
      this.hoverCoord = null;
      this.redraw();
      return;
    }

    if (placement.coord) {
      this.boardView.showInvalid(
        placement.coord,
        state.piece,
        this.configData.gameFeel?.invalidFeedbackMs ?? 180
      );
      this.emitStatus('Not there. Try a nearby open cell.');
      this.playTone(180, 0.04);
    } else if (state.moved) {
      this.emitStatus('Drop onto the Honeycomb Board.');
    } else {
      this.emitStatus(`Piece ${state.slotIndex + 1} selected. Tap the board.`);
    }

    this.keepCurrentPieceActive();
    this.animateGhostBackToTray(state);
  }

  selectTrayPiece(index) {
    const nextState = selectTrayPiece({ activePieceIndex: this.activePieceIndex }, this.tray, index);
    if (nextState.activePieceIndex === this.activePieceIndex && !this.tray[index]) {
      return;
    }

    this.activePieceIndex = nextState.activePieceIndex;
    this.hoverCoord = null;
    this.emitStatus(`Piece ${index + 1} selected. Tap the board.`);
    this.redraw();
  }

  startDrag(index, pointer) {
    if (!this.tray[index]) {
      return;
    }

    this.cancelDrag();
    this.selectTrayPiece(index);
    const trayOrigin = this.trayView.getSlotCenter(index) ?? { x: pointer.x, y: pointer.y };
    this.dragState = {
      slotIndex: index,
      pointerId: getPointerId(pointer),
      piece: this.tray[index],
      trayOrigin,
      startPoint: { x: pointer.x, y: pointer.y },
      ghostCenter: { ...trayOrigin },
      ghostSize: this.getDragGhostSize(),
      ghost: this.add.graphics().setDepth(80),
      moved: false,
      returning: false
    };

    this.capturePointer(pointer);
    this.renderDragGhost(this.dragState);
  }

  placeActivePiece(preferredAnchor) {
    const piece = this.getActivePiece();

    if (!piece) {
      this.emitStatus('Choose a Hive Piece first.');
      return false;
    }

    const anchor = findBestPlacementAnchor(this.board, piece, preferredAnchor, 2);

    if (!anchor) {
      this.boardView.showInvalid(preferredAnchor, piece, this.configData.gameFeel?.invalidFeedbackMs ?? 180);
      this.emitStatus('Not there. Try a nearby open cell.');
      this.playTone(180, 0.04);
      this.hoverCoord = preferredAnchor;
      this.keepCurrentPieceActive();
      this.redraw();
      return false;
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

    const used = useActiveTrayPiece({
      tray: this.tray,
      activePieceIndex: this.activePieceIndex
    });
    this.tray = used.tray;
    this.activePieceIndex = clearActivePieceAfterPlacement(used).activePieceIndex;
    this.hoverCoord = null;

    if (!this.hasTrayPieces()) {
      this.tray = this.generator.generateTray({
        score: this.scoreModel.score,
        placements: this.placements
      });
      this.activePieceIndex = null;
    }

    this.checkGameOver();
    this.redraw();
    this.emitStats();
    return true;
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

    this.cancelDrag();
    this.board.restore(this.undoSnapshot.board);
    this.tray = cloneTray(this.undoSnapshot.tray);
    this.activePieceIndex = this.undoSnapshot.activePieceIndex;
    this.placements = this.undoSnapshot.placements;
    this.scoreModel.restore(this.undoSnapshot.score);
    this.undoSnapshot = null;
    this.isGameOver = false;
    this.hoverCoord = null;
    this.emitStatus('Move undone.');
    this.redraw();
    this.emitStats();
  }

  restartGame() {
    this.cancelDrag();
    this.board = new HexBoardModel(3);
    this.scoreModel = new ScoreModel(this.configData.score);
    this.generator = new PieceGenerator({ config: this.configData });
    this.tray = this.generator.generateTray({ score: 0, placements: 0 });
    this.activePieceIndex = null;
    this.placements = 0;
    this.undoSnapshot = null;
    this.isGameOver = false;
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
      activePieceIndex: this.activePieceIndex,
      placements: this.placements,
      score: this.scoreModel.snapshot()
    };
  }

  redraw() {
    if (!this.boardView || !this.trayView) {
      return;
    }

    const piece = this.getActivePiece();
    const previewAnchor = piece && this.hoverCoord
      ? findBestPlacementAnchor(this.board, piece, this.hoverCoord, 2)
      : null;
    const previewValid = Boolean(previewAnchor);
    this.boardView.render({
      board: this.board,
      selectedPiece: piece,
      hoverCoord: previewAnchor ?? this.hoverCoord,
      previewValid,
      showOpenAnchors: Boolean(piece)
    });
    this.trayView.render({
      tray: this.tray,
      selectedIndex: this.activePieceIndex
    });
  }

  handleResize() {
    this.cancelDrag();
    this.redraw();
  }

  updateDrag(pointer, { final = false } = {}) {
    if (!this.dragState || this.dragState.returning || !this.isSamePointer(pointer)) {
      return;
    }

    const state = this.dragState;
    const movedDistance = Math.hypot(pointer.x - state.startPoint.x, pointer.y - state.startPoint.y);
    state.moved ||= movedDistance >= DRAG_START_DISTANCE;
    if (!state.moved) {
      state.ghostCenter = { ...state.trayOrigin };
      this.hoverCoord = null;
      this.redraw();
      this.renderDragGhost(state);
      return;
    }

    state.ghostCenter = this.getDragGhostCenter(pointer);
    const placement = this.getPlacementCandidateFromPoint(
      state.ghostCenter,
      state.piece,
      this.getDragTolerance()
    );

    state.valid = Boolean(placement.anchor);
    state.anchor = placement.anchor;
    this.hoverCoord = placement.anchor ?? placement.coord;

    if (placement.coord) {
      this.emitStatus(placement.anchor ? 'Release to place.' : 'Try another spot.');
    } else if (state.moved || final) {
      this.emitStatus('Drag over the Honeycomb Board.');
    }

    this.redraw();
    this.renderDragGhost(state);
  }

  getPlacementCandidateFromPoint(point, piece, tolerance) {
    const coord = this.boardView.coordFromPointer(point, { tolerance });
    if (!coord) {
      return { coord: null, anchor: null };
    }

    return {
      coord,
      anchor: findBestPlacementAnchor(this.board, piece, coord, 2)
    };
  }

  getActivePiece() {
    return this.activePieceIndex === null ? null : this.tray[this.activePieceIndex] ?? null;
  }

  keepCurrentPieceActive() {
    const state = keepActivePieceAfterInvalidPlacement({ activePieceIndex: this.activePieceIndex });
    this.activePieceIndex = state.activePieceIndex;
  }

  hasTrayPieces() {
    return this.tray.some(Boolean);
  }

  getTouchTolerance() {
    return this.scale.width < 520 ? 1.35 : 0.95;
  }

  getHoverTolerance() {
    return this.scale.width < 520 ? 1.05 : 0.78;
  }

  getDragTolerance() {
    return this.scale.width < 520 ? 1.55 : 1.1;
  }

  getDragGhostSize() {
    return this.scale.width < 520 ? 25 : 30;
  }

  getDragGhostCenter(pointer) {
    return {
      x: pointer.x + DRAG_LIFT.x,
      y: pointer.y + (this.scale.width < 520 ? DRAG_LIFT.y : -42)
    };
  }

  renderDragGhost(state) {
    if (!state?.ghost) {
      return;
    }

    const points = state.piece.cells.map((cell) => (
      axialToPixel({ q: cell.dq, r: cell.dr }, state.ghostSize)
    ));
    const minX = Math.min(...points.map((point) => point.x));
    const maxX = Math.max(...points.map((point) => point.x));
    const minY = Math.min(...points.map((point) => point.y));
    const maxY = Math.max(...points.map((point) => point.y));
    const offsetX = state.ghostCenter.x - (minX + maxX) / 2;
    const offsetY = state.ghostCenter.y - (minY + maxY) / 2;

    state.ghost.clear();
    state.piece.cells.forEach((cell, index) => {
      drawHex(
        state.ghost,
        points[index].x + offsetX,
        points[index].y + offsetY,
        state.ghostSize,
        {
          fill: COLOR_MAP[cell.color] ?? 0xf2c94c,
          alpha: state.valid ? 0.9 : 0.76,
          line: state.valid ? 0x0f5b55 : 0xffffff,
          lineAlpha: 0.95
        }
      );
    });
  }

  animateGhostBackToTray(state) {
    if (!state?.ghost || state.returning) {
      this.dragState = null;
      this.hoverCoord = null;
      this.redraw();
      return;
    }

    state.returning = true;
    const target = state.trayOrigin;
    this.tweens.add({
      targets: state.ghostCenter,
      x: target.x,
      y: target.y,
      duration: 190,
      ease: 'Cubic.easeOut',
      onUpdate: () => this.renderDragGhost(state),
      onComplete: () => {
        this.destroyDragGhost(state);
        if (this.dragState === state) {
          this.dragState = null;
        }
        this.hoverCoord = null;
        this.redraw();
      }
    });
  }

  destroyDragGhost(state = this.dragState) {
    if (state?.ghost) {
      this.tweens.killTweensOf(state.ghostCenter);
      state.ghost.destroy();
      state.ghost = null;
    }
  }

  cancelDrag() {
    if (!this.dragState) {
      return;
    }

    this.destroyDragGhost(this.dragState);
    this.dragState = null;
    this.hoverCoord = null;
  }

  isSamePointer(pointer) {
    return this.dragState?.pointerId === getPointerId(pointer);
  }

  capturePointer(pointer) {
    const pointerId = pointer.event?.pointerId;
    const canvas = this.game.canvas;
    if (pointerId === undefined || !canvas?.setPointerCapture) {
      return;
    }

    try {
      canvas.setPointerCapture(pointerId);
    } catch (error) {
      // Some browsers reject capture after synthetic mouse events; dragging still works.
    }
  }

  releasePointer(pointer) {
    const pointerId = pointer.event?.pointerId;
    const canvas = this.game.canvas;
    if (pointerId === undefined || !canvas?.releasePointerCapture) {
      return;
    }

    try {
      canvas.releasePointerCapture(pointerId);
    } catch (error) {
      // The pointer may already be released after a canceled touch sequence.
    }
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

function getPointerId(pointer) {
  return pointer.event?.pointerId ?? pointer.id ?? 0;
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
