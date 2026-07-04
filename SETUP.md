# SAM2 Tracker — macOS Setup Guide

## System Requirements
| Requirement | Minimum | Recommended |
|---|---|---|
| macOS | 12 Monterey | 13+ Ventura |
| RAM | 8 GB | 16 GB |
| Python | 3.11 | 3.11 |
| Node.js | 18 | 20 |
| Storage | 2 GB | 5 GB |

---

## Step 1: Install Homebrew (if not installed)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

## Step 2: Install system dependencies
```bash
brew install python@3.11 node ffmpeg
npm install -g yarn
```

## Step 3: Clone the project
```bash
git clone git@gitlab.com:superuser.surveillance/sam2_labelme.git
cd sam2_labelme
git checkout mac
```

## Step 4: Python setup
```bash
python3.11 -m venv venv
source venv/bin/activate
pip install -e ".[demo]"
```

## Step 5: Frontend setup
```bash
cd demo/frontend && yarn install && cd ../..
```

## Step 6: Run
```bash
chmod +x run-demo.sh
./run-demo.sh
```
Browser automatically opens at **http://localhost:7262**

---

## Apple Silicon (M1/M2/M3) Note
The script uses `PYTORCH_ENABLE_MPS_FALLBACK=1` to handle unsupported MPS ops.
For best performance on Apple Silicon, comment out `SAM2_DEMO_FORCE_CPU_DEVICE=1`
in `run-demo.sh` to enable Metal GPU acceleration.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `brew: command not found` | Install Homebrew (Step 1) |
| `python3.11: command not found` | `brew install python@3.11` |
| `ffmpeg: command not found` | `brew install ffmpeg` |
| Port 7262/7263 in use | `pkill -f "python.*app.py"; pkill -f "vite"` |
| Session start fails | Check RAM — close other apps |
| Slow tracking | Normal on CPU — use small crop range |
