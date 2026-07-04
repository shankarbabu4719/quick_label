# SAM2 Tracker — Windows Setup Guide

## System Requirements
| Requirement | Minimum | Recommended |
|---|---|---|
| Windows | 10 (64-bit) | 11 |
| RAM | 8 GB | 16 GB |
| Python | 3.11 | 3.11 |
| Node.js | 18 LTS | 20 LTS |
| Storage | 2 GB | 5 GB |
| GPU (optional) | NVIDIA CUDA 11+ | CUDA 12+ |

---

## Step 1: Install Python 3.11

1. Download from: https://www.python.org/downloads/release/python-3119/
2. Run installer
3. ✅ **Check "Add Python to PATH"** (very important!)
4. Click "Install Now"

Verify:
```cmd
python --version
```

---

## Step 2: Install Node.js

1. Download LTS from: https://nodejs.org/
2. Run installer (default settings)

Verify:
```cmd
node --version
npm --version
```

---

## Step 3: Install ffmpeg

```cmd
winget install Gyan.FFmpeg
```

OR download from https://ffmpeg.org/download.html and add to PATH.

Verify:
```cmd
ffmpeg -version
```

---

## Step 4: Install Git

```cmd
winget install Git.Git
```

---

## Step 5: Clone the project

Open **Git Bash** or **PowerShell**:
```bash
git clone git@gitlab.com:superuser.surveillance/sam2_labelme.git
cd sam2_labelme
git checkout windows
```

---

## Step 6: Run the app

### Option A — Double-click (easiest):
Double-click `run-demo.bat`

### Option B — PowerShell:
```powershell
powershell -ExecutionPolicy Bypass -File run-demo.ps1
```

Browser automatically opens at **http://localhost:7262**

---

## NVIDIA GPU Support (Optional — 5-10x faster)

```cmd
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

Then in `run-demo.bat`, remove or comment:
```
set SAM2_DEMO_FORCE_CPU_DEVICE=1
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `python` not recognized | Reinstall Python, check "Add to PATH" |
| `node` not recognized | Restart terminal after Node install |
| `ffmpeg` not found | `winget install Gyan.FFmpeg`, restart terminal |
| Port already in use | Restart PC or use Task Manager to kill python.exe |
| Slow tracking | Normal on CPU. Use NVIDIA GPU for speed |
| PowerShell script blocked | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| `bash` not found in .bat | Install Git for Windows (includes bash) |

---

## Log Files
- `backend.log` — Python backend output
- `frontend.log` — Vite frontend output

If something fails, check these files for error details.
