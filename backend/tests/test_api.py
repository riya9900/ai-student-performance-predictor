import pytest
GOOD = dict(student_name="Asha", course="math", age=17, daily_study_hours=3, attendance_percent=96,
            first_term_marks=82, previous_marks=88, past_failures=0, higher_education=True,
            internet_access=True, going_out=2, free_time=3, health=4, assignment_completion=95,
            sleep_hours=8, class_participation=4, study_consistency=4, number_of_subjects=6)
WEAK = dict(GOOD, student_name="Ravi", daily_study_hours=0.5, attendance_percent=60, first_term_marks=30,
            previous_marks=25, past_failures=2, higher_education=False, assignment_completion=40,
            sleep_hours=5, class_participation=1, study_consistency=1)


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json()["status"] == "ok"


def test_model_info(client):
    r = client.get("/api/model-info")
    j = r.json()
    assert r.status_code == 200
    assert j["best_model"] in j["model_comparison"]
    assert {"MAE", "RMSE", "R2"} <= set(j["model_comparison"][j["best_model"]]["test"])
    assert len(j["model_comparison"]) >= 2


def test_predict_is_model_driven_not_constant(client):
    good = client.post("/api/predict", json=GOOD).json()
    weak = client.post("/api/predict", json=WEAK).json()
    assert good["predicted_score"] > weak["predicted_score"] + 25
    assert good["risk_level"] == "Low" and weak["risk_level"] == "High"
    assert good["interval_low"] <= good["predicted_score"] <= good["interval_high"]
    assert weak["recommendations"] and weak["what_if"]
    assert 0 <= weak["predicted_score"] <= 100


def test_predict_matches_pipeline_directly(client):
    """API output equals calling the saved pipeline by hand."""
    pytest.importorskip("sklearn")
    import pandas as pd
    from app.predictor import predictor
    from ml.common import FEATURES
    mapped = predictor.map_inputs(GOOD)
    import joblib
    from ml.common import MODELS_DIR
    pipe = joblib.load(MODELS_DIR / "model.joblib")
    direct = float(pipe.predict(pd.DataFrame([mapped])[FEATURES])[0]) * 5
    api = client.post("/api/predict", json=GOOD).json()["predicted_score"]
    assert abs(api - round(direct, 1)) < 0.11


def test_validation_errors(client):
    assert client.post("/api/predict", json=dict(GOOD, attendance_percent=150)).status_code == 422
    assert client.post("/api/predict", json={}).status_code == 422
    assert client.post("/api/predict", json=dict(GOOD, course="art")).status_code == 422


def test_history_dashboard_and_filters(client):
    a = client.post("/api/predict", json=dict(GOOD, student_name="UniqueNameXYZ")).json()
    h = client.get("/api/history", params={"search": "UniqueNameXYZ"}).json()
    assert h["total"] == 1 and h["items"][0]["id"] == a["id"]
    one = client.get(f"/api/history/{a['id']}").json()
    assert one["inputs"]["student_name"] == "UniqueNameXYZ" and "recommendations" in one["result"]
    assert client.get("/api/history/999999").status_code == 404
    assert client.get("/api/history", params={"risk": "bogus"}).status_code == 422
    d = client.get("/api/dashboard").json()
    assert d["total_predictions"] >= 1 and d["average_score"] is not None
    assert sum(d["risk_distribution"].values()) == d["total_predictions"]


def test_plots_and_cors(client):
    assert client.get("/api/model-info/plots/correlation").status_code == 200
    assert client.get("/api/model-info/plots/../../etc/passwd").status_code == 404
    r = client.options("/api/predict", headers={"Origin": "http://localhost:5173",
                                                "Access-Control-Request-Method": "POST"})
    assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"
    r = client.options("/api/predict", headers={"Origin": "http://evil.example",
                                                "Access-Control-Request-Method": "POST"})
    assert "access-control-allow-origin" not in r.headers
