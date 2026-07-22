#!/bin/bash
# QuickLabel — Ubuntu / Linux Setup Script
# Installs all dependencies and runs the app

set -e

echo ""
echo "🐧 QuickLabel — Ubuntu / Linux Setup"
echo "════════════════════════════════════════"

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# ── System dependencies ───────────────────────────────────────────
echo "📦 Installing system dependencies..."
sudo apt update -q
sudo apt install -y python3.11 python3.11-venv python3-pip ffmpeg git build-essential

# ── Node.js 20 + Yarn ─────────────────────────────────────────────
if ! command -v node &>/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 18 ]; then
  echo "📦 Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
fi
if ! command -v yarn &>/dev/null; then
  npm install -g yarn --silent
fi

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

# ── Start ────────────────────────────────────────────────────────
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
env APP_ROOT="$PROJECT_ROOT/" \
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
