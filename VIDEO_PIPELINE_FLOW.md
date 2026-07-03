# SAM2 Video Pipeline — Complete Flow

From video upload to JSON + masked video download — every step explained,
including what happens internally and what format data is saved in.

---

## PHASE 1 — VIDEO UPLOAD

```
User selects video file (browser)
           │
           ▼
  Frontend (React)
  UploadOption.tsx
  Max size: 70MB, Formats: .mp4 / .mov
           │
           │  GraphQL Mutation (multipart/form-data)
           │  uploadVideo(file, start_time_sec, duration_time_sec)
           ▼
  Backend (Python / Flask)
  schema.py → process_video()
           │
           ▼
  ┌─────────────────────────────────────────────┐
  │  1. Video file received as binary            │
  │  2. SHA-256 hash calculated                  │
  │     → filename = {hash}.mp4                 │
  │  3. Transcoded with ffmpeg:                  │
  │     - Trimmed to max 10 seconds              │
  │     - Fixed fps, resolution normalized       │
  │     - Single video stream only               │
  │  4. Saved to disk:                           │
  │     demo/data/uploads/{hash}.mp4             │
  └─────────────────────────────────────────────┘
           │
           ▼
  Backend returns Video object:
  {
    id, path: "uploads/{hash}.mp4",
    url, width, height
  }
           │
           ▼
  Video loads in the frontend player
```

---

## PHASE 2 — SESSION START

```
Triggered automatically after video loads
           │
           ▼
  Frontend SAM2Model.ts
  startSession(videoPath)
           │
           │  GraphQL Mutation
           │  startSession(input: { path: "uploads/{hash}.mp4" })
           ▼
  Backend predictor.py
  InferenceAPI.start_session()
           │
           ▼
  ┌─────────────────────────────────────────────┐
  │  1. UUID generated → session_id              │
  │  2. SAM2 predictor.init_state() called:      │
  │     - Video file read                        │
  │     - All frames extracted                   │
  │     - Image encoder (ViT) runs on each frame │
  │     - Frame features stored in RAM           │
  │  3. Session stored in session_states dict:   │
  │     {                                        │
  │       session_id: {                          │
  │         "state": inference_state,  ← PyTorch │
  │         "masks_per_frame": {},     ← empty   │
  │         "video_path": "...",                 │
  │         "canceled": False                    │
  │       }                                      │
  │     }                                        │
  └─────────────────────────────────────────────┘
           │
           ▼
  Returns: { sessionId: "uuid-xxxx-xxxx" }
           │
           ▼
  Stored in frontend session atom
  Demo is ready — user can click on objects
```

---

## PHASE 3 — OBJECT CLICK (POINT ADD)

```
User clicks on an object in the video frame
           │
           ▼
  Frontend InteractionLayer.tsx
  Click coordinates → normalized (0.0 to 1.0)
           │
           │  GraphQL Mutation
           │  addPoints(input: {
           │    sessionId, frameIndex,
           │    objectId, points: [[x, y]],
           │    labels: [1],  ← 1=foreground, 0=background
           │    clearOldPoints: true
           │  })
           ▼
  Backend predictor.py
  InferenceAPI.add_points()
           │
           ▼
  ┌─────────────────────────────────────────────┐
  │  SAM2 model.add_new_points_or_box()          │
  │  → Instant mask calculated for that frame    │
  │  → Binary mask (0/1 array) → RLE encoded     │
  │                                              │
  │  RLE Format (Run-Length Encoding):           │
  │  {                                           │
  │    "counts": "abc123...",  ← compressed str  │
  │    "size": [height, width]                   │
  │  }                                           │
  │                                              │
  │  Stored in masks_per_frame[frame_idx]:       │
  │  [{ object_id: 0, mask: {counts, size} }]    │
  └─────────────────────────────────────────────┘
           │
           ▼
  Frontend decodes RLE and renders
  colored overlay on canvas
```

---

## PHASE 4 — TRACK & PLAY (PROPAGATION)

```
User clicks "Track & Play" button
           │
           ▼
  Frontend SAM2Model.ts
  streamMasks(frameIndex)
           │
           │  POST /propagate_in_video
           │  { session_id, start_frame_index: 0 }
           ▼
  Backend app.py → predictor.propagate_in_video()
           │
           ▼
  ┌─────────────────────────────────────────────┐
  │  SAM2 model processes every frame            │
  │                                              │
  │  Direction: BOTH (forward + backward)        │
  │                                              │
  │  For each frame:                             │
  │  1. Object mask calculated                   │
  │  2. RLE encoded                              │
  │  3. Stored in masks_per_frame[frame_idx]     │
  │  4. Sent as multipart/x-savi-stream          │
  │                                              │
  │  Stream format (per frame):                  │
  │  {                                           │
  │    frame_index: 5,                           │
  │    results: [{                               │
  │      object_id: 0,                           │
  │      mask: { counts: "...", size: [H, W] }   │
  │    }]                                        │
  │  }                                           │
  └─────────────────────────────────────────────┘
           │
           ▼  (real-time stream)
  Frontend renders mask overlay on canvas
  for each frame as it arrives
           │
           ▼
  All frames complete → streamingState = 'full'
  → "Good to go" button appears
```

---

## PHASE 5 — EXPORT (JSON + MASKED VIDEO)

```
User flow: Good to go → Effects → Next → Download screen
           │
           ├─────────────────────┬────────────────────────
           ▼                     ▼
    [Download Video]     [Download Tracking JSON]
           │                     │
           ▼                     ▼

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MASKED VIDEO DOWNLOAD:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Frontend VideoEncoder (WebCodecs API)
  - Canvas frames + mask overlay → MP4 encoded
  - Saved to browser Downloads folder
  - POST /save_masked_video/{session_id}
    Binary MP4 sent to backend
           │
           ▼
  Backend app.py
  save_masked_video()
  → demo/data/exports/{video_name}/masked.mp4

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JSON DOWNLOAD:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Frontend DownloadJSONOption.tsx
  GET /export_session/{session_id}
           │
           ▼
  Backend app.py → predictor.export_session()
  ┌─────────────────────────────────────────────┐
  │  Builds JSON from session memory:            │
  │  {                                           │
  │    "session_id": "uuid-xxxx",                │
  │    "video_path": "uploads/{hash}.mp4",       │
  │    "num_frames": 75,                         │
  │    "objects": [                              │
  │      { "object_id": 0, "label": "Object 0" }│
  │    ],                                        │
  │    "frames": [                               │
  │      {                                       │
  │        "frame_index": 0,                     │
  │        "masks": [{                           │
  │          "object_id": 0,                     │
  │          "mask": {                           │
  │            "counts": "RLE_string_here",      │
  │            "size": [480, 640]  ← [H, W]     │
  │          }                                   │
  │        }]                                    │
  │      },                                      │
  │      ... (every tracked frame)               │
  │    ]                                         │
  │  }                                           │
  └─────────────────────────────────────────────┘
           │
           ▼
  Backend saves to disk:
  demo/data/exports/{video_name}/tracking.json
  demo/data/exports/{video_name}/original.mp4  ← copy of original
           │
           ▼
  Browser downloads: tracking.json
```

---

## DISK FILE STRUCTURE

```
sam2/
└── demo/
    └── data/
        ├── uploads/
        │   └── {sha256hash}.mp4          ← uploaded + transcoded video
        │
        ├── gallery/
        │   └── 01_dog.mp4, etc.          ← default demo videos
        │
        └── exports/
            └── {video_name}/
                ├── tracking.json          ← mask data in RLE format
                ├── original.mp4           ← copy of the original video
                └── masked.mp4             ← video with colored mask overlay
```

---

## WHAT IS RLE MASK FORMAT?

```
RLE = Run-Length Encoding

A binary mask (0/1 per pixel) is compressed and stored as a string.

Example:
  Actual mask:  000011110000111100001111
  RLE counts:   "4,4,4,4,4,4"  ← 4 zeros, 4 ones, 4 zeros...

In the JSON it looks like:
  {
    "counts": "abc123xyz...",   ← compressed string
    "size": [480, 640]          ← [height, width] of video frame
  }

To decode it in Python:
  from pycocotools.mask import decode
  import numpy as np

  rle = {"counts": "abc123...", "size": [480, 640]}
  mask = decode(rle)  # → numpy array shape (480, 640), values 0 or 1
```

---

## SUMMARY TABLE

| Phase | Frontend | Backend | Stored |
|-------|----------|---------|--------|
| Upload | Select file, send via GraphQL | Transcode, SHA256, save | `uploads/{hash}.mp4` |
| Session Start | Call startSession() | Load frames, run image encoder | RAM (PyTorch tensors) |
| Object Click | Send point coordinates | Calculate instant mask, RLE encode | RAM `masks_per_frame` |
| Track & Play | POST to /propagate_in_video | Process all frames, stream back | RAM `masks_per_frame` |
| Export JSON | GET /export_session | Build JSON from RAM, save to disk | `exports/{name}/tracking.json` |
| Export Video | Encode canvas to MP4 | Receive binary, save to disk | `exports/{name}/masked.mp4` |
