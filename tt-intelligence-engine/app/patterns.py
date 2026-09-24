from __future__ import annotations

import math

from .models import PsychologyState, SnapshotFeatures


TREND = {"BEARISH": -1.0, "RANGE": 0.0, "UNCLEAR": 0.0, "BULLISH": 1.0}
STRUCTURE = {
    "LH_LL": -1.0,
    "BREAKOUT_DOWN": -0.9,
    "REVERSAL_DOWN": -0.6,
    "RANGE": 0.0,
    "UNCLEAR": 0.0,
    "REVERSAL_UP": 0.6,
    "BREAKOUT_UP": 0.9,
    "HH_HL": 1.0,
}
BREAKOUT = {
    "DOWN_HOLD": -1.0,
    "DOWN_RETEST": -0.8,
    "FAILED_UP": -0.5,
    "NONE": 0.0,
    "UNCLEAR": 0.0,
    "FAILED_DOWN": 0.5,
    "UP_RETEST": 0.8,
    "UP_HOLD": 1.0,
}


def _proximity(distance_atr: float | None) -> float:
    if distance_atr is None:
        return 0.0
    return max(0.0, min(1.0, 1.0 - distance_atr))


def _bucket(value: float, bins: int = 5) -> int:
    v = max(-1.0, min(1.0, value))
    return round(((v + 1.0) / 2.0) * (bins - 1))


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if len(a) != len(b) or not a:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0.0 or nb == 0.0:
        return 0.0
    return max(-1.0, min(1.0, dot / (na * nb)))


class PatternEncoder:
    def vectorize(self, f: SnapshotFeatures, p: PsychologyState) -> list[float]:
        recent = f.candles[-4:]
        avg_body = sum((c.body_ratio for c in recent), 0.0) / len(recent) if recent else 0.0
        avg_upper = sum((c.upper_wick_ratio for c in recent), 0.0) / len(recent) if recent else 0.0
        avg_lower = sum((c.lower_wick_ratio for c in recent), 0.0) / len(recent) if recent else 0.0
        avg_close = sum((c.close_position for c in recent), 0.0) / len(recent) if recent else 0.5

        return [
            TREND.get(f.trend, 0.0),
            STRUCTURE.get(f.structure, 0.0),
            BREAKOUT.get(f.breakout_state, 0.0),
            f.momentum_score,
            f.volatility_score,
            f.instability_score,
            _proximity(f.support_distance_atr),
            _proximity(f.resistance_distance_atr),
            f.gap_fill_risk,
            f.overextension_up,
            f.overextension_down,
            avg_body,
            avg_upper,
            avg_lower,
            (avg_close * 2.0) - 1.0,
            p.buyer_aggression,
            p.seller_aggression,
            p.rejection_up,
            p.rejection_down,
            p.absorption_buy,
            p.absorption_sell,
            p.hesitation,
            p.breakout_intent_up,
            p.breakout_intent_down,
            p.exhaustion_up,
            p.exhaustion_down,
            p.trap_risk,
        ]

    def key(self, f: SnapshotFeatures, p: PsychologyState, vector: list[float]) -> str:
        core = vector[:15]
        shape = "".join(str(_bucket(v)) for v in core)
        psych = "".join(str(_bucket((v * 2.0) - 1.0)) for v in vector[15:])
        return (
            f"{f.timeframe}:{f.market_type}:{f.trend}:{f.structure}:"
            f"{f.breakout_state}:S{shape}:P{psych}"
        )
