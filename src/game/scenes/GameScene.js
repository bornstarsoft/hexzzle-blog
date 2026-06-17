import Phaser from 'phaser';

import { BloomResolver } from '../core/BloomResolver.js';
import {
  createDragGhostState,
  getDragGhostCellCenters,
  getGhostAnchorPoint,
  updateDragGhostCenter
} from '../core/DragGhostTracker.js';
import { HexBoardModel } from '../core/HexBoardModel.js';
import { getGhostHexSize, shouldShowOpenAnchorHints } from '../core/HexVisualLayout.js';
import {
  getMaxCellCenterDelta,
  getPieceCellCentersForAnchor,
  getPiecePixelOffsetsFromAnchor
} from '../core/PieceVisualGeometry.js';
import {
  resolveLocalPlacementDrop,
  resolveLocalPlacementPreview
} from '../core/PlacementResolver.js';
import { PieceGenerator } from '../core/PieceGenerator.js';
import { cloneTray } from '../core/PieceModel.js';
import { ScoreModel } from '../core/ScoreModel.js';
import { StorageService } from '../core/StorageService.js';
import {
  clearActivePieceAfterPlacement,
  clearActivePieceAfterInvalidPlacement,
  createTraySelectionState,
  getActiveTrayPiece,
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
const DRAG_DEBUG_PARAM = 'debugDrag';
const DEFAULT_STACK_GATHER_MS = 320;
const DEFAULT_STACK_SETTLE_MS = 140;

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
    this.tray = this.generator.generateTray({
      score: 0,
      placements: 0,
      blooms: 0,
      emptyCells: this.board.getEmptyCellCount()
    });
    this.selectionState = createTraySelectionState();
    this.dragState = null;
    this.previewState = null;
    this.debugDragEnabled = isDragDebugEnabled();
    this.dragDebugGraphics = this.debugDragEnabled ? this.add.graphics().setDepth(130) : null;
    this.dragDebugText = this.debugDragEnabled
      ? this.add.text(12, 12, '', {
        fontFamily: 'Inter, Arial, sans-serif',
        fontSize: '13px',
        color: '#17352e',
        backgroundColor: 'rgba(255,255,255,0.86)',
        padding: { x: 8, y: 5 }
      }).setDepth(131)
      : null;
    if (this.debugDragEnabled) {
      setDragDebugPayload({ last: null, samples: [] });
    }
    this.placements = 0;
    this.undoSnapshot = null;
    this.isGameOver = false;
    this.inputLockedUntil = 0;
    this.hoverCoord = null;
    this.resolutionAnimationToken = 0;
    this.statusMessage = 'Tap a piece, then stack matching colors.';

    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.on('pointerup', this.handlePointerUp, this);
    this.input.on('pointerupoutside', this.handlePointerUp, this);
    this.scale.on('resize', this.redraw, this);
    this.registerPointerCancelHandlers();

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
    if (!piece || !this.debugDragEnabled) {
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
      const piece = getActiveTrayPiece(this.selectionState, this.tray);
      if (piece) {
        this.selectionState = clearActivePieceAfterInvalidPlacement(this.selectionState);
        this.clearPlacementPreview();
        this.emitStatus('Not there. Choose another piece or open space.');
        this.redraw();
      } else {
        this.emitStatus('Tap closer to the Honeycomb Board.');
      }
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
      this.emitStatus(`Piece ${state.slotIndex + 1} selected. Stack matching colors.`);
      this.redraw();
      return;
    }

    this.updateDrag(pointer);
    const preview = this.previewState;
    const drop = this.resolveDrop(state.piece, preview?.localAnchor ?? null);

    if (drop.valid) {
      this.destroyDragGhost(state);
      this.dragState = null;
      this.placeActivePiece(drop.placementAnchor);
      return;
    }

    this.selectionState = clearActivePieceAfterInvalidPlacement(this.selectionState);
    this.clearPlacementPreview();
    this.boardView.showInvalid(
      preview?.previewAnchor ?? this.hoverCoord,
      state.piece,
      this.configData.gameFeel?.invalidFeedbackMs ?? 180
    );
    this.emitStatus('Not there. Choose another piece or open space.');
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
    this.emitStatus(`Piece ${index + 1} selected. Stack matching colors.`);
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

    const tracker = createDragGhostState({
      pointer,
      pieceIndex: index,
      piece,
      boardCellSize: this.getGhostPieceSize(),
      offset: this.getDragOffset()
    });
    this.dragState = {
      slotIndex: index,
      pointerId: tracker.pointerId,
      piece,
      returnOrigin: this.trayView.getPieceAnchorPoint(index, piece) ?? this.trayView.getSlotCenter(index) ?? { x: pointer.x, y: pointer.y },
      pointerPoint: tracker.pointerPoint,
      pointerOffset: tracker.pointerOffset,
      anchorLocalOffset: tracker.anchorLocalOffset,
      ghostAnchorPoint: tracker.ghostAnchorPoint,
      cellCenters: tracker.cellCenters,
      ghostPosition: tracker.ghostPosition,
      ghostCenter: tracker.ghostPosition,
      ghostSize: tracker.boardCellSize,
      ghost: null,
      moved: false,
      returning: false,
      startPoint: { x: pointer.x, y: pointer.y }
    };
    this.createDragGhost(this.dragState);
    this.renderDragDebug(pointer, this.dragState.ghostPosition, null, this.dragState);
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
      this.clearPlacementPreview();
      this.boardView.showInvalid(preview.previewAnchor ?? preferredAnchor, piece, this.configData.gameFeel?.invalidFeedbackMs ?? 180);
      this.selectionState = clearActivePieceAfterInvalidPlacement(this.selectionState);
      this.emitStatus('Not there. Choose another piece or open space.');
      this.playTone(180, 0.04);
      this.redraw();
      return;
    }

    this.undoSnapshot = this.createUndoSnapshot();
    const anchor = preview.placementAnchor;
    const placedTargets = this.board.getTargets(piece, anchor).map((target) => ({ ...target }));
    this.board.placePiece(piece, anchor);
    this.placements += 1;
    const placePoints = this.scoreModel.addPlacement(piece.cells.length);
    const bloomResult = this.resolver.plan(this.board, {
      placedCells: placedTargets,
      anchor
    });
    const stackPoints = this.scoreModel.addBloomResult(bloomResult);
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
        placements: this.placements,
        blooms: this.scoreModel.totalBlooms,
        emptyCells: this.board.getEmptyCellCount()
      });
    }

    this.redraw();
    this.boardView.showScorePop(anchor, `+${placePoints + stackPoints}`);
    this.playTone(440, 0.05);
    this.emitStats();

    if (bloomResult.gatherPlans.length > 0) {
      this.playStackResolutionAnimation(bloomResult);
      return;
    }

    this.resolver.apply(this.board, bloomResult);
    this.emitStatus('Stack started.');
    this.checkGameOver();
    this.redraw();
    this.emitStats();
  }

  playStackResolutionAnimation(bloomResult) {
    const animationToken = this.resolutionAnimationToken + 1;
    this.resolutionAnimationToken = animationToken;
    const gatherMs = this.getStackGatherAnimationMs();
    const settleMs = this.getStackSettleMs(bloomResult);
    const bloomMs = bloomResult.groupsCleared > 0
      ? this.configData.gameFeel?.bloomAnimationMs ?? 480
      : 0;

    this.lockInputFor(gatherMs + settleMs + bloomMs);
    this.emitStatus(bloomResult.groupsCleared > 0
      ? 'Stack reaches 6. Bloom!'
      : 'Same colors gather into one stack.');

    this.boardView.showGather(bloomResult, {
      duration: gatherMs,
      settleDelay: settleMs,
      onComplete: () => {
        if (animationToken !== this.resolutionAnimationToken) {
          return;
        }

        this.resolver.apply(this.board, bloomResult);
        this.redraw();

        if (bloomResult.groupsCleared > 0) {
          this.boardView.showBloom(bloomResult);
          this.playTone(660, 0.08);
          this.emitStatus(createBloomMessage(bloomResult));
          this.time.delayedCall(bloomMs, () => {
            if (animationToken !== this.resolutionAnimationToken) {
              return;
            }

            this.checkGameOver();
            this.emitStats();
          });
          return;
        }

        this.emitStatus(createMergeMessage(bloomResult));
        this.checkGameOver();
        this.emitStats();
      }
    });
  }

  getStackGatherAnimationMs() {
    return Math.min(380, Math.max(220, this.configData.gameFeel?.stackGatherAnimationMs ?? DEFAULT_STACK_GATHER_MS));
  }

  getStackSettleMs(result) {
    const configured = this.configData.gameFeel?.stackSettleMs ?? DEFAULT_STACK_SETTLE_MS;
    return result.groupsCleared > 0
      ? Math.min(220, Math.max(120, configured))
      : Math.min(160, Math.max(70, configured));
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
    this.generator.restore(this.undoSnapshot.generator);
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
    this.resolutionAnimationToken += 1;
    this.emitStatus('Move undone.');
    this.redraw();
    this.emitStats();
  }

  restartGame() {
    this.board = new HexBoardModel(3);
    this.scoreModel = new ScoreModel(this.configData.score);
    this.generator = new PieceGenerator({ config: this.configData });
    this.tray = this.generator.generateTray({
      score: 0,
      placements: 0,
      blooms: 0,
      emptyCells: this.board.getEmptyCellCount()
    });
    this.selectionState = createTraySelectionState();
    this.clearDragState();
    this.previewState = null;
    this.placements = 0;
    this.undoSnapshot = null;
    this.isGameOver = false;
    this.inputLockedUntil = 0;
    this.hoverCoord = null;
    this.resolutionAnimationToken += 1;
    this.emitStatus('New game started. Stack matching colors. Reach 6.');
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
      generator: this.generator.snapshot(),
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
      previewStackHints: preview?.valid ? preview.stackHints ?? [] : [],
      showOpenAnchors: shouldShowOpenAnchorHints({
        selectedPiece: piece,
        isDragging: Boolean(this.dragState),
        debugDragEnabled: this.debugDragEnabled
      })
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
    return resolveLocalPlacementPreview(this.board, piece, anchor);
  }

  resolveDrop(piece, anchor) {
    return resolveLocalPlacementDrop(this.board, piece, anchor);
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

    const tracker = updateDragGhostCenter(state, { pointer });
    state.pointerPoint = tracker.pointerPoint;
    state.ghostPosition = tracker.ghostPosition;
    state.ghostCenter = tracker.ghostPosition;
    state.ghostAnchorPoint = tracker.ghostAnchorPoint;
    state.cellCenters = tracker.cellCenters;
    this.drawDragGhost(state, state.ghostPosition);

    const distance = Math.hypot(pointer.x - state.startPoint.x, pointer.y - state.startPoint.y);
    if (!state.moved && distance < DRAG_MOVE_THRESHOLD) {
      this.renderDragDebug(pointer, state.ghostPosition, null, state);
      return;
    }

    state.moved = true;
    const anchor = this.getNearestBoardAnchor(state.ghostAnchorPoint, { tolerance: this.getPreviewTolerance() });
    this.previewState = this.resolvePreview(state.piece, anchor);
    this.hoverCoord = this.previewState.previewAnchor;
    this.warnIfPreviewDiverged(this.previewState);
    this.renderDragDebug(pointer, state.ghostPosition, this.previewState, state);

    if (this.previewState.valid) {
      this.emitStatus('Release to place.');
    } else if (this.previewState.previewAnchor) {
      this.emitStatus('Not there. Try an open honeycomb space.');
    } else {
      this.emitStatus('Drag over the Honeycomb Board.');
    }

    this.redraw();
  }

  getDragOffset() {
    return {
      x: 0,
      y: -32
    };
  }

  getGhostPieceSize() {
    this.boardView.updateLayout();
    return getGhostHexSize(this.boardView.layout.hexSize);
  }

  createDragGhost(state) {
    if (state.ghost) {
      return state.ghost;
    }

    const ghost = this.add.graphics();
    ghost.setDepth(100);
    ghost.setAlpha(0.92);
    state.ghost = ghost;
    this.drawDragGhost(state, state.ghostPosition);
    return ghost;
  }

  drawDragGhost(state, center) {
    if (!state.ghost) {
      return;
    }

    state.ghostPosition = { x: center.x, y: center.y };
    state.ghostCenter = state.ghostPosition;
    state.ghostAnchorPoint = getGhostAnchorPoint(state.ghostPosition, state.anchorLocalOffset);
    state.cellCenters = getPieceCellCentersForAnchor(state.ghostAnchorPoint, state.piece, state.ghostSize);
    state.ghost.clear();
    drawPieceOnGraphics(state.ghost, state.piece, state.ghostAnchorPoint.x, state.ghostAnchorPoint.y, state.ghostSize, 0.9);
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
    const target = this.trayView.getPieceAnchorPoint(state.slotIndex, state.piece) ?? state.returnOrigin;
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
        this.clearDragDebug();
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
    this.clearDragDebug();
  }

  clearDragState() {
    this.destroyDragGhost();
    this.dragState = null;
  }

  clearPlacementPreview() {
    this.previewState = null;
    this.hoverCoord = null;
  }

  registerPointerCancelHandlers() {
    const canvas = this.game?.canvas;
    if (!canvas) {
      return;
    }

    this.pointerCancelHandler = () => this.handlePointerCancel();
    canvas.addEventListener('pointercancel', this.pointerCancelHandler);
    canvas.addEventListener('mouseleave', this.pointerCancelHandler);
    window.addEventListener('blur', this.pointerCancelHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      canvas.removeEventListener('pointercancel', this.pointerCancelHandler);
      canvas.removeEventListener('mouseleave', this.pointerCancelHandler);
      window.removeEventListener('blur', this.pointerCancelHandler);
    });
  }

  handlePointerCancel() {
    if (this.dragState && !this.dragState.returning) {
      this.selectionState = clearActivePieceAfterInvalidPlacement(this.selectionState);
      this.emitStatus('Not there. Choose another piece or open space.');
      this.animateGhostBackToTray(this.dragState);
      return;
    }

    if (this.previewState || this.hoverCoord) {
      this.clearPlacementPreview();
      this.redraw();
    }
  }

  isInputLocked() {
    return this.time.now < this.inputLockedUntil;
  }

  lockInputFor(duration) {
    this.inputLockedUntil = Math.max(this.inputLockedUntil, this.time.now + duration);
  }

  warnIfPreviewDiverged(preview) {
    if (!this.debugDragEnabled || !preview?.localAnchor || !preview?.previewAnchor) {
      return;
    }

    if (!isSameCoord(preview.localAnchor, preview.previewAnchor)) {
      console.warn('Hexzzle preview anchor diverged from local anchor', {
        localAnchor: preview.localAnchor,
        previewAnchor: preview.previewAnchor
      });
    }
  }

  renderDragDebug(pointer, ghostCenter, preview = null, dragState = null) {
    if (!this.debugDragEnabled || !this.dragDebugGraphics || !this.dragDebugText || !pointer || !ghostCenter) {
      return;
    }

    const dx = ghostCenter.x - pointer.x;
    const dy = ghostCenter.y - pointer.y;
    const distance = Math.hypot(dx, dy);

    this.dragDebugGraphics.clear();
    this.dragDebugGraphics.lineStyle(2, 0x17352e, 0.62);
    this.dragDebugGraphics.lineBetween(pointer.x, pointer.y, ghostCenter.x, ghostCenter.y);
    this.dragDebugGraphics.fillStyle(0xef5a5a, 0.95);
    this.dragDebugGraphics.fillCircle(pointer.x, pointer.y, 5);
    this.dragDebugGraphics.fillStyle(0x2f80ed, 0.95);
    this.dragDebugGraphics.fillCircle(ghostCenter.x, ghostCenter.y, 5);
    if (dragState?.ghostAnchorPoint) {
      this.dragDebugGraphics.fillStyle(0x8f65d9, 0.95);
      this.dragDebugGraphics.fillCircle(dragState.ghostAnchorPoint.x, dragState.ghostAnchorPoint.y, 5);
    }
    if (preview?.localAnchor) {
      const localPoint = this.boardView.toScreen(preview.localAnchor);
      this.dragDebugGraphics.fillStyle(0xf2c94c, 0.95);
      this.dragDebugGraphics.fillCircle(localPoint.x, localPoint.y, 6);
    }

    if (preview?.previewAnchor) {
      const previewPoint = this.boardView.toScreen(preview.previewAnchor);
      this.dragDebugGraphics.fillStyle(preview.valid ? 0x18756b : 0xef5a5a, 0.95);
      this.dragDebugGraphics.fillCircle(previewPoint.x, previewPoint.y, 4);
    }
    const ghostCellCenters = dragState ? getDragGhostCellCenters(dragState) : [];
    const previewCellCenters = preview?.previewAnchor && dragState?.piece
      ? getPieceCellCentersForAnchor(this.boardView.toScreen(preview.previewAnchor), dragState.piece, this.boardView.layout.hexSize)
      : [];
    ghostCellCenters.forEach((center) => {
      this.dragDebugGraphics.fillStyle(0x2f80ed, 0.82);
      this.dragDebugGraphics.fillCircle(center.x, center.y, 3);
    });
    previewCellCenters.forEach((center) => {
      this.dragDebugGraphics.fillStyle(preview?.valid ? 0x18756b : 0xef5a5a, 0.82);
      this.dragDebugGraphics.fillCircle(center.x, center.y, 2);
    });
    const previewAnchorPoint = preview?.previewAnchor ? this.boardView.toScreen(preview.previewAnchor) : null;
    const anchorDelta = previewAnchorPoint && dragState?.ghostAnchorPoint
      ? {
        x: previewAnchorPoint.x - dragState.ghostAnchorPoint.x,
        y: previewAnchorPoint.y - dragState.ghostAnchorPoint.y
      }
      : null;
    const translatedGhostCellCenters = anchorDelta
      ? ghostCellCenters.map((center) => ({
        ...center,
        x: center.x + anchorDelta.x,
        y: center.y + anchorDelta.y
      }))
      : ghostCellCenters;
    const maxCellDelta = translatedGhostCellCenters.length && previewCellCenters.length
      ? getMaxCellCenterDelta(translatedGhostCellCenters, previewCellCenters)
      : null;
    if (maxCellDelta !== null && maxCellDelta > 2) {
      console.warn('Hexzzle ghost/preview cell layout diverged', {
        maxCellDelta,
        piece: dragState?.piece?.id ?? dragState?.piece?.name ?? null,
        ghostCellCenters,
        previewCellCenters
      });
    }

    const previewLabel = preview?.previewAnchor
      ? `preview ${preview.valid ? 'valid' : preview.invalidReason ?? 'invalid'}`
      : 'preview none';
    const anchorLabel = preview?.localAnchor && preview?.previewAnchor
      ? `anchors ${isSameCoord(preview.localAnchor, preview.previewAnchor) ? 'same' : 'diverged'}`
      : 'anchors none';
    const ghostAnchorLabel = dragState?.ghostAnchorPoint
      ? `ghost anchor ${Math.round(dragState.ghostAnchorPoint.x)},${Math.round(dragState.ghostAnchorPoint.y)}`
      : 'ghost anchor none';
    const cellDeltaLabel = maxCellDelta === null
      ? 'max cell delta n/a'
      : `max cell delta ${Math.round(maxCellDelta)}px`;
    const pieceLabel = dragState?.piece
      ? `piece ${dragState.piece.name ?? dragState.piece.id ?? 'unknown'} cells ${dragState.piece.cells.length}`
      : 'piece none';
    this.dragDebugText.setText(
      `ghost dx ${Math.round(dx)} dy ${Math.round(dy)} d ${Math.round(distance)}\n${ghostAnchorLabel}\n${previewLabel} | ${anchorLabel}\n${cellDeltaLabel}\n${pieceLabel}`
    );

    const sample = {
      pointer: { x: Math.round(pointer.x), y: Math.round(pointer.y) },
      ghostCenter: { x: Math.round(ghostCenter.x), y: Math.round(ghostCenter.y) },
      ghostAnchorPoint: dragState?.ghostAnchorPoint
        ? { x: Math.round(dragState.ghostAnchorPoint.x), y: Math.round(dragState.ghostAnchorPoint.y) }
        : null,
      dx: Math.round(dx),
      dy: Math.round(dy),
      distance: Math.round(distance),
      preview: preview ? {
        localAnchor: preview.localAnchor,
        anchor: preview.previewAnchor,
        valid: preview.valid,
        invalidReason: preview.invalidReason
      } : null,
      maxCellDelta: maxCellDelta === null ? null : Math.round(maxCellDelta),
      piece: dragState?.piece ? {
        id: dragState.piece.id ?? null,
        name: dragState.piece.name ?? null,
        cellCount: dragState.piece.cells.length
      } : null,
      previewAnchorDiffers: Boolean(preview?.localAnchor && preview?.previewAnchor && !isSameCoord(preview.localAnchor, preview.previewAnchor))
    };
    const existing = getDragDebugPayload().samples ?? [];
    setDragDebugPayload({
      last: sample,
      samples: [...existing.slice(-39), sample]
    });
  }

  clearDragDebug() {
    this.dragDebugGraphics?.clear();
    if (this.dragDebugText) {
      this.dragDebugText.setText('');
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

function createBloomMessage(result) {
  if (result.chainCount > 1) {
    return `Chain x${result.chainCount}`;
  }

  if (result.groupsCleared > 1) {
    return 'Double Bloom!';
  }

  return 'Bloom!';
}

function createMergeMessage(result) {
  const bestMerge = result.merges.reduce((best, merge) => (
    !best || merge.totalCount > best.totalCount ? merge : best
  ), null);

  return bestMerge ? `Bloom Stack ${bestMerge.totalCount}/6` : 'Stack matching colors.';
}

function getDragGhostCenter(state) {
  return state.ghostCenter ?? state.returnOrigin;
}

function isDragDebugEnabled() {
  return new URLSearchParams(getDragDebugGlobal().location?.search ?? '').get(DRAG_DEBUG_PARAM) === '1';
}

function getDragDebugPayload() {
  return getDragDebugGlobal().__HEXZZLE_DRAG_DEBUG__ ?? { samples: [] };
}

function setDragDebugPayload(payload) {
  getDragDebugGlobal().__HEXZZLE_DRAG_DEBUG__ = payload;
}

function getDragDebugGlobal() {
  if (typeof window !== 'undefined') {
    return window;
  }

  if (typeof globalThis !== 'undefined') {
    return globalThis;
  }

  return {};
}

function isSameCoord(a, b) {
  return Boolean(a && b && a.q === b.q && a.r === b.r);
}

function drawPieceOnGraphics(graphics, piece, anchorX, anchorY, size, alpha = 1) {
  getPiecePixelOffsetsFromAnchor(piece, size).forEach((cell) => {
    drawHex(graphics, anchorX + cell.x, anchorY + cell.y, size, {
      fill: COLOR_MAP[cell.color] ?? 0xf2c94c,
      alpha,
      line: 0xffffff,
      lineAlpha: 0.96
    });
  });
}
