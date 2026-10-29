import io
import uuid
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np
from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.models.entities import ModelRun, Prediction, User
from app.ml.registry import load_model_artifact

def generate_academic_recommendations(
    task_type: str,
    predicted_val: Any,
    input_features: Dict[str, Any]
) -> List[str]:
    recommendations = []

    # Check key academic factors if present
    attendance = input_features.get("attendance_percentage") or input_features.get("attendance")
    study_hours = input_features.get("study_hours_per_week") or input_features.get("study_hours")
    previous_score = input_features.get("previous_score")
    internal_exam = input_features.get("internal_exam_score")
    tutoring = input_features.get("tutoring")

    if attendance is not None:
        try:
            att = float(attendance)
            if att < 75.0:
                recommendations.append(f"Priority Attendance Intervention: Current attendance ({att}%) is below 75%. Establishing an attendance check-in schedule can significantly reduce risk.")
            elif att >= 90.0:
                recommendations.append(f"Strong Attendance: Maintaining consistent attendance ({att}%) provides a solid foundation for test prep.")
        except (ValueError, TypeError):
            pass

    if study_hours is not None:
        try:
            hrs = float(study_hours)
            if hrs < 8.0:
                recommendations.append(f"Study Habit Coaching: Increasing independent study time from {hrs} hrs/week toward 12-15 hrs/week with structured intervals will boost retention.")
            elif hrs > 28.0:
                recommendations.append("Balanced Schedule: High study hours observed; ensure adequate sleep and burnout prevention strategies.")
        except (ValueError, TypeError):
            pass

    if internal_exam is not None and previous_score is not None:
        try:
            exam = float(internal_exam)
            prev = float(previous_score)
            if exam < prev - 10:
                recommendations.append("Exam Preparation Support: Internal exam marks dropped relative to historical performance. Review specific challenging chapters.")
        except (ValueError, TypeError):
            pass

    if str(tutoring).lower() in ["no", "false"]:
        if task_type == "regression" and float(predicted_val) < 60.0:
            recommendations.append("Peer Mentorship / Tutoring: Recommend enrolling in peer-led tutorial sessions for targeted concept reinforcement.")
        elif task_type == "classification" and str(predicted_val) in ["At Risk", "Needs Improvement"]:
            recommendations.append("Academic Advisory Notice: Schedule a 1-on-1 counseling session to diagnose learning bottlenecks.")

    if not recommendations:
        recommendations.append("Standard Academic Progress: Continue current study routines while monitoring upcoming milestone assessments.")

    return recommendations

def run_single_prediction(
    db: Session,
    user: User,
    model_run: ModelRun,
    student_identifier: Optional[str],
    input_features: Dict[str, Any]
) -> Dict[str, Any]:
    if not model_run.artifact_path:
        raise HTTPException(status_code=400, detail="Model artifact path not set for this model run.")

    artifact = load_model_artifact(model_run.artifact_path)
    pipeline = artifact["pipeline"]
    meta = artifact.get("metadata", {})
    required_features = meta.get("selected_features", [])

    # Validate presence of required features
    missing = [f for f in required_features if f not in input_features or input_features[f] is None]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required input features for model '{model_run.name}': {', '.join(missing)}"
        )

    # Format into 1-row DataFrame
    input_df = pd.DataFrame([{f: input_features[f] for f in required_features}])

    try:
        raw_pred = pipeline.predict(input_df)[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

    probabilities = None
    if model_run.task_type == "classification":
        predicted_val = str(raw_pred)
        # Attempt to get predict_proba
        try:
            estimator = pipeline.named_steps.get("classifier")
            if hasattr(pipeline, "predict_proba"):
                probs = pipeline.predict_proba(input_df)[0]
                classes = pipeline.classes_
                probabilities = {str(c): round(float(p), 4) for c, p in zip(classes, probs)}
        except Exception:
            pass
    else:
        # Regression
        predicted_val = str(round(float(raw_pred), 2))

    recommendations = generate_academic_recommendations(
        task_type=model_run.task_type,
        predicted_val=predicted_val,
        input_features=input_features
    )

    # Save to database
    prediction_record = Prediction(
        user_id=user.id,
        model_run_id=model_run.id,
        student_identifier=student_identifier or "ANONYMOUS",
        input_data=input_features,
        predicted_value=predicted_val,
        probabilities=probabilities,
        prediction_type="single"
    )
    db.add(prediction_record)
    db.commit()
    db.refresh(prediction_record)

    return {
        "prediction_id": prediction_record.id,
        "student_identifier": student_identifier,
        "model_name": model_run.name,
        "algorithm": model_run.algorithm,
        "task_type": model_run.task_type,
        "target_column": model_run.target_column,
        "predicted_value": float(predicted_val) if model_run.task_type == "regression" else predicted_val,
        "probabilities": probabilities,
        "evaluation_summary": {
            k: v for k, v in (model_run.metrics or {}).items() 
            if k in ["mae", "rmse", "r2", "accuracy", "f1_macro", "f1_weighted"]
        },
        "input_features": input_features,
        "recommendations": recommendations
    }

def run_batch_prediction(
    db: Session,
    user: User,
    model_run: ModelRun,
    file: UploadFile
) -> Dict[str, Any]:
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are accepted for batch prediction.")

    if not model_run.artifact_path:
        raise HTTPException(status_code=400, detail="Model artifact path not set.")

    artifact = load_model_artifact(model_run.artifact_path)
    pipeline = artifact["pipeline"]
    meta = artifact.get("metadata", {})
    required_features = meta.get("selected_features", [])

    contents = file.file.read()
    try:
        batch_df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read CSV: {str(e)}")

    if batch_df.empty:
        raise HTTPException(status_code=400, detail="Batch CSV file is empty.")

    # Check for missing required columns
    missing_cols = [f for f in required_features if f not in batch_df.columns]
    if missing_cols:
        raise HTTPException(
            status_code=400,
            detail=f"Uploaded CSV is missing required model features: {', '.join(missing_cols)}"
        )

    # Identify student identifier column if present
    id_col = next((c for c in ["student_id", "id", "roll_no", "identifier"] if c in batch_df.columns), None)

    batch_id = str(uuid.uuid4())[:8]
    predictions_out = []
    errors_out = []
    db_predictions = []

    for idx, row in batch_df.iterrows():
        student_id_val = str(row[id_col]) if id_col and pd.notna(row[id_col]) else f"ROW_{idx + 1}"
        row_input = {f: row[f] for f in required_features}
        
        # Check nulls in required features
        row_missing = [f for f in required_features if pd.isna(row_input[f])]
        if row_missing:
            errors_out.append({
                "row_index": idx + 1,
                "student_identifier": student_id_val,
                "error": f"Missing values in required columns: {', '.join(row_missing)}"
            })
            continue

        try:
            single_row_df = pd.DataFrame([row_input])
            raw_pred = pipeline.predict(single_row_df)[0]
            
            if model_run.task_type == "regression":
                pred_val_str = str(round(float(raw_pred), 2))
                pred_val_display = round(float(raw_pred), 2)
            else:
                pred_val_str = str(raw_pred)
                pred_val_display = str(raw_pred)

            predictions_out.append({
                "row_index": idx + 1,
                "student_identifier": student_id_val,
                "predicted_value": pred_val_display,
                "input_summary": row_input
            })

            db_predictions.append(Prediction(
                user_id=user.id,
                model_run_id=model_run.id,
                student_identifier=student_id_val,
                input_data=row_input,
                predicted_value=pred_val_str,
                prediction_type="batch",
                batch_id=batch_id
            ))
        except Exception as e:
            errors_out.append({
                "row_index": idx + 1,
                "student_identifier": student_id_val,
                "error": str(e)
            })

    if db_predictions:
        db.bulk_save_objects(db_predictions)
        db.commit()

    return {
        "model_id": model_run.id,
        "model_name": model_run.name,
        "task_type": model_run.task_type,
        "total_rows": len(batch_df),
        "successful_count": len(predictions_out),
        "failed_count": len(errors_out),
        "predictions": predictions_out,
        "errors": errors_out
    }
