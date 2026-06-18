import test from 'node:test';
import assert from 'node:assert/strict';

import { getTraySlotVisualState } from '../ui/TrayView.js';

const piece = { id: 'duo-blue', cells: [{ color: 'blue' }, { color: 'blue' }] };

test('dragging tray slot hides piece cells while keeping the slot visible', () => {
  const state = getTraySlotVisualState({
    piece,
    selected: true,
    dragging: true
  });

  assert.equal(state.drawSlot, true);
  assert.equal(state.drawPiece, false);
  assert.equal(state.drawLiftPlaceholder, true);
  assert.equal(state.selected, false);
});

test('selected tray slot still draws the piece before real drag lift', () => {
  const state = getTraySlotVisualState({
    piece,
    selected: true,
    dragging: false
  });

  assert.equal(state.drawSlot, true);
  assert.equal(state.drawPiece, true);
  assert.equal(state.drawLiftPlaceholder, false);
  assert.equal(state.selected, true);
});

test('used tray slot remains visible and muted without drawing a piece', () => {
  const state = getTraySlotVisualState({
    piece: null,
    selected: false,
    dragging: false
  });

  assert.equal(state.drawSlot, true);
  assert.equal(state.drawPiece, false);
  assert.equal(state.drawLiftPlaceholder, false);
  assert.equal(state.used, true);
});
