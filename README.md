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
<a href="./LICENSE">
  <img src="https://img.shields.io/badge/%F0%9F%93%84-Apache_2.0-22c55e?style=flat-square" />
</a>

</div>

<br/>

> ***QuickLabel*** is a full-stack web application for **interactive video object tracking**, mask annotation, and **YOLO model training** — no code required.
> Upload a video → click any object → tracks across every frame → export annotations → train a custom detector.

***QuickLabel*** is suitable for:
- 🎯 **Surveillance & retail analytics** — track people, vehicles, or products across footage
- 🏷️ **Data annotation** — generate YOLO `.txt` labels automatically from video
- 🤖 **Custom model training** — train a detector directly from the browser with your own data
- 🎬 **Multi-object tracking** — up to 10 objects simultaneously with colored mask overlays

---

## :movie_camera: Demo

<div align="center">

<img src="./assets/demo.gif" width="80%" alt="QuickLabel Demo — Two tennis players tracked with colored mask overlays"/>

*Two players tracked simultaneously — masks propagated across 72 frames at 10 fps*

</div>

---

## :rocket: Features

| Feature | Description |
|---------|-------------|
| ⚡ One-click tracking | Click any object — segments and tracks instantly |
| 👥 Multi-object | Track up to 10 objects with distinct colored overlays |
| ✂️ Timeline crop | Drag handles to define start/end range |
| 📦 Frame export | Extract frames as `.jpg` + YOLO `.txt` at any FPS |
| 🤖 YOLO training | Merge datasets, configure, and train directly in the browser |
| 💾 Draft saving | Sessions auto-saved — resume incomplete projects anytime |
| 🎛️ Model selection | Switch between 4 model sizes (Tiny → Large) |

---

## :file_folder: Branch Structure

This repo has **one branch per operating system**. Clone the branch for your OS:

```
main  (this branch)
│
├── 🍎  mac      ──→  macOS (Apple Silicon / Intel)
├── 🐧  ubuntu   ──→  Ubuntu / Linux
└── 🪟  windows  ──→  Windows 10 / 11
```

| Branch | OS | Switch to |
|--------|----|-----------|
| [`mac`](../../tree/mac) | 🍎 macOS (Apple Silicon / Intel) | `git checkout mac` |
| [`ubuntu`](../../tree/ubuntu) | 🐧 Ubuntu / Linux | `git checkout ubuntu` |
| [`windows`](../../tree/windows) | 🪟 Windows 10 / 11 | `git checkout windows` |

> Each branch contains OS-specific startup scripts and a tailored README with step-by-step setup instructions for that platform.

---

## :computer: Quick Start

### 🍎 macOS → [`mac` branch](../../tree/mac)

```bash
git clone git@gitlab.com:superuser.surveillance/sam2_labelme.git
cd sam2_labelme && git checkout mac
./run-demo.sh
```

### 🐧 Ubuntu / Linux → [`ubuntu` branch](../../tree/ubuntu)

```bash
git clone git@gitlab.com:superuser.surveillance/sam2_labelme.git
cd sam2_labelme && git checkout ubuntu
./run-demo.sh
```

### 🪟 Windows → [`windows` branch](../../tree/windows)

```powershell
git clone git@gitlab.com:superuser.surveillance/sam2_labelme.git
cd sam2_labelme; git checkout windows
.\run-demo.ps1
```

✅ Browser opens → **http://localhost:7262**

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
2. Select FPS (0.5 – 24) → each frame saved as:

```
frame_000001.jpg    ← image
frame_000001.json   ← annotation
frame_000001.txt    ← YOLO format bbox
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

1. Click **"🎯 Train YOLO Model"** from home
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

---

## :sos: Troubleshooting

| Problem | Fix |
|---------|-----|
| `python3.11: not found` | macOS: `brew install python@3.11` · Ubuntu: `sudo apt install python3.11` |
| `ffmpeg: not found` | macOS: `brew install ffmpeg` · Ubuntu: `sudo apt install ffmpeg` · Windows: add to PATH |
| Port 7262/7263 in use | macOS/Ubuntu: `pkill -f "python.*app.py"` · Windows: restart PC |
| Slow tracking | Use shorter crop range or switch to Tiny model |
| Session fails | Close other apps — 8 GB RAM minimum |

---

## :clap: Acknowledgements

- [Segment Anything Model 2 (SAM2)](https://github.com/facebookresearch/sam2) — Meta AI Research
- [Ultralytics YOLOv8](https://github.com/ultralytics/ultralytics)

---

## :book: Citing QuickLabel

If you use QuickLabel in your research or project, please cite:

```bibtex
@software{quicklabel2024,
  title={QuickLabel: Interactive Video Object Tracking and YOLO Training},
  author={pinklotus.ai},
  year={2024},
  url={https://gitlab.com/superuser.surveillance/sam2_labelme}
}
```

---

## :page_facing_up: License

Apache License 2.0 — see [LICENSE](LICENSE) for details.
