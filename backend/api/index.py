import os
import sys
import traceback
from pathlib import Path

# Add root, backend, and api directory to sys.path
current_dir = Path(__file__).resolve().parent
parent_dir = current_dir.parent

for candidate in [parent_dir, parent_dir / "backend", current_dir]:
    cand_str = str(candidate)
    if cand_str not in sys.path:
        sys.path.insert(0, cand_str)

try:
    from app.main import app
    handler = app
except Exception as e:
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse
    
    app = FastAPI(title="ScholarIQ Diagnostic")
    handler = app
    err_trace = traceback.format_exc()
    print("FATAL ERROR IN SCHOLARIQ STARTUP:\n", err_trace)

    @app.api_route("/{path_name:path}", methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"])
    async def diagnostic_fallback(path_name: str = ""):
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": "ScholarIQ backend initialization failed during serverless cold start.",
                "error": str(e),
                "traceback": err_trace.splitlines(),
                "sys_path": sys.path
            }
        )
