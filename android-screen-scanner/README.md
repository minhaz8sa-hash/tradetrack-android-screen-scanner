# TradeTrack Live Android Screen Scanner v1.1

Phone companion for TradeTrack Live:

1. Create an **8-hour Scanner Token** in **TradeTrack Live → Settings → Phone Screen Scan**.
2. Open this scanner and paste the token.
3. Enable **Display over other apps** and Android **screen capture** permission.
4. Open the **Quotex Broker App** and keep the chart visible.
5. Tap the floating **TT SCAN** bubble.
6. The scanner captures **3 short-spaced chart frames** and returns **UP confirmation % / DOWN confirmation %** plus a final **UP / DOWN / WATCH** state.

## v1.1 analysis engine

- 3-frame live candle movement tracking.
- Support/resistance reaction and repeated-level testing.
- Breakout acceptance vs failed breakout.
- Retest hold/fail and trapped buyer/seller psychology.
- Wick pressure, body expansion/contraction, absorption and indecision.
- Momentum continuation vs exhaustion / mean-reversion pressure.
- HH/HL, LH/LL and visible structure changes.
- Candlestick context: engulfing, pin/hammer/shooting-star-like rejection, doji/spinning top, inside/outside bar, marubozu-like momentum, morning/evening-star-like reversals, three soldiers/crows and tweezer-like rejection.
- Visible candle-sequence psychology across the latest 3-8 candles.
- OTC behaviour is inferred only from the broker-visible chart sequence and prior scans; the app does not claim access to a secret Quotex pricing algorithm.

## Percentage meaning

UP/DOWN percentages are **confirmation weights from visible evidence**. They are not guaranteed win probabilities. Demo results can later be used to calibrate empirical probabilities.

## Privacy and safety

- Scanner captures only when you tap **TT SCAN**.
- The floating bubble hides before capture.
- The top account/balance strip is cropped out of the analysis image.
- Frames use private Base44 storage and short-lived signed URLs.
- The scanner does not tap Quotex buttons, place orders, or automate trades.

## Build

GitHub Actions builds the Android debug APK using JDK 17, Android SDK 35 and Gradle 8.9.
