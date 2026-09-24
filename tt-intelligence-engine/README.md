# TT Intelligence Engine v0.1

The new TT SCAN backend is designed around one pipeline:

**Snapshot -> observable chart features -> market-behaviour psychology -> pattern fingerprint -> similar labelled history -> risk gate -> NEXT-candle candidate/lock**

## Why this exists

The old TT SCAN could identify direction but the user could still be unsure whether the direction applied to the running candle or the next candle. The v2 engine separates those concerns:

- The current candle is evidence only.
- The engine creates a candidate for one target NEXT candle.
- A late verification can LOCK the candidate.
- If late evidence invalidates it, the result becomes NO_TRADE instead of flipping direction at the last second.
- Every analysis can later receive the actual candle outcome so pattern memory improves.

## Market psychology

"Psychology" is deliberately measurable behaviour, not mind reading. The engine derives:

- buyer/seller aggression
- upside/downside rejection
- buy/sell absorption
- hesitation
- breakout intent
- upside/downside exhaustion
- trap risk

The deterministic builder combines observed candle bodies/wicks, close location, trend, HH/HL or LH/LL structure, breakout state, support/resistance proximity, volatility, instability, gap-fill risk, and overextension.

Manual psychology/trading observations can also be stored through `POST /v1/manual-observation`.

## Pattern learning

Each snapshot becomes a numeric pattern vector plus a bucketed fingerprint. After the actual NEXT candle is known, `POST /v1/outcomes` labels the analysis WIN/LOSS/DRAW. Future scans query structurally similar patterns for the same pair/timeframe/market type.

This is outcome-calibrated memory, not uncontrolled self-modifying model training.

## API

### POST /v1/analyze

Multipart fields:

- `frame` required
- `frame2`, `frame3` optional
- `pair` optional hint
- `timeframe` default `1M`
- `market_type`: `REAL`, `OTC`, or `UNKNOWN`
- `analysis_mode`: `full` or `verify`
- `scan_session_id`
- `captured_at` ISO timestamp

Returns:

- extracted chart features
- market-psychology state
- pattern key/vector
- similar labelled historical patterns
- decision: CANDIDATE / LOCKED / NO_TRADE
- target next-candle open time when the chart timer can be read

### POST /v1/train-snapshot

Upload one to three historical chart screenshots plus `actual_direction=UP|DOWN|DOJI`.
The engine extracts the structure/candle sequence, builds psychology, creates the
pattern fingerprint, and immediately labels the actual next-candle outcome.
An optional `psychology_json` field can override the automatically derived
psychology when a human-reviewed interpretation is available.

### POST /v1/training-examples

Use this for curated historical/CK examples. Supply normalized chart features,
an optional human-reviewed psychology state, and the actual next-candle direction.
The engine stores the same pattern vector used by live scans and immediately labels
the outcome, so it can participate in future similar-pattern retrieval.

### POST /v1/outcomes

```json
{
  "analysis_id": "...",
  "actual_direction": "UP",
  "notes": "Next M1 candle closed bullish"
}
```

This is the learning feedback loop.

### POST /v1/manual-observation

Allows manually curated market/trading psychology data to be stored without pretending it came from the screenshot model.

## Local run

```bash
cd tt-intelligence-engine
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export OPENAI_API_KEY="..."
uvicorn app.main:app --host 0.0.0.0 --port 8080
```

Do not commit the API key and do not place it in the Android APK.

## Current milestone

v0.1 implements the core engine, storage, pattern matching, psychology builder and learning feedback API.

Next milestone: point Android `CaptureService.java` at this backend, persist one `scan_session_id` across full+verify calls, and automatically submit the observed NEXT-candle outcome.
