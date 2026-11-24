"""Export a fitted scikit-learn Pipeline (scaler + one-hot + regressor) to a portable .npz."""
from pathlib import Path

import numpy as np
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import Ridge


def export_pipeline(pipe, path: Path) -> str:
    prep = pipe.named_steps["prep"]
    model = pipe.named_steps["model"]
    scaler = prep.named_transformers_["num"]
    ohe = prep.named_transformers_["cat"]
    numeric = [c for c in prep.transformers_[0][2]]
    categorical = [c for c in prep.transformers_[1][2]]

    # We only support binary categoricals with drop='if_binary' (positive = 2nd category).
    positives = []
    for cats, drop in zip(ohe.categories_, ohe.drop_idx_):
        if len(cats) != 2 or int(drop) != 0:
            raise ValueError("exporter supports binary categorical features only")
        positives.append(str(cats[1]))

    out = {
        "numeric_features": np.array(numeric, dtype="U32"),
        "categorical_features": np.array(categorical, dtype="U32"),
        "positive_categories": np.array(positives, dtype="U32"),
        "scaler_mean": scaler.mean_.astype(np.float64),
        "scaler_scale": scaler.scale_.astype(np.float64),
    }

    if isinstance(model, Ridge):
        kind = "ridge"
        out["coef"] = np.asarray(model.coef_, dtype=np.float64).ravel()
        out["intercept"] = np.float64(model.intercept_)
    elif isinstance(model, (RandomForestRegressor, GradientBoostingRegressor)):
        is_rf = isinstance(model, RandomForestRegressor)
        kind = "random_forest" if is_rf else "gradient_boosting"
        trees = list(model.estimators_) if is_rf else [e[0] for e in model.estimators_]
        left, right, feature, threshold, value, roots = [], [], [], [], [], []
        offset = 0
        for est in trees:
            t = est.tree_
            roots.append(offset)
            left.append(np.where(t.children_left >= 0, t.children_left + offset, -1))
            right.append(np.where(t.children_right >= 0, t.children_right + offset, -1))
            feature.append(t.feature)            # leaves are -2
            threshold.append(t.threshold)
            value.append(t.value[:, 0, 0])
            offset += t.node_count
        out.update(
            left=np.concatenate(left).astype(np.int32),
            right=np.concatenate(right).astype(np.int32),
            feature=np.concatenate(feature).astype(np.int32),
            threshold=np.concatenate(threshold).astype(np.float64),
            value=np.concatenate(value).astype(np.float64),
            roots=np.array(roots, dtype=np.int32),
        )
        if is_rf:
            out["init"] = np.float64(0.0)
            out["learning_rate"] = np.float64(1.0)
        else:
            out["init"] = np.float64(np.ravel(model.init_.constant_)[0])
            out["learning_rate"] = np.float64(model.learning_rate)
    else:
        raise ValueError(f"unsupported model type: {type(model).__name__}")

    out["kind"] = np.array(kind, dtype="U32")
    np.savez_compressed(path, **out)
    return kind
