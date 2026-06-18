# Hexzzle Leaderboard Plan

Hexzzle currently uses local-only records saved on the player's device. There is no public score submission, nickname form, D1 database, Pages Functions endpoint, or moderation backend in this phase.

## Future Public Record Fields

When public leaderboard work starts, every submitted result should include:

- `score`
- `blooms`
- `bestStack`
- `overblooms`
- `piecesPlaced`
- `durationSec`
- `ruleVersion`
- `balanceVersion`
- `createdAt`
- `rejected`
- optional `nickname`

Current versions:

- `ruleVersion`: `bloom-stack-v1`
- `balanceVersion`: `202606-quad-sixcolor-v1`

## Deployment Direction

A future leaderboard can use Cloudflare Pages Functions with D1, but it should wait until Hexzzle's rule and balance are stable enough for fair comparison.

The first public version should start with Daily or Today records before All-Time records. It should include simple anti-abuse checks, reject impossible scores, and keep personal data collection minimal. Nicknames should be optional, short, filtered, and moderated.

## Privacy And Fairness

Public records must avoid email, login, IP display, browser fingerprinting, or unnecessary tracking. Rule and balance versions are required so scores from older rule sets do not mix unfairly with newer score curves.
