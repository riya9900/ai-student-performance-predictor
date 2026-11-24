"""Train, compare and save the student performance model.

Run:  python -m ml.train        (from the backend/ folder)

Steps: load -> clean -> EDA charts -> compare models with leakage-safe
GroupKFold CV + hold-out test -> ablation (without G1/G2) -> save best pipeline.
"""
import json
import warnings
from datetime import datetime, timezone

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import sklearn
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyRegressor
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.inspection import permutation_importance
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GroupKFold, GroupShuffleSplit, cross_val_predict
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from ml.common import (
    CATEGORICAL_FEATURES, EDA_DIR, FEATURES, METRICS_PATH, MODEL_PATH, MODELS_DIR,
    MODELS_DIR, NUMERIC_FEATURES, PROCESSED_DIR, STUDENT_KEYS, TARGET, load_raw,
)

warnings.filterwarnings("ignore")
SEED = 42


def build_preprocessor(numeric, categorical):
    return ColumnTransformer([
        ("num", StandardScaler(), numeric),
        ("cat", OneHotEncoder(handle_unknown="ignore", drop="if_binary"), categorical),
    ])


def candidate_models():
    return {
        "Baseline (predict mean)": DummyRegressor(strategy="mean"),
        "Ridge Regression": Ridge(alpha=1.0),
        "Random Forest": RandomForestRegressor(
            n_estimators=300, min_samples_leaf=3, random_state=SEED, n_jobs=-1),
        "Gradient Boosting": GradientBoostingRegressor(
            n_estimators=200, learning_rate=0.05, max_depth=3,
            subsample=0.8, random_state=SEED),
    }


def metrics(y_true, y_pred):
    return {
        "MAE": float(mean_absolute_error(y_true, y_pred)),
        "RMSE": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "R2": float(r2_score(y_true, y_pred)),
    }


def make_pipeline(model, numeric, categorical):
    return Pipeline([("prep", build_preprocessor(numeric, categorical)), ("model", model)])


def clean(df: pd.DataFrame) -> pd.DataFrame:
    n0 = len(df)
    df = df.drop_duplicates().copy()
    for c in df.select_dtypes("object"):
        df[c] = df[c].str.strip().str.lower()
    df = df.dropna(subset=FEATURES + [TARGET])
    df[TARGET] = df[TARGET].astype(float)
    print(f"clean: {n0} -> {len(df)} rows ({n0 - len(df)} dropped)")
    return df.reset_index(drop=True)


def make_eda(df: pd.DataFrame):
    EDA_DIR.mkdir(parents=True, exist_ok=True)
    plt.rcParams.update({"figure.dpi": 110, "axes.spines.top": False, "axes.spines.right": False})

    fig, ax = plt.subplots(figsize=(6, 3.6))
    ax.hist(df[TARGET], bins=21, range=(-0.5, 20.5), color="#6366f1", edgecolor="white")
    ax.set(title="Distribution of final grade (G3)", xlabel="G3 (0-20)", ylabel="Students")
    fig.tight_layout(); fig.savefig(EDA_DIR / "g3_distribution.png"); plt.close(fig)

    num = df[NUMERIC_FEATURES + [TARGET]]
    corr = num.corr()
    fig, ax = plt.subplots(figsize=(6.4, 5.4))
    im = ax.imshow(corr, cmap="RdBu_r", vmin=-1, vmax=1)
    ax.set_xticks(range(len(corr))); ax.set_xticklabels(corr.columns, rotation=45, ha="right")
    ax.set_yticks(range(len(corr))); ax.set_yticklabels(corr.columns)
    fig.colorbar(im, ax=ax, shrink=0.8); ax.set_title("Correlation matrix")
    fig.tight_layout(); fig.savefig(EDA_DIR / "correlation.png"); plt.close(fig)

    fig, axes = plt.subplots(1, 3, figsize=(11, 3.4))
    for ax, col in zip(axes, ["studytime", "absences", "failures"]):
        df.groupby(col)[TARGET].mean().plot(kind="bar", ax=ax, color="#8b5cf6", rot=0)
        ax.set(title=f"Mean G3 by {col}", xlabel=col, ylabel="mean G3")
    fig.tight_layout(); fig.savefig(EDA_DIR / "g3_by_factors.png"); plt.close(fig)

    return {
        "rows": int(len(df)),
        "g3_mean": float(df[TARGET].mean()),
        "g3_std": float(df[TARGET].std()),
        "fail_rate_g3_lt_10": float((df[TARGET] < 10).mean()),
        "corr_with_g3": {k: float(v) for k, v in corr[TARGET].drop(TARGET).sort_values(ascending=False).items()},
        "mean_g3_by_course": {k: float(v) for k, v in df.groupby("course")[TARGET].mean().items()},
    }


def main():
    MODELS_DIR.mkdir(exist_ok=True)
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    raw = load_raw()
    print(f"raw rows: {len(raw)}  (columns: {raw.shape[1]})")
    df = clean(raw)
    df.to_csv(PROCESSED_DIR / "students_clean.csv", index=False)
    eda = make_eda(df)

    X, y = df[FEATURES], df[TARGET]
    # Same student can appear in both course files -> keep them in the same fold.
    groups = df[STUDENT_KEYS].astype(str).agg("|".join, axis=1).factorize()[0]
    print(f"unique student groups: {groups.max() + 1}")

    # Hold-out test split by group (no student in both train and test)
    gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=SEED)
    tr, te = next(gss.split(X, y, groups))
    X_tr, X_te, y_tr, y_te, g_tr = X.iloc[tr], X.iloc[te], y.iloc[tr], y.iloc[te], groups[tr]

    cv = GroupKFold(n_splits=5)
    results = {}
    for name, model in candidate_models().items():
        pipe = make_pipeline(model, NUMERIC_FEATURES, CATEGORICAL_FEATURES)
        cv_pred = cross_val_predict(pipe, X_tr, y_tr, cv=cv, groups=g_tr)
        cv_m = metrics(y_tr, cv_pred)
        pipe.fit(X_tr, y_tr)
        test_m = metrics(y_te, np.clip(pipe.predict(X_te), 0, 20))
        results[name] = {"cv": cv_m, "test": test_m}
        print(f"{name:26s} CV RMSE={cv_m['RMSE']:.3f} R2={cv_m['R2']:.3f} | "
              f"TEST MAE={test_m['MAE']:.3f} RMSE={test_m['RMSE']:.3f} R2={test_m['R2']:.3f}")

    # Pick best by cross-validated RMSE among real models (not the baseline)
    real = {k: v for k, v in results.items() if not k.startswith("Baseline")}
    best_name = min(real, key=lambda k: real[k]["cv"]["RMSE"])
    print("best model:", best_name)

    # Ablation: how good is the model WITHOUT earlier grades G1/G2?
    no_grades = [c for c in NUMERIC_FEATURES if c not in ("G1", "G2")]
    abl_pipe = make_pipeline(candidate_models()[best_name], no_grades, CATEGORICAL_FEATURES)
    abl_pipe.fit(X_tr[no_grades + CATEGORICAL_FEATURES], y_tr)
    ablation = metrics(y_te, np.clip(abl_pipe.predict(X_te[no_grades + CATEGORICAL_FEATURES]), 0, 20))
    print("ablation (no G1/G2):", ablation)

    # Residuals from CV on training data -> honest prediction interval
    best_pipe = make_pipeline(candidate_models()[best_name], NUMERIC_FEATURES, CATEGORICAL_FEATURES)
    cv_pred = np.clip(cross_val_predict(best_pipe, X_tr, y_tr, cv=cv, groups=g_tr), 0, 20)
    resid = y_tr.to_numpy() - cv_pred
    q10, q90 = np.quantile(resid, [0.10, 0.90])

    # Feature importance on the hold-out set
    best_pipe.fit(X_tr, y_tr)
    pi = permutation_importance(best_pipe, X_te, y_te, n_repeats=15, random_state=SEED,
                                scoring="neg_root_mean_squared_error")
    importance = {f: float(v) for f, v in sorted(zip(FEATURES, pi.importances_mean), key=lambda t: -t[1])}

    # Diagnostic plots
    pred_te = np.clip(best_pipe.predict(X_te), 0, 20)
    fig, ax = plt.subplots(figsize=(4.6, 4.4))
    ax.scatter(y_te, pred_te, alpha=0.5, color="#6366f1")
    ax.plot([0, 20], [0, 20], "--", color="#94a3b8")
    ax.set(title=f"{best_name}: actual vs predicted (test)", xlabel="Actual G3", ylabel="Predicted G3")
    fig.tight_layout(); fig.savefig(MODELS_DIR / "eda" / "actual_vs_predicted.png"); plt.close(fig)
    fig, ax = plt.subplots(figsize=(6, 3.6))
    ax.barh(list(importance)[::-1], list(importance.values())[::-1], color="#8b5cf6")
    ax.set(title="Permutation importance (RMSE increase)", xlabel="importance")
    fig.tight_layout(); fig.savefig(MODELS_DIR / "eda" / "feature_importance.png"); plt.close(fig)

    # Final model: refit on ALL data for serving (metrics above are from held-out data)
    final = make_pipeline(candidate_models()[best_name], NUMERIC_FEATURES, CATEGORICAL_FEATURES)
    final.fit(X, y)
    joblib.dump(final, MODELS_DIR / "model.joblib")   # sklearn object (training/parity tests only)
    from ml.export import export_pipeline
    kind = export_pipeline(final, MODEL_PATH)           # portable NumPy export used by the API
    print("exported portable model:", MODEL_PATH.name, kind)

    info = {
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "sklearn_version": sklearn.__version__,
        "best_model": best_name,
        "target": f"{TARGET} (final grade, 0-20)",
        "features": FEATURES,
        "n_rows": int(len(df)),
        "n_unique_students": int(groups.max() + 1),
        "train_rows": int(len(tr)), "test_rows": int(len(te)),
        "model_comparison": results,
        "ablation_without_G1_G2": ablation,
        "residual_q10": float(q10), "residual_q90": float(q90),
        "feature_importance": importance,
        "eda": eda,
        "dataset": {
            "name": "Student Performance (Cortez & Silva, 2008)",
            "source": "https://archive.ics.uci.edu/dataset/320/student+performance",
            "license": "CC BY 4.0",
            "citation": "P. Cortez and A. Silva. Using Data Mining to Predict Secondary School "
                        "Student Performance. In A. Brito and J. Teixeira (Eds.), Proceedings of "
                        "5th FUture BUsiness TEChnology Conference (FUBUTEC 2008), pp. 5-12, Porto, "
                        "Portugal, April 2008.",
        },
    }
    METRICS_PATH.write_text(json.dumps(info, indent=2))
    print("saved", MODEL_PATH, "and", METRICS_PATH)


if __name__ == "__main__":
    main()
