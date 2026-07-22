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
<img src="https://img.shields.io/badge/%F0%9F%AA%9F-Windows_10%20%2F%2011-0078D4?style=flat-square" />
<a href="./LICENSE">
  <img src="https://img.shields.io/badge/%F0%9F%93%84-Apache_2.0-22c55e?style=flat-square" />
</a>

</div>

<br/>

> ***SAM2 Tracker*** is a full-stack web application for **interactive video object tracking**, mask annotation, and **YOLO model training** — powered by Meta's [Segment Anything Model 2](https://github.com/facebookresearch/sam2).
> Click on any object in a video → SAM2 tracks it across every frame → export annotations → train a custom YOLOv8 detector. **No code required.**

---

## :movie_camera: Demo

<div align="center">

<img src="./assets/demo.gif" width="80%" alt="SAM2 Tracker Demo"/>

*Two players tracked simultaneously — masks propagated across 72 frames at 10 fps*

</div>

---

## :file_folder: You are on the `windows` branch

```
main
│
├── 🍎  mac      ──→  git checkout mac
├── 🐧  ubuntu   ──→  git checkout ubuntu
└── 🪟  windows  ──→  YOU ARE HERE
```

> This branch is configured for **Windows 10 / 11**. All scripts use PowerShell (`.ps1`). Run PowerShell as **Administrator** for the install steps.

---

## :computer: Setup — Windows

### Prerequisites

| Tool | Install via |
|------|------------|
| Python 3.11 | `winget install Python.Python.3.11` |
| Node.js LTS | `winget install OpenJS.NodeJS.LTS` |
| ffmpeg | `winget install Gyan.FFmpeg` |
| Git | `winget install Git.Git` |
| Yarn | `npm install -g yarn` |

> **Important:** After running `winget` installs, **restart PowerShell** before continuing.

---

### Step 1 — Install dependencies

```powershell
# Run PowerShell as Administrator
winget install Python.Python.3.11
winget install OpenJS.NodeJS.LTS
winget install Gyan.FFmpeg
winget install Git.Git
```

> Restart PowerShell after this step.

### Step 2 — Install Yarn

```powershell
npm install -g yarn
```

### Step 3 — Clone & switch to windows branch

```powershell
git clone git@gitlab.com:superuser.surveillance/sam2_labelme.git
cd sam2_labelme
git checkout windows
```

### Step 4 — Python virtual environment

```powershell
python -m venv venv
venv\Scripts\activate
pip install -e ".[demo]"
```

### Step 5 — Frontend

```powershell
cd demo\frontend
yarn install
cd ..\..
```

### Step 6 — Run

```powershell
powershell -ExecutionPolicy Bypass -File run-demo.ps1
```

✅ Browser opens automatically → **http://localhost:7262**

> **ffmpeg PATH:** After `winget install Gyan.FFmpeg`, add ffmpeg to your system PATH:
> `System Properties → Environment Variables → Path → Add: C:\ProgramData\chocolatey\bin` (or wherever ffmpeg was installed).
> Restart PowerShell to apply.

---

## :rocket: Features

| Feature | Description |
|---------|-------------|
| ⚡ One-click tracking | Click any object — SAM2 segments and tracks it instantly |
| 👥 Multi-object | Track up to 10 objects with colored overlays |
| ✂️ Timeline crop | Drag handles to set start/end range |
| 📦 Frame export | `.jpg` + LabelMe `.json` + YOLO `.txt` at any FPS |
| 🤖 YOLO training | Merge datasets and train YOLOv8 in the browser |
| 💾 Draft saving | Auto-saved sessions — resume anytime |
| 🎛️ Model selection | SAM2 Tiny / Small / Base+ / Large |

---

## :world_map: How It Works

### Step 1 — Upload & Track

1. Open **http://localhost:7262**
2. Upload a video (up to 5 min, 250 MB — `.mp4` / `.mov`)
3. Click **"+ Create New Project"**
4. Set crop range using timeline handles *(optional)*
5. Click any object → SAM2 segments instantly
6. Press **"Track"** → propagates across all frames

### Step 2 — Export Frames

1. Open completed project → **"Extract Frames"**
2. Select FPS (0.5 – 24) → saved as:

```
frame_000001.jpg    ← image
frame_000001.json   ← LabelMe annotation
frame_000001.txt    ← YOLO bbox
classes.txt
```

3. Click **"Convert to YOLO"**:

```
YOLODataset/
├── images\train\   images\val\
├── labels\train\   labels\val\
└── dataset.yaml
```

### Step 3 — Train YOLO

1. Click **"🎯 Train YOLO Model"**
2. Select datasets → **"Merge"** → configure → **"🚀 Start Training"**
3. `best.pt` saved automatically

---

## :brain: Models

| Model | Size | Speed | Accuracy |
|-------|------|-------|----------|
| `sam2.1_hiera_tiny.pt` | 38 MB | ⚡⚡⚡ | ★★☆ |
| `sam2.1_hiera_small.pt` | 46 MB | ⚡⚡ | ★★★ |
| `sam2.1_hiera_base_plus.pt` | 80 MB | ⚡ | ★★★★ |
| `sam2.1_hiera_large.pt` | 224 MB | 🐢 | ★★★★★ |

Set model in `run-demo.ps1`: `MODEL_SIZE=tiny|small|base_plus|large`

---

## :sos: Troubleshooting

| Problem | Fix |
|---------|-----|
| `python: not found` | Reinstall Python 3.11 via `winget`, restart terminal |
| `ffmpeg: not found` | Add ffmpeg to system PATH, restart terminal |
| `yarn: not found` | Run `npm install -g yarn`, restart terminal |
| Port 7262/7263 in use | Restart PC or kill process in Task Manager |
| `venv\Scripts\activate` fails | Run `Set-ExecutionPolicy RemoteSigned` in PowerShell as Admin |
| Slow tracking | Switch to `tiny` model or shorten crop range |
| Session fails | Close other apps — 8 GB RAM minimum |

---

## :clap: Acknowledgements

- [Segment Anything Model 2 (SAM2)](https://github.com/facebookresearch/sam2) — Meta AI Research
- [Ultralytics YOLOv8](https://github.com/ultralytics/ultralytics)
- [LabelMe](https://github.com/labelmeai/labelme) annotation format

---

## :page_facing_up: License

Apache License 2.0 — see [LICENSE](LICENSE) for details.
SAM2 model weights subject to Meta's [model license](https://github.com/facebookresearch/sam2/blob/main/LICENSE).
