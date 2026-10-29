from pathlib import Path
from typing import Dict, Any, Optional
import joblib
from app.core.config import settings

def save_model_artifact(pipeline: Any, model_run_id: int, metadata: Dict[str, Any]) -> str:
    artifact_dir = Path(settings.ARTIFACT_STORAGE_DIR)
    artifact_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = artifact_dir / f"model_run_{model_run_id}.joblib"
    
    payload = {
        "pipeline": pipeline,
        "model_run_id": model_run_id,
        "metadata": metadata
    }
    
    joblib.dump(payload, file_path)
    return str(file_path)

def load_model_artifact(file_path: str) -> Dict[str, Any]:
    resolved_path = Path(file_path).resolve()
    base_storage = Path(settings.ARTIFACT_STORAGE_DIR).resolve()
    
    # Path traversal and safety guardrail: must reside within internal artifacts folder
    if not str(resolved_path).startswith(str(base_storage)):
        raise ValueError("Security violation: Attempted to load model artifact outside authorized storage directory.")
        
    if not resolved_path.exists():
        raise FileNotFoundError(f"Model artifact not found at {resolved_path}")
        
    loaded = joblib.load(resolved_path)
    if not isinstance(loaded, dict) or "pipeline" not in loaded:
        raise ValueError("Invalid model artifact structure.")
        
    return loaded
