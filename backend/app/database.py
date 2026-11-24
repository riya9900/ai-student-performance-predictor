"""Persistence layer.

* If DATABASE_URL is set (postgres://...), predictions are stored in PostgreSQL (psycopg 3) -
  use this in the cloud so history survives restarts/redeploys.
* Otherwise a local SQLite file is used (zero setup for local development).
"""
import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone

from .config import DATABASE_PATH, DATABASE_URL

USE_PG = bool(DATABASE_URL)

SCHEMA = """
CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    student_name TEXT,
    course TEXT NOT NULL,
    predicted_score REAL NOT NULL,
    predicted_grade_20 REAL NOT NULL,
    interval_low REAL NOT NULL,
    interval_high REAL NOT NULL,
    category TEXT NOT NULL,
    risk_level TEXT NOT NULL,
    inputs_json TEXT NOT NULL,
    result_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pred_created ON predictions(created_at DESC);
"""


SCHEMA_PG = SCHEMA.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "BIGSERIAL PRIMARY KEY") \
                  .replace("REAL", "DOUBLE PRECISION")


class _Conn:
    """Tiny adapter so the query code below is identical for SQLite and PostgreSQL."""

    def __init__(self, raw):
        self.raw = raw

    def execute(self, sql, args=()):
        if USE_PG:
            cur = self.raw.cursor()
            cur.execute(sql.replace("?", "%s"), list(args))
            return cur
        return self.raw.execute(sql, args)


@contextmanager
def get_conn():
    if USE_PG:
        import psycopg
        from psycopg.rows import dict_row
        raw = psycopg.connect(DATABASE_URL, row_factory=dict_row, connect_timeout=10)
    else:
        DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
        raw = sqlite3.connect(DATABASE_PATH)
        raw.row_factory = sqlite3.Row
    try:
        yield _Conn(raw)
        raw.commit()
    finally:
        raw.close()


def _scalar(cur):
    r = cur.fetchone()
    return list(r.values())[0] if USE_PG else r[0]


def init_db():
    with get_conn() as c:
        for stmt in (SCHEMA_PG if USE_PG else SCHEMA).split(";"):
            if stmt.strip():
                c.execute(stmt)


def save_prediction(inputs: dict, result: dict) -> tuple[int, str]:
    created = datetime.now(timezone.utc).isoformat(timespec="seconds")
    with get_conn() as c:
        cur = c.execute(
            """INSERT INTO predictions (created_at, student_name, course, predicted_score,
               predicted_grade_20, interval_low, interval_high, category, risk_level,
               inputs_json, result_json) VALUES (?,?,?,?,?,?,?,?,?,?,?)""" + (" RETURNING id" if USE_PG else ""),
            (created, inputs.get("student_name"), inputs["course"], result["predicted_score"],
             result["predicted_grade_20"], result["interval_low"], result["interval_high"],
             result["category"], result["risk_level"], json.dumps(inputs), json.dumps(result)),
        )
        new_id = cur.fetchone()["id"] if USE_PG else cur.lastrowid
        return new_id, created


def _row(r, full: bool = False) -> dict:
    d = {k: r[k] for k in ("id", "created_at", "student_name", "course", "predicted_score",
                           "predicted_grade_20", "interval_low", "interval_high",
                           "category", "risk_level")}
    if full:
        d["inputs"] = json.loads(r["inputs_json"])
        d["result"] = json.loads(r["result_json"])
    return d


def list_history(search=None, category=None, risk=None, limit=50, offset=0) -> dict:
    where, args = [], []
    if search:
        where.append("(LOWER(student_name) LIKE LOWER(?) OR LOWER(course) LIKE LOWER(?))")
        args += [f"%{search}%", f"%{search}%"]
    if category:
        where.append("category = ?"); args.append(category)
    if risk:
        where.append("risk_level = ?"); args.append(risk)
    clause = ("WHERE " + " AND ".join(where)) if where else ""
    with get_conn() as c:
        total = _scalar(c.execute(f"SELECT COUNT(*) FROM predictions {clause}", args))
        rows = c.execute(
            f"SELECT * FROM predictions {clause} ORDER BY id DESC LIMIT ? OFFSET ?",
            args + [limit, offset]).fetchall()
    return {"total": total, "items": [_row(r) for r in rows]}


def get_prediction(pid: int):
    with get_conn() as c:
        r = c.execute("SELECT * FROM predictions WHERE id = ?", (pid,)).fetchone()
    return _row(r, full=True) if r else None


def dashboard_stats() -> dict:
    with get_conn() as c:
        total = _scalar(c.execute("SELECT COUNT(*) FROM predictions"))
        avg = _scalar(c.execute("SELECT AVG(predicted_score) FROM predictions"))
        cats = c.execute("SELECT category, COUNT(*) n FROM predictions GROUP BY category").fetchall()
        risks = c.execute("SELECT risk_level, COUNT(*) n FROM predictions GROUP BY risk_level").fetchall()
        courses = c.execute(
            "SELECT course, AVG(predicted_score) a, COUNT(*) n FROM predictions GROUP BY course").fetchall()
        trend = c.execute(
            "SELECT id, created_at, predicted_score FROM predictions ORDER BY id DESC LIMIT 20").fetchall()
        recent = c.execute("SELECT * FROM predictions ORDER BY id DESC LIMIT 5").fetchall()
    return {
        "total_predictions": total,
        "average_score": round(avg, 1) if avg is not None else None,
        "category_distribution": {r["category"]: r["n"] for r in cats},
        "risk_distribution": {r["risk_level"]: r["n"] for r in risks},
        "by_course": [{"course": r["course"], "average_score": round(r["a"], 1), "count": r["n"]} for r in courses],
        "score_trend": [{"id": r["id"], "created_at": r["created_at"], "score": r["predicted_score"]}
                        for r in reversed(trend)],
        "recent": [_row(r) for r in recent],
    }
