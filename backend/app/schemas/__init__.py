from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# ----------------- AUTH SCHEMAS -----------------
class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)
    role: str = Field("teacher", pattern="^(admin|teacher|student)$")
    student_id: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    student_id: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None


# ----------------- DATASET SCHEMAS -----------------
class DatasetColumnOut(BaseModel):
    id: int
    name: str
    data_type: str
    missing_count: int
    unique_count: int
    sample_values: List[Any] = []
    min_val: Optional[float] = None
    max_val: Optional[float] = None
    mean_val: Optional[float] = None

    class Config:
        from_attributes = True

class DatasetOut(BaseModel):
    id: int
    name: str
    filename: str
    row_count: int
    column_count: int
    file_size_bytes: int
    is_sample: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class DatasetDetail(DatasetOut):
    columns: List[DatasetColumnOut] = []

class DatasetPreview(BaseModel):
    columns: List[str]
    rows: List[Dict[str, Any]]
    total_rows: int
    page: int
    page_size: int
    numeric_columns: List[str]
    categorical_columns: List[str]
    identifier_columns: List[str]


# ----------------- EDA SCHEMAS -----------------
class EdaResponse(BaseModel):
    dataset_id: int
    row_count: int
    column_count: int
    numeric_columns: List[str]
    categorical_columns: List[str]
    missing_summary: Dict[str, int]
    distributions: Dict[str, Any]
    correlation_matrix: List[Dict[str, Any]]
    scatter_attendance_score: List[Dict[str, Any]]
    scatter_study_score: List[Dict[str, Any]]
    category_distribution: List[Dict[str, Any]]
    group_analyses: Dict[str, Any]


# ----------------- FEATURE SELECTION SCHEMAS -----------------
class FeatureScoreItem(BaseModel):
    feature: str
    score: float
    rank: int
    is_selected: bool
    interpretation: str

class FeatureSelectionRequest(BaseModel):
    dataset_id: int
    target_column: str
    method: str = "select_k_best"  # correlation, select_k_best, mutual_info
    k: int = 5

class FeatureSelectionResponse(BaseModel):
    target_column: str
    method: str
    interpretation: str
    caution_note: str
    scores: List[FeatureScoreItem]


# ----------------- MODEL TRAINING & EVALUATION SCHEMAS -----------------
class TrainRegressionRequest(BaseModel):
    dataset_id: int
    name: str
    algorithm: str = "RandomForestRegressor"  # DummyRegressor, LinearRegression, RandomForestRegressor, GradientBoostingRegressor
    target_column: str = "final_score"
    selected_features: List[str]
    test_size: float = Field(0.2, ge=0.1, le=0.5)
    random_seed: int = 42

class TrainClassificationRequest(BaseModel):
    dataset_id: int
    name: str
    algorithm: str = "RandomForestClassifier"  # DummyClassifier, LogisticRegression, RandomForestClassifier, DecisionTreeClassifier
    target_column: str = "performance_category"
    is_derived_target: bool = False
    source_score_column: Optional[str] = None
    derived_thresholds: Optional[Dict[str, float]] = None
    selected_features: List[str]
    test_size: float = Field(0.2, ge=0.1, le=0.5)
    random_seed: int = 42

class ModelFeatureOut(BaseModel):
    feature_name: str
    feature_type: str
    importance_score: Optional[float] = None
    is_selected: bool

    class Config:
        from_attributes = True

class ModelRunOut(BaseModel):
    id: int
    dataset_id: int
    name: str
    task_type: str
    algorithm: str
    target_column: str
    is_derived_target: bool
    test_size: float
    random_seed: int
    status: str
    duration_seconds: float
    is_active: bool
    created_at: datetime
    metrics: Dict[str, Any] = {}
    features: List[ModelFeatureOut] = []

    class Config:
        from_attributes = True


# ----------------- PREDICTION SCHEMAS -----------------
class SinglePredictionRequest(BaseModel):
    model_run_id: int
    student_identifier: Optional[str] = "STUDENT_INQUIRY"
    input_features: Dict[str, Any]

class SinglePredictionResponse(BaseModel):
    prediction_id: int
    student_identifier: Optional[str]
    model_name: str
    algorithm: str
    task_type: str
    target_column: str
    predicted_value: Any
    probabilities: Optional[Dict[str, float]] = None
    evaluation_summary: Dict[str, Any]
    input_features: Dict[str, Any]
    recommendations: List[str]

class BatchPredictionResponse(BaseModel):
    model_id: int
    model_name: str
    task_type: str
    total_rows: int
    successful_count: int
    failed_count: int
    predictions: List[Dict[str, Any]]
    errors: List[Dict[str, Any]]
    csv_export_url: Optional[str] = None

class PredictionRecordOut(BaseModel):
    id: int
    student_identifier: Optional[str]
    model_run_id: int
    model_name: str
    task_type: str
    algorithm: str
    predicted_value: str
    probabilities: Optional[Dict[str, float]] = None
    prediction_type: str
    batch_id: Optional[str] = None
    input_data: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- AUDIT & HEALTH SCHEMAS -----------------
class HealthOut(BaseModel):
    status: str
    project: str
    version: str
    database_connected: bool
    sample_dataset_ready: bool
