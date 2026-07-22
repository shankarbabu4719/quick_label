<div align="center">

<img src="./assets/banner.png" width="100%" alt="SAM2 Tracker Banner"/>

<br/>
<br/>

<a href="https://github.com/facebookresearch/sam2">
  <img src="https://img.shields.io/badge/Built_on-SAM2_Meta_AI-0064e0?style=flat-square&logo=meta" />
</a>
<a href="https://github.com/ultralytics/ultralytics">
  <img src="https://img.shields.io/badge/YOLO-v8_Ultralytics-00b4d8?style=flat-square" />
</a>
<img src="https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white" />
<img src="https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react&logoColor=black" />
<img src="https://img.shields.io/badge/Flask-Backend-000000?style=flat-square&logo=flask" />
<img src="https://img.shields.io/badge/License-Apache_2.0-22c55e?style=flat-square" />

</div>

<br/>

**SAM2 Tracker** is a full-stack web application for interactive video object tracking, mask annotation, and YOLO model training — powered by Meta's [Segment Anything Model 2 (SAM2)](https://github.com/facebookresearch/sam2).

Click on any object in a video → SAM2 tracks it across every frame → export annotations → train a custom YOLOv8 model. No code required.

- **One-click tracking** — click any object, SAM2 segments and tracks it instantly
- **Multi-object support** — track up to 10 objects simultaneously with colored overlays
- **Timeline crop** — drag handles to set start/end range; all tracking and export respect the crop
- **Frame export** — extract frames at any FPS as `.jpg` + LabelMe `.json` + YOLO `.txt`
- **YOLO training** — merge datasets, configure, and train YOLOv8 directly from the browser
- **Project hub** — manage sessions, resume drafts, download exports

---

## Demo

<div align="center">

<img src="./assets/demo.gif" width="80%" alt="SAM2 Tracker Demo — Two tennis players tracked with colored mask overlays"/>

*Two players tracked simultaneously — orange and blue mask overlays propagated across 72 frames*

</div>

---

## Architecture

```
┌─────────────────────────────────────────────┐
│              Web Browser                    │
│    React 18 + TypeScript + Relay GraphQL    │
│                                             │
│  ProjectHub → VideoEditor → TrainPage       │
└──────────────────┬──────────────────────────┘
                   │  HTTP / GraphQL
┌──────────────────▼──────────────────────────┐
│           Flask Backend (Python)            │
│                                             │
│  SAM2 Model → Tracking → Export → YOLO     │
│  (PyTorch)    (GraphQL)  (JSON/MP4) (Ultralytics) │
└─────────────────────────────────────────────┘
```

---

## Quick Start

### macOS (Apple Silicon)

```bash
# 1. Clone
git clone git@gitlab.com:superuser.surveillance/sam2_labelme.git
cd sam2_labelme
git checkout mac

# 2. Python setup
python3.11 -m venv venv
source venv/bin/activate
pip install -e ".[demo]"

# 3. Frontend setup
cd demo/frontend && yarn install && cd ../..

# 4. Run
chmod +x run-demo.sh
./run-demo.sh
```

Browser opens automatically → **http://localhost:7262**

---

### Ubuntu / Linux

```bash
git checkout ubuntu

sudo apt-get install -y python3.11 python3.11-venv ffmpeg nodejs npm
npm install -g yarn

python3.11 -m venv venv
source venv/bin/activate
pip install -e ".[demo]"
cd demo/frontend && yarn install && cd ../..

chmod +x run-demo.sh
./run-demo.sh
```

---

### Windows

```bash
git checkout windows

python -m venv venv
venv\Scripts\activate
pip install -e ".[demo]"
cd demo\frontend && yarn install && cd ..\..

run-demo.bat
```

---

## How It Works

### Step 1 — Upload & Track

1. Open **http://localhost:7262**
2. Upload a video (up to 5 min, 250MB)
3. Click **"+ Create New Project"**
4. Click any object → SAM2 segments it instantly
5. Press **"Track"** → mask propagates across all frames

### Step 2 — Export Frames

1. Open the completed project card
2. Select FPS (0.5 – 24)
3. Click **"Extract Frames"** — saves:

```
frame_000001.jpg    ← image
frame_000001.json   ← LabelMe rectangle format
frame_000001.txt    ← YOLO format (normalized bbox)
classes.txt         ← class names
```

4. Click **"Convert to YOLO"** → generates:

```
YOLODataset/
  images/train/   images/val/
  labels/train/   labels/val/
  dataset.yaml
```

### Step 3 — Train YOLO

1. Click **"🎯 Train YOLO Model"** from the home page
2. Select one or more `YOLODataset` folders
3. Click **"Merge Datasets"**
4. Configure `imgsz`, `epochs`, model size
5. Click **"🚀 Start Training"** — live log streams to UI
6. `best.pt` saved automatically

---

## Models

SAM2 checkpoints live in `checkpoints/`:

| Model | Size | Speed | Accuracy |
|-------|------|-------|----------|
| `sam2.1_hiera_tiny.pt` | 38 MB | ⚡⚡⚡ | ★★☆ |
| `sam2.1_hiera_small.pt` | 46 MB | ⚡⚡ | ★★★ |
| `sam2.1_hiera_base_plus.pt` | 80 MB | ⚡ | ★★★★ |
| `sam2.1_hiera_large.pt` | 224 MB | 🐢 | ★★★★★ |

Set active model with `MODEL_SIZE=tiny|small|base_plus|large` in `run-demo.sh`.

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/extract_frames/<project>` | Extract frames from exported video |
| `POST` | `/labelme2yolo/<project>` | Convert frames to YOLO dataset |
| `GET`  | `/list_yolo_datasets` | List all YOLO datasets |
| `POST` | `/merge_datasets` | Merge selected YOLO datasets |
| `POST` | `/train_yolo` | Start YOLO training |
| `GET`  | `/train_status/<job_id>` | Poll training progress |
| `GET`  | `/list_exports` | List completed projects |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MODEL_SIZE` | `tiny` | SAM2 model: `tiny` / `small` / `base_plus` / `large` |
| `SAM2_MAX_FRAMES` | `300` | Max frames loaded into memory |
| `VIDEO_ENCODE_FPS` | `10` | Transcoded video FPS |
| `FFMPEG_NUM_THREADS` | `4` | ffmpeg CPU threads |
| `MAX_UPLOAD_VIDEO_DURATION` | `300` | Max video length (seconds) |

---

## File Structure

```
sam2_labelme/
├── demo/
│   ├── backend/server/
│   │   ├── app.py              ← Flask API
│   │   ├── inference/
│   │   │   └── predictor.py    ← SAM2 inference wrapper
│   │   └── data/               ← GraphQL schema, store, transcoder
│   └── frontend/src/
│       ├── routes/
│       │   ├── ProjectHubPage.tsx    ← home page
│       │   ├── DemoPage.tsx          ← video editor
│       │   └── TrainPage.tsx         ← YOLO training
│       └── common/components/
├── sam2/                       ← SAM2 model code (Meta AI)
├── assets/
│   ├── banner.png              ← project banner
│   └── demo.gif                ← demo animation
├── checkpoints/                ← SAM2 model weights
├── run-demo.sh                 ← startup script
└── setup.py
```

---

## Requirements

- Python 3.11+
- Node.js 18+ / Yarn
- ffmpeg
- 8 GB RAM minimum (16 GB recommended for Large model)
- GPU optional — runs on CPU and Apple Silicon MPS

---

## Acknowledgements

Built on top of:

- [Segment Anything Model 2 (SAM2)](https://github.com/facebookresearch/sam2) — Meta AI Research
- [Ultralytics YOLOv8](https://github.com/ultralytics/ultralytics)
- [LabelMe](https://github.com/labelmeai/labelme) annotation format

---

## License

Apache License 2.0 — see [LICENSE](LICENSE) for details.  
SAM2 model weights are subject to Meta's [model license](https://github.com/facebookresearch/sam2/blob/main/LICENSE).
