@echo off
REM ============================================================
REM  SAM2 Tracker — Windows Start Script
REM  Double-click to run
REM ============================================================

setlocal EnableDelayedExpansion
title SAM2 Tracker

echo.
echo ==========================================
echo   SAM2 Tracker -- Windows
echo ==========================================
echo.

REM ── Get project root ────────────────────────────────────────
set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"

REM ── Kill stale processes on ports ────────────────────────────
echo Cleaning up old processes...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":7263 "') do (
    if not "%%a"=="0" taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":7262 "') do (
    if not "%%a"=="0" taskkill /F /PID %%a >nul 2>&1
)

REM ── Check Python ─────────────────────────────────────────────
where python >nul 2>&1
if errorlevel 1 (
  echo ERROR: Python not found!
  echo   Install from: https://www.python.org/downloads/
  echo   Check "Add Python to PATH" during install.
  pause
  exit /b 1
)
echo Python ... OK

REM ── Check Node ───────────────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js not found!
  echo   Install from: https://nodejs.org/
  pause
  exit /b 1
)
echo Node.js ... OK

REM ── Check ffmpeg ─────────────────────────────────────────────
where ffmpeg >nul 2>&1
if errorlevel 1 (
  echo ERROR: ffmpeg not found!
  echo   Run: winget install Gyan.FFmpeg
  pause
  exit /b 1
)
echo ffmpeg ... OK

REM ── Check yarn ───────────────────────────────────────────────
where yarn >nul 2>&1
if errorlevel 1 (
  echo Installing yarn...
  npm install -g yarn
)
echo yarn ... OK

REM ── Virtual environment (use only if venv exists AND has packages) ────────
if exist "venv\Scripts\python.exe" (
  venv\Scripts\python.exe -c "import strawberry" >nul 2>&1
  if not errorlevel 1 (
    echo Using venv...
    call venv\Scripts\activate.bat
  ) else (
    echo Venv found but packages missing - using global Python...
  )
)

REM ── Install Python deps if needed ────────────────────────────
python -c "import sam2" >nul 2>&1
if errorlevel 1 (
  echo Installing Python dependencies - please wait...
  pip install -e "." strawberry-graphql[flask] flask-cors dataclasses-json imagesize tqdm pycocotools av hydra-core iopath decord
  if errorlevel 1 (
    echo ERROR: pip install failed!
    pause
    exit /b 1
  )
)
echo Python deps ... OK

REM ── Checkpoints ──────────────────────────────────────────────
if not exist "checkpoints\sam2.1_hiera_tiny.pt" (
  echo Downloading model checkpoint ~150MB - please wait...
  python -c "import urllib.request; urllib.request.urlretrieve('https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_tiny.pt','checkpoints/sam2.1_hiera_tiny.pt'); print('Done')"
  if errorlevel 1 (
    echo ERROR: Checkpoint download failed!
    pause
    exit /b 1
  )
)
echo Checkpoint ... OK

REM ── Frontend deps ─────────────────────────────────────────────
if not exist "demo\frontend\node_modules\" (
  echo Installing frontend dependencies - please wait...
  cd demo\frontend
  yarn install
  cd "%PROJECT_ROOT%"
)
echo Frontend deps ... OK

REM ── Start backend ─────────────────────────────────────────────
echo.
echo Starting backend on port 7263...
cd "%PROJECT_ROOT%demo\backend\server"

set "SAM2_DEMO_FORCE_CPU_DEVICE=1"
set "APP_ROOT=%PROJECT_ROOT%"
set "API_URL=http://localhost:7263"
set "MODEL_SIZE=tiny"
set "DATA_PATH=%PROJECT_ROOT%demo\data"
set "DEFAULT_VIDEO_PATH=gallery/05_default_juggle.mp4"
set "SAM2_MAX_FRAMES=300"

start "SAM2-Backend" /min python app.py
cd "%PROJECT_ROOT%"

REM ── Wait for backend ─────────────────────────────────────────
echo Waiting for backend to be ready...
set /a TRIES=0
:WAIT_LOOP
timeout /t 3 /nobreak >nul
curl -s http://localhost:7263/healthy >nul 2>&1
if not errorlevel 1 (
  echo Backend is ready!
  goto BACKEND_READY
)
set /a TRIES+=1
echo   Waiting... attempt !TRIES!/30
if !TRIES! lss 30 goto WAIT_LOOP
echo Backend taking longer than expected - continuing anyway...

:BACKEND_READY

REM ── Start frontend ────────────────────────────────────────────
echo Starting frontend on port 7262...
cd "%PROJECT_ROOT%demo\frontend"
start "SAM2-Frontend" /min yarn dev --port 7262
cd "%PROJECT_ROOT%"

timeout /t 5 /nobreak >nul

REM ── Open browser ──────────────────────────────────────────────
start "" http://localhost:7262

echo.
echo ==========================================
echo   SAM2 Tracker is running!
echo   Open: http://localhost:7262
echo ==========================================
echo.
echo   Backend log:  backend.log
echo   Frontend log: frontend.log
echo.
echo   Press any key to STOP everything and exit.
echo.
pause >nul

REM ── Cleanup on exit ──────────────────────────────────────────
echo Stopping servers...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":7263 "') do (
    if not "%%a"=="0" taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":7262 "') do (
    if not "%%a"=="0" taskkill /F /PID %%a >nul 2>&1
)
echo Done. Goodbye!
timeout /t 2 /nobreak >nul
