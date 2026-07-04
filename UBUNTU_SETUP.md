# SAM2 Tracker — Ubuntu Setup Guide

## Requirements
- Ubuntu 20.04 / 22.04 / 24.04
- Python 3.11+
- Node.js 18+
- 8GB+ RAM recommended
- ffmpeg

---

## Step 1: Clone the project

```bash
git clone git@gitlab.com:superuser.surveillance/sam2_labelme.git
cd sam2_labelme
git checkout sam2
```

---

## Step 2: Install system dependencies

```bash
sudo apt update && sudo apt install -y \
  python3.11 python3.11-venv python3-pip \
  ffmpeg curl git build-essential

# Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Yarn
npm install -g yarn
```

---

## Step 3: Python virtual environment

```bash
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -e ".[demo]"
```

---

## Step 4: Frontend dependencies

```bash
cd demo/frontend
yarn install
cd ../..
```

---

## Step 5: Download model checkpoints

```bash
cd checkpoints
bash download_ckpts.sh
cd ..
```

> ⚠️ This downloads ~150MB (tiny model). All models: ~1.5GB

---

## Step 6: Run the app

```bash
chmod +x run-demo.sh
./run-demo.sh
```

Then open: **http://localhost:7262**

---

## GPU Support (Optional — much faster)

If you have an NVIDIA GPU:

```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

Then remove `SAM2_DEMO_FORCE_CPU_DEVICE=1` from `run-demo.sh`.

---

## Troubleshooting

### Port already in use
```bash
pkill -f "python.*app.py"
pkill -f "vite.*7262"
./run-demo.sh
```

### ffmpeg not found
```bash
sudo apt install -y ffmpeg
```

### Node version too old
```bash
node --version  # should be 18+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### Out of memory on model load
Edit `run-demo.sh` — `MODEL_SIZE=tiny` is already set (149MB).
If still OOM, close other applications.

---

## File Locations

```
sam2_labelme/
├── run-demo.sh           ← Start script
├── venv/                 ← Python environment
├── checkpoints/          ← AI model weights
├── demo/
│   ├── backend/server/   ← Flask API (port 7263)
│   ├── frontend/         ← React app (port 7262)
│   └── data/
│       ├── uploads/      ← Uploaded videos
│       ├── exports/      ← Completed projects
│       └── drafts/       ← Draft projects
```
