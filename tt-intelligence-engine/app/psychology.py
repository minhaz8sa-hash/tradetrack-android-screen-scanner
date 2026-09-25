from __future__ import annotations

from .models import PsychologyState, SnapshotFeatures


def _clamp(value: float) -> float:
    return round(max(0.0, min(1.0, value)), 4)


def _avg(values: list[float], default: float = 0.0) -> float:
    return sum(values) / len(values) if values else default


class PsychologyBuilder:
    """
    Converts observable chart behaviour into a repeatable market-behaviour state.

    These scores do not claim to read traders' minds. "Psychology" here means
    inferred behaviour such as aggression, rejection, absorption, hesitation,
    exhaustion, and trap risk.
    """

    def build(self, f: SnapshotFeatures) -> PsychologyState:
        candles = f.candles[-6:]
        bullish_body = _avg([max(0.0, c.body_ratio) for c in candles])
        bearish_body = _avg([max(0.0, -c.body_ratio) for c in candles])
        upper_wick = _avg([c.upper_wick_ratio for c in candles])
        lower_wick = _avg([c.lower_wick_ratio for c in candles])
        close_position = _avg([c.close_position for c in candles], 0.5)
        body_size = _avg([abs(c.body_ratio) for c in candles])

        trend_up = 1.0 if f.trend == "BULLISH" else 0.0
        trend_down = 1.0 if f.trend == "BEARISH" else 0.0
        structure_up = 1.0 if f.structure in {"HH_HL", "BREAKOUT_UP", "REVERSAL_UP"} else 0.0
        structure_down = 1.0 if f.structure in {"LH_LL", "BREAKOUT_DOWN", "REVERSAL_DOWN"} else 0.0

        breakout_up = 1.0 if f.breakout_state in {"UP_HOLD", "UP_RETEST"} else 0.0
        breakout_down = 1.0 if f.breakout_state in {"DOWN_HOLD", "DOWN_RETEST"} else 0.0
        failed_breakout = 1.0 if f.breakout_state in {"FAILED_UP", "FAILED_DOWN"} else 0.0

        momentum_up = (f.momentum_score + 1.0) / 2.0
        momentum_down = (1.0 - f.momentum_score) / 2.0

        buyer_aggression = _clamp(
            0.25 * bullish_body +
            0.25 * close_position +
            0.20 * momentum_up +
            0.15 * trend_up +
            0.15 * structure_up
        )
        seller_aggression = _clamp(
            0.25 * bearish_body +
            0.25 * (1.0 - close_position) +
            0.20 * momentum_down +
            0.15 * trend_down +
            0.15 * structure_down
        )

        rejection_up = _clamp(
            0.50 * upper_wick +
            0.20 * (1.0 if f.resistance_distance_atr is not None and f.resistance_distance_atr < 0.35 else 0.0) +
            0.20 * (1.0 if f.breakout_state == "FAILED_UP" else 0.0) +
            0.10 * f.overextension_up
        )
        rejection_down = _clamp(
            0.50 * lower_wick +
            0.20 * (1.0 if f.support_distance_atr is not None and f.support_distance_atr < 0.35 else 0.0) +
            0.20 * (1.0 if f.breakout_state == "FAILED_DOWN" else 0.0) +
            0.10 * f.overextension_down
        )

        absorption_buy = _clamp(
            0.45 * lower_wick +
            0.25 * close_position +
            0.20 * structure_up +
            0.10 * (1.0 - f.instability_score)
        )
        absorption_sell = _clamp(
            0.45 * upper_wick +
            0.25 * (1.0 - close_position) +
            0.20 * structure_down +
            0.10 * (1.0 - f.instability_score)
        )

        hesitation = _clamp(
            0.35 * (1.0 - min(1.0, body_size * 1.6)) +
            0.30 * min(1.0, upper_wick + lower_wick) +
            0.20 * f.instability_score +
            0.15 * (1.0 if f.trend in {"RANGE", "UNCLEAR"} else 0.0)
        )

        breakout_intent_up = _clamp(
            0.40 * breakout_up + 0.25 * momentum_up + 0.20 * structure_up + 0.15 * buyer_aggression
        )
        breakout_intent_down = _clamp(
            0.40 * breakout_down + 0.25 * momentum_down + 0.20 * structure_down + 0.15 * seller_aggression
        )

        exhaustion_up = _clamp(
            0.40 * f.overextension_up + 0.30 * upper_wick + 0.20 * rejection_up + 0.10 * f.instability_score
        )
        exhaustion_down = _clamp(
            0.40 * f.overextension_down + 0.30 * lower_wick + 0.20 * rejection_down + 0.10 * f.instability_score
        )

        trap_risk = _clamp(
            0.30 * failed_breakout +
            0.25 * f.gap_fill_risk +
            0.20 * f.instability_score +
            0.15 * hesitation +
            0.10 * max(rejection_up, rejection_down)
        )

        dominant = "balanced"
        if buyer_aggression - seller_aggression >= 0.15:
            dominant = "buyers pressing"
        elif seller_aggression - buyer_aggression >= 0.15:
            dominant = "sellers pressing"

        summary = (
            f"{dominant}; hesitation={hesitation:.2f}; trap_risk={trap_risk:.2f}; "
            f"breakout_intent_up={breakout_intent_up:.2f}; "
            f"breakout_intent_down={breakout_intent_down:.2f}"
        )

        return PsychologyState(
            buyer_aggression=buyer_aggression,
            seller_aggression=seller_aggression,
            rejection_up=rejection_up,
            rejection_down=rejection_down,
            absorption_buy=absorption_buy,
            absorption_sell=absorption_sell,
            hesitation=hesitation,
            breakout_intent_up=breakout_intent_up,
            breakout_intent_down=breakout_intent_down,
            exhaustion_up=exhaustion_up,
            exhaustion_down=exhaustion_down,
            trap_risk=trap_risk,
            summary=summary,
        )
