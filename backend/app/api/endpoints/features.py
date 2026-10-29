import os
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.entities import Dataset, User
from app.schemas import FeatureSelectionRequest, FeatureSelectionResponse
from app.api.deps import require_role
from app.ml.feature_selection import run_feature_selection

router = APIRouter()

@router.post("/select", response_model=FeatureSelectionResponse)
def select_features(
    req: FeatureSelectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "teacher"]))
):
    dataset = db.query(Dataset).filter(Dataset.id == req.dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found.")

    if not os.path.exists(dataset.file_path):
        raise HTTPException(status_code=404, detail="Dataset file missing on disk.")

    df = pd.read_csv(dataset.file_path)

    try:
        results = run_feature_selection(
            df=df,
            target_column=req.target_column,
            method=req.method,
            k=req.k
        )
        return results
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Feature selection error: {str(e)}")
