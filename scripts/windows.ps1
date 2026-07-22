# QuickLabel — Windows Setup Script
# Run as: powershell -ExecutionPolicy Bypass -File scripts/windows.ps1

Write-Host ""
Write-Host "🪟 QuickLabel — Windows Setup" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan

$PROJECT_ROOT = Split-Path -Parent $PSScriptRoot
Set-Location $PROJECT_ROOT

# ── Install dependencies ─────────────────────────────────────────
Write-Host "📦 Installing dependencies via winget..." -ForegroundColor Yellow
winget install Python.Python.3.11 --silent --accept-package-agreements 2>$null
winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements 2>$null
winget install Gyan.FFmpeg --silent --accept-package-agreements 2>$null
Write-Host "⚠️  Restart PowerShell if this is your first install, then re-run this script." -ForegroundColor Yellow

# ── Yarn ─────────────────────────────────────────────────────────
if (-not (Get-Command yarn -ErrorAction SilentlyContinue)) {
  Write-Host "📦 Installing Yarn..." -ForegroundColor Yellow
  npm install -g yarn
}

# ── Python virtual environment ────────────────────────────────────
if (-not (Test-Path "venv")) {
  Write-Host "🐍 Creating Python virtual environment..." -ForegroundColor Yellow
  python -m venv venv
}
& venv\Scripts\Activate.ps1
Write-Host "📦 Installing Python packages..." -ForegroundColor Yellow
pip install -e ".[demo]" -q

# ── Frontend ──────────────────────────────────────────────────────
Write-Host "🎨 Installing frontend packages..." -ForegroundColor Yellow
Set-Location demo\frontend
yarn install --silent 2>$null
Set-Location $PROJECT_ROOT

# ── Checkpoints ──────────────────────────────────────────────────
if (-not (Test-Path "checkpoints\sam2.1_hiera_tiny.pt")) {
  Write-Host "📥 Downloading model checkpoints..." -ForegroundColor Yellow
  Set-Location checkpoints
  bash download_ckpts.sh
  Set-Location $PROJECT_ROOT
}

Write-Host ""
Write-Host "✅ Setup complete! Starting QuickLabel..." -ForegroundColor Green
Write-Host ""

# ── Kill existing processes ────────────────────────────────────────
Get-Process | Where-Object { $_.CommandLine -like "*app.py*" } | Stop-Process -Force 2>$null

# ── Start backend ────────────────────────────────────────────────
Write-Host "🔧 Starting backend..." -ForegroundColor Yellow
$env:APP_ROOT       = "$PROJECT_ROOT\"
$env:API_URL        = "http://localhost:7263"
$env:MODEL_SIZE     = "tiny"
$env:DATA_PATH      = "$PROJECT_ROOT\demo\data"
$env:SAM2_MAX_FRAMES           = "300"
$env:VIDEO_ENCODE_MAX_FRAMES   = "300"
$env:VIDEO_ENCODE_FPS          = "10"
$env:FFMPEG_NUM_THREADS        = "4"

$backend = Start-Process python -ArgumentList "app.py" `
  -WorkingDirectory "$PROJECT_ROOT\demo\backend\server" `
  -PassThru -WindowStyle Hidden

# ── Wait for backend ──────────────────────────────────────────────
Write-Host "⏳ Waiting for backend..." -ForegroundColor Yellow
for ($i = 1; $i -le 90; $i++) {
  try {
    $r = Invoke-WebRequest -Uri "http://localhost:7263/healthy" -UseBasicParsing -ErrorAction Stop
    Write-Host "✅ Backend ready! (${i}s)" -ForegroundColor Green
    break
  } catch { Start-Sleep 1 }
}

# ── Start frontend ────────────────────────────────────────────────
Write-Host "🎨 Starting frontend..." -ForegroundColor Yellow
$frontend = Start-Process yarn -ArgumentList "dev --port 7262" `
  -WorkingDirectory "$PROJECT_ROOT\demo\frontend" `
  -PassThru -WindowStyle Hidden

Start-Sleep 3
Write-Host ""
Write-Host "════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ QuickLabel is running!" -ForegroundColor Green
Write-Host "  🌐 http://localhost:7262" -ForegroundColor Green
Write-Host "  Close this window to stop" -ForegroundColor Gray
Write-Host "════════════════════════════════════════" -ForegroundColor Green
Write-Host ""

# Open browser
Start-Process "http://localhost:7262"
$backend.WaitForExit()
