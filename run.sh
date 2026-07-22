#!/bin/bash
# QuickLabel — Universal Setup & Run Script
# Auto-detects OS and runs the appropriate setup script

set -e

echo ""
echo "🚀 QuickLabel — Auto-detecting your OS..."
echo ""

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

# ── Detect OS ────────────────────────────────────────────────────
OS="$(uname -s)"

case "$OS" in
  Darwin)
    echo "✅ Detected: macOS"
    chmod +x scripts/mac.sh
    exec bash scripts/mac.sh
    ;;
  Linux)
    echo "✅ Detected: Linux"
    chmod +x scripts/ubuntu.sh
    exec bash scripts/ubuntu.sh
    ;;
  CYGWIN*|MINGW*|MSYS*)
    echo "✅ Detected: Windows (Git Bash)"
    echo ""
    echo "Please run:"
    echo "  powershell -ExecutionPolicy Bypass -File scripts/windows.ps1"
    echo ""
    exit 1
    ;;
  *)
    echo "❌ Unsupported OS: $OS"
    echo ""
    echo "Supported platforms:"
    echo "  • macOS:        bash run.sh"
    echo "  • Linux/Ubuntu: bash run.sh"
    echo "  • Windows:      powershell -ExecutionPolicy Bypass -File scripts/windows.ps1"
    echo ""
    exit 1
    ;;
esac
