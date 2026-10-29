from datetime import datetime, timezone
import json
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from app.db.session import Base

def utcnow():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="teacher")  # admin, teacher, student
    student_id = Column(String(100), nullable=True, index=True)    # optional linkage for students
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    # Relationships
    datasets = relationship("Dataset", back_populates="owner", cascade="all, delete-orphan")
    model_runs = relationship("ModelRun", back_populates="creator", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="user", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    row_count = Column(Integer, default=0)
    column_count = Column(Integer, default=0)
    file_size_bytes = Column(Integer, default=0)
    is_sample = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    # Relationships
    owner = relationship("User", back_populates="datasets")
    columns = relationship("DatasetColumn", back_populates="dataset", cascade="all, delete-orphan")
    model_runs = relationship("ModelRun", back_populates="dataset", cascade="all, delete-orphan")


class DatasetColumn(Base):
    __tablename__ = "dataset_columns"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    data_type = Column(String(50), nullable=False)  # numeric, categorical, identifier
    missing_count = Column(Integer, default=0)
    unique_count = Column(Integer, default=0)
    sample_values = Column(JSON, default=list)
    min_val = Column(Float, nullable=True)
    max_val = Column(Float, nullable=True)
    mean_val = Column(Float, nullable=True)

    dataset = relationship("Dataset", back_populates="columns")


class ModelRun(Base):
    __tablename__ = "model_runs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    task_type = Column(String(50), nullable=False)  # regression, classification
    algorithm = Column(String(100), nullable=False)
    target_column = Column(String(255), nullable=False)
    is_derived_target = Column(Boolean, default=False)
    derived_thresholds = Column(JSON, nullable=True)
    test_size = Column(Float, default=0.2)
    random_seed = Column(Integer, default=42)
    status = Column(String(50), default="completed")  # pending, training, completed, failed
    metrics = Column(JSON, default=dict)
    duration_seconds = Column(Float, default=0.0)
    artifact_path = Column(String(512), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    # Relationships
    creator = relationship("User", back_populates="model_runs")
    dataset = relationship("Dataset", back_populates="model_runs")
    features = relationship("ModelFeature", back_populates="model_run", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="model_run")


class ModelFeature(Base):
    __tablename__ = "model_features"

    id = Column(Integer, primary_key=True, index=True)
    model_run_id = Column(Integer, ForeignKey("model_runs.id"), nullable=False, index=True)
    feature_name = Column(String(255), nullable=False)
    feature_type = Column(String(50), default="numeric")  # numeric, categorical
    importance_score = Column(Float, nullable=True)
    is_selected = Column(Boolean, default=True)

    model_run = relationship("ModelRun", back_populates="features")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    model_run_id = Column(Integer, ForeignKey("model_runs.id"), nullable=False, index=True)
    student_identifier = Column(String(255), nullable=True, index=True)
    input_data = Column(JSON, nullable=False)
    predicted_value = Column(String(255), nullable=False)
    probabilities = Column(JSON, nullable=True)
    prediction_type = Column(String(50), default="single")  # single, batch
    batch_id = Column(String(100), nullable=True, index=True)
    created_at = Column(DateTime(timezone=True), default=utcnow)

    # Relationships
    user = relationship("User", back_populates="predictions")
    model_run = relationship("ModelRun", back_populates="predictions")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(100), nullable=False)
    resource_type = Column(String(100), nullable=False)
    resource_id = Column(String(100), nullable=True)
    details = Column(JSON, default=dict)
    timestamp = Column(DateTime(timezone=True), default=utcnow)

    user = relationship("User", back_populates="audit_logs")
