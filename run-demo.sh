#!/bin/bash
# ============================================================
#  SAM2 Tracker — Ubuntu/Linux Start Script
#  Requires: Ubuntu 20.04+, Python 3.11, Node 18+, yarn, ffmpeg
# ============================================================

set -euo pipefail

cleanup() {
  echo ""
  echo "🛑 Shutting down..."
  pkill -f "python.*app.py" 2>/dev/null || true
  pkill -f "vite.*7262"     2>/dev/null || true
  exit 0
}
trap cleanup SIGINT SIGTERM

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

echo "🐧 SAM2 Tracker — Ubuntu/Linux"
echo "   Root: $PROJECT_ROOT"
echo ""

# ── Kill stale processes ──────────────────────────────────────
pkill -f "python.*app.py" 2>/dev/null || true
pkill -f "vite.*7262"     2>/dev/null || true
sleep 1

# ── Check requirements ────────────────────────────────────────
missing=()
command -v python3  &>/dev/null || missing+=("python3 (sudo apt install python3.11 python3.11-venv)")
command -v node     &>/dev/null || missing+=("node (see SETUP.md for install instructions)")
command -v ffmpeg   &>/dev/null || missing+=("ffmpeg (sudo apt install ffmpeg)")
command -v yarn     &>/dev/null || missing+=("yarn (npm install -g yarn)")

if [ ${#missing[@]} -gt 0 ]; then
  echo "❌ Missing dependencies:"
  for m in "${missing[@]}"; do echo "   • $m"; done
  echo ""
  echo "Run: sudo apt install python3.11 python3.11-venv ffmpeg"
  echo "See SETUP.md for full instructions."
  exit 1
fi

# ── Virtual env ───────────────────────────────────────────────
if [ ! -d "venv" ]; then
  echo "📦 Creating virtual environment..."
  python3 -m venv venv
fi
source venv/bin/activate

# ── Install Python deps if needed ────────────────────────────
if ! python -c "import sam2" &>/dev/null 2>&1; then
  echo "📦 Installing Python dependencies (first time ~5 min)..."
  pip install -q -e ".[demo]"
fi

# ── Checkpoints ──────────────────────────────────────────────
if [ ! -f "checkpoints/sam2.1_hiera_tiny.pt" ]; then
  echo "📥 Downloading model checkpoints (~150MB)..."
  (cd checkpoints && bash download_ckpts.sh)
fi

# ── Frontend deps ─────────────────────────────────────────────
if [ ! -d "demo/frontend/node_modules" ]; then
  echo "📦 Installing frontend dependencies..."
  (cd demo/frontend && yarn install --silent)
fi

# ── Start backend ─────────────────────────────────────────────
echo "🔧 Starting backend on port 7263..."
cd "$PROJECT_ROOT/demo/backend/server"

# Ubuntu: no macOS flags, CUDA auto-detected if available
SAM2_DEMO_FORCE_CPU_DEVICE=1 \
APP_ROOT="$PROJECT_ROOT/" \
API_URL=http://localhost:7263 \
MODEL_SIZE=tiny \
DATA_PATH="$PROJECT_ROOT/demo/data" \
DEFAULT_VIDEO_PATH=gallery/05_default_juggle.mp4 \
  python app.py 2>&1 &

BACKEND_PID=$!
cd "$PROJECT_ROOT"

# ── Wait for backend ──────────────────────────────────────────
echo "⏳ Waiting for backend (model loading ~30-60s)..."
for i in $(seq 1 120); do
  curl -s http://localhost:7263/healthy &>/dev/null && { echo "✅ Backend ready (${i}s)"; break; }
  sleep 1
done

# ── Start frontend ────────────────────────────────────────────
echo "🎨 Starting frontend on port 7262..."
cd "$PROJECT_ROOT/demo/frontend"
yarn dev --port 7262 --host 0.0.0.0 2>&1 &
FRONTEND_PID=$!
cd "$PROJECT_ROOT"

sleep 3
echo ""
echo "════════════════════════════════════════"
echo "  ✅  SAM2 Tracker is running!"
echo "  🌐  http://localhost:7262"
echo "  🔧  API: http://localhost:7263"
echo "  Press Ctrl+C to stop"
echo "════════════════════════════════════════"

wait $BACKEND_PID $FRONTEND_PID
