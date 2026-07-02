# SAM2 Tracker — Setup & Run Flow

```
╔════════════════════════════════════════════════════════════╗
║           SAM2 TRACKER — SETUP & RUN FLOW                  ║
╚════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────┐
│  🖥️  FIRST TIME SETUP (New Machine)                         │
└─────────────────────────────────────────────────────────────┘
           │
           ▼
   ┌───────────────┐
   │  git clone    │  git clone https://github.com/YOU/sam2-tracker.git
   │  repository   │  cd sam2-tracker
   └───────┬───────┘
           │
           ▼
   ┌───────────────┐
   │  Python venv  │  python3 -m venv venv
   │  create       │  source venv/bin/activate
   └───────┬───────┘
           │
           ▼
   ┌───────────────┐
   │  Install      │  pip install -e ".[demo]"
   │  dependencies │
   └───────┬───────┘
           │
           ▼
   ┌───────────────┐
   │  Download     │  cd checkpoints
   │  checkpoints  │  ./download_ckpts.sh        ⚠️ ~1-2 GB
   │  (.pt files)  │  cd ..
   └───────┬───────┘
           │
           ▼
   ┌───────────────┐
   │  Frontend     │  cd demo/frontend
   │  dependencies │  yarn install
   │               │  cd ../..
   └───────┬───────┘
           │
           ▼
   ┌───────────────┐
   │  ✅ SETUP     │  Only once per machine
   │  COMPLETE     │
   └───────┬───────┘
           │
╔══════════╪═════════════════════════════════════════════════╗
║          ▼   EVERY TIME RUN                                 ║
╚═════════════════════════════════════════════════════════════╝
           │
           ▼
   ┌───────────────┐
   │  Run demo     │  ./run-demo.sh
   └───────┬───────┘
           │
           ├──────────────────────────────────┐
           ▼                                  ▼
   ┌───────────────┐                 ┌────────────────┐
   │  🔧 Backend   │                 │  🎨 Frontend   │
   │  port 7263    │                 │  port 7262     │
   │  (Python/     │                 │  (React/Vite)  │
   │   gunicorn)   │                 │                │
   └───────┬───────┘                 └───────┬────────┘
           │                                 │
           └──────────────┬──────────────────┘
                          ▼
                ┌─────────────────┐
                │  Open Browser   │  http://localhost:7262
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │  Upload / Select│
                │  a video        │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │  Click objects  │
                │  to track       │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │  Track & Play   │
                │  (propagation)  │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │  Good to go →   │
                │  Effects tab    │
                └────────┬────────┘
                         │
                         ▼
                ┌─────────────────┐
                │  Next →         │
                │  Download screen│
                └────────┬────────┘
                         │
                    ┌────┴────┐
                    ▼         ▼
           ┌─────────────┐  ┌──────────────────┐
           │  📥 Download │  │  📄 Download     │
           │  masked      │  │  Tracking JSON   │
           │  video       │  │  (mask data)     │
           └─────────────┘  └──────────────────┘


╔═════════════════════════════════════════════════════════════╗
║  📁 WHAT GETS DOWNLOADED FROM GIT vs MANUAL                 ║
╠═════════════════════════════════════════════════════════════╣
║  ✅ FROM GIT      → Source code, run-demo.sh, configs       ║
║  ⚠️  MANUAL ONLY  → checkpoints/*.pt  (too large for git)   ║
║  🚫 NOT IN GIT   → venv/, demo/data/uploads/, exports/      ║
╚═════════════════════════════════════════════════════════════╝
```

## Quick Commands Reference

### First Time Setup
```bash
git clone https://github.com/YOUR_USERNAME/sam2-tracker.git
cd sam2-tracker
python3 -m venv venv
source venv/bin/activate
pip install -e ".[demo]"
cd checkpoints && ./download_ckpts.sh && cd ..
cd demo/frontend && yarn install && cd ../..
```

### Every Time Run
```bash
source venv/bin/activate
./run-demo.sh
```

### Open in Browser
```
http://localhost:7262
```
