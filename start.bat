@echo off
echo ========================================================
echo Starting Zigmaa CRM / OmniFlow CRM Stack
echo ========================================================

echo [1/3] Running Database Seed Script...
python seed_data.py

echo [2/3] Starting FastAPI Backend on http://localhost:8000 ...
start "FastAPI Backend" cmd /k "python -m uvicorn app.main:app --app-dir backend --reload --port 8000"

echo [3/3] Starting Next.js Frontend on http://localhost:3000 ...
npm run dev

pause
