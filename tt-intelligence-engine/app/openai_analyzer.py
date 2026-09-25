from __future__ import annotations

import base64
import json
import os
from typing import Iterable, Literal, Optional

from openai import AsyncOpenAI
from pydantic import BaseModel, Field

from .models import CandleFeature, SnapshotFeatures


SYSTEM_PROMPT = """
You are the visual feature extractor for TT Intelligence Engine.
Fill the provided structured schema from observable 1-minute candlestick-chart evidence only.

Rules:
- Analyze the central candlestick chart, not decorative UI, payout buttons, signal bubbles, or red zig-zag/trend-line drawings.
- Metadata readability is separate from chart readability. If pair or timer text is unreadable, use UNKNOWN/null only for that field and still analyze the candles.
- Determine trend and market structure from the visible price action.
- Extract at most the 6 most recent visible candles, oldest to newest.
- candle body_ratio: -1 strong bearish to +1 strong bullish.
- wick ratios and close_position are 0..1; range_relative is relative to recent average range.
- momentum_score: -1 strong selling to +1 strong buying.
- volatility_score, instability_score, gap_fill_risk, and overextension values are 0..1.
- support_distance_atr/resistance_distance_atr are approximate distances in recent average candle ranges; null if not defensible.
- The current running candle is evidence only. Do not output a trading instruction or guaranteed probability.
- Use UNCLEAR only when the candlestick evidence itself is genuinely unreadable or conflicting.
""".strip()


def _data_url(data: bytes) -> str:
    return "data:image/jpeg;base64," + base64.b64encode(data).decode("ascii")


class VisionSnapshot(BaseModel):
    pair: str = "UNKNOWN"
    market_type: Literal["REAL", "OTC", "UNKNOWN"] = "UNKNOWN"
    seconds_to_close: Optional[float] = Field(default=None, ge=0.0, le=120.0)
    trend: Literal["BULLISH", "BEARISH", "RANGE", "UNCLEAR"] = "UNCLEAR"
    structure: Literal[
        "HH_HL", "LH_LL", "BREAKOUT_UP", "BREAKOUT_DOWN",
        "RANGE", "REVERSAL_UP", "REVERSAL_DOWN", "UNCLEAR"
    ] = "UNCLEAR"
    breakout_state: Literal[
        "UP_HOLD", "DOWN_HOLD", "UP_RETEST", "DOWN_RETEST",
        "FAILED_UP", "FAILED_DOWN", "NONE", "UNCLEAR"
    ] = "UNCLEAR"
    momentum_score: float = Field(0.0, ge=-1.0, le=1.0)
    volatility_score: float = Field(0.5, ge=0.0, le=1.0)
    instability_score: float = Field(0.5, ge=0.0, le=1.0)
    support_distance_atr: Optional[float] = Field(default=None, ge=0.0, le=10.0)
    resistance_distance_atr: Optional[float] = Field(default=None, ge=0.0, le=10.0)
    gap_fill_risk: float = Field(0.0, ge=0.0, le=1.0)
    overextension_up: float = Field(0.0, ge=0.0, le=1.0)
    overextension_down: float = Field(0.0, ge=0.0, le=1.0)
    candles: list[CandleFeature] = Field(default_factory=list, max_length=6)


class OpenAIChartAnalyzer:
    def __init__(self, client: AsyncOpenAI | None = None):
        self.client = client
        self.model = os.getenv("OPENAI_VISION_MODEL", "gpt-5.6-luna")

    async def extract(
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
        image_detail = "high" if analysis_mode == "full" else "low"
        for frame in frames:
            content.append({
                "type": "input_image",
                "image_url": _data_url(frame),
                "detail": image_detail,
            })

        if self.client is None:
            self.client = AsyncOpenAI()
        client = self.client
        last_error: Exception | None = None

        # Structured Outputs removes the prompt-only JSON parsing failure mode that
        # previously caused intermittent 502s. Retry at most once for transient
        # network/model errors; the Android client has a hard candle deadline.
        # One bounded model call per stage. Android already has an independent
        # late verification stage, so retrying a full vision request only burns the
        # same candle deadline and can roll the UI into stale results.
        max_attempts = 1
        for attempt in range(max_attempts):
            try:
                response = await client.responses.parse(
                    model=self.model,
                    input=[{"role": "user", "content": content}],
                    text_format=VisionSnapshot,
                    reasoning={"effort": "none"},
                    timeout=8.0 if analysis_mode == "full" else 5.5,
                )
                parsed = response.output_parsed
                if parsed is None:
                    raise ValueError("OpenAI returned no parsed SnapshotFeatures")

                payload = parsed.model_dump()
                if pair_hint and (not payload.get("pair") or payload.get("pair") in {"UNKNOWN", "—"}):
                    payload["pair"] = pair_hint
                payload["timeframe"] = timeframe or payload.get("timeframe", "1M")
                if market_type != "UNKNOWN":
                    payload["market_type"] = market_type
                return SnapshotFeatures.model_validate(payload)
            except Exception as exc:
                last_error = exc
                if attempt + 1 >= max_attempts:
                    break

        raise RuntimeError(
            f"OpenAI snapshot extraction failed after {max_attempts} attempt(s): {last_error}"
        )


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
    def __init__(self, client: AsyncOpenAI | None = None):
        self.client = client
        self.model = os.getenv("OPENAI_VISION_MODEL", "gpt-5.6-luna")

    async def resolve(self, frame: bytes, *, pair_hint: str | None = None) -> dict:
        if self.client is None:
            self.client = AsyncOpenAI()
        client = self.client
        response = await client.responses.create(
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