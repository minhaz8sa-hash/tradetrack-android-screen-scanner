# TradeTrack Live Android Screen Scanner v1.4

## Exact workflow

1. Open Quotex and keep the running M1 candle visible.
2. Tap **TT SCAN once** when the running candle has roughly **50-30 seconds left**.
3. The app stays ARMED and builds context from the running candle.
4. It verifies the same running candle again around the last **20-10 seconds**.
5. A stable next-candle candidate is held locally so cloud latency does not make the result appear after the candle changes.
6. Only around **T-5 to T-2** does the overlay reveal:

   NEXT ↑ UP
   or
   NEXT ↓ DOWN

7. If the late candle becomes unstable or a fresh confirmation is not available, the app returns **NO TRADE**.

The running candle is evidence only. The UP/DOWN direction always targets the **NEXT candle**.

## v1.4 timing changes

- Full context scan uses 3 frames.
- Later verification scans use a smaller single frame to reduce latency.
- The bubble is hidden only while capturing, then shows **ANALYZING NEXT** during network/model processing.
- Backend estimates the current candle close time from the visible timer.
- Android keeps the close timestamp locally and releases the held candidate at T-5..T-2.
- A candidate used for final display must come from a late scan (source timer <= 15 seconds) and pass the stability threshold.
- One weak/unreadable frame does not stop the armed workflow; the scanner keeps checking until the final window.

No automatic trade is placed.
