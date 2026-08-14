# SAM2 Tracker — Ubuntu Setup (GPU Enabled)
# SSH key already added to GitLab ✅
# Copy-paste each block in Terminal

---

## STEP 0 — Verify GPU (Optional but recommended)
```bash
# Check if NVIDIA GPU is available
nvidia-smi

# Should show GPU info. If not, install NVIDIA drivers first:
# sudo ubuntu-drivers autoinstall
# sudo reboot
```

---

## STEP 1 — Install dependencies
```bash
sudo apt update && sudo apt install -y python3.11 python3.11-venv python3-pip ffmpeg curl git build-essential
```

---

## STEP 1.5 — Install CUDA Toolkit (for GPU support)
```bash
# Install CUDA 11.8 or 12.1 (PyTorch compatible)
# Check your GPU: nvidia-smi
# Then install matching CUDA version

# For CUDA 12.1:
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.0-1_all.deb
sudo dpkg -i cuda-keyring_1.0-1_all.deb
sudo apt-get update
sudo apt-get -y install cuda-12-1

# Add to PATH (add to ~/.bashrc for permanent)
export PATH=/usr/local/cuda-12.1/bin${PATH:+:${PATH}}
export LD_LIBRARY_PATH=/usr/local/cuda-12.1/lib64${LD_LIBRARY_PATH:+:${LD_LIBRARY_PATH}}
```

---

## STEP 2 — Install Node.js 20 + yarn
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
npm install -g yarn
```

---

## STEP 3 — Clone project
```bash
git clone git@gitlab.com:superuser.surveillance/sam2_labelme.git
cd sam2_labelme
git checkout ubuntu
```

---

## STEP 4 — Python setup (with GPU support)
```bash
python3.11 -m venv venv
source venv/bin/activate

# Install PyTorch with CUDA support first
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121

# Then install SAM2
pip install -e ".[demo]"

# Verify GPU is detected
python -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}'); print(f'GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"None\"}')"
```

---

## STEP 5 — Frontend setup
```bash
cd demo/frontend && yarn install && cd ../..
```

---

## STEP 6 — Run (GPU enabled by default)
```bash
chmod +x run-demo.sh
./run-demo.sh

# Backend will automatically use GPU if available
# Check console logs for: "🚀 GPU DETECTED"
```

---

## 🔧 Troubleshooting

### Force CPU mode (for testing)
```bash
SAM2_DEMO_FORCE_CPU_DEVICE=1 ./run-demo.sh
```

### Check GPU usage while running
```bash
watch -n 1 nvidia-smi
```

### If GPU not detected
```bash
# Check CUDA installation
nvcc --version

# Check PyTorch CUDA
python -c "import torch; print(torch.cuda.is_available())"

# Reinstall PyTorch with CUDA
pip uninstall torch torchvision
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
```

---

## ✅ Open browser → http://localhost:7262
## 🚀 GPU-accelerated tracking is 10-50x faster than CPU!
