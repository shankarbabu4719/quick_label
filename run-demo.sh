#!/bin/bash

# SAM2 Tracker — Start script
# Works on macOS and Ubuntu/Linux

# ── Cleanup on exit ─────────────────────────────────────────────
cleanup() {
  echo ""
  echo "🛑 Shutting down services..."
  pkill -f "python.*app.py" 2>/dev/null
  pkill -f "vite.*7262"     2>/dev/null
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  exit
}
trap cleanup SIGINT SIGTERM

# ── Project root ─────────────────────────────────────────────────
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

echo "🚀 Starting SAM2 Tracker..."
echo "   Project: $PROJECT_ROOT"

# ── Kill any leftover processes ───────────────────────────────────
pkill -f "python.*app.py" 2>/dev/null
pkill -f "vite.*7262"     2>/dev/null
sleep 1

# ── Virtual environment ──────────────────────────────────────────
if [ ! -d "venv" ]; then
  echo "❌ venv not found. Run: python3 -m venv venv && source venv/bin/activate && pip install -e '.[demo]'"
  exit 1
fi
source venv/bin/activate
echo "📦 Virtual environment activated"

# ── Checkpoints ──────────────────────────────────────────────────
CKPT_DIR="checkpoints"
if [ ! -f "$CKPT_DIR/sam2.1_hiera_tiny.pt" ]; then
  echo "📥 Downloading checkpoints (this may take a while)..."
  (cd "$CKPT_DIR" && bash download_ckpts.sh)
fi

# ── Detect OS for backend env vars ───────────────────────────────
OS="$(uname -s)"
if [ "$OS" = "Darwin" ]; then
  # macOS: disable fork safety + MPS fallback
  # Use MPS (Apple GPU) for better performance — remove FORCE_CPU
  EXTRA_ENV="OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES PYTORCH_ENABLE_MPS_FALLBACK=1 MallocStackLogging=0"
  echo "🍎 macOS detected (MPS GPU mode)"
else
  # Linux/Ubuntu: no macOS-specific flags needed
  EXTRA_ENV=""
  echo "🐧 Linux detected"
fi

# ── Start backend ────────────────────────────────────────────────
echo "🔧 Starting backend on http://localhost:7263 (tiny model, CPU mode)..."
cd demo/backend/server

env $EXTRA_ENV \
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

# ── Wait for backend to be ready ─────────────────────────────────
echo "⏳ Waiting for backend to be ready..."
BACKEND_READY=0
for i in $(seq 1 90); do
  if curl -s http://localhost:7263/healthy > /dev/null 2>&1; then
    echo "✅ Backend ready! (${i}s)"
    BACKEND_READY=1
    break
  fi
  sleep 1
done

if [ $BACKEND_READY -eq 0 ]; then
  echo "⚠️  Backend taking longer than expected — starting frontend anyway"
fi

# ── Start frontend ────────────────────────────────────────────────
echo "🎨 Starting frontend on http://localhost:7262..."
cd demo/frontend
yarn install --silent 2>/dev/null || npm install --silent 2>/dev/null
yarn dev --port 7262 2>&1 &
FRONTEND_PID=$!
cd "$PROJECT_ROOT"

# ── Done ──────────────────────────────────────────────────────────
sleep 3
echo ""
echo "════════════════════════════════════════"
echo "  ✅ SAM2 Tracker is running!"
echo "  🌐 Open: http://localhost:7262"
echo "  🔧 API:  http://localhost:7263"
echo "  Press Ctrl+C to stop"
echo "════════════════════════════════════════"
echo ""

wait $BACKEND_PID $FRONTEND_PID
