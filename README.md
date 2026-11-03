# ScholarIQ — Student Academic Performance Prediction System

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_18_TypeScript-61DAFB.svg)](https://react.dev)
[![Scikit-Learn](https://img.shields.io/badge/ML-Scikit--Learn-F7931E.svg)](https://scikit-learn.org)
[![Alembic](https://img.shields.io/badge/DB-Alembic_Migrations-green.svg)](https://alembic.sqlalchemy.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

An end-to-end, production-oriented full-stack web application for educational institutions, faculty, and academic advisors. **ScholarIQ** delivers genuine data-driven academic forecasting, exploratory cohort analytics, statistical feature selection, regression and classification model training, single-student inference with intervention recommendations, and high-throughput batch predictions.

---

## Key Features

1. **Role-Based Access Control (RBAC)**:
   - **Administrator**: System-wide oversight, audit logging, model registry control, and database diagnostics.
   - **Faculty / Teacher**: Cohort dataset management, exploratory data analysis (EDA), feature selection studio, model training labs, single/batch inference, and export capabilities.
   - **Student**: Strict privacy isolation — students can only view their personal academic projections and tailored learning recommendations linked to their verified `student_id`.
2. **Dataset Management & Profiling**:
   - Automated CSV file size, encoding, and schema validation.
   - Inferred column profiling (numeric continuous, categorical, and high-cardinality identifiers).
   - Instant paginated preview with missing value counts and summary statistics.
   - Pre-packaged with a realistic 1,000-row synthetic student dataset (`data/sample/student_performance.csv`).
3. **Exploratory Data Analysis (EDA) Studio**:
   - Interactive score distribution histograms with calculated mean, median, standard deviation, and range.
   - Dual multi-variable scatter plots: *Attendance vs. Final Score* and *Study Hours vs. Final Score*.
   - Pearson correlation heatmap matrix (-1.0 to +1.0) with adaptive chromatic scales.
   - Demographic cohort comparisons (Parental Education, Grade Level, Gender).
4. **Feature Selection Studio**:
   - Three statistical algorithms: **SelectKBest** (ANOVA F-statistic), **Mutual Information** (non-linear entropy), and **Pearson Correlation**.
   - Strict leakage exclusion: Identifiers and prediction targets are quarantined from candidate feature sets.
   - Explicit causation vs. statistical association advisories.
5. **Regression Lab (Continuous Final Score Prediction)**:
   - Estimators supported: `DummyRegressor` (mean baseline), `LinearRegression`, `RandomForestRegressor`, and `GradientBoostingRegressor`.
   - Preprocessing inside Scikit-learn `Pipeline` (Median Imputer + StandardScaler).
   - Held-out test evaluation: MAE, RMSE, and R² (with transparent negative R² guidance when models underperform mean baseline).
   - Visual Actual vs. Predicted scatter plot with 45-degree reference line and Residual analysis plot.
6. **Classification Lab (Academic Performance Tiers)**:
   - Estimators supported: `DummyClassifier` (stratified baseline), `LogisticRegression`, `RandomForestClassifier`, and `DecisionTreeClassifier`.
   - Dual target mode: Native categorical dataset columns OR dynamically derived categories from continuous scores using customizable score thresholds (*At Risk <40*, *Needs Improvement 40-60*, *Average 60-75*, *Good 75-85*, *Excellent 85-100*).
   - Stratified train/test splitting to preserve minority class ratios.
   - Test evaluation: Accuracy, Macro F1, Weighted F1, Confusion Matrix heatmap, Per-Class precision/recall/support, and class imbalance alerts.
7. **Single & Batch Prediction Engine**:
   - **Single Inference**: Form rendered dynamically strictly based on the active model's required input features. Generates real-time forecasts, class probabilities, and personalized interventions (attendance coaching, tutorial recommendations, study hour pacing).
   - **Batch Prediction**: High-throughput CSV processing with row-level error resilience, preserving student roll numbers/IDs, and exporting evaluated rosters.
8. **Model Registry & Prediction Audit Trail**:
   - Persisted Scikit-Learn pipelines serialized via Joblib in secure internal storage.
   - Searchable, filterable audit history with date, model version, and CSV export.

---

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts, React Router v6, Axios.
- **Backend**: Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic, Bcrypt, PyJWT.
- **Machine Learning**: Scikit-Learn, Pandas, NumPy, Joblib.
- **Databases**: SQLite (zero-config local development) / PostgreSQL (production).
- **Testing**: Pytest (backend & ML pipelines), Vitest & React Testing Library (frontend).

---

## Project Structure

```text
edupredict-ai/
├── backend/
│   ├── alembic/              # Database migrations & version scripts
│   ├── app/
│   │   ├── api/              # RESTful API endpoints (auth, datasets, features, models, predictions, system)
│   │   ├── core/             # Configuration, security, JWT token utilities
│   │   ├── db/               # SQLAlchemy engine & session setup
│   │   ├── ml/               # Scikit-learn pipelines, preprocessing, evaluation, registry
│   │   ├── models/           # SQLAlchemy database entities (User, Dataset, ModelRun, Prediction, AuditLog)
│   │   ├── schemas/          # Pydantic validation models
│   │   ├── services/         # Business logic & data processing services
│   │   └── main.py           # FastAPI application entrypoint with seed initialization
│   ├── tests/                # Automated pytest suite (auth, leakage, regression, classification, batch)
│   ├── alembic.ini           # Alembic migration configuration
│   └── requirements.txt      # Backend Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/       # UI primitives (Card, Badge, Button, Alert) & AppLayout/Navbar/Sidebar
│   │   ├── context/          # React AuthContext with quick demo persona switcher
│   │   ├── pages/            # Feature views (Dashboard, Datasets, EDA, Regression, Classification, etc.)
│   │   ├── services/         # Axios API client with bearer token interceptors
│   │   ├── test/             # Vitest component test suites
│   │   └── types/            # TypeScript interfaces
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
├── data/
│   └── sample/               # Synthetic 1,000-row student dataset & generator script
├── artifacts/
│   ├── datasets/             # Managed uploaded dataset storage
│   └── models/               # Serialized Joblib model artifacts
├── docs/                     # Architectural context, tasks, and bug trackers
├── Dockerfile.backend        # Production Python container
├── Dockerfile.frontend       # Production Node/Nginx container
├── docker-compose.yml        # Multi-container orchestration with PostgreSQL
├── pytest.ini
├── PROJECT_CONTEXT.md
├── TASKS.md
└── BUGS.md
```

---

## Local Development Setup

### Prerequisites
- Python 3.10+ (Tested on Python 3.12)
- Node.js 18+ (Tested on Node.js 24)
- Git

### 1. Backend Setup
From the repository root:
```bash
# Navigate to backend and install requirements
python -m pip install -r backend/requirements.txt

# Run database migrations
cd backend
alembic upgrade head
cd ..

# Start the FastAPI server (starts on http://127.0.0.1:8000)
python -m uvicorn app.main:app --app-dir backend --reload --port 8000
```
*Note: On first startup, the database automatically initializes tables and pre-seeds the demo accounts and the synthetic dataset!*

### 2. Frontend Setup
In a second terminal:
```bash
cd frontend

# Install npm packages
npm install

# Start Vite dev server (starts on http://127.0.0.1:5173)
npm run dev
```

Visit **http://localhost:5173** in your browser.

---

## Pre-Configured Demo Credentials

The login screen provides one-click quick-fill buttons for testing different role permissions:

| Persona | Email | Password | Role & Permissions |
|---|---|---|---|
| **Administrator** | `admin@edupredict.ai` | `AdminPass123!` | System oversight, full dataset & model management |
| **Faculty / Teacher** | `teacher@edupredict.ai` | `TeacherPass123!` | Upload cohorts, EDA, Feature Selection, Train Models, Batch Inference |
| **Student** | `student@edupredict.ai` | `StudentPass123!` | Personal learning portal restricted to identifier `STU-10001` |

---

## Running Automated Tests

### Backend & ML Tests (Pytest)
```bash
pytest backend/tests -v
```
Verifies authentication, access controls, CSV parsing, data leakage prevention, regression and classification pipelines, confusion matrices, negative R² handling, and prediction privacy isolation.

### Frontend Component Tests (Vitest)
```bash
cd frontend
npm test
```

### Production Build Validation
```bash
cd frontend
npm run build
```

---

## Interactive API Documentation

Once the backend is running, explore and test the complete OpenAPI / Swagger documentation at:
**http://127.0.0.1:8000/docs**

Key Endpoints:
- `POST /api/auth/login`: Authenticate and receive JWT bearer token.
- `GET /api/datasets`: List authorized datasets.
- `POST /api/datasets/upload`: Upload CSV and infer column profiles.
- `GET /api/datasets/{id}/eda`: Compute distributions, correlations, and scatter data.
- `POST /api/features/select`: Calculate ANOVA F, Mutual Info, or Correlation ranks.
- `POST /api/models/train-regression`: Train continuous regression model.
- `POST /api/models/train-classification`: Train multi-class classifier.
- `POST /api/predictions/single`: Run single-student inference with intervention tips.
- `POST /api/predictions/batch`: Batch process student rosters from CSV.
- `GET /api/predictions/history`: Query audit logs with student-level isolation.
- `GET /api/system/stats`: Live system KPIs for dashboard.
- `GET /api/health`: Database and model storage health check.

---

## Docker & Production Deployment

To run the complete production stack with PostgreSQL:
```bash
docker compose up --build
```
This orchestrates:
- **`db`**: PostgreSQL 16 container with health check.
- **`backend`**: FastAPI Python 3.12 container with persistent volume for Joblib artifacts.
- **`frontend`**: Nginx container serving optimized React production assets with `/api` proxying.

---

## Methodological & Ethical AI Principles

1. **Decision Support Only**:
   ScholarIQ outputs are decision-support insights intended to assist educators and advisors in identifying students who benefit from proactive support. Models do not assign official course grades, determine disciplinary actions, or evaluate scholarship eligibility.
2. **Strict Data Leakage Prevention**:
   Prediction targets and student identifiers are strictly excluded from feature inputs. Preprocessing transformations (imputation, scaling, encoding) are encapsulated within Scikit-Learn Pipelines fitted exclusively on training splits.
3. **Student Privacy Isolation**:
   Student accounts are restricted to viewing only predictions matching their registered `student_id`. Cross-student cohort rosters are inaccessible to students.
