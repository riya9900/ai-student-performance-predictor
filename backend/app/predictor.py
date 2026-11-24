"""Loads the exported (NumPy-only) model and turns form input into a prediction.

No scikit-learn / pandas / SciPy is imported here - see app/inference.py."""
import json
import logging
import threading

import numpy as np

from ml.common import METRICS_PATH, MODEL_PATH

from .inference import NumpyModel
from .config import MAX_ABSENCES, SCHOOL_DAYS_ASSUMED
from .recommendations import build_recommendations

log = logging.getLogger("predictor")
DISCLAIMER = (
    "This is a statistical estimate from a model trained on historical data from two "
    "Portuguese secondary schools. It is not a guaranteed examination result."
)


class Predictor:
    def __init__(self):
        self.model: NumpyModel | None = None
        self.info: dict = {}
        self._lock = threading.Lock()

    # ---------- loading ----------
    def load(self):
        with self._lock:
            if not self._try_load():
                log.warning("Portable model missing -> trying to train from bundled dataset")
                try:
                    from ml import train  # needs requirements-train.txt (scikit-learn, pandas)
                    train.main()
                except ImportError as exc:
                    raise RuntimeError(
                        "models/model.npz is missing and training dependencies are not installed. "
                        "Run: pip install -r requirements-train.txt && python -m ml.train"
                    ) from exc
                if not self._try_load():
                    raise RuntimeError("Could not load or train the model")

    def _try_load(self) -> bool:
        try:
            if not (MODEL_PATH.exists() and METRICS_PATH.exists()):
                return False
            info = json.loads(METRICS_PATH.read_text())
            self.model = NumpyModel.load(MODEL_PATH)
            self.info = info
            return True
        except Exception as exc:  # corrupt / incompatible file
            log.warning("model load failed: %s", exc)
            return False

    @property
    def ready(self) -> bool:
        return self.model is not None

    # ---------- feature mapping ----------
    @staticmethod
    def map_inputs(req: dict) -> dict:
        weekly = req["daily_study_hours"] * 7
        studytime = 1 if weekly < 2 else 2 if weekly <= 5 else 3 if weekly <= 10 else 4
        absences = int(round((100 - req["attendance_percent"]) / 100 * SCHOOL_DAYS_ASSUMED))
        return {
            "age": req["age"],
            "studytime": studytime,
            "failures": req["past_failures"],
            "absences": min(absences, MAX_ABSENCES),
            "G1": round(req["first_term_marks"] / 5, 2),
            "G2": round(req["previous_marks"] / 5, 2),
            "goout": req["going_out"],
            "freetime": req["free_time"],
            "health": req["health"],
            "higher": "yes" if req["higher_education"] else "no",
            "internet": "yes" if req["internet_access"] else "no",
            "course": req["course"],
        }

    def _predict_g3(self, mapped: dict) -> float:
        return float(np.clip(self.model.predict_row(mapped), 0, 20))

    # ---------- main entry ----------
    def predict(self, req: dict) -> dict:
        mapped = self.map_inputs(req)
        g3 = self._predict_g3(mapped)
        lo = float(np.clip(g3 + self.info["residual_q10"], 0, 20))
        hi = float(np.clip(g3 + self.info["residual_q90"], 0, 20))
        score = g3 * 5

        category = (
            "Excellent" if score >= 80 else "Good" if score >= 65
            else "Average" if score >= 50 else "Needs Improvement"
        )
        risk = "High" if g3 < 10 else "Medium" if (g3 < 12 or lo < 10) else "Low"

        what_if = self._what_if(mapped, g3)
        recs = build_recommendations(req, mapped, score, risk, what_if)
        return {
            "predicted_score": round(score, 1),
            "predicted_grade_20": round(g3, 2),
            "interval_low": round(lo * 5, 1),
            "interval_high": round(hi * 5, 1),
            "category": category,
            "risk_level": risk,
            "recommendations": recs,
            "what_if": what_if,
            "mapped_features": mapped,
            "disclaimer": DISCLAIMER,
        }

    def _what_if(self, mapped: dict, base_g3: float) -> list[dict]:
        """Re-run the *model* with one input changed. Associations in historical
        data - not proof that the change would cause the improvement."""
        out = []
        if mapped["studytime"] < 4:
            m = {**mapped, "studytime": mapped["studytime"] + 1}
            out.append({"change": "Move up one weekly study-time band", "delta_score":
                        round((self._predict_g3(m) - base_g3) * 5, 1)})
        if mapped["absences"] >= 4:
            m = {**mapped, "absences": max(0, mapped["absences"] // 2)}
            out.append({"change": "Halve the number of absences", "delta_score":
                        round((self._predict_g3(m) - base_g3) * 5, 1)})
        m = {**mapped, "G2": min(20, mapped["G2"] + 1)}
        out.append({"change": "Score 5 marks higher in the next exam (reflected in G2)", "delta_score":
                    round((self._predict_g3(m) - base_g3) * 5, 1)})
        return out


predictor = Predictor()
