import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
import pandas as pd

from app.main import app
from app.db.session import Base, get_db
from app.core.config import settings
from app.models.entities import User, Dataset, DatasetColumn
from app.core.security import hash_password, create_access_token
from app.ml.preprocessing import identify_column_types

# In-memory or test SQLite database
TEST_DB_PATH = Path(__file__).resolve().parent / "test_edupredict.db"
SQLALCHEMY_DATABASE_URL = f"sqlite:///{TEST_DB_PATH}"

test_engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)
    if TEST_DB_PATH.exists():
        try:
            TEST_DB_PATH.unlink()
        except Exception:
            pass

@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture
def test_teacher(db_session):
    user = db_session.query(User).filter(User.email == "test_teacher@edupredict.ai").first()
    if not user:
        user = User(
            email="test_teacher@edupredict.ai",
            hashed_password=hash_password("TeacherTestPass123!"),
            full_name="Prof. Test Teacher",
            role="teacher",
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    return user

@pytest.fixture
def teacher_auth_headers(test_teacher):
    token = create_access_token(subject=test_teacher.id, role=test_teacher.role)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def test_student(db_session):
    user = db_session.query(User).filter(User.email == "test_student@edupredict.ai").first()
    if not user:
        user = User(
            email="test_student@edupredict.ai",
            hashed_password=hash_password("StudentTestPass123!"),
            full_name="Test Student",
            role="student",
            student_id="STU-TEST-99",
            is_active=True
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
    return user

@pytest.fixture
def student_auth_headers(test_student):
    token = create_access_token(subject=test_student.id, role=test_student.role)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def sample_dataset(db_session, test_teacher):
    sample_csv_path = Path(settings.SAMPLE_DATA_DIR) / "student_performance.csv"
    if not sample_csv_path.exists():
        # generate a quick mini dataframe
        df = pd.DataFrame({
            "student_id": [f"STU-{i}" for i in range(50)],
            "attendance_percentage": [80.0 + (i % 20) for i in range(50)],
            "study_hours_per_week": [10.0 + (i % 15) for i in range(50)],
            "previous_score": [65.0 + (i % 30) for i in range(50)],
            "final_score": [60.0 + (i % 35) for i in range(50)],
            "performance_category": ["Average" if i % 2 == 0 else "Good" for i in range(50)],
            "parent_education": ["Bachelor's" for _ in range(50)],
            "internet_access": ["Yes" for _ in range(50)]
        })
        sample_csv_path.parent.mkdir(parents=True, exist_ok=True)
        df.to_csv(sample_csv_path, index=False)
    else:
        df = pd.read_csv(sample_csv_path)

    dataset = db_session.query(Dataset).filter(Dataset.name == "Test Fixture Dataset").first()
    if not dataset:
        dataset = Dataset(
            user_id=test_teacher.id,
            name="Test Fixture Dataset",
            filename="student_performance.csv",
            file_path=str(sample_csv_path),
            row_count=len(df),
            column_count=len(df.columns),
            file_size_bytes=sample_csv_path.stat().st_size,
            is_sample=True
        )
        db_session.add(dataset)
        db_session.flush()

        numeric_cols, categorical_cols, identifier_cols = identify_column_types(df)
        for col in df.columns:
            c_type = "numeric" if col in numeric_cols else ("identifier" if col in identifier_cols else "categorical")
            db_session.add(DatasetColumn(
                dataset_id=dataset.id,
                name=col,
                data_type=c_type,
                missing_count=0,
                unique_count=int(df[col].nunique()),
                sample_values=[str(x) for x in df[col].head(3).tolist()]
            ))
        db_session.commit()
        db_session.refresh(dataset)

    return dataset
