@echo off
REM ============================================================
REM  SAM2 Tracker — Windows Start Script
REM  Requires: Python 3.11, Node 18+, yarn, ffmpeg
REM  Run as: Double-click OR from Command Prompt
REM ============================================================

setlocal EnableDelayedExpansion
title SAM2 Tracker

echo.
echo  [34m==========================================[0m
echo  [34m  SAM2 Tracker -- Windows[0m
echo  [34m==========================================[0m
echo.

REM ── Get project root ────────────────────────────────────────
set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"

REM ── Kill stale processes ─────────────────────────────────────
taskkill /F /IM python.exe /FI "WINDOWTITLE eq SAM2*" >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":7263"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":7262"') do taskkill /F /PID %%a >nul 2>&1

REM ── Check Python ─────────────────────────────────────────────
where python >nul 2>&1
if errorlevel 1 (
  echo [31m ERROR: Python not found![0m
  echo    Install Python 3.11 from: https://www.python.org/downloads/
  echo    Make sure to check "Add Python to PATH"
  pause
  exit /b 1
)

REM ── Check Node ───────────────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
  echo [31m ERROR: Node.js not found![0m
  echo    Install from: https://nodejs.org/  (LTS version)
  pause
  exit /b 1
)

REM ── Check ffmpeg ─────────────────────────────────────────────
where ffmpeg >nul 2>&1
if errorlevel 1 (
  echo [31m ERROR: ffmpeg not found![0m
  echo    Install: winget install Gyan.FFmpeg
  echo    OR download from: https://ffmpeg.org/download.html
  pause
  exit /b 1
)

REM ── Check yarn ───────────────────────────────────────────────
where yarn >nul 2>&1
if errorlevel 1 (
  echo [33m Installing yarn...[0m
  npm install -g yarn
)

REM ── Virtual environment (optional — use only if venv exists) ────────────
if exist "venv\Scripts\python.exe" (
  call venv\Scripts\activate.bat
)

REM ── Install Python deps if needed ────────────────────────────
python -c "import sam2" >nul 2>&1
if errorlevel 1 (
  echo [33m Installing Python dependencies (first time ~5 min)...[0m
  pip install -q -e "." strawberry-graphql[flask] flask-cors dataclasses-json imagesize tqdm pycocotools av hydra-core iopath decord
)

REM ── Checkpoints ──────────────────────────────────────────────
if not exist "checkpoints\sam2.1_hiera_tiny.pt" (
  echo [33m Downloading model checkpoints (~150MB)...[0m
  cd checkpoints
  bash download_ckpts.sh
  cd ..
)

REM ── Frontend deps ─────────────────────────────────────────────
if not exist "demo\frontend\node_modules\" (
  echo [33m Installing frontend dependencies...[0m
  cd demo\frontend
  yarn install --silent
  cd ..\..
)

REM ── Start backend ─────────────────────────────────────────────
echo [32m Starting backend on port 7263...[0m
cd demo\backend\server

set "SAM2_DEMO_FORCE_CPU_DEVICE=1"
set "APP_ROOT=%PROJECT_ROOT%"
set "API_URL=http://localhost:7263"
set "MODEL_SIZE=tiny"
set "DATA_PATH=%PROJECT_ROOT%demo\data"
set "DEFAULT_VIDEO_PATH=gallery/05_default_juggle.mp4"
set "SAM2_MAX_FRAMES=300"

start /b "" python app.py > "%PROJECT_ROOT%backend.log" 2>&1
cd "%PROJECT_ROOT%"

REM ── Wait for backend ─────────────────────────────────────────
echo [33m Waiting for backend to be ready...[0m
set /a TRIES=0
:WAIT_LOOP
timeout /t 2 /nobreak >nul
curl -s http://localhost:7263/healthy >nul 2>&1
if not errorlevel 1 (
  echo [32m Backend ready![0m
  goto BACKEND_READY
)
set /a TRIES+=1
if !TRIES! lss 45 goto WAIT_LOOP
echo [33m Backend still loading — continuing anyway...[0m

:BACKEND_READY

REM ── Start frontend ────────────────────────────────────────────
echo [32m Starting frontend on port 7262...[0m
cd demo\frontend
start /b "" yarn dev --port 7262 > "%PROJECT_ROOT%frontend.log" 2>&1
cd "%PROJECT_ROOT%"

timeout /t 4 /nobreak >nul

REM ── Open browser ──────────────────────────────────────────────
start "" http://localhost:7262

echo.
echo  [32m===========================================[0m
echo  [32m  SAM2 Tracker is running![0m
echo  [32m  Open: http://localhost:7262[0m
echo  [32m  Close this window to stop[0m
echo  [32m===========================================[0m
echo.
echo  Logs: backend.log / frontend.log
echo.
pause
