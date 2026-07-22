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
<img src="https://img.shields.io/badge/%F0%9F%AA%9F-Windows_10%20%2F%2011-0078D4?style=flat-square" />
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

## :file_folder: You are on the `windows` branch

```
main
│
├── 🍎  mac      ──→  git checkout mac
├── 🐧  ubuntu   ──→  git checkout ubuntu
└── 🪟  windows  ──→  YOU ARE HERE
```

> This branch is configured for **Windows 10 / 11**. All scripts use PowerShell (`.ps1`). Run PowerShell as **Administrator** for install steps.

---

## :computer: Setup — Windows

### Prerequisites

| Tool | Install |
|------|---------|
| Python 3.11 | `winget install Python.Python.3.11` |
| Node.js LTS | `winget install OpenJS.NodeJS.LTS` |
| ffmpeg | `winget install Gyan.FFmpeg` |
| Git | `winget install Git.Git` |
| Yarn | `npm install -g yarn` |

> **Restart PowerShell** after all `winget` installs before continuing.

### Step 1 — Install dependencies

```powershell
# Run as Administrator
winget install Python.Python.3.11
winget install OpenJS.NodeJS.LTS
winget install Gyan.FFmpeg
winget install Git.Git
```

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

> **ffmpeg PATH:** After installing, add ffmpeg's `bin` folder to system PATH manually:
> `System Properties → Environment Variables → Path → New → C:\path\to\ffmpeg\bin`
> Restart PowerShell after adding.

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
YOLODataset\
├── images\train\   images\val\
├── labels\train\   labels\val\
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

Set model: `MODEL_SIZE=tiny|small|base_plus|large` in `run-demo.ps1`

---

## :sos: Troubleshooting

| Problem | Fix |
|---------|-----|
| `python: not found` | Reinstall Python 3.11, check "Add to PATH" during install |
| `ffmpeg: not found` | Add ffmpeg `bin` folder to system PATH, restart terminal |
| `yarn: not found` | `npm install -g yarn`, restart terminal |
| Port 7262/7263 in use | Restart PC or kill process in Task Manager |
| `activate` fails | Run `Set-ExecutionPolicy RemoteSigned` as Admin |
| Slow tracking | Switch to Tiny model or shorten crop range |
| Session fails | Close other apps — 8 GB RAM minimum |

---

## :clap: Acknowledgements

- [Segment Anything Model 2 (SAM2)](https://github.com/facebookresearch/sam2) — Meta AI Research
- [Ultralytics YOLOv8](https://github.com/ultralytics/ultralytics)

---

## :page_facing_up: License

Apache License 2.0 — see [LICENSE](LICENSE) for details.
