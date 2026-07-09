#!/bin/bash
# ============================================================
#  SAM2 Tracker — macOS Start Script
#  Requires: macOS 12+, Python 3.11, Node 18+, yarn, ffmpeg
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

echo "🍎 SAM2 Tracker — macOS"
echo "   Root: $PROJECT_ROOT"
echo ""

# ── Kill stale processes ──────────────────────────────────────
pkill -f "python.*app.py" 2>/dev/null || true
pkill -f "vite.*7262"     2>/dev/null || true
sleep 1

# ── Check requirements ────────────────────────────────────────
check() {
  command -v "$1" &>/dev/null || { echo "❌ '$1' not found. Install it first."; exit 1; }
}
check python3
check node
check yarn
check ffmpeg

# ── Virtual env ───────────────────────────────────────────────
if [ ! -d "venv" ]; then
  echo "📦 Creating virtual environment..."
  python3 -m venv venv
fi
source venv/bin/activate

# ── Install Python deps if needed ────────────────────────────
if ! python -c "import sam2" &>/dev/null 2>&1; then
  echo "📦 Installing Python dependencies..."
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
echo "🔧 Starting backend on port 7263 (MPS GPU mode)..."
cd "$PROJECT_ROOT/demo/backend/server"

# macOS: MPS GPU + fork safety + disable MallocStackLogging
OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES \
PYTORCH_ENABLE_MPS_FALLBACK=1 \
MallocStackLogging=0 \
APP_ROOT="$PROJECT_ROOT/" \
API_URL=http://localhost:7263 \
MODEL_SIZE=tiny \
DATA_PATH="$PROJECT_ROOT/demo/data" \
DEFAULT_VIDEO_PATH=gallery/05_default_juggle.mp4 \
SAM2_MAX_FRAMES=300 \
VIDEO_ENCODE_MAX_FRAMES=300 \
VIDEO_ENCODE_FPS=10 \
FFMPEG_NUM_THREADS=4 \
  python app.py 2>&1 &

BACKEND_PID=$!
cd "$PROJECT_ROOT"

# ── Wait for backend ──────────────────────────────────────────
echo "⏳ Waiting for backend..."
for i in $(seq 1 90); do
  curl -s http://localhost:7263/healthy &>/dev/null && { echo "✅ Backend ready (${i}s)"; break; }
  sleep 1
done

# ── Start frontend ────────────────────────────────────────────
echo "🎨 Starting frontend on port 7262..."
cd "$PROJECT_ROOT/demo/frontend"
yarn dev --port 7262 2>&1 &
FRONTEND_PID=$!
cd "$PROJECT_ROOT"

sleep 3
# ── Auto-open browser on macOS ────────────────────────────────
open http://localhost:7262 2>/dev/null || true

echo ""
echo "════════════════════════════════════════"
echo "  ✅  SAM2 Tracker is running!"
echo "  🌐  http://localhost:7262"
echo "  Press Ctrl+C to stop"
echo "════════════════════════════════════════"

wait $BACKEND_PID $FRONTEND_PID
