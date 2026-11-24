import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Comma-separated list of allowed browser origins (your Vercel URL in production)
CORS_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if o.strip()
]
# Optional regex, e.g. r"https://.*\.vercel\.app" to also allow Vercel preview URLs
CORS_ORIGIN_REGEX = os.getenv("CORS_ORIGIN_REGEX") or None

DATABASE_PATH = Path(os.getenv("DATABASE_PATH", BASE_DIR / "data" / "predictions.db"))

# Assumption used to turn "attendance %" into the dataset's "number of absences".
SCHOOL_DAYS_ASSUMED = 90
MAX_ABSENCES = 75  # largest value present in the dataset

# PostgreSQL connection string for cloud deployments (e.g. Neon/Supabase). Empty -> local SQLite.
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = "postgresql://" + DATABASE_URL[len("postgres://"):]
