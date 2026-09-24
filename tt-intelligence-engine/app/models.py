from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


Direction = Literal["UP", "DOWN", "DOJI", "SKIP"]
MarketType = Literal["REAL", "OTC", "UNKNOWN"]


class CandleFeature(BaseModel):
    body_ratio: float = Field(0.0, ge=-1.0, le=1.0)
    upper_wick_ratio: float = Field(0.0, ge=0.0, le=1.0)
    lower_wick_ratio: float = Field(0.0, ge=0.0, le=1.0)
    close_position: float = Field(0.5, ge=0.0, le=1.0)
    range_relative: float = Field(0.5, ge=0.0, le=2.0)


class SnapshotFeatures(BaseModel):
    pair: str
    timeframe: str = "1M"
    market_type: MarketType = "UNKNOWN"
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
    candles: list[CandleFeature] = Field(default_factory=list, max_length=12)
    visible_support: Optional[str] = None
    visible_resistance: Optional[str] = None
    notes: list[str] = Field(default_factory=list, max_length=12)


class PsychologyState(BaseModel):
    buyer_aggression: float = Field(0.0, ge=0.0, le=1.0)
    seller_aggression: float = Field(0.0, ge=0.0, le=1.0)
    rejection_up: float = Field(0.0, ge=0.0, le=1.0)
    rejection_down: float = Field(0.0, ge=0.0, le=1.0)
    absorption_buy: float = Field(0.0, ge=0.0, le=1.0)
    absorption_sell: float = Field(0.0, ge=0.0, le=1.0)
    hesitation: float = Field(0.0, ge=0.0, le=1.0)
    breakout_intent_up: float = Field(0.0, ge=0.0, le=1.0)
    breakout_intent_down: float = Field(0.0, ge=0.0, le=1.0)
    exhaustion_up: float = Field(0.0, ge=0.0, le=1.0)
    exhaustion_down: float = Field(0.0, ge=0.0, le=1.0)
    trap_risk: float = Field(0.0, ge=0.0, le=1.0)
    summary: str = ""


class ManualPsychologyInput(BaseModel):
    pair: str
    timeframe: str = "1M"
    market_type: MarketType = "UNKNOWN"
    occurred_at: datetime = Field(default_factory=datetime.utcnow)
    structure: Optional[str] = None
    psychology: PsychologyState
    notes: str = ""
    tags: list[str] = Field(default_factory=list)


class TrainingExampleInput(BaseModel):
    features: SnapshotFeatures
    psychology_override: Optional[PsychologyState] = None
    actual_direction: Literal["UP", "DOWN", "DOJI"]
    notes: str = ""
    tags: list[str] = Field(default_factory=list)


class SimilarPattern(BaseModel):
    analysis_id: str
    similarity: float
    direction: Direction
    actual_direction: Optional[Direction] = None
    result: Optional[Literal["WIN", "LOSS", "DRAW"]] = None


class Decision(BaseModel):
    state: Literal["CANDIDATE", "LOCKED", "NO_TRADE"]
    direction: Direction
    up_score: int = Field(ge=0, le=100)
    down_score: int = Field(ge=0, le=100)
    risk_vetoes: list[str] = Field(default_factory=list)
    rationale: list[str] = Field(default_factory=list)
    target_candle_open_at: Optional[datetime] = None


class AnalysisResponse(BaseModel):
    analysis_id: str
    session_id: Optional[str] = None
    analysis_mode: Literal["full", "verify"] = "full"
    features: SnapshotFeatures
    psychology: PsychologyState
    pattern_key: str
    pattern_vector: list[float]
    similar_patterns: list[SimilarPattern]
    decision: Decision


class OutcomeInput(BaseModel):
    analysis_id: str
    actual_direction: Direction
    notes: str = ""


class OutcomeResponse(BaseModel):
    analysis_id: str
    predicted_direction: Direction
    actual_direction: Direction
    result: Literal["WIN", "LOSS", "DRAW", "NOT_APPLICABLE"]
