from __future__ import annotations

import json
import os
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .models import SimilarPattern
from .patterns import cosine_similarity


class Storage:
    def __init__(self, path: str | None = None):
        self.path = path or os.getenv("TT_DB_PATH", "./data/tt_intelligence.db")
        Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._lock, self._connect() as conn:
            conn.executescript(
                """
                PRAGMA journal_mode=WAL;

                CREATE TABLE IF NOT EXISTS analyses (
                    id TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL,
                    session_id TEXT,
                    analysis_mode TEXT NOT NULL,
                    pair TEXT NOT NULL,
                    timeframe TEXT NOT NULL,
                    market_type TEXT NOT NULL,
                    pattern_key TEXT NOT NULL,
                    vector_json TEXT NOT NULL,
                    features_json TEXT NOT NULL,
                    psychology_json TEXT NOT NULL,
                    decision_json TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS outcomes (
                    analysis_id TEXT PRIMARY KEY,
                    recorded_at TEXT NOT NULL,
                    predicted_direction TEXT NOT NULL,
                    actual_direction TEXT NOT NULL,
                    result TEXT NOT NULL,
                    notes TEXT NOT NULL DEFAULT '',
                    FOREIGN KEY (analysis_id) REFERENCES analyses(id)
                );

                CREATE TABLE IF NOT EXISTS manual_observations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    occurred_at TEXT NOT NULL,
                    pair TEXT NOT NULL,
                    timeframe TEXT NOT NULL,
                    market_type TEXT NOT NULL,
                    structure TEXT,
                    psychology_json TEXT NOT NULL,
                    notes TEXT NOT NULL,
                    tags_json TEXT NOT NULL
                );

                CREATE INDEX IF NOT EXISTS idx_analyses_context
                    ON analyses(pair, timeframe, market_type, created_at);
                CREATE INDEX IF NOT EXISTS idx_analyses_pattern
                    ON analyses(pattern_key);
                """
            )

    def save_analysis(self, payload: dict[str, Any]) -> None:
        now = datetime.now(timezone.utc).isoformat()
        with self._lock, self._connect() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO analyses (
                    id, created_at, session_id, analysis_mode, pair, timeframe,
                    market_type, pattern_key, vector_json, features_json,
                    psychology_json, decision_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    payload["analysis_id"],
                    now,
                    payload.get("session_id"),
                    payload["analysis_mode"],
                    payload["features"]["pair"],
                    payload["features"]["timeframe"],
                    payload["features"]["market_type"],
                    payload["pattern_key"],
                    json.dumps(payload["pattern_vector"]),
                    json.dumps(payload["features"]),
                    json.dumps(payload["psychology"]),
                    json.dumps(payload["decision"]),
                ),
            )

    def save_manual_observation(self, item: dict[str, Any]) -> int:
        with self._lock, self._connect() as conn:
            cur = conn.execute(
                """
                INSERT INTO manual_observations (
                    occurred_at, pair, timeframe, market_type, structure,
                    psychology_json, notes, tags_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    item["occurred_at"],
                    item["pair"],
                    item["timeframe"],
                    item["market_type"],
                    item.get("structure"),
                    json.dumps(item["psychology"]),
                    item.get("notes", ""),
                    json.dumps(item.get("tags", [])),
                ),
            )
            return int(cur.lastrowid)

    def get_analysis(self, analysis_id: str) -> dict[str, Any] | None:
        with self._connect() as conn:
            row = conn.execute("SELECT * FROM analyses WHERE id = ?", (analysis_id,)).fetchone()
        if row is None:
            return None
        return {
            "analysis_id": row["id"],
            "session_id": row["session_id"],
            "analysis_mode": row["analysis_mode"],
            "pair": row["pair"],
            "timeframe": row["timeframe"],
            "market_type": row["market_type"],
            "pattern_key": row["pattern_key"],
            "pattern_vector": json.loads(row["vector_json"]),
            "features": json.loads(row["features_json"]),
            "psychology": json.loads(row["psychology_json"]),
            "decision": json.loads(row["decision_json"]),
        }

    def record_outcome(self, analysis_id: str, actual_direction: str, notes: str) -> dict[str, str]:
        analysis = self.get_analysis(analysis_id)
        if analysis is None:
            raise KeyError("analysis_not_found")

        predicted = str(analysis["decision"]["direction"])
        if predicted not in {"UP", "DOWN"}:
            result = "NOT_APPLICABLE"
        elif actual_direction == "DOJI":
            result = "DRAW"
        elif predicted == actual_direction:
            result = "WIN"
        else:
            result = "LOSS"

        with self._lock, self._connect() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO outcomes (
                    analysis_id, recorded_at, predicted_direction,
                    actual_direction, result, notes
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    analysis_id,
                    datetime.now(timezone.utc).isoformat(),
                    predicted,
                    actual_direction,
                    result,
                    notes,
                ),
            )
        return {
            "analysis_id": analysis_id,
            "predicted_direction": predicted,
            "actual_direction": actual_direction,
            "result": result,
        }

    def find_similar(
        self,
        vector: list[float],
        pair: str,
        timeframe: str,
        market_type: str,
        min_similarity: float,
        limit: int = 20,
    ) -> list[SimilarPattern]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                SELECT a.id, a.vector_json, a.decision_json,
                       o.actual_direction, o.result
                FROM analyses a
                JOIN outcomes o ON o.analysis_id = a.id
                WHERE a.pair = ? AND a.timeframe = ? AND a.market_type = ?
                  AND o.result IN ('WIN', 'LOSS', 'DRAW')
                ORDER BY a.created_at DESC
                LIMIT 1000
                """,
                (pair, timeframe, market_type),
            ).fetchall()

        scored: list[SimilarPattern] = []
        for row in rows:
            other = json.loads(row["vector_json"])
            similarity = cosine_similarity(vector, other)
            if similarity < min_similarity:
                continue
            decision = json.loads(row["decision_json"])
            scored.append(
                SimilarPattern(
                    analysis_id=row["id"],
                    similarity=round(similarity, 4),
                    direction=decision.get("direction", "SKIP"),
                    actual_direction=row["actual_direction"],
                    result=row["result"],
                )
            )

        scored.sort(key=lambda x: x.similarity, reverse=True)
        return scored[:limit]


    def learning_stats(self, pair: str | None = None) -> dict[str, int]:
        where = ""
        params: tuple = ()
        if pair:
            where = " WHERE pair = ?"
            params = (pair,)

        with self._connect() as conn:
            analyses = conn.execute(
                f"SELECT COUNT(*) AS n FROM analyses{where}", params
            ).fetchone()["n"]

            patterns = conn.execute(
                f"SELECT COUNT(DISTINCT pattern_key) AS n FROM analyses{where}", params
            ).fetchone()["n"]

            if pair:
                labelled = conn.execute(
                    """
                    SELECT COUNT(*) AS n
                    FROM outcomes o
                    JOIN analyses a ON a.id = o.analysis_id
                    WHERE a.pair = ? AND o.result IN ('WIN','LOSS','DRAW')
                    """,
                    (pair,),
                ).fetchone()["n"]
                rows = conn.execute(
                    """
                    SELECT o.result, COUNT(*) AS n
                    FROM outcomes o
                    JOIN analyses a ON a.id = o.analysis_id
                    WHERE a.pair = ? AND o.result IN ('WIN','LOSS','DRAW')
                    GROUP BY o.result
                    """,
                    (pair,),
                ).fetchall()
                manual = conn.execute(
                    "SELECT COUNT(*) AS n FROM manual_observations WHERE pair = ?",
                    (pair,),
                ).fetchone()["n"]
            else:
                labelled = conn.execute(
                    "SELECT COUNT(*) AS n FROM outcomes WHERE result IN ('WIN','LOSS','DRAW')"
                ).fetchone()["n"]
                rows = conn.execute(
                    """
                    SELECT result, COUNT(*) AS n
                    FROM outcomes
                    WHERE result IN ('WIN','LOSS','DRAW')
                    GROUP BY result
                    """
                ).fetchall()
                manual = conn.execute(
                    "SELECT COUNT(*) AS n FROM manual_observations"
                ).fetchone()["n"]

        result_counts = {row["result"]: row["n"] for row in rows}
        return {
            "analyses": int(analyses),
            "unique_patterns": int(patterns),
            "labelled_outcomes": int(labelled),
            "wins": int(result_counts.get("WIN", 0)),
            "losses": int(result_counts.get("LOSS", 0)),
            "draws": int(result_counts.get("DRAW", 0)),
            "manual_psychology_observations": int(manual),
        }
