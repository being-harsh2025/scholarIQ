# PROJECT_CONTEXT.md — EduPredict AI

## Project Overview
**EduPredict AI — Student Academic Performance Prediction System** is an end-to-end, full-stack, production-oriented machine learning web application. It enables educational institutions, administrators, teachers, and students to analyze academic indicators, explore datasets, select optimal features, train and compare regression and classification models, generate single-student and batch predictions with actionable recommendations, and maintain an auditable prediction history.

## Technical Architecture

### 1. Frontend Architecture (`frontend/`)
- **Framework**: React 18 / 19 with TypeScript, Vite
- **Styling**: Tailwind CSS, Lucide React icons, accessible modern UI components
- **Visualization**: Recharts for dynamic charts (scatter plots, histograms, correlation heatmaps, confusion matrices, residual plots, distribution bars)
- **Routing**: React Router DOM (protected routes with role-based redirection)
- **State & Forms**: React Hook Form with Zod schema validation, unified API client with JWT authentication
- **Design System**: Light theme default, slate/navy typography, indigo primary accents, responsive layouts with clean data tables and visual feedback

### 2. Backend Architecture (`backend/`)
- **Framework**: FastAPI (Python 3.12)
- **ORM & Database**: SQLAlchemy 2.0 with SQLite for local development (`sqlite:///./edupredict.db`) and PostgreSQL configuration for production deployment (`postgresql://...`)
- **Migrations**: Alembic with auto-migration support
- **Authentication**: JWT (JSON Web Tokens) with secure password hashing (`bcrypt`), role-based access control (`admin`, `teacher`, `student`)
- **API Standards**: Pydantic v2 schemas, RESTful endpoint design, complete OpenAPI / Swagger documentation (`/docs`)

### 3. Machine Learning Core (`backend/app/ml/`)
- **Data Engine**: Pandas, NumPy
- **ML Framework**: Scikit-Learn
- **Artifact Persistence**: Joblib (controlled local storage with checksum/path validation)
- **Regression Suite**:
  - `DummyRegressor` (baseline)
  - `LinearRegression`
  - `RandomForestRegressor`
  - `GradientBoostingRegressor`
  - Metrics: MAE, RMSE, R² (with support for negative R² handling), Actual vs. Predicted plots, Residual plots
- **Classification Suite**:
  - `DummyClassifier` (baseline)
  - `LogisticRegression`
  - `RandomForestClassifier`
  - `DecisionTreeClassifier`
  - Target handling: Native categorical targets or dynamically derived categories from numeric scores using customizable thresholds (At Risk, Needs Improvement, Average, Good, Excellent)
  - Metrics: Accuracy, Precision, Recall, F1 (macro & weighted), Confusion Matrix, Class Imbalance detection
- **Feature Selection Studio**:
  - Pearson / Spearman Correlation
  - `SelectKBest` (F-regression, F-classif, Chi2)
  - Mutual Information (`mutual_info_regression`, `mutual_info_classif`)
  - Permutation Importance
- **Data Leakage & Integrity Guardrails**:
  - Identification & exclusion of student identifiers (`student_id`, etc.)
  - Exclusion of regression target from features
  - Preprocessing and feature selection fitted strictly on training splits within Scikit-Learn `Pipeline`
  - Safe imputation and one-hot encoding with unknown category handling

### 4. Database Schema
- `users`: ID, email, hashed_password, full_name, role (`admin`, `teacher`, `student`), student_id, timestamps
- `datasets`: ID, user_id, name, filename, file_path, row_count, column_count, is_sample, timestamps
- `dataset_columns`: ID, dataset_id, name, data_type, missing_count, unique_count, sample_values
- `model_runs`: ID, user_id, dataset_id, name, task_type, algorithm, target_column, is_derived, thresholds, test_size, random_seed, status, metrics, duration, artifact_path, is_active, timestamps
- `model_features`: ID, model_run_id, feature_name, feature_type, importance_score, is_selected
- `predictions`: ID, user_id, model_run_id, student_identifier, input_data, predicted_value, probabilities, prediction_type (`single`, `batch`), batch_id, timestamps
- `audit_logs`: ID, user_id, action, resource_type, resource_id, details, timestamp

## User Roles and Access Matrix
| Feature / Endpoint | Admin | Teacher | Student |
|---|:---:|:---:|:---:|
| User Management | Yes | No | No |
| Dataset Upload & Delete | Yes | Yes (Own) | No |
| Dataset Preview & EDA | Yes | Yes | No |
| Feature Selection | Yes | Yes | No |
| Train Regression / Classification | Yes | Yes | No |
| Model Registry & Activation | Yes | Yes | No |
| Single & Batch Prediction | Yes | Yes | No |
| View Prediction History | Yes (All) | Yes (Own) | Yes (Own student_id only) |
| System Health & Auditing | Yes | Limited | Limited |

## Key Decisions & Conventions
1. **Local-First & Production-Ready**: SQLite is used out-of-the-box for instant zero-dependency local verification, seamlessly switchable to PostgreSQL via `DATABASE_URL`.
2. **Real ML Pipeline**: Every metric, chart, and prediction originates from real Scikit-Learn pipelines; no simulated values or hardcoded mock scores.
3. **Synthetic Demo Data**: Packaged with a realistic 1,000-row synthetic academic dataset (`data/sample/synthetic_students.csv`) featuring realistic correlations and demographic distributions, explicitly marked as synthetic.
4. **Resilient Seed Accounts**: Pre-seeded demo credentials for each role:
   - Admin: `admin@edupredict.ai` / `AdminPass123!`
   - Teacher: `teacher@edupredict.ai` / `TeacherPass123!`
   - Student: `student@edupredict.ai` / `StudentPass123!` (Linked to student ID: `STU-00101`)
