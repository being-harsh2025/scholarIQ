import io
import csv
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Response
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.entities import ModelRun, Prediction, User
from app.schemas import (
    SinglePredictionRequest,
    SinglePredictionResponse,
    BatchPredictionResponse,
    PredictionRecordOut
)
from app.api.deps import get_current_user, require_role, log_audit
from app.services.prediction_service import run_single_prediction, run_batch_prediction

router = APIRouter()

@router.post("/single", response_model=SinglePredictionResponse)
def predict_single(
    req: SinglePredictionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "teacher"]))
):
    model_run = db.query(ModelRun).filter(ModelRun.id == req.model_run_id).first()
    if not model_run:
        raise HTTPException(status_code=404, detail="Selected model run not found.")

    res = run_single_prediction(
        db=db,
        user=current_user,
        model_run=model_run,
        student_identifier=req.student_identifier,
        input_features=req.input_features
    )
    log_audit(db, current_user.id, "PREDICT_SINGLE", "prediction", str(res["prediction_id"]))
    return res

@router.post("/batch", response_model=BatchPredictionResponse)
def predict_batch(
    model_run_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "teacher"]))
):
    model_run = db.query(ModelRun).filter(ModelRun.id == model_run_id).first()
    if not model_run:
        raise HTTPException(status_code=404, detail="Selected model run not found.")

    res = run_batch_prediction(
        db=db,
        user=current_user,
        model_run=model_run,
        file=file
    )
    log_audit(db, current_user.id, "PREDICT_BATCH", "model_run", str(model_run_id), {"total": res["total_rows"]})
    return res

@router.get("/history", response_model=List[PredictionRecordOut])
def get_prediction_history(
    model_run_id: Optional[int] = None,
    student_id: Optional[str] = None,
    task_type: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Prediction).join(ModelRun, Prediction.model_run_id == ModelRun.id)

    # RBAC Enforcement:
    if current_user.role == "student":
        # Student MUST ONLY access their own records
        if not current_user.student_id:
            return []
        query = query.filter(Prediction.student_identifier == current_user.student_id)
    elif current_user.role == "teacher":
        query = query.filter(Prediction.user_id == current_user.id)
    # Admin sees all

    if model_run_id:
        query = query.filter(Prediction.model_run_id == model_run_id)
    if student_id and current_user.role != "student":
        query = query.filter(Prediction.student_identifier.ilike(f"%{student_id}%"))
    if task_type:
        query = query.filter(ModelRun.task_type == task_type)

    predictions = query.order_by(Prediction.created_at.desc()).limit(limit).all()

    # Format response
    out = []
    for p in predictions:
        out.append(PredictionRecordOut(
            id=p.id,
            student_identifier=p.student_identifier,
            model_run_id=p.model_run_id,
            model_name=p.model_run.name,
            task_type=p.model_run.task_type,
            algorithm=p.model_run.algorithm,
            predicted_value=p.predicted_value,
            probabilities=p.probabilities,
            prediction_type=p.prediction_type,
            batch_id=p.batch_id,
            input_data=p.input_data,
            created_at=p.created_at
        ))
    return out

@router.get("/export")
def export_predictions_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Prediction).join(ModelRun, Prediction.model_run_id == ModelRun.id)

    if current_user.role == "student":
        if not current_user.student_id:
            raise HTTPException(status_code=403, detail="No student record linked.")
        query = query.filter(Prediction.student_identifier == current_user.student_id)
    elif current_user.role == "teacher":
        query = query.filter(Prediction.user_id == current_user.id)

    records = query.order_by(Prediction.created_at.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Prediction ID", "Student Identifier", "Model Name", "Task Type",
        "Algorithm", "Predicted Output", "Type", "Created At"
    ])

    for r in records:
        writer.writerow([
            r.id,
            r.student_identifier,
            r.model_run.name,
            r.model_run.task_type,
            r.model_run.algorithm,
            r.predicted_value,
            r.prediction_type,
            r.created_at.isoformat()
        ])

    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=edupredict_predictions_export.csv"}
    )
