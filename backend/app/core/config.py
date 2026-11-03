import os
import shutil
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import List

BASE_DIR = Path(__file__).resolve().parent.parent.parent
WORKSPACE_DIR = BASE_DIR.parent

# Detect serverless environment (Vercel, AWS Lambda, or read-only filesystem)
IS_SERVERLESS = (
    "VERCEL" in os.environ
    or "AWS_LAMBDA_FUNCTION_NAME" in os.environ
    or not os.access(str(BASE_DIR), os.W_OK)
)

if IS_SERVERLESS:
    TMP_DIR = Path("/tmp") / "scholariq"
    DEFAULT_DB_PATH = TMP_DIR / "edupredict.db"

    # Copy bundled pre-seeded database to /tmp if not already present
    bundled_db = BASE_DIR / "edupredict.db"
    if not DEFAULT_DB_PATH.exists():
        try:
            TMP_DIR.mkdir(parents=True, exist_ok=True)
            if bundled_db.exists():
                shutil.copy2(bundled_db, DEFAULT_DB_PATH)
        except Exception as e:
            print(f"Warning: Could not copy bundled DB to /tmp: {e}")

    DEFAULT_DATABASE_URL = f"sqlite:///{DEFAULT_DB_PATH}"
    DEFAULT_DATASET_DIR = str(TMP_DIR / "artifacts" / "datasets")
    DEFAULT_ARTIFACT_DIR = str(TMP_DIR / "artifacts" / "models")

    # Locate sample data directory
    sample_candidates = [
        BASE_DIR / "data" / "sample",
        WORKSPACE_DIR / "data" / "sample",
    ]
    DEFAULT_SAMPLE_DIR = str(next((p for p in sample_candidates if p.exists()), BASE_DIR / "data" / "sample"))
else:
    DEFAULT_DATABASE_URL = f"sqlite:///{BASE_DIR / 'edupredict.db'}"
    DEFAULT_DATASET_DIR = str(WORKSPACE_DIR / "artifacts" / "datasets")
    DEFAULT_ARTIFACT_DIR = str(WORKSPACE_DIR / "artifacts" / "models")
    DEFAULT_SAMPLE_DIR = (
        str(WORKSPACE_DIR / "data" / "sample")
        if (WORKSPACE_DIR / "data" / "sample").exists()
        else str(BASE_DIR / "data" / "sample")
    )

class Settings(BaseSettings):
    PROJECT_NAME: str = "ScholarIQ"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = "scholariq-super-secret-production-key-2026-safe-default"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database
    DATABASE_URL: str = DEFAULT_DATABASE_URL
    
    # Storage paths
    DATASET_STORAGE_DIR: str = DEFAULT_DATASET_DIR
    ARTIFACT_STORAGE_DIR: str = DEFAULT_ARTIFACT_DIR
    SAMPLE_DATA_DIR: str = DEFAULT_SAMPLE_DIR
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
        "https://scholariq-xi.vercel.app",
        "https://backend-eadq.vercel.app"
    ]

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()

# Ensure storage directories exist safely (never throw on read-only environments)
for dir_path in [settings.DATASET_STORAGE_DIR, settings.ARTIFACT_STORAGE_DIR, settings.SAMPLE_DATA_DIR]:
    try:
        Path(dir_path).mkdir(parents=True, exist_ok=True)
    except Exception as e:
        print(f"Notice: Storage directory '{dir_path}' could not be created at startup: {e}")
