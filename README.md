<div align="center">

<img src="./assets/banner.png" width="100%" alt="QuickLabel — powered by pinklotus.ai"/>

<br/>

<a href="https://github.com/facebookresearch/sam2">
  <img src="https://img.shields.io/badge/%F0%9F%A4%96-Powered_by_SAM2-0064e0?style=flat-square" />
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
<img src="https://img.shields.io/badge/%F0%9F%8D%8E-macOS-silver?style=flat-square" />
<a href="./LICENSE">
  <img src="https://img.shields.io/badge/%F0%9F%93%84-Apache_2.0-22c55e?style=flat-square" />
</a>

</div>

<br/>

> ***QuickLabel*** is a full-stack web application for **interactive video object tracking**, mask annotation, and **YOLO model training** — no code required.
> Upload a video → click any object → tracks across every frame → export annotations → train a custom detector.

---

## :movie_camera: Demo

<div align="center">

<img src="./assets/demo.gif" width="80%" alt="QuickLabel Demo"/>

*Two players tracked simultaneously — masks propagated across 72 frames at 10 fps*

</div>

---

## :file_folder: You are on the `mac` branch

```
main
│
├── 🍎  mac      ──→  YOU ARE HERE
├── 🐧  ubuntu   ──→  git checkout ubuntu
└── 🪟  windows  ──→  git checkout windows
```

> This branch is configured for **macOS (Apple Silicon & Intel)**. Uses Apple MPS (Metal GPU) automatically — no NVIDIA GPU needed.

---

## :computer: Setup — macOS

### Prerequisites

| Tool | Install |
|------|---------|
| Homebrew | `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"` |
| Python 3.11 | `brew install python@3.11` |
| Node.js + Yarn | `brew install node && npm install -g yarn` |
| ffmpeg | `brew install ffmpeg` |
| Git | `brew install git` |

### Step 1 — Install dependencies

```bash
brew install python@3.11 node ffmpeg git
npm install -g yarn
```

### Step 2 — Clone & switch to mac branch

```bash
git clone git@gitlab.com:superuser.surveillance/sam2_labelme.git
cd sam2_labelme
git checkout mac
```

### Step 3 — Python virtual environment

```bash
python3.11 -m venv venv
source venv/bin/activate
pip install -e ".[demo]"
```

### Step 4 — Frontend

```bash
cd demo/frontend && yarn install && cd ../..
```

### Step 5 — Run

```bash
chmod +x run-demo.sh
./run-demo.sh
```

✅ Browser opens automatically → **http://localhost:7262**

> **Apple MPS:** The app uses Apple Silicon GPU automatically via Metal. Tracking is fast even without NVIDIA GPU.

---

## :rocket: Features

| Feature | Description |
|---------|-------------|
| ⚡ One-click tracking | Click any object — segments and tracks instantly |
| 👥 Multi-object | Track up to 10 objects with colored overlays |
| ✂️ Timeline crop | Drag handles to set start/end range |
| 📦 Frame export | `.jpg` + YOLO `.txt` at any FPS |
| 🤖 YOLO training | Merge datasets and train directly in the browser |
| 💾 Draft saving | Auto-saved sessions — resume anytime |
| 🎛️ Model selection | Tiny / Small / Base+ / Large |

---

## :world_map: How It Works

### Step 1 — Upload & Track

1. Open **http://localhost:7262**
2. Upload a video (up to 5 min, 250 MB)
3. Click **"+ Create New Project"**
4. Set crop range using timeline handles *(optional)*
5. Click any object → segments instantly
6. Press **"Track"** → propagates across all frames

### Step 2 — Export Frames

1. Open completed project → **"Extract Frames"**
2. Select FPS (0.5 – 24):

```
frame_000001.jpg    ← image
frame_000001.json   ← annotation
frame_000001.txt    ← YOLO bbox
classes.txt
```

3. Click **"Convert to YOLO"**:

```
YOLODataset/
├── images/train/   images/val/
├── labels/train/   labels/val/
└── dataset.yaml
```

### Step 3 — Train

1. Click **"🎯 Train YOLO Model"**
2. Select datasets → **"Merge"** → configure → **"🚀 Start Training"**
3. `best.pt` saved automatically

---

## :brain: Models

| Model | Size | Speed | Accuracy |
|-------|------|-------|----------|
| Tiny | 38 MB | ⚡⚡⚡ | ★★☆ |
| Small | 46 MB | ⚡⚡ | ★★★ |
| Base+ | 80 MB | ⚡ | ★★★★ |
| Large | 224 MB | 🐢 | ★★★★★ |

Set model: `MODEL_SIZE=tiny|small|base_plus|large` in `run-demo.sh`

---

## :sos: Troubleshooting

| Problem | Fix |
|---------|-----|
| `python3.11: not found` | `brew install python@3.11` |
| `ffmpeg: not found` | `brew install ffmpeg` |
| `node: not found` | `brew install node` |
| Port 7262/7263 in use | `pkill -f "python.*app.py"` |
| Slow tracking | Switch to Tiny model or shorten crop range |
| Session fails | Close other apps — 8 GB RAM minimum |

---

## :clap: Acknowledgements

- [Segment Anything Model 2 (SAM2)](https://github.com/facebookresearch/sam2) — Meta AI Research
- [Ultralytics YOLOv8](https://github.com/ultralytics/ultralytics)

---

## :page_facing_up: License

Apache License 2.0 — see [LICENSE](LICENSE) for details.
