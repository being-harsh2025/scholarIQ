import sys
from pathlib import Path

# Add backend directory to sys.path
root_dir = Path(__file__).resolve().parent
backend_dir = root_dir / "backend"
for p in [str(root_dir), str(backend_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

if __name__ == "__main__":
    import uvicorn
    from app.main import app
    print("Starting ScholarIQ unified server at http://127.0.0.1:8000", flush=True)
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
