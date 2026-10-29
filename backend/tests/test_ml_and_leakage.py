import io
import pandas as pd
import pytest

def test_feature_selection_leakage_safeguards(client, teacher_auth_headers, sample_dataset):
    payload = {
        "dataset_id": sample_dataset.id,
        "target_column": "final_score",
        "method": "select_k_best",
        "k": 3
    }
    res = client.post("/api/features/select", json=payload, headers=teacher_auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["target_column"] == "final_score"
    
    # Feature candidates MUST NOT contain target or student_id
    features = [s["feature"] for s in data["scores"]]
    assert "final_score" not in features
    assert "student_id" not in features
    assert len(data["scores"]) > 0

def test_regression_target_leakage_rejected(client, teacher_auth_headers, sample_dataset):
    # Attempt to include final_score as an input feature to predict final_score
    payload = {
        "dataset_id": sample_dataset.id,
        "name": "Leakage Test Run",
        "algorithm": "LinearRegression",
        "target_column": "final_score",
        "selected_features": ["attendance_percentage", "final_score"],  # Leakage!
        "test_size": 0.2,
        "random_seed": 42
    }
    res = client.post("/api/models/train-regression", json=payload, headers=teacher_auth_headers)
    assert res.status_code == 400
    assert "leakage" in res.json()["detail"].lower()

def test_regression_training_and_metrics(client, teacher_auth_headers, sample_dataset):
    payload = {
        "dataset_id": sample_dataset.id,
        "name": "Production RF Regressor",
        "algorithm": "RandomForestRegressor",
        "target_column": "final_score",
        "selected_features": ["attendance_percentage", "study_hours_per_week", "previous_score"],
        "test_size": 0.2,
        "random_seed": 42
    }
    res = client.post("/api/models/train-regression", json=payload, headers=teacher_auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["task_type"] == "regression"
    assert data["status"] == "completed"
    
    metrics = data["metrics"]
    assert "mae" in metrics
    assert "rmse" in metrics
    assert "r2" in metrics
    assert isinstance(metrics["mae"], (int, float))
    assert isinstance(metrics["rmse"], (int, float))
    assert isinstance(metrics["r2"], (int, float))
    assert len(metrics["actual_vs_predicted"]) > 0
    assert len(metrics["residuals"]) > 0

def test_classification_derived_leakage_rejected(client, teacher_auth_headers, sample_dataset):
    # When deriving categories from final_score, final_score must NOT be in input features!
    payload = {
        "dataset_id": sample_dataset.id,
        "name": "Derived Leakage Classifier",
        "algorithm": "RandomForestClassifier",
        "target_column": "final_score_category",
        "is_derived_target": True,
        "source_score_column": "final_score",
        "selected_features": ["attendance_percentage", "final_score"],  # Leakage!
        "test_size": 0.2,
        "random_seed": 42
    }
    res = client.post("/api/models/train-classification", json=payload, headers=teacher_auth_headers)
    assert res.status_code == 400
    assert "leakage" in res.json()["detail"].lower()

def test_classification_training_and_confusion_matrix(client, teacher_auth_headers, sample_dataset):
    payload = {
        "dataset_id": sample_dataset.id,
        "name": "Academic Tier Classifier",
        "algorithm": "RandomForestClassifier",
        "target_column": "performance_category",
        "is_derived_target": False,
        "selected_features": ["attendance_percentage", "study_hours_per_week", "previous_score"],
        "test_size": 0.2,
        "random_seed": 42
    }
    res = client.post("/api/models/train-classification", json=payload, headers=teacher_auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["task_type"] == "classification"
    
    metrics = data["metrics"]
    assert "accuracy" in metrics
    assert "f1_macro" in metrics
    assert "f1_weighted" in metrics
    assert "confusion_matrix" in metrics
    assert "per_class" in metrics
    assert len(metrics["classes"]) >= 2

def test_single_and_batch_prediction_flow(client, teacher_auth_headers, student_auth_headers, sample_dataset):
    # 1. Train a model
    train_res = client.post("/api/models/train-regression", json={
        "dataset_id": sample_dataset.id,
        "name": "Forecast Model for Predictions",
        "algorithm": "LinearRegression",
        "target_column": "final_score",
        "selected_features": ["attendance_percentage", "study_hours_per_week", "previous_score"],
        "test_size": 0.2,
        "random_seed": 42
    }, headers=teacher_auth_headers)
    assert train_res.status_code == 200
    model_id = train_res.json()["id"]

    # 2. Single prediction with valid features
    single_res = client.post("/api/predictions/single", json={
        "model_run_id": model_id,
        "student_identifier": "STU-TEST-99",
        "input_features": {
            "attendance_percentage": 68.0,
            "study_hours_per_week": 6.5,
            "previous_score": 62.0
        }
    }, headers=teacher_auth_headers)
    assert single_res.status_code == 200
    s_data = single_res.json()
    assert "predicted_value" in s_data
    assert len(s_data["recommendations"]) > 0
    # Low attendance (68%) should trigger attendance recommendation
    rec_texts = " ".join(s_data["recommendations"]).lower()
    assert "attendance" in rec_texts

    # 3. Single prediction with missing feature must fail cleanly
    bad_single = client.post("/api/predictions/single", json={
        "model_run_id": model_id,
        "student_identifier": "STU-ERR",
        "input_features": {
            "attendance_percentage": 90.0
            # missing study_hours_per_week and previous_score
        }
    }, headers=teacher_auth_headers)
    assert bad_single.status_code == 400
    assert "missing" in bad_single.json()["detail"].lower()

    # 4. Batch prediction
    batch_csv = (
        "student_id,attendance_percentage,study_hours_per_week,previous_score\n"
        "STU-B1,85.0,14.0,75.0\n"
        "STU-B2,92.0,18.5,88.0\n"
        "STU-B3,55.0,4.0,45.0\n"
    )
    files = {"file": ("batch_test.csv", batch_csv.encode("utf-8"), "text/csv")}
    batch_res = client.post(
        "/api/predictions/batch",
        data={"model_run_id": model_id},
        files=files,
        headers=teacher_auth_headers
    )
    assert batch_res.status_code == 200
    b_data = batch_res.json()
    assert b_data["total_rows"] == 3
    assert b_data["successful_count"] == 3
    assert b_data["failed_count"] == 0
    assert b_data["predictions"][0]["student_identifier"] == "STU-B1"

    # 5. Student privacy isolation check
    # Student STU-TEST-99 queries /api/predictions/history
    student_history = client.get("/api/predictions/history", headers=student_auth_headers)
    assert student_history.status_code == 200
    s_history_records = student_history.json()
    
    # All records visible to the student must belong exclusively to STU-TEST-99
    for rec in s_history_records:
        assert rec["student_identifier"] == "STU-TEST-99"
