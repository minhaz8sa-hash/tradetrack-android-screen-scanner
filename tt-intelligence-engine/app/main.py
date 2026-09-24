from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import HTMLResponse

from .engine import TTIntelligenceEngine
from .models import (
    AnalysisResponse,
    ManualPsychologyInput,
    OutcomeInput,
    OutcomeResponse,
    PsychologyState,
    TrainingExampleInput,
)
from .openai_analyzer import OpenAIChartAnalyzer, OpenAIOutcomeResolver
from .storage import Storage


app = FastAPI(
    title="TT Intelligence Engine",
    version="0.1.0",
    description="Snapshot -> structure -> market psychology -> pattern memory -> decision.",
)

storage = Storage()
engine = TTIntelligenceEngine(storage)
chart_analyzer = OpenAIChartAnalyzer()
outcome_resolver = OpenAIOutcomeResolver()


@app.get("/dashboard", response_class=HTMLResponse)
def dashboard() -> HTMLResponse:
    path = Path(__file__).with_name("dashboard.html")
    return HTMLResponse(path.read_text(encoding="utf-8"))


@app.get("/health")
def health() -> dict:
    return {"ok": True, "engine": "tt-intelligence", "version": "0.1.0"}


@app.post("/v1/analyze", response_model=AnalysisResponse)
async def analyze(
    frame: UploadFile = File(...),
    frame2: UploadFile | None = File(None),
    frame3: UploadFile | None = File(None),
    pair: str | None = Form(None),
    timeframe: str = Form("1M"),
    market_type: str = Form("UNKNOWN"),
    analysis_mode: str = Form("full"),
    scan_session_id: str | None = Form(None),
    captured_at: str | None = Form(None),
):
    if analysis_mode not in {"full", "verify"}:
        raise HTTPException(400, "analysis_mode must be full or verify")
    if market_type not in {"REAL", "OTC", "UNKNOWN"}:
        raise HTTPException(400, "market_type must be REAL, OTC, or UNKNOWN")

    uploads = [frame, frame2, frame3]
    frames: list[bytes] = []
    for item in uploads:
        if item is None:
            continue
        blob = await item.read()
        if blob:
            frames.append(blob)

    if not frames:
        raise HTTPException(400, "at least one snapshot is required")

    try:
        features = chart_analyzer.extract(
            frames,
            pair_hint=pair,
            timeframe=timeframe,
            market_type=market_type,
            analysis_mode=analysis_mode,
        )
        dt = datetime.fromisoformat(captured_at.replace("Z", "+00:00")) if captured_at else datetime.now(timezone.utc)
        return engine.analyze_features(
            features,
            session_id=scan_session_id,
            analysis_mode=analysis_mode,
            captured_at=dt,
        )
    except Exception as exc:
        raise HTTPException(502, f"analysis_failed: {exc}") from exc


@app.post("/v1/mobile-scan")
async def mobile_scan(
    frame: UploadFile = File(...),
    frame2: UploadFile | None = File(None),
    frame3: UploadFile | None = File(None),
    capturedAt: str | None = Form(None),
    scanSessionId: str | None = Form(None),
    analysisMode: str = Form("full"),
    pair: str | None = Form(None),
    timeframe: str = Form("1M"),
    marketType: str = Form("UNKNOWN"),
):
    if analysisMode not in {"full", "verify"}:
        raise HTTPException(400, "analysisMode must be full or verify")
    if marketType not in {"REAL", "OTC", "UNKNOWN"}:
        raise HTTPException(400, "marketType must be REAL, OTC, or UNKNOWN")

    frames: list[bytes] = []
    for item in [frame, frame2, frame3]:
        if item is None:
            continue
        blob = await item.read()
        if blob:
            frames.append(blob)
    if not frames:
        raise HTTPException(400, "at least one snapshot is required")

    try:
        features = chart_analyzer.extract(
            frames,
            pair_hint=pair,
            timeframe=timeframe,
            market_type=marketType,
            analysis_mode=analysisMode,
        )
        dt = datetime.fromisoformat(capturedAt.replace("Z", "+00:00")) if capturedAt else datetime.now(timezone.utc)
        analysis = engine.analyze_features(
            features,
            session_id=scanSessionId,
            analysis_mode=analysisMode,
            captured_at=dt,
        )
        decision = analysis.decision
        psychology = analysis.psychology

        if decision.state == "NO_TRADE":
            bias_state = "NO_TRADE"
        elif features.instability_score >= 0.62:
            bias_state = "UNSTABLE"
        else:
            bias_state = "SCANNING"

        candidate_ready = (
            decision.state == "LOCKED"
            and decision.direction in {"UP", "DOWN"}
        )
        estimated_close = (
            decision.target_candle_open_at.isoformat().replace("+00:00", "Z")
            if decision.target_candle_open_at
            else ""
        )
        seconds_to_close = (
            features.seconds_to_close if features.seconds_to_close is not None else -1
        )
        rationale = "; ".join(decision.rationale[:5])
        if decision.risk_vetoes:
            rationale += ("; " if rationale else "") + "veto=" + " | ".join(decision.risk_vetoes)

        return {
            "success": True,
            "scan": {
                "analysisId": analysis.analysis_id,
                "patternKey": analysis.pattern_key,
                "upConfirmation": decision.up_score,
                "downConfirmation": decision.down_score,
                "biasState": bias_state,
                "secondsToCandleClose": seconds_to_close,
                "candidateReady": candidate_ready,
                "candidateDirection": decision.direction,
                "endInstabilityScore": round(features.instability_score * 100),
                "estimatedCandleCloseAt": estimated_close,
                "asset": features.pair,
                "payout": 0,
                "rationale": rationale,
                "psychology": psychology.model_dump(mode="json"),
                "similarPatternCount": len(analysis.similar_patterns),
                "decisionState": decision.state,
            },
        }
    except Exception as exc:
        raise HTTPException(502, f"mobile_scan_failed: {exc}") from exc


@app.post("/v1/outcome-snapshot")
async def outcome_snapshot(
    frame: UploadFile = File(...),
    analysisId: str = Form(...),
    pair: str | None = Form(None),
):
    blob = await frame.read()
    if not blob:
        raise HTTPException(400, "outcome snapshot is empty")
    analysis = storage.get_analysis(analysisId)
    if analysis is None:
        raise HTTPException(404, "analysisId not found")

    try:
        resolved = outcome_resolver.resolve(
            blob,
            pair_hint=pair or analysis.get("pair"),
        )
        if resolved["confidence"] < 0.70:
            return {
                "saved": False,
                "resolved": False,
                "analysisId": analysisId,
                **resolved,
            }

        result = storage.record_outcome(
            analysisId,
            resolved["actual_direction"],
            "automatic outcome snapshot: " + resolved["reason"],
        )
        return {
            "saved": True,
            "resolved": True,
            "analysisId": analysisId,
            "confidence": resolved["confidence"],
            "reason": resolved["reason"],
            "outcome": result,
        }
    except Exception as exc:
        raise HTTPException(502, f"outcome_snapshot_failed: {exc}") from exc


@app.post("/v1/manual-observation")
def manual_observation(item: ManualPsychologyInput) -> dict:
    payload = item.model_dump(mode="json")
    row_id = storage.save_manual_observation(payload)
    return {"saved": True, "observation_id": row_id}


@app.post("/v1/train-snapshot")
async def train_snapshot(
    frame: UploadFile = File(...),
    frame2: UploadFile | None = File(None),
    frame3: UploadFile | None = File(None),
    actual_direction: str = Form(...),
    pair: str | None = Form(None),
    timeframe: str = Form("1M"),
    market_type: str = Form("UNKNOWN"),
    notes: str = Form(""),
    psychology_json: str | None = Form(None),
    captured_at: str | None = Form(None),
):
    if actual_direction not in {"UP", "DOWN", "DOJI"}:
        raise HTTPException(400, "actual_direction must be UP, DOWN, or DOJI")
    if market_type not in {"REAL", "OTC", "UNKNOWN"}:
        raise HTTPException(400, "market_type must be REAL, OTC, or UNKNOWN")

    frames: list[bytes] = []
    for item in [frame, frame2, frame3]:
        if item is None:
            continue
        blob = await item.read()
        if blob:
            frames.append(blob)
    if not frames:
        raise HTTPException(400, "at least one snapshot is required")

    try:
        features = chart_analyzer.extract(
            frames,
            pair_hint=pair,
            timeframe=timeframe,
            market_type=market_type,
            analysis_mode="full",
        )
        psychology_override = (
            PsychologyState.model_validate_json(psychology_json)
            if psychology_json
            else None
        )
        dt = datetime.fromisoformat(captured_at.replace("Z", "+00:00")) if captured_at else datetime.now(timezone.utc)
        analysis = engine.analyze_features(
            features,
            session_id=None,
            analysis_mode="full",
            captured_at=dt,
            psychology_override=psychology_override,
        )
        outcome = storage.record_outcome(
            analysis.analysis_id,
            actual_direction,
            notes,
        )
        return {
            "saved": True,
            "analysis": analysis.model_dump(mode="json"),
            "outcome": outcome,
        }
    except Exception as exc:
        raise HTTPException(502, f"training_snapshot_failed: {exc}") from exc


@app.post("/v1/training-examples")
def training_example(item: TrainingExampleInput) -> dict:
    analysis = engine.analyze_features(
        item.features,
        session_id=None,
        analysis_mode="full",
        psychology_override=item.psychology_override,
    )
    outcome = storage.record_outcome(
        analysis.analysis_id,
        item.actual_direction,
        item.notes + (f" | tags={','.join(item.tags)}" if item.tags else ""),
    )
    return {
        "saved": True,
        "analysis": analysis.model_dump(mode="json"),
        "outcome": outcome,
    }


@app.post("/v1/outcomes", response_model=OutcomeResponse)
def record_outcome(item: OutcomeInput):
    try:
        result = storage.record_outcome(item.analysis_id, item.actual_direction, item.notes)
        return OutcomeResponse.model_validate(result)
    except KeyError:
        raise HTTPException(404, "analysis_id not found")


@app.get("/v1/learning/stats")
def learning_stats(pair: str | None = None) -> dict:
    return storage.learning_stats(pair)


@app.get("/v1/analyses/{analysis_id}")
def get_analysis(analysis_id: str):
    item = storage.get_analysis(analysis_id)
    if item is None:
        raise HTTPException(404, "analysis_id not found")
    return item
