import os
import shutil
from pathlib import Path
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.entities import Dataset, DatasetColumn, User
from app.ml.preprocessing import identify_column_types

MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB

def process_and_save_dataset(
    db: Session,
    user: User,
    name: str,
    file: UploadFile
) -> Dataset:
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are currently supported.")

    # Storage destination
    storage_dir = Path(settings.DATASET_STORAGE_DIR)
    storage_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate unique safe file name
    safe_filename = f"user_{user.id}_{int(pd.Timestamp.now().timestamp())}_{file.filename.replace(' ', '_')}"
    file_path = storage_dir / safe_filename

    # Read and validate file size
    contents = file.file.read()
    file_size = len(contents)
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"File exceeds maximum allowed size of {MAX_FILE_SIZE // (1024*1024)} MB.")
    
    with open(file_path, "wb") as f:
        f.write(contents)

    # Validate CSV parsing
    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=400, detail=f"Invalid CSV format: {str(e)}")

    if len(df) < 5:
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=400, detail="Dataset must contain at least 5 rows for statistical validity.")

    if len(df.columns) < 2:
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=400, detail="Dataset must contain at least 2 columns.")

    # Create dataset record
    dataset = Dataset(
        user_id=user.id,
        name=name,
        filename=file.filename,
        file_path=str(file_path),
        row_count=len(df),
        column_count=len(df.columns),
        file_size_bytes=file_size,
        is_sample=False
    )
    db.add(dataset)
    db.flush()

    # Column profiling
    numeric_cols, categorical_cols, identifier_cols = identify_column_types(df)

    for col in df.columns:
        col_type = "numeric" if col in numeric_cols else ("identifier" if col in identifier_cols else "categorical")
        missing_count = int(df[col].isna().sum())
        unique_count = int(df[col].nunique(dropna=True))
        
        sample_vals = [str(v) for v in df[col].dropna().head(5).tolist()]
        
        min_v, max_v, mean_v = None, None, None
        if col in numeric_cols:
            clean_series = pd.to_numeric(df[col], errors='coerce').dropna()
            if not clean_series.empty:
                min_v = float(clean_series.min())
                max_v = float(clean_series.max())
                mean_v = float(clean_series.mean())

        column_record = DatasetColumn(
            dataset_id=dataset.id,
            name=col,
            data_type=col_type,
            missing_count=missing_count,
            unique_count=unique_count,
            sample_values=sample_vals,
            min_val=min_v,
            max_val=max_v,
            mean_val=mean_v
        )
        db.add(column_record)

    db.commit()
    db.refresh(dataset)
    return dataset

def get_dataset_preview(dataset: Dataset, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
    if not os.path.exists(dataset.file_path):
        raise HTTPException(status_code=404, detail="Dataset file missing on disk.")

    df = pd.read_csv(dataset.file_path)
    total_rows = len(df)
    
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    preview_df = df.iloc[start_idx:end_idx].replace({np.nan: None})

    numeric_cols, categorical_cols, identifier_cols = identify_column_types(df)

    return {
        "columns": list(df.columns),
        "rows": preview_df.to_dict(orient="records"),
        "total_rows": total_rows,
        "page": page,
        "page_size": page_size,
        "numeric_columns": numeric_cols,
        "categorical_columns": categorical_cols,
        "identifier_columns": identifier_cols
    }

def delete_dataset(db: Session, dataset: Dataset):
    if os.path.exists(dataset.file_path):
        try:
            os.remove(dataset.file_path)
        except Exception:
            pass
    db.delete(dataset)
    db.commit()
