# QA Checklist

## Functional

- [ ] Can start a new game.
- [ ] Can place pieces.
- [ ] Cannot place outside the honeycomb board.
- [ ] Cannot place on occupied cells.
- [ ] Connected same-color group of 6 clears.
- [ ] Scattered same-color cells totaling 6 do not clear.
- [ ] Group larger than 6 clears.
- [ ] Multiple bloom groups can clear.
- [ ] Score updates.
- [ ] Best score persists.
- [ ] Game over triggers correctly.
- [ ] Restart works.
- [ ] Undo works if included.
- [ ] Share button works.
- [ ] Share fallback copy works.
- [ ] Existing `/posts/<slug>/` pages still build.

## Mobile

- [ ] 360px Android Chrome
- [ ] 390px iPhone Safari
- [ ] 430px iPhone Safari
- [ ] 768px iPad
- [ ] Desktop Chrome/Safari

## Check

- [ ] No horizontal scroll.
- [ ] Board fits.
- [ ] Tray is reachable.
- [ ] Buttons are not too small.
- [ ] Result panel fits.
- [ ] Text does not overlap.
- [ ] Touch input is accurate.

## Performance

- [ ] Fast initial load.
- [ ] Smooth mobile gameplay.
- [ ] Avoid heavy image/audio files.
- [ ] Avoid unnecessary scripts.

## Trust

- [ ] Privacy page exists.
- [ ] Terms page exists.
- [ ] Contact page exists.
- [ ] Ads, if added later, are clearly separated.
- [ ] No deceptive reward UI.
- [ ] No excessive tracking.
- [ ] No competitor-like naming in public title/meta/H1.

## Accessibility Follow-Up

- [ ] Add pattern mode so colors are not the only long-term differentiator.
- [ ] Add deeper keyboard placement controls beyond basic tray selection, restart, and undo.
- [ ] Verify screen reader copy around game status and result state.
