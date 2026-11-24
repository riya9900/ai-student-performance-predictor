"""Shared feature definitions + dataset loading for training and serving.

This module must stay importable WITHOUT pandas/scikit-learn (the web app imports it).

The model is trained ONLY on columns that really exist in the UCI
"Student Performance" dataset. Form fields that the dataset does not contain
(sleep hours, assignment completion, class participation, study consistency)
are NOT fed to the model - see README "Honest limitations".
"""
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
RAW_DIR = BASE_DIR / "data" / "raw"
PROCESSED_DIR = BASE_DIR / "data" / "processed"
MODELS_DIR = BASE_DIR / "models"
MODEL_PATH = MODELS_DIR / "model.npz"   # portable NumPy export (used at runtime)
METRICS_PATH = MODELS_DIR / "metrics.json"
EDA_DIR = MODELS_DIR / "eda"

TARGET = "G3"  # final grade, 0-20 (Portuguese grading scale)

NUMERIC_FEATURES = [
    "age",         # 15-22
    "studytime",   # weekly study time: 1 (<2h) 2 (2-5h) 3 (5-10h) 4 (>10h)
    "failures",    # past class failures (0-3)
    "absences",    # number of school absences
    "G1",          # first period grade (0-20)
    "G2",          # second period grade (0-20)
    "goout",       # going out with friends (1-5)
    "freetime",    # free time after school (1-5)
    "health",      # current health status (1-5)
]
CATEGORICAL_FEATURES = [
    "higher",      # wants to take higher education (yes/no)
    "internet",    # internet access at home (yes/no)
    "course",      # 'math' or 'portuguese' (added by us when merging files)
]
FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES

# Columns that identify the *same student* appearing in both course files
# (UCI documents ~382 overlapping students). Used to build leak-free CV groups.
STUDENT_KEYS = [
    "school", "sex", "age", "address", "famsize", "Pstatus", "Medu", "Fedu",
    "Mjob", "Fjob", "reason", "nursery", "internet",
]


def load_raw():
    import pandas as pd  # training-only dependency, imported lazily

    mat = pd.read_csv(RAW_DIR / "student-mat.csv", sep=";")
    por = pd.read_csv(RAW_DIR / "student-por.csv", sep=";")
    mat["course"] = "math"
    por["course"] = "portuguese"
    return pd.concat([mat, por], ignore_index=True)
