# SAM2 Tracker — Complete Installation Flowchart
# Beginner Guide — Follow step by step

```
╔═══════════════════════════════════════════════════════════════════════╗
║              SAM2 TRACKER — SETUP FLOWCHART                          ║
║          Works on: macOS  |  Ubuntu  |  Windows                      ║
╚═══════════════════════════════════════════════════════════════════════╝

                         ┌─────────────────┐
                         │   START HERE    │
                         │  Open Terminal  │
                         └────────┬────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │   What OS are you using?  │
                    └─────────────┬─────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
              ▼                   ▼                   ▼
        ┌──────────┐       ┌──────────┐       ┌──────────┐
        │  macOS   │       │  Ubuntu  │       │ Windows  │
        └────┬─────┘       └────┬─────┘       └────┬─────┘
             │                  │                   │
    ─────────┼──────────────────┼───────────────────┼─────────
    STEP 1   │                  │                   │
    ─────────┼──────────────────┼───────────────────┼─────────
             ▼                  ▼                   ▼
    ┌─────────────────┐ ┌───────────────────┐ ┌─────────────────────┐
    │ Install         │ │ Install system    │ │ Install Python 3.11 │
    │ Homebrew        │ │ packages:         │ │ from python.org     │
    │                 │ │                   │ │                     │
    │ Paste in        │ │ sudo apt update   │ │ ✅ CHECK             │
    │ Terminal:       │ │ sudo apt install  │ │ "Add Python to PATH"│
    │                 │ │ python3.11        │ │                     │
    │ /bin/bash -c    │ │ python3.11-venv   │ │ Verify:             │
    │ "$(curl -fsSL   │ │ python3-pip       │ │ python --version    │
    │ https://brew.sh │ │ ffmpeg git curl   │ └──────────┬──────────┘
    │ /install.sh)"   │ │ build-essential   │            │
    └────────┬────────┘ └────────┬──────────┘            │
             │                   │                        │
             ▼                   │                        ▼
    ┌─────────────────┐          │             ┌──────────────────────┐
    │ brew install    │          │             │ Install Node.js LTS  │
    │ python@3.11     │          │             │ from nodejs.org      │
    │ node ffmpeg     │          │             │                      │
    │                 │          │             │ Verify:              │
    │ npm i -g yarn   │          │             │ node --version       │
    └────────┬────────┘          │             └──────────┬───────────┘
             │                   │                        │
             │          ┌────────▼──────────┐             │
             │          │ Install Node.js:  │             │
             │          │                   │             │
             │          │ curl -fsSL        │             ▼
             │          │ https://deb.      │  ┌──────────────────────┐
             │          │ nodesource.com/   │  │ Install ffmpeg:      │
             │          │ setup_20.x |      │  │                      │
             │          │ sudo -E bash -    │  │ winget install       │
             │          │                   │  │ Gyan.FFmpeg          │
             │          │ sudo apt install  │  └──────────┬───────────┘
             │          │ nodejs            │             │
             │          │ npm i -g yarn     │             ▼
             │          └────────┬──────────┘  ┌──────────────────────┐
             │                   │             │ Install Git:         │
             │                   │             │                      │
             │                   │             │ winget install       │
             │                   │             │ Git.Git              │
             │                   │             └──────────┬───────────┘
             │                   │                        │
    ─────────┼───────────────────┼────────────────────────┼─────────
    STEP 2   │                   │                        │
             │          ALL 3 OS — SAME STEPS BELOW       │
    ─────────┴───────────────────┴────────────────────────┴─────────
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │ Open Terminal / Git Bash     │
                    │ and run:                     │
                    │                              │
                    │ git clone git@gitlab.com:    │
                    │ superuser.surveillance/      │
                    │ sam2_labelme.git             │
                    │                              │
                    │ cd sam2_labelme              │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │  Checkout your OS branch:    │
                    │                              │
                    │  macOS:   git checkout mac   │
                    │  Ubuntu:  git checkout ubuntu│
                    │  Windows: git checkout windows│
                    └──────────────┬───────────────┘
                                   │
    ────────────────────────────────────────────────────────
    STEP 3
    ────────────────────────────────────────────────────────
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │ Create Python environment:   │
                    │                              │
                    │ macOS / Ubuntu:              │
                    │   python3.11 -m venv venv    │
                    │   source venv/bin/activate   │
                    │                              │
                    │ Windows (CMD):               │
                    │   python -m venv venv        │
                    │   venv\Scripts\activate      │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │ Install Python packages:     │
                    │                              │
                    │   pip install -e ".[demo]"   │
                    │                              │
                    │ ⏳ Takes 3-10 minutes         │
                    │    first time only           │
                    └──────────────┬───────────────┘
                                   │
    ────────────────────────────────────────────────────────
    STEP 4
    ────────────────────────────────────────────────────────
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │ Install frontend packages:   │
                    │                              │
                    │   cd demo/frontend           │
                    │   yarn install               │
                    │   cd ../..                   │
                    └──────────────┬───────────────┘
                                   │
    ────────────────────────────────────────────────────────
    STEP 5 — Run the App
    ────────────────────────────────────────────────────────
                                   │
                                   ▼
               ┌───────────────────┴───────────────────┐
               │                                       │
               ▼                                       ▼
      ┌─────────────────────┐               ┌──────────────────────┐
      │  macOS / Ubuntu:    │               │  Windows:            │
      │                     │               │                      │
      │  chmod +x           │               │  Double-click:       │
      │    run-demo.sh      │               │  run-demo.bat        │
      │  ./run-demo.sh      │               │                      │
      │                     │               │  OR PowerShell:      │
      │  ⏳ Wait ~60 sec     │               │  powershell -        │
      │     (model loading) │               │  ExecutionPolicy     │
      └──────────┬──────────┘               │  Bypass -File        │
                 │                          │  run-demo.ps1        │
                 │                          └──────────┬───────────┘
                 │                                     │
                 └──────────────┬──────────────────────┘
                                │
                                ▼
                 ┌──────────────────────────────┐
                 │ ✅ DONE!                      │
                 │                              │
                 │ Open browser:                │
                 │  http://localhost:7262        │
                 │                              │
                 │ (Windows + macOS auto-open)  │
                 └──────────────┬───────────────┘
                                │
                                ▼
                 ┌──────────────────────────────┐
                 │ 🎉 SAM2 Tracker is running!  │
                 │                              │
                 │  1. Drop a video             │
                 │  2. Click objects to track   │
                 │  3. Press "Track objects"    │
                 │  4. Export JSON / Video      │
                 └──────────────────────────────┘
```

---

## ❌ If something goes wrong — Quick Fixes

```
Problem                          │ Fix
─────────────────────────────────┼──────────────────────────────────────
python not found                 │ Reinstall Python, check "Add to PATH"
node not found                   │ Restart terminal after Node install
ffmpeg not found                 │ Install ffmpeg (see OS section above)
Port 7262/7263 already in use    │ Restart your computer
"Session failed" error           │ Close other apps, free up RAM
Tracking is slow                 │ Use a shorter video / smaller crop range
yarn: command not found          │ npm install -g yarn
pip install fails                │ pip install --upgrade pip, then retry
```

---

## ✅ Success Checklist

Before running `./run-demo.sh`, verify:

```
[ ] python3 --version   → 3.11.x
[ ] node --version      → 18.x or 20.x
[ ] ffmpeg -version     → any version
[ ] yarn --version      → 1.x or 4.x
[ ] venv/ folder exists
[ ] checkpoints/sam2.1_hiera_tiny.pt exists (~149MB)
[ ] demo/frontend/node_modules/ exists
```

All 7 checked? → Run `./run-demo.sh` → Open http://localhost:7262 🚀
