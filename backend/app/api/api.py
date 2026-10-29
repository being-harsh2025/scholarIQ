from fastapi import APIRouter
from app.api.endpoints import auth, datasets, features, models, predictions, system

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(datasets.router, prefix="/datasets", tags=["Datasets"])
api_router.include_router(features.router, prefix="/features", tags=["Feature Selection"])
api_router.include_router(models.router, prefix="/models", tags=["Model Training & Registry"])
api_router.include_router(predictions.router, prefix="/predictions", tags=["Predictions"])
api_router.include_router(system.router, prefix="/system", tags=["System & Metrics"])
