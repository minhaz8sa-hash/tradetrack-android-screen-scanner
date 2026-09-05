# TradeTrack Live Android Screen Scanner v1.3

## Continuous-confidence workflow

Tap **TT SCAN once** while the current candle still has time left (ideally around 20-40 seconds).

The scanner stays armed and keeps analyzing the same running candle. It does not release a trade direction immediately.

A final signal is released only when all of these are true:
- the estimated current-candle time remaining is inside the final **5-10 second** window,
- next-candle UP/DOWN confirmation is strong,
- evidence score and independent confirmations are sufficient,
- late-candle instability is below the safety threshold.

If the window is missed or the candle becomes unstable, the scanner returns **NO TRADE** instead of chasing.

The running candle is evidence only. Every displayed UP/DOWN signal targets the **NEXT candle**.

## Learning data

Each scan session sends pattern codes, psychology codes, range state, structure, candle-size class, end-candle instability, and timing metadata to the TradeTrack Live behavior-learning backend.

The scanner does not tap broker buttons or place trades.
