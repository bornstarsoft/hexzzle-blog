import test from 'node:test';
import assert from 'node:assert/strict';

import {
  clearActivePieceAfterPlacement,
  keepActivePieceAfterInvalidPlacement,
  selectTrayPiece,
  useActiveTrayPiece
} from '../core/TraySelectionState.js';

const tray = [
  { id: 'a', cells: [{ dq: 0, dr: 0, color: 'red' }] },
  { id: 'b', cells: [{ dq: 0, dr: 0, color: 'blue' }] },
  { id: 'c', cells: [{ dq: 0, dr: 0, color: 'yellow' }] }
];

test('selects only an explicitly tapped tray piece', () => {
  assert.deepEqual(selectTrayPiece({ activePieceIndex: null }, tray, 1), {
    activePieceIndex: 1
  });
});

test('ignores empty used tray slots when selecting', () => {
  const usedTray = [tray[0], null, tray[2]];

  assert.deepEqual(selectTrayPiece({ activePieceIndex: 0 }, usedTray, 1), {
    activePieceIndex: 0
  });
});

test('successful placement clears active selection and keeps the used slot represented', () => {
  const result = useActiveTrayPiece({
    tray,
    activePieceIndex: 1
  });

  assert.equal(result.activePieceIndex, null);
  assert.equal(result.tray.length, 3);
  assert.equal(result.tray[1], null);
  assert.equal(result.tray[0]?.id, 'a');
  assert.equal(result.tray[2]?.id, 'c');
});

test('successful placement does not auto-select the next tray piece', () => {
  assert.deepEqual(clearActivePieceAfterPlacement({ activePieceIndex: 0 }), {
    activePieceIndex: null
  });
});

test('invalid placement keeps the same selected piece active', () => {
  assert.deepEqual(keepActivePieceAfterInvalidPlacement({ activePieceIndex: 2 }), {
    activePieceIndex: 2
  });
});
