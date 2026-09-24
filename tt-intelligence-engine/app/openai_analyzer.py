from __future__ import annotations

import base64
import json
import os
from typing import Iterable

from openai import OpenAI

from .models import SnapshotFeatures


SYSTEM_PROMPT = """
You are the visual feature extractor for TT Intelligence Engine.
You are NOT placing a trade. Extract only observable 1-minute chart evidence.

Return exactly one JSON object matching this shape:
{
  "pair": "EUR/JPY",
  "timeframe": "1M",
  "market_type": "REAL|OTC|UNKNOWN",
  "seconds_to_close": 12.0,
  "trend": "BULLISH|BEARISH|RANGE|UNCLEAR",
  "structure": "HH_HL|LH_LL|BREAKOUT_UP|BREAKOUT_DOWN|RANGE|REVERSAL_UP|REVERSAL_DOWN|UNCLEAR",
  "breakout_state": "UP_HOLD|DOWN_HOLD|UP_RETEST|DOWN_RETEST|FAILED_UP|FAILED_DOWN|NONE|UNCLEAR",
  "momentum_score": 0.0,
  "volatility_score": 0.5,
  "instability_score": 0.5,
  "support_distance_atr": null,
  "resistance_distance_atr": null,
  "gap_fill_risk": 0.0,
  "overextension_up": 0.0,
  "overextension_down": 0.0,
  "candles": [
    {
      "body_ratio": 0.0,
      "upper_wick_ratio": 0.0,
      "lower_wick_ratio": 0.0,
      "close_position": 0.5,
      "range_relative": 0.5
    }
  ],
  "visible_support": null,
  "visible_resistance": null,
  "notes": []
}

Rules:
- momentum_score is -1 strong selling to +1 strong buying.
- All other score-like values are 0..1.
- Candle body_ratio is -1..1; negative is bearish, positive is bullish.
- Extract up to the most recent 12 visible candles, oldest to newest.
- support_distance_atr/resistance_distance_atr are approximate distances in units
  of recent average candle range; use null if not visually defensible.
- Do not invent a pair, timer, support, resistance, or price not visible.
- If uncertain use UNKNOWN/UNCLEAR/null and explain briefly in notes.
- Current/running candle is evidence only; do not output an UP/DOWN trading signal.
- Output JSON only, with no markdown.
""".strip()


def _data_url(data: bytes) -> str:
    return "data:image/jpeg;base64," + base64.b64encode(data).decode("ascii")


class OpenAIChartAnalyzer:
    def __init__(self, client: OpenAI | None = None):
        self.client = client
        self.model = os.getenv("OPENAI_VISION_MODEL", "gpt-5.6-luna")

    def extract(
        self,
        frames: Iterable[bytes],
        *,
        pair_hint: str | None,
        timeframe: str,
        market_type: str,
        analysis_mode: str,
    ) -> SnapshotFeatures:
        content: list[dict] = [
            {
                "type": "input_text",
                "text": (
                    SYSTEM_PROMPT
                    + "\n\nClient hints (use only when consistent with the image): "
                    + json.dumps(
                        {
                            "pair_hint": pair_hint,
                            "timeframe": timeframe,
                            "market_type": market_type,
                            "analysis_mode": analysis_mode,
                        }
                    )
                ),
            }
        ]
        for frame in frames:
            content.append({"type": "input_image", "image_url": _data_url(frame)})

        client = self.client or OpenAI()
        response = client.responses.create(
            model=self.model,
            input=[{"role": "user", "content": content}],
        )

        raw = response.output_text.strip()
        if raw.startswith("```"):
            raw = raw.strip("`")
            if raw.startswith("json"):
                raw = raw[4:].strip()

        payload = json.loads(raw)
        if pair_hint and (not payload.get("pair") or payload.get("pair") in {"UNKNOWN", "—"}):
            payload["pair"] = pair_hint
        payload["timeframe"] = timeframe or payload.get("timeframe", "1M")
        if market_type != "UNKNOWN":
            payload["market_type"] = market_type
        return SnapshotFeatures.model_validate(payload)


OUTCOME_PROMPT = """
You are resolving the outcome of a previously targeted 1-minute candle from a
chart screenshot captured immediately after that candle closed.

Identify the most recently CLOSED candle immediately to the left of the current
running candle. Return JSON only:
{
  "actual_direction": "UP|DOWN|DOJI",
  "confidence": 0.0,
  "reason": "short observable reason"
}

Rules:
- UP: close is visibly above open.
- DOWN: close is visibly below open.
- DOJI: open/close are effectively indistinguishable or direction is not reliable.
- Do not infer a trading signal.
- If the latest closed candle cannot be identified confidently, use DOJI with
  confidence below 0.70.
""".strip()


class OpenAIOutcomeResolver:
    def __init__(self, client: OpenAI | None = None):
        self.client = client
        self.model = os.getenv("OPENAI_VISION_MODEL", "gpt-5.6-luna")

    def resolve(self, frame: bytes, *, pair_hint: str | None = None) -> dict:
        client = self.client or OpenAI()
        response = client.responses.create(
            model=self.model,
            input=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": OUTCOME_PROMPT + "\nPair hint: " + str(pair_hint or "UNKNOWN"),
                        },
                        {
                            "type": "input_image",
                            "image_url": _data_url(frame),
                        },
                    ],
                }
            ],
        )
        raw = response.output_text.strip()
        if raw.startswith("```"):
            raw = raw.strip("`")
            if raw.startswith("json"):
                raw = raw[4:].strip()
        payload = json.loads(raw)
        direction = str(payload.get("actual_direction", "DOJI")).upper()
        if direction not in {"UP", "DOWN", "DOJI"}:
            direction = "DOJI"
        confidence = float(payload.get("confidence", 0.0))
        confidence = max(0.0, min(1.0, confidence))
        return {
            "actual_direction": direction,
            "confidence": confidence,
            "reason": str(payload.get("reason", "")),
        }
