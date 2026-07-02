#!/bin/bash

# Script to run both SAM 2 frontend and backend together

# Function to handle cleanup (kill child processes on exit)
cleanup() {
  echo "Shutting down services..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  exit
}

# Set up trap to handle Ctrl+C and exit
trap cleanup SIGINT SIGTERM

# Get the project root directory
PROJECT_ROOT="$(dirname "$0")"
cd "$PROJECT_ROOT"

echo "🚀 Starting SAM 2 Demo..."

# Activate virtual environment
echo "📦 Activating virtual environment..."
source venv/bin/activate

# Check if checkpoints are downloaded
if [ ! -d "checkpoints" ] || [ -z "$(ls -A checkpoints 2>/dev/null)" ]; then
  echo "📥 Downloading checkpoints..."
  (cd checkpoints && ./download_ckpts.sh)
fi

# Start backend in background with gunicorn, adding macOS fork safety env var
  echo "🔧 Starting backend on http://localhost:7263 (CPU mode)..."
  cd demo/backend/server
  OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES \
  PYTORCH_ENABLE_MPS_FALLBACK=1 \
  SAM2_DEMO_FORCE_CPU_DEVICE=1 \
  APP_ROOT="$(pwd)/../../../" \
  API_URL=http://localhost:7263 \
  MODEL_SIZE=base_plus \
  DATA_PATH="$(pwd)/../../data" \
  DEFAULT_VIDEO_PATH=gallery/05_default_juggle.mp4 \
  gunicorn \
    --worker-class gthread app:app \
    --workers 1 \
    --threads 2 \
    --bind 0.0.0.0:7263 \
    --timeout 60 2>&1 &
BACKEND_PID=$!
cd ../../..

# Give backend a moment to start
sleep 8

# Start frontend in background
echo "🎨 Starting frontend on http://localhost:7262..."
cd demo/frontend
yarn install
yarn dev --port 7262 2>&1 &
FRONTEND_PID=$!
cd ../..

# Wait for both processes
echo "✅ Both services are running!"
echo "Frontend: http://localhost:7262"
echo "Backend:  http://localhost:7263/graphql"
echo "Press Ctrl+C to stop"
wait $BACKEND_PID $FRONTEND_PID
