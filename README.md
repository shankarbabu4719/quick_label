<div align="center">

<img src="./assets/banner.png" width="100%" alt="SAM2 Tracker"/>

<br/>

<a href="https://github.com/facebookresearch/sam2">
  <img src="https://img.shields.io/badge/%F0%9F%A4%96-Built_on_SAM2_Meta_AI-0064e0?style=flat-square" />
</a>
<a href="https://github.com/ultralytics/ultralytics">
  <img src="https://img.shields.io/badge/%F0%9F%8E%AF-YOLOv8_Ultralytics-00b4d8?style=flat-square" />
</a>
<a href="#">
  <img src="https://img.shields.io/badge/%F0%9F%90%8D-Python_3.11-3776AB?style=flat-square" />
</a>
<a href="#">
  <img src="https://img.shields.io/badge/%E2%9A%9B%EF%B8%8F-React_18-61dafb?style=flat-square" />
</a>
<a href="./LICENSE">
  <img src="https://img.shields.io/badge/%F0%9F%93%84-Apache_2.0-22c55e?style=flat-square" />
</a>

</div>

<br/>

> ***SAM2 Tracker*** is a full-stack web application for **interactive video object tracking**, mask annotation, and **YOLO model training** — powered by Meta's [Segment Anything Model 2](https://github.com/facebookresearch/sam2).
> Click on any object in a video → SAM2 tracks it across every frame → export annotations → train a custom YOLOv8 detector. **No code required.**

***SAM2 Tracker*** is suitable for:
- 🎯 **Surveillance & retail analytics** — track people, vehicles, or products across footage
- 🏷️ **Data annotation** — generate LabelMe JSON + YOLO `.txt` labels automatically
- 🤖 **Custom model training** — train YOLOv8 directly from the browser with your own data
- 🎬 **Multi-object tracking** — up to 10 objects simultaneously with colored mask overlays

---

## :movie_camera: Demo

<div align="center">

<img src="./assets/demo.gif" width="80%" alt="SAM2 Tracker — Two tennis players tracked with orange and blue mask overlays"/>

*Two players tracked simultaneously — masks propagated across 72 frames at 10 fps*

</div>

---

## :rocket: Features

| Feature | Description |
|---------|-------------|
| ⚡ One-click tracking | Click any object — SAM2 segments and tracks it instantly |
| 👥 Multi-object | Track up to 10 objects with distinct colored overlays |
| ✂️ Timeline crop | Drag handles to define start/end; all tracking respects the range |
| 📦 Frame export | Extract frames as `.jpg` + LabelMe `.json` + YOLO `.txt` at any FPS |
| 🤖 YOLO training | Merge datasets, configure, and train YOLOv8 directly in the browser |
| 💾 Draft saving | Sessions auto-saved — resume incomplete projects anytime |
| 🎛️ Model selection | Switch between SAM2 Tiny / Small / Base+ / Large |

---

## :computer: Get Started

### 🍎 macOS (Apple Silicon / Intel)

**Prerequisites:** [Homebrew](https://brew.sh), Python 3.11, Node.js, ffmpeg, Yarn

```bash
# Step 1 — Install dependencies
brew install python@3.11 node ffmpeg git
npm install -g yarn

# Step 2 — Clone the repo
git clone git@gitlab.com:superuser.surveillance/sam2_labelme.git
cd sam2_labelme
git checkout mac

# Step 3 — Python virtual environment
python3.11 -m venv venv
source venv/bin/activate
pip install -e ".[demo]"

# Step 4 — Frontend
cd demo/frontend && yarn install && cd ../..

# Step 5 — Run
chmod +x run-demo.sh
./run-demo.sh
```

✅ Browser opens automatically → **http://localhost:7262**

> **Note:** macOS uses Apple MPS (Metal GPU) automatically for faster inference. No NVIDIA GPU needed.

---

### 🐧 Ubuntu / Linux

**Prerequisites:** Python 3.11, Node.js 20, ffmpeg, Yarn

```bash
# Step 1 — Install system dependencies
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3-pip ffmpeg git build-essential

# Step 2 — Install Node.js 20 + Yarn
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
npm install -g yarn

# Step 3 — Clone the repo
git clone git@gitlab.com:superuser.surveillance/sam2_labelme.git
cd sam2_labelme
git checkout ubuntu

# Step 4 — Python virtual environment
python3.11 -m venv venv
source venv/bin/activate
pip install -e ".[demo]"

# Step 5 — Frontend
cd demo/frontend && yarn install && cd ../..

# Step 6 — Run
chmod +x run-demo.sh
./run-demo.sh
```

✅ Open browser → **http://localhost:7262**

> **Note:** For GPU acceleration, ensure CUDA drivers are installed. The app runs on CPU if no GPU is detected.

---

### 🪟 Windows

**Prerequisites:** Python 3.11, Node.js 18+, ffmpeg (in PATH), Git, Yarn

```powershell
# Step 1 — Install dependencies (PowerShell as Administrator)
winget install Python.Python.3.11
winget install OpenJS.NodeJS.LTS
winget install Gyan.FFmpeg
winget install Git.Git
# Restart PowerShell after this step

# Step 2 — Install Yarn
npm install -g yarn

# Step 3 — Clone the repo
git clone git@gitlab.com:superuser.surveillance/sam2_labelme.git
cd sam2_labelme
git checkout windows

# Step 4 — Python virtual environment
python -m venv venv
venv\Scripts\activate
pip install -e ".[demo]"

# Step 5 — Frontend
cd demo\frontend
yarn install
cd ..\..

# Step 6 — Run
powershell -ExecutionPolicy Bypass -File run-demo.ps1
```

✅ Browser opens automatically → **http://localhost:7262**

> **Note:** Add `ffmpeg` to your system PATH after installing. Restart terminal to apply.

---

## :world_map: How It Works

### Step 1 — Upload & Track

1. Open **http://localhost:7262**
2. Upload a video (up to 5 min, 250 MB — `.mp4` / `.mov`)
3. Click **"+ Create New Project"**
4. Set the crop range using the timeline handles *(optional)*
5. Click any object in the video → SAM2 segments it instantly
6. Press **"Track"** → mask propagates across all frames in the crop range

### Step 2 — Export Frames

1. Open the completed project card → click **"Extract Frames"**
2. Select FPS (0.5 – 24)
3. Each frame is saved as:

```
frame_000001.jpg    ← image
frame_000001.json   ← LabelMe rectangle annotation
frame_000001.txt    ← YOLO format (normalized bbox)
classes.txt         ← class names
```

4. Click **"Convert to YOLO"** to generate a ready-to-train dataset:

```
YOLODataset/
├── images/
│   ├── train/
│   └── val/
├── labels/
│   ├── train/
│   └── val/
├── classes.txt
└── dataset.yaml
```

### Step 3 — Train YOLO

1. Click **"🎯 Train YOLO Model"** from the home page
2. Select one or more `YOLODataset` folders
3. Click **"Merge Datasets"**
4. Configure: `imgsz` · `epochs` · model size (n / s / m / l / x)
5. Click **"🚀 Start Training"** — live log streams to UI
6. `best.pt` saved inside the merged dataset folder

---

## :brain: Models

SAM2 checkpoints are stored in `checkpoints/`:

| Model | File | Size | Speed | Accuracy |
|-------|------|------|-------|----------|
| Tiny | `sam2.1_hiera_tiny.pt` | 38 MB | ⚡⚡⚡ | ★★☆ |
| Small | `sam2.1_hiera_small.pt` | 46 MB | ⚡⚡ | ★★★ |
| Base+ | `sam2.1_hiera_base_plus.pt` | 80 MB | ⚡ | ★★★★ |
| Large | `sam2.1_hiera_large.pt` | 224 MB | 🐢 | ★★★★★ |

Switch model by setting `MODEL_SIZE=tiny|small|base_plus|large` in `run-demo.sh`.

---

## :package: Architecture

```
┌──────────────────────────────────────────────────┐
│                   Web Browser                    │
│       React 18 + TypeScript + Relay (GraphQL)    │
│                                                  │
│   ProjectHub → VideoEditor → TrainPage           │
└─────────────────────┬────────────────────────────┘
                      │  HTTP / GraphQL
┌─────────────────────▼────────────────────────────┐
│             Flask Backend  (Python 3.11)         │
│                                                  │
│  SAM2 Model → Tracking → Export → YOLO Train    │
│  (PyTorch)    (GraphQL)   (JSON/MP4) (Ultralytics)│
└──────────────────────────────────────────────────┘
```

---

## :wrench: Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MODEL_SIZE` | `tiny` | SAM2 model size: `tiny` / `small` / `base_plus` / `large` |
| `SAM2_MAX_FRAMES` | `300` | Max frames loaded into memory |
| `VIDEO_ENCODE_FPS` | `10` | Transcoded video FPS |
| `FFMPEG_NUM_THREADS` | `4` | ffmpeg CPU threads |
| `MAX_UPLOAD_VIDEO_DURATION` | `300` | Max video length in seconds |

---

## :sos: Troubleshooting

| Problem | Fix |
|---------|-----|
| `python3.11: not found` | macOS: `brew install python@3.11` · Ubuntu: `sudo apt install python3.11` |
| `ffmpeg: not found` | macOS: `brew install ffmpeg` · Ubuntu: `sudo apt install ffmpeg` · Windows: add to PATH after `winget install` |
| `node: not found` | Restart terminal after Node.js install |
| Port 7262 / 7263 in use | macOS/Ubuntu: `pkill -f "python.*app.py"` · Windows: restart PC |
| Slow tracking | Normal on CPU — use a shorter crop range or switch to `tiny` model |
| Session fails to start | Close other apps to free RAM (8 GB minimum required) |
| SSH: `Permission denied` | Add your SSH public key to GitLab → Profile → SSH Keys |

---

## :clap: Acknowledgements

Built on top of:

- [Segment Anything Model 2 (SAM2)](https://github.com/facebookresearch/sam2) — Meta AI Research
- [Ultralytics YOLOv8](https://github.com/ultralytics/ultralytics)
- [LabelMe](https://github.com/labelmeai/labelme) annotation format

---

## :page_facing_up: License

Apache License 2.0 — see [LICENSE](LICENSE) for details.  
SAM2 model weights are subject to Meta's [model license](https://github.com/facebookresearch/sam2/blob/main/LICENSE).
