# Analytics Plan

Hexzzle MVP should launch without unnecessary third-party tracking.

## Principles

- Measure only what helps improve the game.
- Do not collect secrets, contact data, payment data, or precise personal data.
- Do not add aggressive monetization funnels.
- Keep analytics optional to the build and documented in the privacy page before enabling.

## Candidate Events For A Later Phase

- `game_start`
- `piece_place`
- `bloom_clear`
- `undo_used`
- `game_over`
- `share_clicked`
- `share_completed`

## Suggested Properties

- Mode: `classic` or future `daily`
- Score bucket
- Bloom count bucket
- Best Stack bucket
- Overbloom count bucket
- Pieces placed bucket
- Viewport category: phone, tablet, desktop

## Guardrails

- Avoid session replay.
- Avoid fingerprinting.
- Avoid cross-site ad identifiers.
- Keep IP retention minimized if Cloudflare analytics are used.
- Update `/privacy/` before enabling any additional analytics.
