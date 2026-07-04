# SAM2 Tracker — Project Overview

---

## PART 1: What We Built (Features & Changes)

### 1. Home Page — Project Hub
- New home page at `/` with 3 sections:
  - **Start New Project** — drag & drop video upload zone
  - **Previous Projects** — completed exports with Download JSON button
  - **Draft Projects** — incomplete work auto-saved with Resume/Delete
- Professional dark UI: sticky blur nav, gradient hero, feature pills, hover cards

### 2. Draft Auto-Save System
- Work in progress automatically saved when:
  - User clicks "Start Over"
  - User clicks "Change Video"
  - Browser tab closed
- Draft appears on home page → Resume button restores video + objects
- When project is completed → draft auto-deleted, moves to Previous Projects
- Backend APIs: `/save_draft`, `/list_drafts`, `/load_draft`, `/delete_draft`

### 3. Timeline Crop (Left/Right Handles)
- Two draggable purple handles on the video filmstrip timeline
- Left handle = start point, Right handle = end point
- Time labels show live while dragging (e.g. 0.5s → 1.8s, duration: 1.3s)
- Everything works ONLY within the crop range:
  - Video playback loops between handles
  - Object tracking propagates only start→end
  - Trim, export, frame extraction — all respect crop range

### 4. Object Tracking
- Click objects in video → mask generated instantly
- "Track objects" button → propagates mask across all frames in crop range
- Left panel shows dynamic status: Annotating → Tracking → Done
- Support for up to 3 objects simultaneously

### 5. Export (Auto-save on "Good to go")
When user clicks "Good to go" — all 3 files automatically saved:
- `original.mp4` — trimmed to crop range
- `masked.mp4` — video with colored mask overlay
- `tracking.json` — per-frame mask data (RLE format)
All saved to `demo/data/exports/{video_name}/`

### 6. Download Screen
- **Download Masked Video** — .mp4 with mask overlay
- **Download Tracking JSON** — frame-by-frame mask data
- **Extract Frames** — FPS selector (1/2/5/10/24/30) + save PNG frames
  - Each PNG has a matching JSON with mask data for that frame
  - Saved to `exports/{video_name}/{video}_frames_{fps}fps/`
- **Create New Project** — back to home page

### 7. Professional UI
- Dark theme: #0B0D12 background, #13151C panels
- Indigo gradient buttons with hover glow
- Dynamic badges: Annotating (purple) / Tracking (amber pulse) / Done (green)
- Consistent spacing, typography, card shadows

### 8. Backend Improvements
- Flask dev server (port 7263), threaded=True
- MODEL_SIZE=tiny (149MB — lower RAM usage)
- Video upload: 200MB max, 2 minutes max
- ffprobe auto-detects actual video FPS for accurate trimming
- Session expired fallback: serves from disk when RAM session gone

---

## PART 2: Setup Guide (3 Operating Systems)

> **Pre-requirement:** Add your SSH public key to GitLab
> GitLab → Profile → SSH Keys → Add key
> Then verify: `ssh -T git@gitlab.com`

---

### macOS Setup

**STEP 1 — Install Homebrew**
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**STEP 2 — Install dependencies**
```bash
brew install python@3.11 node ffmpeg git
npm install -g yarn
```

**STEP 3 — Clone project**
```bash
git clone git@gitlab.com:superuser.surveillance/sam2_labelme.git
cd sam2_labelme
git checkout mac
```

**STEP 4 — Python setup**
```bash
python3.11 -m venv venv
source venv/bin/activate
pip install -e ".[demo]"
```

**STEP 5 — Frontend setup**
```bash
cd demo/frontend && yarn install && cd ../..
```

**STEP 6 — Run**
```bash
chmod +x run-demo.sh
./run-demo.sh
```
✅ Browser opens automatically → **http://localhost:7262**

---

### Ubuntu Setup

**STEP 1 — Install dependencies**
```bash
sudo apt update && sudo apt install -y python3.11 python3.11-venv python3-pip ffmpeg curl git build-essential
```

**STEP 2 — Install Node.js 20 + yarn**
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
npm install -g yarn
```

**STEP 3 — Clone project**
```bash
git clone git@gitlab.com:superuser.surveillance/sam2_labelme.git
cd sam2_labelme
git checkout ubuntu
```

**STEP 4 — Python setup**
```bash
python3.11 -m venv venv
source venv/bin/activate
pip install -e ".[demo]"
```

**STEP 5 — Frontend setup**
```bash
cd demo/frontend && yarn install && cd ../..
```

**STEP 6 — Run**
```bash
chmod +x run-demo.sh
./run-demo.sh
```
✅ Open browser → **http://localhost:7262**

---

### Windows Setup

**STEP 1 — Install dependencies** *(PowerShell as Administrator)*
```powershell
winget install Python.Python.3.11
winget install OpenJS.NodeJS.LTS
winget install Gyan.FFmpeg
winget install Git.Git
```
> Restart PowerShell after this step

**STEP 2 — Install yarn**
```powershell
npm install -g yarn
```

**STEP 3 — Clone project**
```powershell
git clone git@gitlab.com:superuser.surveillance/sam2_labelme.git
cd sam2_labelme
git checkout windows
```

**STEP 4 — Python setup**
```powershell
python -m venv venv
venv\Scripts\activate
pip install -e ".[demo]"
```

**STEP 5 — Frontend setup**
```powershell
cd demo\frontend
yarn install
cd ..\..
```

**STEP 6 — Run**
```powershell
powershell -ExecutionPolicy Bypass -File run-demo.ps1
```
✅ Browser opens automatically → **http://localhost:7262**

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `python3.11: not found` | macOS: `brew install python@3.11` · Ubuntu: `sudo apt install python3.11` |
| `node: not found` | Restart terminal after Node install |
| `ffmpeg: not found` | macOS: `brew install ffmpeg` · Ubuntu: `sudo apt install ffmpeg` · Windows: `winget install Gyan.FFmpeg` |
| Port 7262/7263 in use | macOS/Ubuntu: `pkill -f "python.*app.py"` · Windows: Restart PC |
| Session start fails | Close other apps to free RAM |
| Slow tracking | Normal on CPU — use shorter crop range |
| SSH: `Permission denied` | Add SSH key to GitLab Profile → SSH Keys |

---

## Git Branches

| Branch | OS | Run command |
|---|---|---|
| `main` | All code | `./run-demo.sh` |
| `mac` | macOS | `./run-demo.sh` |
| `ubuntu` | Ubuntu/Linux | `./run-demo.sh` |
| `windows` | Windows | `run-demo.ps1` |
