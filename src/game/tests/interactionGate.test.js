import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canCommitDrop,
  canSelectTrayPiece,
  canStartTrayDrag,
  shouldQueueDropDuringAnimation
} from '../core/InteractionGate.js';

test('tray selection is allowed while board animation is playing', () => {
  assert.equal(canSelectTrayPiece({
    isBoardAnimating: true,
    isGameOver: false,
    isResultOpen: false
  }), true);
});

test('tray drag is allowed while board animation is playing', () => {
  assert.equal(canStartTrayDrag({
    isBoardAnimating: true,
    isGameOver: false,
    isResultOpen: false,
    hasPiece: true,
    isDragging: false
  }), true);
});

test('result or game over blocks tray interaction', () => {
  assert.equal(canSelectTrayPiece({ isGameOver: true }), false);
  assert.equal(canSelectTrayPiece({ isResultOpen: true }), false);
  assert.equal(canStartTrayDrag({ isGameOver: true, hasPiece: true }), false);
  assert.equal(canStartTrayDrag({ isResultOpen: true, hasPiece: true }), false);
});

test('used or currently dragging tray slots cannot start another drag', () => {
  assert.equal(canStartTrayDrag({ hasPiece: false }), false);
  assert.equal(canStartTrayDrag({ hasPiece: true, isDragging: true }), false);
});

test('drop commits during board animation when logical board is settled', () => {
  assert.equal(canCommitDrop({
    hasPiece: true,
    isBoardAnimating: true,
    logicalBoardSettled: true
  }), true);
});

test('drop queues during board animation only when logical board is not settled', () => {
  assert.equal(shouldQueueDropDuringAnimation({
    isBoardAnimating: true,
    logicalBoardSettled: false
  }), true);
  assert.equal(shouldQueueDropDuringAnimation({
    isBoardAnimating: true,
    logicalBoardSettled: true
  }), false);
});
