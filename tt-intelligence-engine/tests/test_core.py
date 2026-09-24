from app.models import CandleFeature, SnapshotFeatures
from app.patterns import PatternEncoder, cosine_similarity
from app.psychology import PsychologyBuilder


def sample_features() -> SnapshotFeatures:
    return SnapshotFeatures(
        pair="EUR/JPY",
        timeframe="1M",
        market_type="REAL",
        seconds_to_close=8,
        trend="BULLISH",
        structure="HH_HL",
        breakout_state="UP_RETEST",
        momentum_score=0.72,
        volatility_score=0.55,
        instability_score=0.18,
        support_distance_atr=0.65,
        resistance_distance_atr=0.45,
        candles=[
            CandleFeature(body_ratio=0.45, upper_wick_ratio=0.12, lower_wick_ratio=0.18, close_position=0.78),
            CandleFeature(body_ratio=0.55, upper_wick_ratio=0.10, lower_wick_ratio=0.12, close_position=0.82),
            CandleFeature(body_ratio=-0.18, upper_wick_ratio=0.12, lower_wick_ratio=0.42, close_position=0.62),
            CandleFeature(body_ratio=0.62, upper_wick_ratio=0.08, lower_wick_ratio=0.14, close_position=0.88),
        ],
    )


def test_psychology_detects_buyer_pressure():
    state = PsychologyBuilder().build(sample_features())
    assert state.buyer_aggression > state.seller_aggression
    assert state.breakout_intent_up > state.breakout_intent_down


def test_identical_pattern_has_similarity_one():
    f = sample_features()
    p = PsychologyBuilder().build(f)
    encoder = PatternEncoder()
    v = encoder.vectorize(f, p)
    assert cosine_similarity(v, v) > 0.9999


def test_pattern_key_is_stable():
    f = sample_features()
    p = PsychologyBuilder().build(f)
    encoder = PatternEncoder()
    v = encoder.vectorize(f, p)
    assert encoder.key(f, p, v) == encoder.key(f, p, v)


def test_support_risk_veto_blocks_down_near_support(tmp_path):
    from app.engine import TTIntelligenceEngine
    from app.storage import Storage

    features = SnapshotFeatures(
        pair="EUR/JPY",
        timeframe="1M",
        market_type="REAL",
        seconds_to_close=8,
        trend="BEARISH",
        structure="LH_LL",
        breakout_state="NONE",
        momentum_score=-0.72,
        volatility_score=0.55,
        instability_score=0.18,
        support_distance_atr=0.10,
        resistance_distance_atr=0.80,
        candles=[
            CandleFeature(body_ratio=-0.62, upper_wick_ratio=0.10, lower_wick_ratio=0.16, close_position=0.12),
            CandleFeature(body_ratio=-0.48, upper_wick_ratio=0.12, lower_wick_ratio=0.22, close_position=0.18),
        ],
    )
    engine = TTIntelligenceEngine(Storage(str(tmp_path / "tt.db")))
    result = engine.analyze_features(features, session_id="s1", analysis_mode="verify")
    assert result.decision.state == "NO_TRADE"
    assert result.decision.direction == "SKIP"
    assert any("support" in reason.lower() for reason in result.decision.risk_vetoes)


def test_verified_snapshot_can_lock_next_candle(tmp_path):
    from app.engine import TTIntelligenceEngine
    from app.storage import Storage

    engine = TTIntelligenceEngine(Storage(str(tmp_path / "tt.db")))
    result = engine.analyze_features(sample_features(), session_id="s2", analysis_mode="verify")
    assert result.decision.state == "LOCKED"
    assert result.decision.direction == "UP"
    assert result.decision.target_candle_open_at is not None
