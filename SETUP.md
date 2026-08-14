# SAM2 Tracker — Ubuntu/Linux Setup Guide

## System Requirements
| Requirement | Minimum | Recommended |
|---|---|---|
| Ubuntu | 20.04 LTS | 22.04 / 24.04 LTS |
| RAM | 8 GB | 16 GB |
| Python | 3.11 | 3.11 |
| Node.js | 18 | 20 |
| Storage | 2 GB | 5 GB |
| GPU (optional) | NVIDIA CUDA 11+ | CUDA 12+ |

---

## Step 1: System dependencies

```bash
sudo apt update && sudo apt install -y \
  python3.11 python3.11-venv python3-pip \
  ffmpeg curl git build-essential

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Yarn
npm install -g yarn
```

## Step 2: Clone the project

```bash
git clone git@gitlab.com:superuser.surveillance/sam2_labelme.git
cd sam2_labelme
git checkout ubuntu
```

## Step 3: Python setup

```bash
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -e ".[demo]"
```

## Step 4: Frontend setup

```bash
cd demo/frontend && yarn install && cd ../..
```

## Step 5: Run

```bash
chmod +x run-demo.sh
./run-demo.sh
```

Open browser: **http://localhost:7262**

---

## NVIDIA GPU Support (Optional — 5-10x faster)

```bash
# Check CUDA version
nvidia-smi

# Install PyTorch with CUDA
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118

# Then in run-demo.sh, comment out:
# SAM2_DEMO_FORCE_CPU_DEVICE=1
```

---

## Run as a Service (systemd)

```bash
sudo nano /etc/systemd/system/sam2.service
```

Paste:
```ini
[Unit]
Description=SAM2 Tracker
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/path/to/sam2_labelme
ExecStart=/path/to/sam2_labelme/run-demo.sh
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable sam2
sudo systemctl start sam2
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `python3.11: command not found` | `sudo apt install python3.11 python3.11-venv` |
| `ffmpeg: command not found` | `sudo apt install ffmpeg` |
| `node: command not found` | Follow Step 1 Node.js install |
| Port already in use | `pkill -f "python.*app.py"; pkill -f "vite"` |
| Slow tracking | Normal on CPU. Use NVIDIA GPU for speed |
| `CUDA out of memory` | Set `MODEL_SIZE=tiny` in run-demo.sh |
