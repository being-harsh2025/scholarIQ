from typing import Dict, Any, List
import numpy as np
import pandas as pd
from sklearn.metrics import (
    mean_absolute_error,
    root_mean_squared_error,
    r2_score,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
    classification_report
)

def evaluate_regression(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    max_plot_points: int = 200
) -> Dict[str, Any]:
    mae = float(mean_absolute_error(y_true, y_pred))
    rmse = float(root_mean_squared_error(y_true, y_pred))
    r2 = float(r2_score(y_true, y_pred))

    residuals = y_true - y_pred
    
    # Negative R2 guidance
    r2_warning = None
    if r2 < 0:
        r2_warning = "Negative R² indicates that the chosen model performs worse on the held-out test data than a simple horizontal line predicting the mean target."

    # Sample points for visualization
    n_points = min(len(y_true), max_plot_points)
    indices = np.random.choice(len(y_true), size=n_points, replace=False) if len(y_true) > n_points else np.arange(len(y_true))
    
    actual_vs_pred = [
        {"actual": round(float(y_true[i]), 2), "predicted": round(float(y_pred[i]), 2)}
        for i in indices
    ]
    
    residual_data = [
        {"predicted": round(float(y_pred[i]), 2), "residual": round(float(residuals[i]), 2)}
        for i in indices
    ]

    return {
        "mae": round(mae, 4),
        "rmse": round(rmse, 4),
        "r2": round(r2, 4),
        "r2_warning": r2_warning,
        "residual_mean": round(float(np.mean(residuals)), 4),
        "residual_std": round(float(np.std(residuals)), 4),
        "actual_vs_predicted": actual_vs_pred,
        "residuals": residual_data,
        "test_sample_count": len(y_true)
    }


def evaluate_classification(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    classes: List[str]
) -> Dict[str, Any]:
    acc = float(accuracy_score(y_true, y_pred))
    p_macro = float(precision_score(y_true, y_pred, average="macro", zero_division=0))
    p_weighted = float(precision_score(y_true, y_pred, average="weighted", zero_division=0))
    r_macro = float(recall_score(y_true, y_pred, average="macro", zero_division=0))
    r_weighted = float(recall_score(y_true, y_pred, average="weighted", zero_division=0))
    f1_macro = float(f1_score(y_true, y_pred, average="macro", zero_division=0))
    f1_weighted = float(f1_score(y_true, y_pred, average="weighted", zero_division=0))

    cm = confusion_matrix(y_true, y_pred, labels=classes)
    
    # Class imbalance detection
    unique, counts = np.unique(y_true, return_counts=True)
    class_counts = dict(zip([str(u) for u in unique], [int(c) for c in counts]))
    min_count = min(counts) if len(counts) > 0 else 0
    max_count = max(counts) if len(counts) > 0 else 1
    imbalance_warning = None
    if min_count / max_count < 0.2:
        imbalance_warning = f"High class imbalance detected (ratio: {round(min_count/max_count, 2)}). Accuracy alone may be misleading; observe Macro and Weighted F1-scores."

    # Per-class metrics
    report = classification_report(y_true, y_pred, labels=classes, output_dict=True, zero_division=0)
    per_class = []
    for cls in classes:
        cls_str = str(cls)
        cls_data = report.get(cls_str, {})
        per_class.append({
            "class_name": cls_str,
            "precision": round(cls_data.get("precision", 0.0), 4),
            "recall": round(cls_data.get("recall", 0.0), 4),
            "f1_score": round(cls_data.get("f1-score", 0.0), 4),
            "support": int(cls_data.get("support", 0))
        })

    return {
        "accuracy": round(acc, 4),
        "precision_macro": round(p_macro, 4),
        "precision_weighted": round(p_weighted, 4),
        "recall_macro": round(r_macro, 4),
        "recall_weighted": round(r_weighted, 4),
        "f1_macro": round(f1_macro, 4),
        "f1_weighted": round(f1_weighted, 4),
        "classes": [str(c) for c in classes],
        "confusion_matrix": cm.tolist(),
        "per_class": per_class,
        "class_counts": class_counts,
        "imbalance_warning": imbalance_warning,
        "test_sample_count": len(y_true)
    }
