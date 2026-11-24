"""NumPy engine must reproduce the scikit-learn pipeline (needs training deps; skipped otherwise)."""
import numpy as np
import pytest

pytest.importorskip("sklearn")
pytest.importorskip("pandas")
import joblib  # noqa: E402

from app.inference import NumpyModel  # noqa: E402
from ml.common import FEATURES, MODELS_DIR, MODEL_PATH, load_raw  # noqa: E402


@pytest.fixture(scope="module")
def both():
    return joblib.load(MODELS_DIR / "model.joblib"), NumpyModel.load(MODEL_PATH)


def test_parity_all_dataset_rows(both):
    pipe, nm = both
    df = load_raw()[FEATURES]
    ref = pipe.predict(df)
    got = np.array([nm.predict_row(r) for r in df.to_dict("records")])
    assert np.max(np.abs(ref - got)) < 1e-9


def test_parity_random_inputs(both):
    import pandas as pd
    pipe, nm = both
    rng = np.random.default_rng(0)
    rows = [{
        "age": int(rng.integers(15, 23)), "studytime": int(rng.integers(1, 5)),
        "failures": int(rng.integers(0, 4)), "absences": int(rng.integers(0, 76)),
        "G1": float(rng.uniform(0, 20)), "G2": float(rng.uniform(0, 20)),
        "goout": int(rng.integers(1, 6)), "freetime": int(rng.integers(1, 6)),
        "health": int(rng.integers(1, 6)),
        "higher": rng.choice(["yes", "no"]), "internet": rng.choice(["yes", "no"]),
        "course": rng.choice(["math", "portuguese"]),
    } for _ in range(2000)]
    ref = pipe.predict(pd.DataFrame(rows)[FEATURES])
    got = np.array([nm.predict_row(r) for r in rows])
    assert np.max(np.abs(ref - got)) < 1e-9
