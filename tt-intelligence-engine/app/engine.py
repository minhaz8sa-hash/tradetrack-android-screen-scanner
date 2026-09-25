from __future__ import annotations

import os
import uuid
from datetime import datetime, timedelta, timezone

from .models import AnalysisResponse, Decision, PsychologyState, SnapshotFeatures
from .patterns import PatternEncoder
from .psychology import PsychologyBuilder
from .storage import Storage


def _clip(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


class TTIntelligenceEngine:
    def __init__(self, storage: Storage):
        self.storage = storage
        self.psychology = PsychologyBuilder()
        self.patterns = PatternEncoder()
        self.min_similarity = float(os.getenv("TT_MIN_PATTERN_SIMILARITY", "0.82"))
        self.min_edge = float(os.getenv("TT_MIN_DIRECTION_EDGE", "0.15"))

    def _history_edge(self, similar, direction: str) -> tuple[float, str]:
        same_direction = [x for x in similar if x.direction == direction and x.result in {"WIN", "LOSS"}]
        if len(same_direction) < 3:
            return 0.0, "insufficient similar-pattern outcomes"

        weighted_wins = sum(x.similarity for x in same_direction if x.result == "WIN")
        weighted_total = sum(x.similarity for x in same_direction)
        if weighted_total <= 0:
            return 0.0, "insufficient similar-pattern outcomes"

        win_rate = weighted_wins / weighted_total
        # Convert historical result into a modest +/-0.15 directional adjustment.
        edge = (win_rate - 0.5) * 0.30
        return edge, f"{len(same_direction)} similar labelled patterns, weighted win rate {win_rate:.1%}"

    def _decision(
        self,
        f: SnapshotFeatures,
        p: PsychologyState,
        similar,
        *,
        analysis_mode: str,
        captured_at: datetime,
    ) -> Decision:
        rationale: list[str] = []
        vetoes: list[str] = []

        trend_edge = {
            "BULLISH": 0.16,
            "BEARISH": -0.16,
            "RANGE": 0.0,
            "UNCLEAR": 0.0,
        }[f.trend]
        structure_edge = {
            "HH_HL": 0.22,
            "BREAKOUT_UP": 0.24,
            "REVERSAL_UP": 0.16,
            "LH_LL": -0.22,
            "BREAKOUT_DOWN": -0.24,
            "REVERSAL_DOWN": -0.16,
            "RANGE": 0.0,
            "UNCLEAR": 0.0,
        }[f.structure]
        breakout_edge = {
            "UP_HOLD": 0.24,
            "UP_RETEST": 0.20,
            "DOWN_HOLD": -0.24,
            "DOWN_RETEST": -0.20,
            "FAILED_UP": -0.14,
            "FAILED_DOWN": 0.14,
            "NONE": 0.0,
            "UNCLEAR": 0.0,
        }[f.breakout_state]

        psych_edge = (
            0.20 * (p.buyer_aggression - p.seller_aggression)
            + 0.14 * (p.breakout_intent_up - p.breakout_intent_down)
            + 0.10 * (p.absorption_buy - p.absorption_sell)
            + 0.10 * (p.rejection_down - p.rejection_up)
            + 0.08 * (p.exhaustion_down - p.exhaustion_up)
        )
        raw_edge = (
            trend_edge
            + structure_edge
            + breakout_edge
            + 0.22 * f.momentum_score
            + psych_edge
        )

        preferred = "UP" if raw_edge >= 0 else "DOWN"
        history_edge, history_note = self._history_edge(similar, preferred)
        raw_edge += history_edge
        rationale.append(history_note)

        if f.instability_score >= 0.62:
            vetoes.append("late/current candle instability is high")
        if p.hesitation >= 0.72:
            vetoes.append("market behaviour is indecisive")
        if p.trap_risk >= 0.68:
            vetoes.append("trap/failed-break risk is high")
        if f.gap_fill_risk >= 0.75:
            vetoes.append("gap/FVG fill risk is high")

        if raw_edge > 0:
            if (
                f.resistance_distance_atr is not None
                and f.resistance_distance_atr < 0.28
                and f.breakout_state not in {"UP_HOLD", "UP_RETEST"}
            ):
                vetoes.append("UP would chase directly into nearby resistance without break+hold/retest")
            if p.exhaustion_up >= 0.72:
                vetoes.append("upside is overextended/exhausted")
        else:
            if (
                f.support_distance_atr is not None
                and f.support_distance_atr < 0.28
                and f.breakout_state not in {"DOWN_HOLD", "DOWN_RETEST"}
            ):
                vetoes.append("DOWN would chase directly into nearby support without break+hold/retest")
            if p.exhaustion_down >= 0.72:
                vetoes.append("downside is overextended/exhausted")

        edge = _clip(raw_edge, -1.0, 1.0)
        up_probability_like_score = _clip(0.5 + edge / 2.0)
        up_score = round(up_probability_like_score * 100)
        down_score = 100 - up_score

        if abs(edge) < self.min_edge:
            vetoes.append("directional edge is too small")

        direction = "UP" if edge > 0 else "DOWN"
        if vetoes:
            direction = "SKIP"
            state = "NO_TRADE"
        else:
            # The Android client schedules verify exactly inside the late window
            # against a locally locked 1M target. Do not depend on vision/OCR timer
            # extraction to decide whether a verification is late enough.
            state = "LOCKED" if analysis_mode == "verify" else "CANDIDATE"

        target_open = None
        if f.seconds_to_close is not None:
            target_open = captured_at.astimezone(timezone.utc) + timedelta(seconds=f.seconds_to_close)

        rationale.extend(
            [
                f"trend={f.trend}",
                f"structure={f.structure}",
                f"breakout={f.breakout_state}",
                p.summary,
            ]
        )

        return Decision(
            state=state,
            direction=direction,
            up_score=up_score,
            down_score=down_score,
            risk_vetoes=vetoes,
            rationale=rationale,
            target_candle_open_at=target_open,
        )

    def analyze_features(
        self,
        features: SnapshotFeatures,
        *,
        session_id: str | None,
        analysis_mode: str,
        captured_at: datetime | None = None,
        psychology_override: PsychologyState | None = None,
    ) -> AnalysisResponse:
        captured_at = captured_at or datetime.now(timezone.utc)
        if captured_at.tzinfo is None:
            captured_at = captured_at.replace(tzinfo=timezone.utc)

        psychology = psychology_override or self.psychology.build(features)
        vector = self.patterns.vectorize(features, psychology)
        pattern_key = self.patterns.key(features, psychology, vector)
        similar = self.storage.find_similar(
            vector,
            features.pair,
            features.timeframe,
            features.market_type,
            min_similarity=self.min_similarity,
        )
        decision = self._decision(
            features,
            psychology,
            similar,
            analysis_mode=analysis_mode,
            captured_at=captured_at,
        )

        response = AnalysisResponse(
            analysis_id=str(uuid.uuid4()),
            session_id=session_id,
            analysis_mode=analysis_mode,
            features=features,
            psychology=psychology,
            pattern_key=pattern_key,
            pattern_vector=vector,
            similar_patterns=similar,
            decision=decision,
        )
        self.storage.save_analysis(response.model_dump(mode="json"))
        return response