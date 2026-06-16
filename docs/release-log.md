# Release Log

## 2026-06-16 - Hexzzle web game MVP

- Revamped the Hugo blog shell into a game-first Hexzzle site.
- Added pages for home, play, daily, guide, about, contact, privacy, and terms.
- Preserved existing `content/posts/` entries for `/posts/<slug>/` access.
- Added a Phaser Classic mode source tree with 37-cell radius 3 honeycomb logic.
- Added test coverage for coordinates, board placement, bloom clearing, piece generation, and share text.
- Added local best score, sound preference, one-move undo, restart, game-over result card, and share fallback behavior.
- Added SEO, social metadata, JSON-LD, related game links, and a placeholder OG SVG.

## Notes

- `CNAME` was preserved as-is.
- No login, payments, coins, gems, forced ads, rewarded ads, or third-party tracking were added.
- Pattern mode for non-color-only play is documented as a Phase 2 accessibility improvement.
