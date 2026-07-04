# ============================================================
#  SAM2 Tracker — Windows PowerShell Start Script
#  Usage: Right-click → "Run with PowerShell"
#         OR: powershell -ExecutionPolicy Bypass -File run-demo.ps1
# ============================================================

$ErrorActionPreference = "Stop"
$Host.UI.RawUI.WindowTitle = "SAM2 Tracker"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  SAM2 Tracker -- Windows (PowerShell)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$PROJECT_ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $PROJECT_ROOT

# ── Kill stale processes ──────────────────────────────────────
Write-Host "Cleaning up old processes..." -ForegroundColor Yellow
Get-Process -Name python -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
$ports = @(7262, 7263)
foreach ($port in $ports) {
    $pid = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue).OwningProcess
    if ($pid) { Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue }
}
Start-Sleep -Seconds 1

# ── Check dependencies ────────────────────────────────────────
function Check-Command($cmd, $installHint) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: '$cmd' not found. $installHint" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Check-Command "python"  "Install from https://python.org (check 'Add to PATH')"
Check-Command "node"    "Install from https://nodejs.org (LTS)"
Check-Command "ffmpeg"  "Run: winget install Gyan.FFmpeg"

if (-not (Get-Command "yarn" -ErrorAction SilentlyContinue)) {
    Write-Host "Installing yarn..." -ForegroundColor Yellow
    npm install -g yarn
}

# ── Virtual env ───────────────────────────────────────────────
if (-not (Test-Path "venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}
& ".\venv\Scripts\Activate.ps1"

# ── Python deps ───────────────────────────────────────────────
$samInstalled = python -c "import sam2" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Installing Python dependencies (~5 min first time)..." -ForegroundColor Yellow
    pip install -q -e ".[demo]"
}

# ── Checkpoints ──────────────────────────────────────────────
if (-not (Test-Path "checkpoints\sam2.1_hiera_tiny.pt")) {
    Write-Host "Downloading model checkpoints (~150MB)..." -ForegroundColor Yellow
    Set-Location checkpoints
    bash download_ckpts.sh
    Set-Location $PROJECT_ROOT
}

# ── Frontend deps ────────────────────────────────────────────
if (-not (Test-Path "demo\frontend\node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    Set-Location "demo\frontend"
    yarn install --silent
    Set-Location $PROJECT_ROOT
}

# ── Start backend ─────────────────────────────────────────────
Write-Host "Starting backend on port 7263..." -ForegroundColor Green
Set-Location "demo\backend\server"

$env:SAM2_DEMO_FORCE_CPU_DEVICE = "1"
$env:APP_ROOT = "$PROJECT_ROOT\"
$env:API_URL = "http://localhost:7263"
$env:MODEL_SIZE = "tiny"
$env:DATA_PATH = "$PROJECT_ROOT\demo\data"
$env:DEFAULT_VIDEO_PATH = "gallery/05_default_juggle.mp4"

$backend = Start-Process python -ArgumentList "app.py" -PassThru -WindowStyle Hidden -RedirectStandardOutput "$PROJECT_ROOT\backend.log" -RedirectStandardError "$PROJECT_ROOT\backend_err.log"
Set-Location $PROJECT_ROOT

# ── Wait for backend ──────────────────────────────────────────
Write-Host "Waiting for backend..." -ForegroundColor Yellow
$ready = $false
for ($i = 0; $i -lt 90; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:7263/healthy" -TimeoutSec 2 -ErrorAction Stop
        if ($r.StatusCode -eq 200) { Write-Host "Backend ready! (${i}s)" -ForegroundColor Green; $ready = $true; break }
    } catch {}
    Start-Sleep -Seconds 1
}
if (-not $ready) { Write-Host "Backend still loading, continuing..." -ForegroundColor Yellow }

# ── Start frontend ────────────────────────────────────────────
Write-Host "Starting frontend on port 7262..." -ForegroundColor Green
Set-Location "demo\frontend"
$frontend = Start-Process yarn -ArgumentList "dev --port 7262" -PassThru -WindowStyle Hidden -RedirectStandardOutput "$PROJECT_ROOT\frontend.log"
Set-Location $PROJECT_ROOT

Start-Sleep -Seconds 3
Start-Process "http://localhost:7262"

Write-Host ""
Write-Host "===========================================" -ForegroundColor Green
Write-Host "  SAM2 Tracker is running!" -ForegroundColor Green
Write-Host "  Open: http://localhost:7262" -ForegroundColor Green
Write-Host "  Press Ctrl+C or close window to stop" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Logs: backend.log / frontend.log"

# Keep running
$backend.WaitForExit()
