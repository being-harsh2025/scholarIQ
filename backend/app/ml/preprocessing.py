from typing import List, Tuple, Dict, Any, Optional
import pandas as pd
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder

DEFAULT_THRESHOLDS = {
    "At Risk": 40.0,
    "Needs Improvement": 60.0,
    "Average": 75.0,
    "Good": 85.0,
    "Excellent": 100.0
}

def identify_column_types(df: pd.DataFrame) -> Tuple[List[str], List[str], List[str]]:
    """
    Categorizes columns into (numeric, categorical, identifier)
    """
    numeric_cols = []
    categorical_cols = []
    identifier_cols = []

    for col in df.columns:
        col_lower = col.lower()
        if "id" in col_lower or "identifier" in col_lower or "student_id" in col_lower:
            identifier_cols.append(col)
        elif pd.api.types.is_numeric_dtype(df[col]):
            numeric_cols.append(col)
        else:
            categorical_cols.append(col)

    return numeric_cols, categorical_cols, identifier_cols

def create_preprocessor(numeric_features: List[str], categorical_features: List[str]) -> ColumnTransformer:
    transformers = []
    
    if numeric_features:
        num_pipeline = Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='median')),
            ('scaler', StandardScaler())
        ])
        transformers.append(('num', num_pipeline, numeric_features))
        
    if categorical_features:
        cat_pipeline = Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='most_frequent')),
            ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
        ])
        transformers.append(('cat', cat_pipeline, categorical_features))
        
    return ColumnTransformer(transformers=transformers, remainder='drop')

def derive_performance_categories(
    scores: pd.Series,
    thresholds: Optional[Dict[str, float]] = None
) -> pd.Series:
    th = thresholds or DEFAULT_THRESHOLDS
    
    # Sort thresholds ascending
    t_risk = th.get("At Risk", 40.0)
    t_improve = th.get("Needs Improvement", 60.0)
    t_avg = th.get("Average", 75.0)
    t_good = th.get("Good", 85.0)

    def categorize(score):
        if pd.isna(score):
            return "Unknown"
        s = float(score)
        if s < t_risk:
            return "At Risk"
        elif s < t_improve:
            return "Needs Improvement"
        elif s < t_avg:
            return "Average"
        elif s < t_good:
            return "Good"
        else:
            return "Excellent"

    return scores.apply(categorize)
