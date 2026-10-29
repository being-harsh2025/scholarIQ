import time
import os
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sklearn.model_selection import train_test_split

from app.models.entities import ModelRun, ModelFeature, Dataset, User
from app.ml.pipelines import build_classification_pipeline
from app.ml.evaluation import evaluate_classification
from app.ml.registry import save_model_artifact
from app.ml.preprocessing import identify_column_types, derive_performance_categories

def train_classification_model(
    db: Session,
    user: User,
    dataset: Dataset,
    name: str,
    algorithm: str,
    target_column: str,
    is_derived_target: bool = False,
    source_score_column: Optional[str] = None,
    derived_thresholds: Optional[Dict[str, float]] = None,
    selected_features: List[str] = [],
    test_size: float = 0.2,
    random_seed: int = 42
) -> ModelRun:
    start_time = time.time()

    if not os.path.exists(dataset.file_path):
        raise HTTPException(status_code=404, detail="Dataset file not found.")

    df = pd.read_csv(dataset.file_path)

    # 1. Target Preparation & Leakage Safeguards
    if is_derived_target:
        if not source_score_column or source_score_column not in df.columns:
            raise HTTPException(status_code=400, detail="Valid source score column must be specified when deriving categorical target.")
        
        # Strict Leakage Rule: Never include the source score column when predicting the category derived from that score!
        if source_score_column in selected_features:
            raise HTTPException(
                status_code=400,
                detail=f"Data leakage violation: Cannot include source score column '{source_score_column}' as an input feature when predicting categories derived from it!"
            )
        
        y_series = derive_performance_categories(df[source_score_column], derived_thresholds)
        target_name = f"{source_score_column}_category"
    else:
        if target_column not in df.columns:
            raise HTTPException(status_code=400, detail=f"Target column '{target_column}' not found in dataset.")
        y_series = df[target_column].astype(str)
        target_name = target_column

    if target_column in selected_features or target_name in selected_features:
        raise HTTPException(status_code=400, detail="Data leakage violation: Target column cannot be included in input features.")

    numeric_cols, categorical_cols, identifier_cols = identify_column_types(df)

    # Filter features to exclude identifiers and target
    clean_features = [
        f for f in selected_features 
        if f in df.columns and f not in identifier_cols and f != target_column and f != source_score_column
    ]

    if not clean_features:
        raise HTTPException(status_code=400, detail="At least one valid non-identifier feature must be selected.")

    # Remove rows where target is invalid or missing
    valid_mask = y_series.notna() & (y_series != "Unknown")
    df_valid = df[valid_mask]
    y_valid = y_series[valid_mask]

    if len(df_valid) < 10:
        raise HTTPException(status_code=400, detail="Insufficient valid samples to train classification model.")

    X = df_valid[clean_features]
    y = y_valid

    # Determine unique classes
    classes = sorted(list(y.unique()))
    if len(classes) < 2:
        raise HTTPException(status_code=400, detail="Classification requires at least 2 distinct target classes.")

    num_feats = [f for f in clean_features if pd.api.types.is_numeric_dtype(X[f])]
    cat_feats = [f for f in clean_features if f not in num_feats]

    # Stratification check (all classes must have at least 2 samples)
    class_counts = y.value_counts()
    can_stratify = (class_counts.min() >= 2)
    stratify_target = y if can_stratify else None

    # Train / Test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_seed, stratify=stratify_target
    )

    # Build and fit pipeline
    pipeline = build_classification_pipeline(
        algorithm=algorithm,
        numeric_features=num_feats,
        categorical_features=cat_feats,
        random_seed=random_seed
    )

    try:
        pipeline.fit(X_train, y_train)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fitting classification model: {str(e)}")

    # Evaluate on held-out test data
    y_pred = pipeline.predict(X_test)
    metrics = evaluate_classification(y_test.values, y_pred, classes=classes)

    duration = time.time() - start_time

    # Feature importances
    importance_map = {}
    try:
        estimator = pipeline.named_steps["classifier"]
        if hasattr(estimator, "feature_importances_"):
            importances = estimator.feature_importances_
            for idx, feat in enumerate(clean_features):
                if idx < len(importances):
                    importance_map[feat] = round(float(importances[idx]), 4)
    except Exception:
        pass

    # Record ModelRun
    model_run = ModelRun(
        user_id=user.id,
        dataset_id=dataset.id,
        name=name,
        task_type="classification",
        algorithm=algorithm,
        target_column=target_name,
        is_derived_target=is_derived_target,
        derived_thresholds=derived_thresholds,
        test_size=test_size,
        random_seed=random_seed,
        status="completed",
        metrics=metrics,
        duration_seconds=round(duration, 2),
        is_active=True
    )
    db.add(model_run)
    db.flush()

    for feat in clean_features:
        f_type = "numeric" if feat in num_feats else "categorical"
        score = importance_map.get(feat, None)
        mf = ModelFeature(
            model_run_id=model_run.id,
            feature_name=feat,
            feature_type=f_type,
            importance_score=score,
            is_selected=True
        )
        db.add(mf)

    metadata = {
        "model_run_id": model_run.id,
        "name": name,
        "algorithm": algorithm,
        "task_type": "classification",
        "target_column": target_name,
        "classes": classes,
        "selected_features": clean_features,
        "numeric_features": num_feats,
        "categorical_features": cat_feats,
        "metrics": metrics
    }
    artifact_path = save_model_artifact(pipeline, model_run.id, metadata)
    model_run.artifact_path = artifact_path

    db.commit()
    db.refresh(model_run)
    return model_run
