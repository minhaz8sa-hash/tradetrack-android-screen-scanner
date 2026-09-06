# TradeTrack Live PC Scanner v1.0.1

Chrome/Edge screen scanner for Quotex Web.

## Workflow

- Open the extension popup on an active Quotex trading tab.
- No pairing/scanner token is required.
- Click **ARM scanner** in the popup or the floating **TT SCAN** button on the Quotex chart.
- Best timing: arm around T-50 to T-30.
- The extension captures the active Quotex tab, builds context, verifies again around T-20 to T-10, and holds a stable NEXT-candle candidate locally.
- It reveals UP/DOWN only around T-5 to T-2.
- If the late candle becomes unstable or no fresh stable candidate exists, it returns NO TRADE.

## Data / privacy

The extension captures only the visible Quotex tab when armed. It sends temporary chart screenshots to the existing TradeTrack Live analysis backend. It does not click broker order buttons, place trades, or read cookies/passwords.

## Install

1. Unzip this folder.
2. Open chrome://extensions
3. Enable Developer mode.
4. Choose **Load unpacked**.
5. Select the extracted `TradeTrack-PC-Scanner` folder.
6. Open Quotex and click the extension. Optional asset/payout overrides can be saved if needed.
7. Reload Quotex once if the floating TT SCAN button does not appear.