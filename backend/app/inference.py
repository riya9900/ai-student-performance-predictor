"""Portable, dependency-light inference engine (NumPy only).

scikit-learn is used ONLY at training time (ml/train.py). The trained pipeline
(StandardScaler + one-hot + Random Forest / Gradient Boosting / Ridge) is exported to a
plain ``.npz`` file of arrays, and this module evaluates it with NumPy. That means the
deployed backend needs no scikit-learn, no SciPy, no pandas and no OpenMP runtime.

The file is loaded with ``allow_pickle=False`` so it cannot execute code.
"""
from __future__ import annotations

from pathlib import Path

import numpy as np


class NumpyModel:
    def __init__(self, data: dict):
        self.kind: str = str(data["kind"])
        self.numeric = [str(s) for s in data["numeric_features"]]
        self.categorical = [str(s) for s in data["categorical_features"]]
        self.positive = [str(s) for s in data["positive_categories"]]
        self.mean = np.asarray(data["scaler_mean"], dtype=np.float64)
        self.scale = np.asarray(data["scaler_scale"], dtype=np.float64)
        self.features = self.numeric + self.categorical
        if self.kind == "ridge":
            self.coef = np.asarray(data["coef"], dtype=np.float64)
            self.intercept = float(data["intercept"])
        else:  # tree ensembles
            self.left = np.asarray(data["left"], dtype=np.int64)
            self.right = np.asarray(data["right"], dtype=np.int64)
            self.feature = np.asarray(data["feature"], dtype=np.int64)
            self.threshold = np.asarray(data["threshold"], dtype=np.float64)
            self.value = np.asarray(data["value"], dtype=np.float64)
            self.roots = np.asarray(data["roots"], dtype=np.int64)
            self.init = float(data["init"])
            self.learning_rate = float(data["learning_rate"])
            self.n_trees = len(self.roots)

    # ------------------------------------------------------------------ loading
    @classmethod
    def load(cls, path: Path | str) -> "NumpyModel":
        with np.load(path, allow_pickle=False) as z:
            return cls({k: z[k] for k in z.files})

    # ------------------------------------------------------------ preprocessing
    def vectorize(self, row: dict) -> np.ndarray:
        """dict of raw feature values -> model input vector (scaled numbers + 0/1 flags)."""
        nums = np.array([float(row[f]) for f in self.numeric], dtype=np.float64)
        scaled = (nums - self.mean) / self.scale
        flags = np.array(
            [1.0 if str(row[f]) == pos else 0.0 for f, pos in zip(self.categorical, self.positive)],
            dtype=np.float64,
        )
        return np.concatenate([scaled, flags])

    # ---------------------------------------------------------------- inference
    def _tree_values(self, x: np.ndarray) -> np.ndarray:
        # scikit-learn trees compare float32 inputs against float64 thresholds.
        x32 = x.astype(np.float32)
        idx = self.roots.copy()
        while True:
            feat = self.feature[idx]
            leaf = feat < 0
            if leaf.all():
                break
            safe_feat = np.where(leaf, 0, feat)
            go_left = x32[safe_feat] <= self.threshold[idx]
            nxt = np.where(go_left, self.left[idx], self.right[idx])
            idx = np.where(leaf, idx, nxt)
        return self.value[idx]

    def predict_vector(self, x: np.ndarray) -> float:
        if self.kind == "ridge":
            return float(x @ self.coef + self.intercept)
        vals = self._tree_values(x)
        if self.kind == "random_forest":
            return float(vals.mean())
        if self.kind == "gradient_boosting":
            return float(self.init + self.learning_rate * vals.sum())
        raise ValueError(f"unknown model kind {self.kind}")

    def predict_row(self, row: dict) -> float:
        return self.predict_vector(self.vectorize(row))
