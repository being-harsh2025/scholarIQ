export type UserRole = 'admin' | 'teacher' | 'student';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  student_id?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface DatasetColumn {
  id: number;
  name: string;
  data_type: 'numeric' | 'categorical' | 'identifier';
  missing_count: number;
  unique_count: number;
  sample_values: any[];
  min_val?: number | null;
  max_val?: number | null;
  mean_val?: number | null;
}

export interface Dataset {
  id: number;
  name: string;
  filename: string;
  row_count: number;
  column_count: number;
  file_size_bytes: number;
  is_sample: boolean;
  created_at: string;
  updated_at: string;
  columns?: DatasetColumn[];
}

export type DatasetDetail = Dataset;

export interface DatasetPreview {
  columns: string[];
  rows: Record<string, any>[];
  total_rows: number;
  page: number;
  page_size: number;
  numeric_columns: string[];
  categorical_columns: string[];
  identifier_columns: string[];
}

export interface EdaSummary {
  dataset_id: number;
  row_count: number;
  column_count: number;
  numeric_columns: string[];
  categorical_columns: string[];
  missing_summary: Record<string, number>;
  distributions: Record<string, {
    min: number;
    max: number;
    mean: number;
    median: number;
    std: number;
    bins: Array<{ range: string; count: number; min: number; max: number }>;
  }>;
  correlation_matrix: Array<{ col1: string; col2: string; value: number }>;
  scatter_attendance_score: Array<{ attendance: number; score: number; category: string; student_id: string }>;
  scatter_study_score: Array<{ study_hours: number; score: number; category: string; student_id: string }>;
  category_distribution: Array<{ category: string; count: number; percentage: number }>;
  group_analyses: Record<string, Array<{ group: string; count: number; avg_score: number | null; avg_attendance: number | null }>>;
}

export interface FeatureScore {
  feature: string;
  score: number;
  rank: number;
  is_selected: boolean;
  interpretation: string;
}

export interface FeatureSelectionResponse {
  target_column: string;
  method: string;
  interpretation: string;
  caution_note: string;
  scores: FeatureScore[];
}

export interface ModelMetrics {
  mae?: number;
  rmse?: number;
  r2?: number;
  r2_warning?: string | null;
  residual_mean?: number;
  residual_std?: number;
  actual_vs_predicted?: Array<{ actual: number; predicted: number }>;
  residuals?: Array<{ predicted: number; residual: number }>;
  
  accuracy?: number;
  precision_macro?: number;
  precision_weighted?: number;
  recall_macro?: number;
  recall_weighted?: number;
  f1_macro?: number;
  f1_weighted?: number;
  classes?: string[];
  confusion_matrix?: number[][];
  per_class?: Array<{ class_name: string; precision: number; recall: number; f1_score: number; support: number }>;
  class_counts?: Record<string, number>;
  imbalance_warning?: string | null;
  
  test_sample_count: number;
}

export interface ModelFeature {
  feature_name: string;
  feature_type: string;
  importance_score?: number | null;
  is_selected: boolean;
}

export interface ModelRun {
  id: number;
  dataset_id: number;
  name: string;
  task_type: 'regression' | 'classification';
  algorithm: string;
  target_column: string;
  is_derived_target: boolean;
  test_size: number;
  random_seed: number;
  status: string;
  duration_seconds: number;
  is_active: boolean;
  created_at: string;
  metrics: ModelMetrics;
  features: ModelFeature[];
}

export interface SinglePredictionResponse {
  prediction_id: number;
  student_identifier?: string;
  model_name: string;
  algorithm: string;
  task_type: string;
  target_column: string;
  predicted_value: any;
  probabilities?: Record<string, number> | null;
  evaluation_summary: Record<string, any>;
  input_features: Record<string, any>;
  recommendations: string[];
}

export interface BatchPredictionResponse {
  model_id: number;
  model_name: string;
  task_type: string;
  total_rows: number;
  successful_count: number;
  failed_count: number;
  predictions: Array<{
    row_index: number;
    student_identifier: string;
    predicted_value: any;
    input_summary: Record<string, any>;
  }>;
  errors: Array<{
    row_index: number;
    student_identifier: string;
    error: string;
  }>;
}

export interface PredictionRecord {
  id: number;
  student_identifier?: string;
  model_run_id: number;
  model_name: string;
  task_type: string;
  algorithm: string;
  predicted_value: string;
  probabilities?: Record<string, number> | null;
  prediction_type: string;
  batch_id?: string;
  input_data: Record<string, any>;
  created_at: string;
}

export interface DashboardStats {
  total_datasets: number;
  total_records: number;
  total_models: number;
  total_predictions: number;
  latest_model?: {
    id: number;
    name: string;
    algorithm: string;
    task_type: string;
    created_at: string;
    metrics: ModelMetrics;
  } | null;
  recent_datasets: Array<{ id: number; name: string; rows: number; created_at: string }>;
  recent_predictions: Array<{
    id: number;
    student_identifier: string;
    predicted_value: string;
    prediction_type: string;
    model_name: string;
    task_type: string;
    created_at: string;
  }>;
  role: UserRole;
}
