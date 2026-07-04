#!/bin/bash
# ============================================================
#  SAM2 Tracker — Push changes to all branches
#
#  Usage:
#    ./update-all-branches.sh "your commit message"
#
#  What it does:
#    1. Commits current changes on sam2 branch
#    2. Merges sam2 into mac, ubuntu, windows
#    3. Pushes all 4 branches + main to GitLab
# ============================================================

set -e

MESSAGE="${1:-"Update: sync all branches"}"

echo "🔄 Syncing all branches..."
echo "   Message: $MESSAGE"
echo ""

cd "$(dirname "$0")"

# ── Make sure we're on sam2 ───────────────────────────────────
git checkout sam2

# ── Commit if there are changes ──────────────────────────────
if ! git diff --quiet || ! git diff --cached --quiet; then
  git add -A
  git commit -m "$MESSAGE"
  echo "✅ Committed to sam2"
else
  echo "ℹ️  No changes to commit on sam2"
fi

# ── Push sam2 ────────────────────────────────────────────────
git push origin sam2
echo "✅ Pushed sam2"

# ── Merge into main ──────────────────────────────────────────
git checkout main
git merge sam2 --no-edit
git push origin main
echo "✅ Pushed main"

# ── Merge into mac ───────────────────────────────────────────
git checkout mac
git merge sam2 --no-edit
git push origin mac
echo "✅ Pushed mac"

# ── Merge into ubuntu ────────────────────────────────────────
git checkout ubuntu
git merge sam2 --no-edit
git push origin ubuntu
echo "✅ Pushed ubuntu"

# ── Merge into windows ───────────────────────────────────────
git checkout windows
git merge sam2 --no-edit
git push origin windows
echo "✅ Pushed windows"

# ── Back to sam2 ─────────────────────────────────────────────
git checkout sam2

echo ""
echo "════════════════════════════════════════"
echo "  ✅ All branches updated and pushed!"
echo "  Branches: main, sam2, mac, ubuntu, windows"
echo "════════════════════════════════════════"
