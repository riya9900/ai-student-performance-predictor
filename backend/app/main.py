import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from ml.common import EDA_DIR

from . import database
from .config import CORS_ORIGIN_REGEX, CORS_ORIGINS
from .predictor import predictor
from .schemas import PredictRequest, PredictResponse

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("api")


@asynccontextmanager
async def lifespan(_: FastAPI):
    database.init_db()
    predictor.load()
    log.info("Model ready: %s", predictor.info.get("best_model"))
    yield


app = FastAPI(
    title="AI Student Performance Predictor API",
    version="1.0.0",
    description="Predicts final grade from study habits using a model trained on the UCI Student Performance dataset.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/api/health", tags=["system"])
def health():
    return {"status": "ok" if predictor.ready else "model_not_loaded",
            "model": predictor.info.get("best_model"), "database": "sqlite"}


@app.post("/api/predict", response_model=PredictResponse, tags=["prediction"])
def predict(req: PredictRequest):
    if not predictor.ready:
        raise HTTPException(503, "Model is not loaded")
    inputs = req.model_dump()
    try:
        result = predictor.predict(inputs)
    except Exception:
        log.exception("prediction failed")
        raise HTTPException(500, "Prediction failed")
    pid, created = database.save_prediction(inputs, result)
    return {"id": pid, "created_at": created, "inputs": inputs, **result}


@app.get("/api/history", tags=["history"])
def history(
    search: str | None = Query(None, max_length=60),
    category: str | None = None,
    risk: str | None = Query(None, pattern="^(Low|Medium|High)$"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    return database.list_history(search, category, risk, limit, offset)


@app.get("/api/history/{prediction_id}", tags=["history"])
def history_item(prediction_id: int):
    item = database.get_prediction(prediction_id)
    if not item:
        raise HTTPException(404, "Prediction not found")
    return item


@app.get("/api/dashboard", tags=["history"])
def dashboard():
    return database.dashboard_stats()


@app.get("/api/model-info", tags=["model"])
def model_info():
    if not predictor.ready:
        raise HTTPException(503, "Model is not loaded")
    return predictor.info


@app.get("/api/model-info/plots/{name}", tags=["model"])
def model_plot(name: str):
    allowed = {"g3_distribution", "correlation", "g3_by_factors", "actual_vs_predicted", "feature_importance"}
    if name not in allowed:
        raise HTTPException(404, "Unknown plot")
    path = EDA_DIR / f"{name}.png"
    if not path.exists():
        raise HTTPException(404, "Plot not generated")
    return FileResponse(path, media_type="image/png")
