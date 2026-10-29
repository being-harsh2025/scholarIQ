from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.entities import ModelRun, Dataset, User
from app.schemas import (
    TrainRegressionRequest,
    TrainClassificationRequest,
    ModelRunOut
)
from app.api.deps import require_role, log_audit
from app.services.regression_service import train_regression_model
from app.services.classification_service import train_classification_model

router = APIRouter()

@router.get("", response_model=List[ModelRunOut])
def list_models(
    task_type: Optional[str] = None,
    dataset_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "teacher"]))
):
    query = db.query(ModelRun)
    if task_type:
        query = query.filter(ModelRun.task_type == task_type)
    if dataset_id:
        query = query.filter(ModelRun.dataset_id == dataset_id)

    if current_user.role != "admin":
        query = query.filter(ModelRun.user_id == current_user.id)

    return query.order_by(ModelRun.created_at.desc()).all()

@router.post("/train-regression", response_model=ModelRunOut)
def train_regression(
    req: TrainRegressionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "teacher"]))
):
    dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    model_run = train_regression_model(
        db=db,
        user=current_user,
        dataset=dataset,
        name=req.name,
        algorithm=req.algorithm,
        target_column=req.target_column,
        selected_features=req.selected_features,
        test_size=req.test_size,
        random_seed=req.random_seed
    )

    log_audit(db, current_user.id, "TRAIN_REGRESSION", "model_run", str(model_run.id), {"algorithm": req.algorithm})
    return model_run

@router.post("/train-classification", response_model=ModelRunOut)
def train_classification(
    req: TrainClassificationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "teacher"]))
):
    dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    model_run = train_classification_model(
        db=db,
        user=current_user,
        dataset=dataset,
        name=req.name,
        algorithm=req.algorithm,
        target_column=req.target_column,
        is_derived_target=req.is_derived_target,
        source_score_column=req.source_score_column,
        derived_thresholds=req.derived_thresholds,
        selected_features=req.selected_features,
        test_size=req.test_size,
        random_seed=req.random_seed
    )

    log_audit(db, current_user.id, "TRAIN_CLASSIFICATION", "model_run", str(model_run.id), {"algorithm": req.algorithm})
    return model_run

@router.get("/{model_id}", response_model=ModelRunOut)
def get_model(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "teacher"]))
):
    model_run = db.query(ModelRun).filter(ModelRun.id == model_id).first()
    if not model_run:
        raise HTTPException(status_code=404, detail="Model run not found.")

    if current_user.role != "admin" and model_run.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this model.")

    return model_run

@router.patch("/{model_id}/toggle-active", response_model=ModelRunOut)
def toggle_model_active(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "teacher"]))
):
    model_run = db.query(ModelRun).filter(ModelRun.id == model_id).first()
    if not model_run:
        raise HTTPException(status_code=404, detail="Model run not found.")

    if current_user.role != "admin" and model_run.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this model.")

    model_run.is_active = not model_run.is_active
    db.commit()
    db.refresh(model_run)
    return model_run
