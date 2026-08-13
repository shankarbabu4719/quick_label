# Mask Verification Tool - Usage Guide

## మీ masks correctly applied అయ్యాయో verify చేసుకోండి! ✅

### Usage:

```bash
python verify_masks.py <tracking.json> <frames_folder> <output_folder>
```

### Example:

```bash
# Activate venv first
source venv/bin/activate

# Run verification
python verify_masks.py \
  demo/data/exports/my_video/tracking.json \
  demo/data/exports/my_video/frames_1fps_original \
  demo/data/exports/my_video/frames_verified
```

### Steps:

1. **Export your video** from the SAM2 demo with FPS settings
2. **Find the export folder** in `demo/data/exports/your_project_name/`
3. **Run this script** with:
   - `tracking.json` - JSON file with mask data
   - `frames_1fps_original` - Plain frame images
   - `frames_verified` - New folder (will be created) with visualized masks

### Output:

The script will:
- ✅ Read masks from JSON
- ✅ Decode RLE compressed masks
- ✅ Draw colorful overlays on images
- ✅ Add labels to each object
- ✅ Save visualized frames to output folder

### Example Directory Structure:

```
demo/data/exports/
└── my_video/
    ├── tracking.json              # Mask data (input)
    ├── original.mp4               # Original video
    ├── masked.mp4                 # Masked video
    ├── frames_1fps_original/      # Plain frames (input)
    │   ├── frame_000001.jpg
    │   ├── frame_000002.jpg
    │   └── ...
    └── frames_verified/           # Visualized frames (output)
        ├── frame_000001.jpg       # ✨ With masks!
        ├── frame_000002.jpg
        └── ...
```

### Requirements:

The script uses these packages (already installed if you ran `pip install -e ".[interactive-demo]"`):
- PIL (Pillow)
- numpy
- pycocotools
- scipy (optional, for better borders)

### Colors:

Each object gets a unique color:
- Object 0: Blue
- Object 1: Orange
- Object 2: Cyan
- Object 3: Green
- (cycles through 10 colors)

---

## Quick Test:

After you export a project from the demo:

```bash
source venv/bin/activate
python verify_masks.py \
  demo/data/exports/*/tracking.json \
  demo/data/exports/*/frames_*fps_original \
  demo/data/exports/*/frames_verified
```

Replace `*` with your actual project folder name!
