# AI Student Performance & Learning Predictor

A full-stack machine-learning web app that estimates a student's final grade from study habits and earlier marks, flags academic risk, and suggests where to improve.

- **Frontend:** React + Vite + Tailwind CSS + Recharts (light/dark mode, responsive)
- **Backend:** FastAPI + Pydantic + PostgreSQL (cloud) / SQLite (local)
- **ML:** pandas, NumPy, scikit-learn, Matplotlib at *training* time; the trained model is exported to a portable `model.npz` and served with **NumPy only** (no scikit-learn at runtime) — a *really trained* model, no hard-coded scores

> ⚠️ **Predictions are statistical estimates, not guaranteed exam results.** See [Honest limitations](#honest-limitations).

---

## Table of contents
1. [Features](#features)
2. [Technology stack](#technology-stack)
3. [Architecture](#architecture)
4. [Folder structure](#folder-structure)
5. [Installation & running locally (Windows)](#running-locally)
6. [Dataset](#dataset)
7. [ML model](#ml-model)
8. [Honest limitations](#honest-limitations)
9. [API documentation](#api-documentation)
10. [Running the tests](#running-the-tests)
11. [Upload to GitHub](#upload-to-github)
12. [Deploy the frontend on Vercel](#deploy-the-frontend-on-vercel)
13. [Deploy the backend on Render](#deploy-the-backend-on-render)
14. [Explaining it in an interview](#explaining-it-in-an-interview)

---

## Features
- **Landing page** with introduction, features, how-it-works and a *Get Started* button
- **Dashboard** — total predictions, average predicted score, performance trend, risk overview, category split, recent predictions
- **Prediction form** — study hours, attendance, earlier/recent marks, failures, lifestyle, assignments, sleep, participation, consistency, number of subjects
- **Results page** — predicted score (%), performance category, risk level, an 80 % likely range, radar profile chart, personalised recommendations, and "what-if" estimates computed by the model
- **History** — every prediction saved in SQLite; search by name/subject, filter by risk and category, open full details
- **About** — dataset, licence, model comparison table, feature importance, EDA charts, conversion table, limitations
- Light & dark mode, responsive on phone / tablet / desktop

## Technology stack
| Layer | Tools |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS 4, Recharts, Lucide icons, React Router |
| Backend | Python, FastAPI, Pydantic, Uvicorn |
| ML | training: pandas, scikit-learn, Matplotlib · serving: NumPy only (`model.npz`) |
| Database | PostgreSQL via `DATABASE_URL` (cloud) · SQLite fallback (local) |
| Deployment | GitHub, Vercel (frontend), Render (backend) — **no Docker** |

## Architecture
```
 Browser (React SPA)  ──HTTP/JSON──►  FastAPI  ──►  NumPy model (model.npz)
        ▲                               │
        └───────── charts ◄─────────────┴──►  PostgreSQL/SQLite (history)
```
1. The form data is validated by Pydantic.
2. `Predictor.map_inputs` converts the form values into the dataset's columns.
3. The exported model (scaler + one-hot flags + 300-tree Random Forest, evaluated with NumPy; verified identical to the scikit-learn pipeline) predicts the final grade `G3` (0–20).
4. The API computes category, risk, likely range, what-if estimates and recommendations, stores everything in SQLite and returns it.

## Folder structure
```
ai-student-performance-predictor/
├── frontend/                 React app
│   ├── src/pages/            Landing, Dashboard, Predict, Result, History, About
│   ├── src/components/       Layout + UI kit
│   ├── src/lib/              API client, theme, hooks
│   ├── package.json, vite.config.js, .env.example
├── backend/
│   ├── app/                  FastAPI app (main, schemas, database, predictor, recommendations, config)
│   ├── ml/                   common.py (features) and train.py (EDA + training + evaluation)
│   ├── data/raw/             the two UCI CSV files   (data/README.md = provenance)
│   ├── models/               model.npz (portable, committed), metrics.json, eda/*.png
│   ├── tests/                pytest API + ML tests
│   ├── requirements.txt (runtime), requirements-train.txt, requirements-dev.txt, .env.example
├── start-app.bat             one-click launcher for Windows
├── vercel.json               Vercel config
├── render.yaml               Render blueprint
├── .gitignore
└── README.md
```

## Running locally

### Prerequisites
- **Python 3.10 – 3.13** (**3.12 recommended**) — https://www.python.org/downloads/ (tick *Add python.exe to PATH*). `start-app.bat` picks 3.12 automatically if several versions are installed, and it does not use Python 3.14.
- **Node.js LTS** — https://nodejs.org/

### Easiest way (Windows)
Double-click **`start-app.bat`** in the project folder. It will:
1. check Python and Node.js,
2. create `backend\.venv` and install Python packages,
3. check that the shipped `backend\models\model.npz` exists (no training needed),
4. run `npm install` for the frontend (first run only),
5. open **two server windows** (backend + frontend) and then your browser.

URLs: Frontend http://127.0.0.1:5173 · Backend http://127.0.0.1:8000 · API docs http://127.0.0.1:8000/docs

> 💡 The project lives inside **OneDrive**. `node_modules` and `.venv` contain tens of thousands of files that OneDrive will try to sync, which can be slow. Consider pausing OneDrive sync while installing, or move the project to e.g. `C:\dev\`.

### Manual way (any OS)
```bash
# --- backend ---
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows  (macOS/Linux: source .venv/bin/activate)
pip install -r requirements.txt
# (the model ships pre-trained as models/model.npz. To retrain: pip install -r requirements-train.txt && python -m ml.train)
uvicorn app.main:app --host 127.0.0.1 --port 8000

# --- frontend (new terminal) ---
cd frontend
npm install
npm run dev
```
The API itself needs only FastAPI + NumPy. scikit-learn is required only if you want to **retrain** (`requirements-train.txt`).

### Troubleshooting (Windows)

**`ImportError: DLL load failed while importing _openmp_helpers: An Application Control policy has blocked this file`**

(Historical note: older builds of this project imported scikit-learn at runtime. The API no longer does, so this error can't occur when running the app; it can still occur if you retrain locally.) Windows security (Smart App Control, WDAC or AppLocker) is refusing to load a native file that scikit-learn needs. scikit-learn's `sklearn\utils\_openmp_helpers…pyd` loads Microsoft's OpenMP runtime `sklearn\.libs\vcomp140.dll`; one of those files is being blocked. Do **not** turn security features off for this project (Smart App Control cannot be switched back on without resetting Windows).

What to do, in order:
1. **Use Python 3.12.** Install it from https://www.python.org/downloads/ (or `winget install -e --id Python.Python.3.12`) and run `start-app.bat` again. The launcher picks 3.12 automatically and rebuilds `backend\.venv` if it was created with another version (for example 3.14). Newer Python builds can be blocked more often because Windows has less reputation data about their files — this helps in some cases but is not guaranteed.
2. **Find the exact blocked file.** The launcher prints it when the library check fails. You can also look yourself: *Event Viewer → Applications and Services Logs → Microsoft → Windows → CodeIntegrity → Operational*, then find the newest event with ID **3077** (blocked) or **3033** — the text names the blocked file and the policy.
3. **Ask the owner/IT admin of the PC** to allow that file (or the project folder) in the policy. This is the only correct fix if step 1 does not help.
4. As a fallback you can run the project on another computer, or inside Windows Subsystem for Linux if your policy allows it.

Other launcher messages: *"No supported Python was found"* → install Python 3.12; *"Node.js was not found"* → install Node LTS; *port already in use* → close the other program using port 8000/5173.

## Dataset
**Student Performance** — P. Cortez & A. Silva (2008), UCI Machine Learning Repository
https://archive.ics.uci.edu/dataset/320/student+performance — **Licence: CC BY 4.0** (free to use with attribution).

> Cortez, P. and Silva, A. *Using Data Mining to Predict Secondary School Student Performance.* In A. Brito and J. Teixeira (Eds.), Proceedings of 5th FUture BUsiness TEChnology Conference (FUBUTEC 2008), pp. 5–12, Porto, Portugal, April 2008.

- 1,044 records (395 Mathematics + 649 Portuguese language) from two Portuguese secondary schools; 33 columns; no missing values.
- Target: **G3**, the final grade on a 0–20 scale (10 is the pass mark).
- About 382 students appear in *both* files, so ≈ 662 distinct students. To avoid **data leakage**, the same student is never placed in both the training and the test set (grouped splits).
- **Provenance note:** the CSV files in `backend/data/raw/` were downloaded from a public GitHub copy because the UCI site was unreachable when this project was built. Row counts and mean grades match the published UCI figures; see `backend/data/README.md` for SHA-256 hashes and how to verify against the official download.

## ML model
Pipeline (`backend/ml/train.py`):
1. **Load & clean** — merge both files, add a `course` column, strip text, drop duplicates / missing rows (none were found).
2. **EDA** — grade distribution, correlation matrix, grade vs. study time/absences/failures (`backend/models/eda/`).
3. **Preprocessing** — `StandardScaler` for numbers, `OneHotEncoder` for categories, inside a scikit-learn `Pipeline`.
4. **Features used (12):** age, studytime, failures, absences, G1, G2, goout, freetime, health, higher, internet, course.
5. **Models compared:** mean-baseline, Ridge Regression, Random Forest, Gradient Boosting — 5-fold **GroupKFold** cross-validation on the training portion + a **held-out test set** (213 rows of unseen students).
6. **Best model selected** by cross-validated RMSE and refit on all data for serving.

Results on the held-out test set (grades are on the 0–20 scale):

| Model | MAE | RMSE | R² |
|---|---|---|---|
| Baseline (predict the mean) | 2.87 | 3.93 | −0.00 |
| Ridge Regression | 0.97 | 1.42 | 0.870 |
| **Random Forest (selected)** | **0.83** | **1.29** | **0.892** |
| Gradient Boosting | 0.90 | 1.36 | 0.880 |

The "likely range" shown to users is the 10th–90th percentile of the model's cross-validated errors, so roughly 80 % of similar students fell inside it.

### How form fields map to the dataset
| Form field | Dataset column | Conversion |
|---|---|---|
| Daily study hours | `studytime` | hours × 7 → weekly band (<2 h, 2–5 h, 5–10 h, >10 h) |
| Attendance % | `absences` | (100 − attendance) × 90 school days ÷ 100 — **an assumption** |
| Earlier / recent marks % | `G1` / `G2` | percent ÷ 5 → 0–20 |
| Failures, age, subject, higher-ed, internet, going out, free time, health | same names | used directly |

## Honest limitations
- **Not guaranteed results.** The model estimates; it does not know your exam.
- **Earlier grades dominate.** G2 is by far the most important feature. Without G1/G2 the same model's test R² drops to **0.37** (MAE 2.43) — habits alone predict much less.
- **Some form fields are not used by the model.** *Sleep hours, assignment completion, class participation, study consistency* and *number of subjects* **do not exist in the dataset**, so the model cannot learn from them. They are collected only to produce rule-based advice (clearly labelled "not in model" in the UI). I chose this instead of inventing fake data or pretending the model uses them.
- **Conversion assumptions.** Attendance → absences assumes ~90 school days; study hours are bucketed into the dataset's four bands.
- **Narrow population.** Two Portuguese schools, one period, two subjects; it may not transfer to other countries, grading systems or years.
- **Correlation ≠ causation.** "What-if" outputs show patterns in historical data, not guaranteed effects.
- **Privacy:** the app has no login. All predictions are stored in one shared database, so on a public deployment anyone can see the history. Don't enter real personal data on a public deployment.

## API documentation
Interactive Swagger UI: **http://127.0.0.1:8000/docs** (ReDoc at `/redoc`).

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Status of API and model |
| POST | `/api/predict` | Validate input → predict → save → return full result |
| GET | `/api/history` | List predictions. Query: `search`, `category`, `risk` (Low/Medium/High), `limit`, `offset` |
| GET | `/api/history/{id}` | One prediction with its inputs and full result |
| GET | `/api/dashboard` | Totals, average, category/risk distribution, trend, recent items |
| GET | `/api/model-info` | Dataset info, model comparison, metrics, feature importance |
| GET | `/api/model-info/plots/{name}` | EDA/diagnostic PNG charts |

Example:
```bash
curl -X POST http://127.0.0.1:8000/api/predict -H "Content-Type: application/json" -d '{
  "course":"math","age":17,"daily_study_hours":3,"attendance_percent":95,
  "first_term_marks":70,"previous_marks":75,"past_failures":0,
  "assignment_completion":90,"sleep_hours":8,"class_participation":4,"study_consistency":4
}'
```
Invalid input (e.g. attendance 150) returns HTTP 422 with a clear message.

## Running the tests
```bash
cd backend
pip install -r requirements-dev.txt   # includes training deps so the sklearn-parity tests run
python -m pytest -q
```
The tests call the real trained model and a temporary SQLite database (no mocks): health, model info, prediction differs for strong vs weak students, NumPy engine == scikit-learn pipeline on every dataset row and 2,000 random inputs, validation errors, history search/filter, dashboard totals, CORS.

## Upload to GitHub
> Nothing is pushed automatically — you do this yourself.

1. Create an **empty** repository on https://github.com/new (no README/.gitignore).
2. In the project folder:
```bash
git init
git add .
git status            # check: no .env, node_modules or .venv listed
git commit -m "Initial commit: AI Student Performance Predictor"
git branch -M main
git remote add origin https://github.com/<your-username>/ai-student-performance-predictor.git
git push -u origin main
```
The `.gitignore` already excludes secrets (`.env`), `node_modules`, `.venv`, databases and the generated model file. There are no API keys in this project.

## Deploy the frontend on Vercel
1. Push the project to GitHub (above) and deploy the **backend first** (next section) so you know its URL.
2. Vercel → **Add New → Project** → import your repository.
3. Keep **Root Directory = repository root** — the root `vercel.json` already sets the install/build commands and output directory (`frontend/dist`) and the SPA rewrite. *(Alternative: set Root Directory to `frontend`; `frontend/vercel.json` provides the rewrite and Vercel auto-detects Vite.)*
4. Add an **Environment Variable**: `VITE_API_URL` = `https://<your-render-service>.onrender.com` (no trailing slash).
5. Deploy. Then go back to Render and set `CORS_ORIGINS` to your Vercel URL.

## Deploy the backend on Render
1. Render → **New → Blueprint** → select your repository (it reads `render.yaml`), or create a **Web Service** manually with:
   - Root Directory `backend` · Runtime Python 3
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Health check path: `/api/health`
2. Environment variables:
   - `CORS_ORIGINS` = your Vercel URL, e.g. `https://my-app.vercel.app` (comma-separate several)
   - optional `CORS_ORIGIN_REGEX` = `https://.*\.vercel\.app` to allow preview deployments
   - `PYTHON_VERSION` = `3.12.8` (already in `render.yaml`)
3. **Model files:** `backend/models/model.npz` is committed and loaded with NumPy — the build installs only FastAPI, NumPy and psycopg (fast, small).
4. **Database persistence:** set `DATABASE_URL` to a PostgreSQL connection string (e.g. a free Neon or Supabase database) and history persists across restarts/redeploys. Without it the app falls back to SQLite on Render's *ephemeral* disk, which is erased on every restart. (Render's own free Postgres expires after ~30 days, so an external free Postgres is the more durable choice.)
5. **Cold starts:** free services sleep after ~15 min of inactivity; the first request can take up to a minute (the UI shows a hint).

## Explaining it in an interview
- *Problem:* early identification of at-risk students from study behaviour and previous marks.
- *Data:* UCI Student Performance (CC BY 4.0), 1,044 rows, merged two subject files, handled the overlap of students with group-aware splitting to avoid leakage.
- *Models:* compared a baseline, Ridge, Random Forest and Gradient Boosting with cross-validation and a hold-out set; chose Random Forest (MAE 0.83 / 20, R² 0.89).
- *Key insight:* previous grades carry most of the signal — an ablation without G1/G2 drops R² to 0.37. I report this openly.
- *Engineering:* exported-model design (train with sklearn, serve with NumPy, parity-tested), Pydantic validation, PostgreSQL/SQLite history, CORS via environment variables, tests against the real model.
- *Honesty:* fields not in the dataset (sleep, assignments, …) are not fed to the model; they only drive rule-based advice and are labelled as such.

---
Dataset © Cortez & Silva, licensed CC BY 4.0. Project code: use freely for learning and demos.
