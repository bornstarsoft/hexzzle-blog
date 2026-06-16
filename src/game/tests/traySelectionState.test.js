import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearActivePieceAfterPlacement,
  createTraySelectionState,
  getActiveTrayPiece,
  keepActivePieceAfterInvalidPlacement,
  selectTrayPiece,
  useActiveTrayPiece
} from '../core/TraySelectionState.js';

const tray = [
  { id: 'single-red', cells: [{ dq: 0, dr: 0, color: 'red' }] },
  { id: 'single-blue', cells: [{ dq: 0, dr: 0, color: 'blue' }] },
  null
];

test('selects only a tray slot that still has a piece', () => {
  const state = createTraySelectionState();
  const selected = selectTrayPiece(state, tray, 1);
  const ignored = selectTrayPiece(selected, tray, 2);

  assert.equal(selected.activePieceIndex, 1);
  assert.equal(ignored.activePieceIndex, 1);
});

test('empty or used tray slots cannot provide an active drag piece', () => {
  assert.equal(getActiveTrayPiece({ activePieceIndex: 2 }, tray), null);
  assert.equal(getActiveTrayPiece({ activePieceIndex: null }, tray), null);
  assert.equal(getActiveTrayPiece({ activePieceIndex: 1 }, tray), tray[1]);
});

test('successful placement clears active selection without auto-selecting the next piece', () => {
  const result = useActiveTrayPiece({
    tray,
    activePieceIndex: 0
  });
  const cleared = clearActivePieceAfterPlacement({ activePieceIndex: 0 });

  assert.equal(result.tray.length, 3);
  assert.equal(result.tray[0], null);
  assert.equal(result.tray[1], tray[1]);
  assert.equal(result.activePieceIndex, null);
  assert.equal(cleared.activePieceIndex, null);
});

test('invalid placement keeps the same selected piece active', () => {
  const state = { activePieceIndex: 1 };
  const nextState = keepActivePieceAfterInvalidPlacement(state);

  assert.deepEqual(nextState, state);
});
