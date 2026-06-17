# QA Checklist

## Functional

- [ ] Can start a new game.
- [ ] Can place pieces.
- [ ] Cannot place outside the honeycomb board.
- [ ] Cannot place on occupied cells.
- [ ] Same-color adjacent cells merge into one Bloom Stack.
- [ ] Stack count displays clearly for counts 2 to 5.
- [ ] Stack count 6 blooms and clears.
- [ ] Disconnected same-color stacks do not merge.
- [ ] Stack larger than 6 blooms and gives extra score.
- [ ] Multiple affected colors can resolve from one placement.
- [ ] Tray duplicate pieces show one `+` stack-point marker per duplicated color.
- [ ] Same-color duplicated pieces gather into the marked stack point before the count settles.
- [ ] Valid preview shows stack hints such as 5/6 or Bloom!
- [ ] Invalid preview does not show stack hints.
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
