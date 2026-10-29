import time
import os
from typing import Dict, Any, List
import pandas as pd
import numpy as np
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sklearn.model_selection import train_test_split

from app.models.entities import ModelRun, ModelFeature, Dataset, User
from app.ml.pipelines import build_regression_pipeline
from app.ml.evaluation import evaluate_regression
from app.ml.registry import save_model_artifact
from app.ml.preprocessing import identify_column_types

def train_regression_model(
    db: Session,
    user: User,
    dataset: Dataset,
    name: str,
    algorithm: str,
    target_column: str,
    selected_features: List[str],
    test_size: float = 0.2,
    random_seed: int = 42
) -> ModelRun:
    start_time = time.time()

    if not os.path.exists(dataset.file_path):
        raise HTTPException(status_code=404, detail="Dataset file not found.")

    df = pd.read_csv(dataset.file_path)

    # 1. Leakage Safeguards
    if target_column not in df.columns:
        raise HTTPException(status_code=400, detail=f"Target column '{target_column}' not found in dataset.")

    if target_column in selected_features:
        raise HTTPException(status_code=400, detail="Data leakage violation: Target column cannot be included in input features.")

    if not pd.api.types.is_numeric_dtype(df[target_column]):
        raise HTTPException(status_code=400, detail=f"Regression target '{target_column}' must be a numeric continuous column.")

    numeric_cols, categorical_cols, identifier_cols = identify_column_types(df)
    
    # Filter selected features to valid columns excluding identifiers
    clean_features = [f for f in selected_features if f in df.columns and f not in identifier_cols]
    if not clean_features:
        raise HTTPException(status_code=400, detail="At least one valid non-identifier feature must be selected.")

    # 2. Extract X and y, dropping missing targets
    valid_mask = df[target_column].notna()
    df_valid = df[valid_mask]
    
    if len(df_valid) < 10:
        raise HTTPException(status_code=400, detail="Insufficient valid samples with target values to train a regression model.")

    X = df_valid[clean_features]
    y = df_valid[target_column].astype(float)

    # Determine types of selected features
    num_feats = [f for f in clean_features if pd.api.types.is_numeric_dtype(X[f])]
    cat_feats = [f for f in clean_features if f not in num_feats]

    # 3. Train/Test Split (before any preprocessing to prevent leakage)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_seed
    )

    # 4. Build and fit pipeline
    pipeline = build_regression_pipeline(
        algorithm=algorithm,
        numeric_features=num_feats,
        categorical_features=cat_feats,
        random_seed=random_seed
    )

    try:
        pipeline.fit(X_train, y_train)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fitting regression model: {str(e)}")

    # 5. Evaluate on held-out test split
    y_pred = pipeline.predict(X_test)
    metrics = evaluate_regression(y_test.values, y_pred)

    duration = time.time() - start_time

    # 6. Extract feature importances if available
    importance_map = {}
    try:
        estimator = pipeline.named_steps["regressor"]
        if hasattr(estimator, "feature_importances_"):
            # If tree-based
            importances = estimator.feature_importances_
            # Map back to features approx
            for idx, feat in enumerate(clean_features):
                if idx < len(importances):
                    importance_map[feat] = round(float(importances[idx]), 4)
        elif hasattr(estimator, "coef_"):
            coefs = np.abs(estimator.coef_)
            for idx, feat in enumerate(clean_features):
                if idx < len(coefs):
                    importance_map[feat] = round(float(coefs[idx]), 4)
    except Exception:
        pass

    # 7. Create ModelRun record
    model_run = ModelRun(
        user_id=user.id,
        dataset_id=dataset.id,
        name=name,
        task_type="regression",
        algorithm=algorithm,
        target_column=target_column,
        is_derived_target=False,
        test_size=test_size,
        random_seed=random_seed,
        status="completed",
        metrics=metrics,
        duration_seconds=round(duration, 2),
        is_active=True
    )
    db.add(model_run)
    db.flush()

    # Save model features
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

    # 8. Save Model Artifact to persistent storage
    metadata = {
        "model_run_id": model_run.id,
        "name": name,
        "algorithm": algorithm,
        "task_type": "regression",
        "target_column": target_column,
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
