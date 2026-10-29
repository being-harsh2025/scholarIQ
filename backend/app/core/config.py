from pathlib import Path
from pydantic_settings import BaseSettings
from typing import List

BASE_DIR = Path(__file__).resolve().parent.parent.parent
WORKSPACE_DIR = BASE_DIR.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "EduPredict AI"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = "edupredict-ai-super-secret-production-key-2026-safe-default"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database
    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'edupredict.db'}"
    
    # Storage paths
    DATASET_STORAGE_DIR: str = str(WORKSPACE_DIR / "artifacts" / "datasets")
    ARTIFACT_STORAGE_DIR: str = str(WORKSPACE_DIR / "artifacts" / "models")
    SAMPLE_DATA_DIR: str = str(WORKSPACE_DIR / "data" / "sample")
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:8000",
    ]

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()

# Ensure storage directories exist
Path(settings.DATASET_STORAGE_DIR).mkdir(parents=True, exist_ok=True)
Path(settings.ARTIFACT_STORAGE_DIR).mkdir(parents=True, exist_ok=True)
Path(settings.SAMPLE_DATA_DIR).mkdir(parents=True, exist_ok=True)
