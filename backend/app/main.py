import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Ensure backend directory is in sys.path regardless of working directory
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import settings, IS_SERVERLESS
from app.db.session import engine, Base, SessionLocal
from app.models.entities import User, Dataset, DatasetColumn
from app.core.security import hash_password
from app.api.api import api_router
from app.api.endpoints.system import check_health
from app.ml.preprocessing import identify_column_types
import pandas as pd

def init_seed_data(db: Session):
    # 1. Seed standard demo users if not present using precomputed bcrypt hashes
    seed_users = [
        {
            "email": "teacher@scholariq.ai",
            "hashed_password": "$2b$12$chT.LRT1t3tq0RM96UKb3eoerxQrdsjIgF294n8MthE.lPjFvejd2",
            "full_name": "Prof. Marcus Thorne",
            "role": "teacher",
            "student_id": None
        },
        {
            "email": "admin@scholariq.ai",
            "hashed_password": "$2b$12$ijb5fFh2bo7c0QIXlsk5hOOhlOgpg37h0YvvO/kz5OjOL4d8ooB5W",
            "full_name": "Dr. Eleanor Vance (Dean)",
            "role": "admin",
            "student_id": None
        },
        {
            "email": "student@scholariq.ai",
            "hashed_password": "$2b$12$4BS39s.OHfDR/DeonZfQe.0rWka8xveqa9DJc1oRE1dHCugLH2mFC",
            "full_name": "Aria Montgomery",
            "role": "student",
            "student_id": "STU-10001"
        },
        {
            "email": "admin@edupredict.ai",
            "hashed_password": "$2b$12$iA3abi7PnEF9c9VQk38a4.EvW/O1DTEfADPK/td15prI5J/UM7eBa",
            "full_name": "Dr. Eleanor Vance (Dean)",
            "role": "admin",
            "student_id": None
        },
        {
            "email": "teacher@edupredict.ai",
            "hashed_password": "$2b$12$Ecj9tHt1YPyCxPcXF8EywOBJk3KSAzIf7z9vLiZw7u08IesYTzEl6",
            "full_name": "Prof. Marcus Thorne",
            "role": "teacher",
            "student_id": None
        },
        {
            "email": "student@edupredict.ai",
            "hashed_password": "$2b$12$ifP/wFsT8ed4IoY5fCvjcOTHFDGc4grrhnKBIHSD6mHeHH8/JOO52",
            "full_name": "Aria Montgomery",
            "role": "student",
            "student_id": "STU-10001"
        }
    ]

    for u_info in seed_users:
        existing = db.query(User).filter(User.email == u_info["email"]).first()
        if not existing:
            user = User(
                email=u_info["email"],
                hashed_password=u_info["hashed_password"],
                full_name=u_info["full_name"],
                role=u_info["role"],
                student_id=u_info["student_id"],
                is_active=True
            )
            db.add(user)
    db.commit()

    # 2. Seed synthetic dataset if sample CSV exists and not yet registered
    teacher_user = db.query(User).filter(User.role == "teacher").first()
    sample_csv_path = Path(settings.SAMPLE_DATA_DIR) / "student_performance.csv"
    
    if sample_csv_path.exists() and teacher_user:
        existing_sample = db.query(Dataset).filter(Dataset.name == "Synthetic Student Academic Performance (1000 Records)").first()
        if not existing_sample:
            try:
                df = pd.read_csv(sample_csv_path)
                file_size = sample_csv_path.stat().st_size
                
                dataset = Dataset(
                    user_id=teacher_user.id,
                    name="Synthetic Student Academic Performance (1000 Records)",
                    filename="student_performance.csv",
                    file_path=str(sample_csv_path),
                    row_count=len(df),
                    column_count=len(df.columns),
                    file_size_bytes=file_size,
                    is_sample=True
                )
                db.add(dataset)
                db.flush()

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

                    db.add(DatasetColumn(
                        dataset_id=dataset.id,
                        name=col,
                        data_type=col_type,
                        missing_count=missing_count,
                        unique_count=unique_count,
                        sample_values=sample_vals,
                        min_val=min_v,
                        max_val=max_v,
                        mean_val=mean_v
                    ))
                db.commit()
            except Exception as e:
                db.rollback()
                print(f"Failed to auto-seed sample dataset: {e}")

_db_initialized = False

def ensure_db_initialized():
    global _db_initialized
    if _db_initialized:
        return
    try:
        # Check if already initialized
        db = SessionLocal()
        try:
            if db.query(User).filter(User.email == "teacher@scholariq.ai").first():
                _db_initialized = True
                return
        except Exception:
            pass
        finally:
            db.close()

        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        try:
            init_seed_data(db)
        finally:
            db.close()
        _db_initialized = True
    except Exception as e:
        print(f"Notice: Database initialization: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables and seed default users (used in local/Docker runtime)
    ensure_db_initialized()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Student Academic Performance Prediction System API with Regression, Classification, and Feature Selection.",
    version="1.0.0",
    lifespan=None if IS_SERVERLESS else lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serverless DB initializer middleware
@app.middleware("http")
async def db_session_middleware(request, call_next):
    if not _db_initialized:
        ensure_db_initialized()
    return await call_next(request)

# Mount API routers (both at /api and root level for zero configuration mismatch)
app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(api_router)

# Direct health endpoint
@app.get("/api/health")
@app.get("/health")
def root_health():
    ensure_db_initialized()
    db = SessionLocal()
    try:
        return check_health(db)
    except Exception as e:
        return {"status": "degraded", "error": str(e), "project": settings.PROJECT_NAME}
    finally:
        db.close()

@app.get("/api")
@app.get("/api/")
@app.get("/api/index")
def api_root():
    return {
        "project": settings.PROJECT_NAME,
        "status": "online",
        "docs_url": "/docs",
        "api_v1": settings.API_V1_STR
    }

# Check for built frontend distribution directory (for unified fullstack serving)
_dist_candidates = [
    Path(__file__).resolve().parent.parent.parent / "frontend" / "dist",
    Path(__file__).resolve().parent.parent / "frontend" / "dist",
    Path.cwd() / "frontend" / "dist",
    Path("/var/task/frontend/dist")
]
frontend_dist = next((p for p in _dist_candidates if p.exists() and (p / "index.html").exists()), None)

if frontend_dist:
    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="frontend_assets")

    @app.get("/{full_path:path}")
    async def serve_frontend_spa(full_path: str = ""):
        # Exclude backend system, docs, and API endpoints
        if (
            full_path.startswith("api")
            or full_path.startswith("auth")
            or full_path.startswith("datasets")
            or full_path.startswith("features")
            or full_path.startswith("models")
            or full_path.startswith("predictions")
            or full_path.startswith("system")
            or full_path in ["docs", "redoc", "openapi.json", "health"]
        ):
            raise HTTPException(status_code=404, detail="Endpoint not found")

        file_candidate = frontend_dist / full_path
        if full_path and file_candidate.is_file():
            return FileResponse(file_candidate)

        index_file = frontend_dist / "index.html"
        if index_file.is_file():
            return FileResponse(index_file)

        raise HTTPException(status_code=404, detail="Resource not found")
else:
    @app.get("/")
    def root():
        return {
            "project": settings.PROJECT_NAME,
            "status": "online",
            "docs_url": "/docs",
            "api_v1": settings.API_V1_STR,
            "frontend": "Not built yet. Run 'npm --prefix frontend run build' to generate static assets."
        }
