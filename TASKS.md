# TASKS.md — EduPredict AI Implementation Tracking

## Phase 1: Workspace Inspection, Architecture & Scaffolding
- [x] Inspect existing workspace (confirmed clean directory).
- [x] Verify toolchains: Python 3.12, Node.js 24, npm 11, Git.
- [x] Create `PROJECT_CONTEXT.md`, `TASKS.md`, `BUGS.md`.
- [x] Scaffold directory structure (`frontend/`, `backend/`, `data/sample/`, `artifacts/models/`, `docs/`).
- [x] Create Python environment requirements (`backend/requirements.txt`) & configuration (`backend/.env.example`).
- [x] Initialize Frontend with Vite + React + TypeScript + Tailwind CSS (`frontend/package.json`).

## Phase 2: Database Models, Migrations, Auth & RBAC
- [x] SQLAlchemy database engine setup (`backend/app/db/session.py`, `backend/app/core/config.py`).
- [x] Define database models: `User`, `Dataset`, `DatasetColumn`, `ModelRun`, `ModelFeature`, `Prediction`, `AuditLog`.
- [x] Security utilities: JWT token encoding/decoding, secure password hashing.
- [x] Auth endpoints: `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/auth/demo-users`.
- [x] Role-Based Access Control (RBAC) dependencies (`require_role`).
- [x] Seed script for demo accounts (Admin, Teacher, Student) & database initialization.
- [x] Alembic migration configuration and generated initial migration (`backend/alembic/`).

## Phase 3: Dataset Management & Synthetic Demo Data
- [x] Synthetic academic dataset generator script & CSV artifact (`data/sample/student_performance.csv`).
- [x] Dataset upload endpoint (`POST /api/datasets/upload`) with file-size limit, schema inference, duplicate detection.
- [x] Dataset preview endpoint (`GET /api/datasets/{id}/preview`) with pagination and column profiling.
- [x] Dataset list & deletion endpoints (`GET /api/datasets`, `DELETE /api/datasets/{id}`).
- [x] Sample dataset download endpoint (`GET /api/datasets/sample/download`).

## Phase 4: Exploratory Data Analysis (EDA) Service & APIs
- [x] EDA calculation service (`backend/app/services/eda_service.py`):
  - [x] Score distribution histogram bins
  - [x] Attendance vs. Final Score scatter data
  - [x] Study hours vs. Final Score scatter data
  - [x] Pearson correlation matrix across numeric features
  - [x] Missing value & outlier summaries
  - [x] Performance category distribution
  - [x] Group-wise statistics (e.g., by gender, parental education, grade level)
- [x] EDA endpoint (`GET /api/datasets/{id}/eda`).

## Phase 5: Feature Selection Studio & Regression Lab
- [x] Feature selection algorithms (`backend/app/ml/feature_selection.py`):
  - [x] Correlation ranking
  - [x] SelectKBest (F-regression, Mutual Info)
  - [x] Guidance and causation warnings
- [x] Feature selection endpoint (`POST /api/features/select`).
- [x] ML preprocessing pipeline (`backend/app/ml/preprocessing.py`) with median imputer, standard scaler, one-hot encoder.
- [x] Regression training service (`backend/app/services/regression_service.py`):
  - [x] DummyRegressor, LinearRegression, RandomForestRegressor, GradientBoostingRegressor
  - [x] Metrics: MAE, RMSE, R² (handles negative R² correctly)
  - [x] Actual vs. Predicted data points, Residual analysis
  - [x] Artifact serialization with Joblib
- [x] Regression API endpoints (`POST /api/models/train-regression`, `GET /api/models`).

## Phase 6: Classification Lab & Performance Categories
- [x] Performance category thresholding logic (customizable & standard 5-tier scales).
- [x] Classification training service (`backend/app/services/classification_service.py`):
  - [x] DummyClassifier, LogisticRegression, RandomForestClassifier, DecisionTreeClassifier
  - [x] Stratified split handling
  - [x] Metrics: Accuracy, Precision, Recall, F1 (macro & weighted), Confusion Matrix, Per-Class reports
  - [x] Class imbalance detection and warning
- [x] Classification API endpoints (`POST /api/models/train-classification`).

## Phase 7: Single & Batch Prediction Engine & Model Registry
- [x] Prediction service (`backend/app/services/prediction_service.py`):
  - [x] Input validation against saved model schema
  - [x] Single prediction with actionable academic recommendations
  - [x] Batch CSV prediction handling with row-level error resilience and identifier preservation
  - [x] Model artifact loading and validation
- [x] Prediction API endpoints:
  - [x] `POST /api/predictions/single`
  - [x] `POST /api/predictions/batch`
  - [x] `GET /api/predictions/history`
  - [x] `GET /api/predictions/export`
- [x] Model registry APIs: list, details, metrics, activate/deactivate.

## Phase 8: Frontend UI Implementation
- [x] Layouts: Sidebar, Topbar with User Role badge & quick demo switcher, responsive container.
- [x] Auth pages: Login, Register with demo quick-fill buttons.
- [x] Dashboard: Real backend stats, training status, charts, recent activities.
- [x] Dataset Management UI: Drag-and-drop CSV upload, preview table, column metadata badges.
- [x] EDA Studio UI: Interactive Recharts visualizations (histograms, scatter, heatmap, group-by).
- [x] Feature Selection Studio UI: Target selector, method selector, importance bar chart, training feature toggle.
- [x] Regression Lab UI: Algorithm comparison cards, split slider, train action, residual & actual vs predicted plots.
- [x] Classification Lab UI: Threshold configurator, model selector, confusion matrix heatmap, per-class table.
- [x] Single Prediction UI: Dynamic schema-based input form, prediction output card, recommendations.
- [x] Batch Prediction UI: Batch CSV upload, column mapping preview, row-level errors, prediction results table, CSV export.
- [x] Model Registry UI: Active model indicator, metrics breakdown, artifact details.
- [x] Prediction History UI: Paginated table, search/filter by model/task/student, details drawer.
- [x] Student View: Filtered view showing only their records and predictions.
- [x] Settings / About: Methodology, privacy and ethics note, system health.

## Phase 9: Automated Testing & Verification
- [x] Backend unit & integration tests (`pytest`):
  - [x] Auth & RBAC access controls (`test_auth.py`)
  - [x] CSV upload validation & leakage prevention (`test_ml_and_leakage.py`)
  - [x] Feature selection calculations (`test_ml_and_leakage.py`)
  - [x] Regression pipeline training, metrics & negative R² handling (`test_ml_and_leakage.py`)
  - [x] Classification pipeline training, confusion matrix & metrics (`test_ml_and_leakage.py`)
  - [x] Prediction accuracy & schema validation (`test_ml_and_leakage.py`)
  - [x] Student privacy isolation (`test_ml_and_leakage.py`)
  - [x] Results: 11 / 11 tests PASSED.
- [x] Frontend test suites & build validation:
  - [x] Vitest component tests (`frontend/src/test/app.test.tsx`): 4 / 4 passed.
  - [x] Production build validation (`npm run build`): completed successfully.
- [x] End-to-end integration verified.

## Phase 10: Documentation & Deployment Preparation
- [x] Comprehensive `README.md` with startup guides, API documentation, demo workflow.
- [x] Docker & deployment configs (`Dockerfile.backend`, `Dockerfile.frontend`, `docker-compose.yml`, `.env.example`).
- [x] Git ignore configuration (`.gitignore`).
- [x] Final project status report prepared.
