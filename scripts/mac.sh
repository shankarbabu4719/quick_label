#!/bin/bash
# QuickLabel — macOS Setup Script
# Installs all dependencies and runs the app

set -e

echo ""
echo "🍎 QuickLabel — macOS Setup"
echo "════════════════════════════════════════"

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# ── Check Homebrew ────────────────────────────────────────────────
if ! command -v brew &>/dev/null; then
  echo "📦 Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# ── Install system dependencies ───────────────────────────────────
echo "📦 Installing dependencies (python3.11, node, ffmpeg)..."
brew install python@3.11 node ffmpeg git 2>/dev/null || true
npm install -g yarn --silent 2>/dev/null || true

# ── Python virtual environment ────────────────────────────────────
if [ ! -d "venv" ]; then
  echo "🐍 Creating Python virtual environment..."
  python3.11 -m venv venv
fi
source venv/bin/activate
echo "📦 Installing Python packages..."
pip install -e ".[demo]" -q

# ── Frontend ──────────────────────────────────────────────────────
echo "🎨 Installing frontend packages..."
cd demo/frontend && yarn install --silent 2>/dev/null && cd "$PROJECT_ROOT"

# ── Checkpoints ──────────────────────────────────────────────────
if [ ! -f "checkpoints/sam2.1_hiera_tiny.pt" ]; then
  echo "📥 Downloading model checkpoints..."
  (cd checkpoints && bash download_ckpts.sh)
fi

echo ""
echo "✅ Setup complete! Starting QuickLabel..."
echo ""

# ── Start backend ────────────────────────────────────────────────
cleanup() {
  pkill -f "python.*app.py" 2>/dev/null
  pkill -f "vite.*7262" 2>/dev/null
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  exit
}
trap cleanup SIGINT SIGTERM

pkill -f "python.*app.py" 2>/dev/null
pkill -f "vite.*7262" 2>/dev/null
sleep 1

cd demo/backend/server
env OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES \
    PYTORCH_ENABLE_MPS_FALLBACK=1 \
    MallocStackLogging=0 \
    APP_ROOT="$PROJECT_ROOT/" \
    API_URL=http://localhost:7263 \
    MODEL_SIZE=tiny \
    DATA_PATH="$PROJECT_ROOT/demo/data" \
    SAM2_MAX_FRAMES=300 \
    VIDEO_ENCODE_MAX_FRAMES=300 \
    VIDEO_ENCODE_FPS=10 \
    FFMPEG_NUM_THREADS=4 \
    python app.py 2>&1 &
BACKEND_PID=$!
cd "$PROJECT_ROOT"

echo "⏳ Waiting for backend..."
for i in $(seq 1 90); do
  if curl -s http://localhost:7263/healthy >/dev/null 2>&1; then
    echo "✅ Backend ready! (${i}s)"
    break
  fi
  sleep 1
done

cd demo/frontend
yarn dev --port 7262 2>&1 &
FRONTEND_PID=$!
cd "$PROJECT_ROOT"

sleep 2
echo ""
echo "════════════════════════════════════════"
echo "  ✅ QuickLabel is running!"
echo "  🌐 http://localhost:7262"
echo "  Press Ctrl+C to stop"
echo "════════════════════════════════════════"
echo ""
wait $BACKEND_PID $FRONTEND_PID
