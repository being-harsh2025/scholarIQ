import os
from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.entities import Dataset, User
from app.schemas import DatasetOut, DatasetDetail, DatasetPreview, EdaResponse
from app.api.deps import get_current_user, require_role, log_audit
from app.services.dataset_service import process_and_save_dataset, get_dataset_preview, delete_dataset
from app.services.eda_service import compute_eda_analysis
from app.core.config import settings

router = APIRouter()

@router.get("", response_model=List[DatasetOut])
def list_datasets(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "teacher"]))
):
    if current_user.role == "admin":
        return db.query(Dataset).order_by(Dataset.created_at.desc()).all()
    else:
        return db.query(Dataset).filter(
            (Dataset.user_id == current_user.id) | (Dataset.is_sample == True)
        ).order_by(Dataset.created_at.desc()).all()

@router.post("/upload", response_model=DatasetDetail)
def upload_dataset(
    name: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "teacher"]))
):
    dataset = process_and_save_dataset(db, current_user, name, file)
    log_audit(db, current_user.id, "UPLOAD_DATASET", "dataset", str(dataset.id), {"name": name, "rows": dataset.row_count})
    return dataset

@router.get("/sample/download")
def download_sample_dataset():
    sample_path = os.path.join(settings.SAMPLE_DATA_DIR, "student_performance.csv")
    if not os.path.exists(sample_path):
        raise HTTPException(status_code=404, detail="Synthetic sample dataset not found on server.")
    return FileResponse(
        sample_path,
        media_type="text/csv",
        filename="student_performance_sample.csv"
    )

@router.get("/{dataset_id}", response_model=DatasetDetail)
def get_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "teacher"]))
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    if current_user.role != "admin" and dataset.user_id != current_user.id and not dataset.is_sample:
        raise HTTPException(status_code=403, detail="Not authorized to access this dataset.")

    return dataset

@router.get("/{dataset_id}/preview", response_model=DatasetPreview)
def preview_dataset(
    dataset_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=5, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "teacher"]))
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    if current_user.role != "admin" and dataset.user_id != current_user.id and not dataset.is_sample:
        raise HTTPException(status_code=403, detail="Not authorized to access this dataset.")

    return get_dataset_preview(dataset, page, page_size)

@router.get("/{dataset_id}/eda", response_model=EdaResponse)
def get_dataset_eda(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "teacher"]))
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    if current_user.role != "admin" and dataset.user_id != current_user.id and not dataset.is_sample:
        raise HTTPException(status_code=403, detail="Not authorized to access this dataset.")

    return compute_eda_analysis(dataset)

@router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "teacher"]))
):
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    if current_user.role != "admin" and dataset.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this dataset.")

    delete_dataset(db, dataset)
    log_audit(db, current_user.id, "DELETE_DATASET", "dataset", str(dataset_id))
    return None
