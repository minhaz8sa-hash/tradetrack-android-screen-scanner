# TT SCAN Next-Candle Signal Protocol v2

## Goal
Remove all ambiguity about whether a signal is for the current candle or the next candle.

## Core rule
The running candle is evidence only.
A direction is never shown as an actionable signal for the running candle.
Every actionable signal is bound to one exact target candle open time.

## State machine

### 1. ARMED
UI:
TT SCAN
ARMED

Meaning:
Scanner has been tapped. No direction yet.

### 2. ANALYZING CURRENT
UI:
ANALYZING CURRENT
NEXT CANDLE ONLY

Meaning:
The visible/running candle is being used only as evidence.

### 3. WAIT FOR TRIGGER
UI example:
WAIT
UP > 180.500
DOWN < 180.478

Meaning:
No trade yet. Structure exists but the required break/hold or rejection is not confirmed.

### 4. NEXT CANDLE CANDIDATE
UI example:
NEXT CANDLE
UP CANDIDATE
82 / 100

Meaning:
A candidate exists, but it is not actionable yet. Late verification can still cancel it.

### 5. LOCKED
Only allowed after late verification.

UI example:
NEXT 03:52
UP LOCKED
ENTRY: NEXT OPEN

Rules:
- targetCandleOpenAt must be known.
- source scan must be late/fresh.
- direction must be structurally stable.
- support/resistance veto must pass.
- no direction flip is allowed after LOCKED.
- if late evidence invalidates the setup, cancel to NO TRADE instead of flipping direction.

### 6. ENTER NEXT
Displayed only around T-3..T+3 seconds of the target candle open.

UI example:
ENTER NEXT ↑
UP
03:52 CANDLE

Meaning:
This is the only actionable state.

### 7. EXPIRED
After the entry window.

UI:
SIGNAL EXPIRED
DO NOT CHASE

No late entry should be encouraged.

### 8. NO TRADE
UI:
SKIP NEXT CANDLE
NO TRADE

Use when:
- structure is mixed
- price is too close to support/resistance
- breakout lacks hold/retest
- failed breakout/re-entry risk is high
- gap-fill/reversal risk is high
- candle becomes unstable late
- candidate changes direction during late verification
- target candle timing is uncertain

## CK-derived decision order

1. Market structure: HH/HL/LH/LL
2. Current trend and momentum
3. Support/resistance and previous high/low
4. Breakout + hold/retest or rejection confirmation
5. Gap/FVG/imbalance + gap-fill risk
6. Overextension/exhaustion
7. Late-candle instability
8. Support/resistance veto
9. Final late verification
10. Lock exact target candle or return NO TRADE

## Important UX rules

- Never display bare "UP" or "DOWN".
- Always prefix actionable direction with "NEXT" or "ENTER NEXT".
- Show exact target candle time, e.g. "NEXT 03:52".
- Show a countdown until target candle open.
- Once target candle has been open for more than 3 seconds, mark the signal EXPIRED.
- A late direction change becomes NO TRADE, never a last-second flip.
- One tap = one target candle. After signal/NO TRADE/EXPIRED, the session resets.

## Suggested backend fields

{
  "state": "LOCKED",
  "pair": "EUR/JPY",
  "timeframe": "1M",
  "currentCandleOpenAt": "2026-09-25T03:51:00+06:00",
  "targetCandleOpenAt": "2026-09-25T03:52:00+06:00",
  "targetCandleCloseAt": "2026-09-25T03:53:00+06:00",
  "direction": "UP",
  "upScore": 82,
  "downScore": 18,
  "trigger": "break + hold above resistance",
  "support": 180.478,
  "resistance": 180.500,
  "lateVerified": true,
  "riskVetoPassed": true,
  "validEntryFromMs": -3000,
  "validEntryToMs": 3000
}

## Non-negotiable rule
If the scanner cannot identify the exact target candle time confidently, it must return NO TRADE.
