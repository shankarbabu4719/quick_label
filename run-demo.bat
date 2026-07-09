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

REM ── Project root (no trailing backslash) ─────────────────────
set "PROJECT_ROOT=%~dp0"
REM Remove trailing backslash
if "%PROJECT_ROOT:~-1%"=="\" set "PROJECT_ROOT=%PROJECT_ROOT:~0,-1%"
cd /d "%PROJECT_ROOT%"

REM ── Kill stale processes ─────────────────────────────────────
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
  pause & exit /b 1
)
echo Python ... OK

REM ── Check Node ───────────────────────────────────────────────
where node >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js not found!
  echo   Install from: https://nodejs.org/
  pause & exit /b 1
)
echo Node.js ... OK

REM ── Check ffmpeg ─────────────────────────────────────────────
where ffmpeg >nul 2>&1
if errorlevel 1 (
  echo ERROR: ffmpeg not found!
  echo   Run: winget install Gyan.FFmpeg
  pause & exit /b 1
)
echo ffmpeg ... OK

REM ── Check / install yarn ─────────────────────────────────────
where yarn >nul 2>&1
if errorlevel 1 (
  echo Installing yarn...
  npm install -g yarn
)
echo yarn ... OK

REM ── Virtual environment — use only if venv has packages ──────
if exist "%PROJECT_ROOT%\venv\Scripts\python.exe" (
  "%PROJECT_ROOT%\venv\Scripts\python.exe" -c "import strawberry" >nul 2>&1
  if not errorlevel 1 (
    echo Using venv...
    call "%PROJECT_ROOT%\venv\Scripts\activate.bat"
  ) else (
    echo Venv missing packages - using global Python...
  )
)

REM ── Install Python deps if not present ───────────────────────
python -c "import sam2" >nul 2>&1
if errorlevel 1 (
  echo Installing Python dependencies - please wait a few minutes...
  pip install -e "." "strawberry-graphql[flask]" flask-cors dataclasses-json imagesize tqdm pycocotools av hydra-core iopath decord
  if errorlevel 1 (
    echo ERROR: pip install failed! Check internet connection.
    pause & exit /b 1
  )
)
echo Python deps ... OK

REM ── Download checkpoint if missing ───────────────────────────
if not exist "%PROJECT_ROOT%\checkpoints\sam2.1_hiera_tiny.pt" (
  echo Downloading SAM2 model checkpoint ~150MB - please wait...
  python -c "import urllib.request; print('Downloading...'); urllib.request.urlretrieve('https://dl.fbaipublicfiles.com/segment_anything_2/092824/sam2.1_hiera_tiny.pt','%PROJECT_ROOT%/checkpoints/sam2.1_hiera_tiny.pt'); print('Done')"
  if errorlevel 1 (
    echo ERROR: Checkpoint download failed! Check internet.
    pause & exit /b 1
  )
)
echo Checkpoint ... OK

REM ── Frontend dependencies ────────────────────────────────────
if not exist "%PROJECT_ROOT%\demo\frontend\node_modules\" (
  echo Installing frontend dependencies - please wait...
  cd "%PROJECT_ROOT%\demo\frontend"
  yarn install
  cd "%PROJECT_ROOT%"
)
echo Frontend deps ... OK

REM ── Set backend environment ──────────────────────────────────
set "SAM2_DEMO_FORCE_CPU_DEVICE=1"
set "APP_ROOT=%PROJECT_ROOT%"
set "API_URL=http://localhost:7263"
set "MODEL_SIZE=tiny"
set "DATA_PATH=%PROJECT_ROOT%\demo\data"
set "DEFAULT_VIDEO_PATH=gallery/05_default_juggle.mp4"
set "SAM2_MAX_FRAMES=300"
set "VIDEO_ENCODE_MAX_FRAMES=300"
set "VIDEO_ENCODE_FPS=10"
set "VIDEO_ENCODE_MAX_WIDTH=640"
set "VIDEO_ENCODE_MAX_HEIGHT=360"
set "VIDEO_ENCODE_CRF=28"
REM Use all CPU threads for faster ffmpeg transcoding
for /f "tokens=2 delims==" %%a in ('wmic cpu get NumberOfLogicalProcessors /value 2^>nul') do set "FFMPEG_NUM_THREADS=%%a"
if not defined FFMPEG_NUM_THREADS set "FFMPEG_NUM_THREADS=4"

REM ── Start backend ────────────────────────────────────────────
echo.
echo Starting backend on port 7263...
cd "%PROJECT_ROOT%\demo\backend\server"
start "SAM2-Backend" /min cmd /c "python app.py > "%PROJECT_ROOT%\backend.log" 2>&1"
cd "%PROJECT_ROOT%"

REM ── Wait for backend to be ready ─────────────────────────────
echo Waiting for backend to load SAM2 model (30-60 sec first time)...
set /a TRIES=0
:WAIT_LOOP
timeout /t 3 /nobreak >nul
curl -s http://localhost:7263/healthy >nul 2>&1
if not errorlevel 1 (
  echo Backend is ready!
  goto BACKEND_READY
)
set /a TRIES+=1
if !TRIES! lss 40 (
  echo   Still loading... !TRIES!/40
  goto WAIT_LOOP
)
echo WARNING: Backend still not ready after 2 min - check backend.log
echo          Continuing anyway...

:BACKEND_READY

REM ── Start frontend ───────────────────────────────────────────
echo Starting frontend on port 7262...
cd "%PROJECT_ROOT%\demo\frontend"
start "SAM2-Frontend" /min cmd /c "yarn dev --port 7262 > "%PROJECT_ROOT%\frontend.log" 2>&1"
cd "%PROJECT_ROOT%"

REM ── Wait for frontend ────────────────────────────────────────
echo Waiting for frontend...
timeout /t 8 /nobreak >nul

REM ── Open browser ─────────────────────────────────────────────
start "" http://localhost:7262

echo.
echo ==========================================
echo   SAM2 Tracker is running!
echo   Open: http://localhost:7262
echo ==========================================
echo.
echo   Logs:
echo     backend.log   - backend errors
echo     frontend.log  - frontend errors
echo.
echo   Press any key to STOP all servers.
echo.
pause >nul

REM ── Cleanup ──────────────────────────────────────────────────
echo Stopping servers...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":7263 "') do (
    if not "%%a"=="0" taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":7262 "') do (
    if not "%%a"=="0" taskkill /F /PID %%a >nul 2>&1
)
echo Done. Goodbye!
timeout /t 2 /nobreak >nul
