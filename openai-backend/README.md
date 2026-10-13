# TradeTrack 2.0 test backend

Standalone Node 22 service. Android and Chrome call this service directly; no Base44 SDK, upload integration, database or InvokeLLM is used. Existing Base44 production app is unchanged. Windows scanner remains legacy and is outside this release.

## Run

Set OPENAI_API_KEY and SCANNER_ACCESS_TOKEN (random 24+ characters) using your host's secret settings. Optional OPENAI_MODEL defaults to gpt-5.6-luna; verify access for your API project. Run `node server.mjs` or deploy the Dockerfile behind HTTPS. GET /health checks readiness. Configure the full HTTPS /analyze URL and scanner access token in Android/Chrome settings. Never put the OpenAI key in either client. API usage and hosting are billed separately.

Use a single backend instance: session verification memory is process-local and expires after 90 seconds. Restarts cause conservative NO TRADE. Limit service access to your own devices. Do not expose the HTTP port directly; use a managed HTTPS ingress.

## Timing contract

M1 only. Read countdown from screenshots, not device minute rounding or order expiration. Bind session to pair/market/timeframe and first observed candle close, tolerating at most 1.8 seconds of OCR variation. Two matching strong observations captured between T-20 and T-10 are needed. An unstable or contradictory observation clears the candidate. Clients release only between T-5 and T-2, with no request in flight. Late results, changed chart/candle, missing timer or insufficient evidence yield NO TRADE. Entry is current candle close; expiry is exactly 60 seconds later. Evidence scores are not measured win probabilities.

Screenshot timing is still an estimate. Broker-native timestamp/countdown integration would be more reliable; do not claim that this solves prediction accuracy. Slow API responses can miss the window and legitimately produce NO TRADE.

## Verification

`node --test` covers 10 decision/timing cases. Syntax checks pass for backend and Chrome scripts. No live OpenAI request has been tested without a server API key. Real Android capture, Chrome chart capture, network latency and broker timer accuracy require demo-device testing.

Demo procedure: configure backend, open M1 chart with pair/payout/countdown visible, tap once at T-50..T-30. Record screen through entry and expiry. Confirm no early direction, exact entry/expiry label, no release outside T-5..T-2. Test cancel/rearm, chart switch, API failure, slow response and candle rollover. Assess predictions separately over recorded outcomes; this build makes no accuracy guarantee.
