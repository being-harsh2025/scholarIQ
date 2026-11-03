import os
from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.entities import User, Dataset, ModelRun, Prediction
from app.schemas import HealthOut
from app.api.deps import get_current_user
from app.core.config import settings

router = APIRouter()

@router.get("/health", response_model=HealthOut)
def check_health(db: Session = Depends(get_db)):
    db_ok = True
    try:
        db.execute(func.now()).scalar()
    except Exception:
        db_ok = False

    sample_path = os.path.join(settings.SAMPLE_DATA_DIR, "student_performance.csv")
    sample_ready = os.path.exists(sample_path)

    return HealthOut(
        status="healthy" if db_ok else "degraded",
        project=settings.PROJECT_NAME,
        version="1.0.0",
        database_connected=db_ok,
        sample_dataset_ready=sample_ready
    )

@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Unified total datasets across the system
    dataset_query = db.query(Dataset)
    total_datasets = dataset_query.count()
    total_records = db.query(func.coalesce(func.sum(Dataset.row_count), 0)).scalar()

    # Unified total models
    model_query = db.query(ModelRun)
    total_models = model_query.count()

    # Unified total predictions
    pred_query = db.query(Prediction)
    total_predictions = pred_query.count()

    # Latest model run
    latest_model = model_query.order_by(ModelRun.created_at.desc()).first()
    latest_model_summary = None
    if latest_model:
        latest_model_summary = {
            "id": latest_model.id,
            "name": latest_model.name,
            "algorithm": latest_model.algorithm,
            "task_type": latest_model.task_type,
            "created_at": latest_model.created_at.isoformat(),
            "metrics": latest_model.metrics
        }

    # Recent datasets
    recent_datasets = [
        {"id": d.id, "name": d.name, "rows": d.row_count, "created_at": d.created_at.isoformat()}
        for d in dataset_query.order_by(Dataset.created_at.desc()).limit(5).all()
    ]

    # Recent predictions
    recent_preds = [
        {
            "id": p.id,
            "student_identifier": p.student_identifier,
            "predicted_value": p.predicted_value,
            "prediction_type": p.prediction_type,
            "model_name": p.model_run.name if p.model_run else "Unknown",
            "task_type": p.model_run.task_type if p.model_run else "Unknown",
            "created_at": p.created_at.isoformat()
        }
        for p in pred_query.order_by(Prediction.created_at.desc()).limit(6).all()
    ]

    return {
        "total_datasets": total_datasets,
        "total_records": int(total_records),
        "total_models": total_models,
        "total_predictions": total_predictions,
        "latest_model": latest_model_summary,
        "recent_datasets": recent_datasets,
        "recent_predictions": recent_preds,
        "role": current_user.role
    }
