# SAM2 Video Pipeline — Complete Flow

Video upload చేసిన దగ్గర నుండి JSON + masked video download వరకు
ప్రతి step లో ఏం జరుగుతుందో, ఏ format లో save అవుతుందో.

---

## PHASE 1 — VIDEO UPLOAD

```
User selects video file (browser)
           │
           ▼
  Frontend (React)
  UploadOption.tsx
  max size: 70MB, formats: .mp4 / .mov
           │
           │  GraphQL Mutation (multipart/form-data)
           │  uploadVideo(file, start_time_sec, duration_time_sec)
           ▼
  Backend (Python/Flask)
  schema.py → process_video()
           │
           ▼
  ┌─────────────────────────────────────────────┐
  │  1. Video file received as binary           │
  │  2. SHA-256 hash calculate చేస్తారు          │
  │     → filename = {hash}.mp4                │
  │  3. ffmpeg తో transcode చేస్తారు:            │
  │     - max 10 seconds trim                   │
  │     - fixed fps, resolution normalize       │
  │     - single video stream only              │
  │  4. Save చేస్తారు:                           │
  │     demo/data/uploads/{hash}.mp4            │
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
  Frontend video player లో load అవుతుంది
```

---

## PHASE 2 — SESSION START

```
Video load అయిన తర్వాత automatic గా
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
  │  1. UUID generate చేస్తారు → session_id      │
  │  2. SAM2 predictor.init_state() call:        │
  │     - Video file read చేస్తారు               │
  │     - అన్ని frames extract చేస్తారు          │
  │     - Image encoder (ViT) run చేస్తారు       │
  │     - Frame features memory లో store చేస్తారు│
  │  3. session_states dict లో save:             │
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
  Frontend session atom లో store అవుతుంది
  Demo ready — user click చేయవచ్చు
```

---

## PHASE 3 — OBJECT CLICK (POINT ADD)

```
User video frame మీద object click చేస్తారు
           │
           ▼
  Frontend InteractionLayer.tsx
  click coordinates → normalized (0.0 to 1.0)
           │
           │  GraphQL Mutation
           │  addPoints(input: {
           │    sessionId, frameIndex,
           │    objectId, points: [[x,y]],
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
  │  → ఆ frame మీద instant mask calculate        │
  │  → Binary mask (0/1 array) → RLE encode      │
  │                                              │
  │  RLE Format (Run-Length Encoding):           │
  │  {                                           │
  │    "counts": "abc123...",  ← compressed      │
  │    "size": [height, width]                   │
  │  }                                           │
  │                                              │
  │  masks_per_frame[frame_idx] లో store:         │
  │  [{ object_id: 0, mask: {counts, size} }]    │
  └─────────────────────────────────────────────┘
           │
           ▼
  Frontend RLE decode చేసి canvas మీద
  colored overlay గా render చేస్తుంది
```

---

## PHASE 4 — TRACK & PLAY (PROPAGATION)

```
User "Track & Play" button click చేస్తారు
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
  │  SAM2 model అన్ని frames process చేస్తుంది   │
  │                                              │
  │  Direction: BOTH (forward + backward)        │
  │                                              │
  │  ప్రతి frame కి:                              │
  │  1. Object mask calculate చేస్తారు            │
  │  2. RLE encode చేస్తారు                       │
  │  3. masks_per_frame[frame_idx] లో store      │
  │  4. multipart/x-savi-stream గా send చేస్తారు  │
  │                                              │
  │  Stream format (per frame):                  │
  │  {                                           │
  │    frame_index: 5,                           │
  │    results: [{                               │
  │      object_id: 0,                           │
  │      mask: { counts: "...", size: [H,W] }    │
  │    }]                                        │
  │  }                                           │
  └─────────────────────────────────────────────┘
           │
           ▼  (real-time stream)
  Frontend ప్రతి frame receive అయిన వెంటనే
  canvas మీద mask overlay render చేస్తుంది
           │
           ▼
  All frames complete → streamingState = 'full'
  → "Good to go" button కనిపిస్తుంది
```

---

## PHASE 5 — EXPORT (JSON + MASKED VIDEO)

```
User: Good to go → Effects → Next → Download screen
           │
           ├─────────────────┬──────────────────────
           ▼                 ▼
    [Download Video]   [Download Tracking JSON]
           │                 │
           ▼                 ▼

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MASKED VIDEO DOWNLOAD:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Frontend VideoEncoder (WebCodecs API)
  - Canvas frames + mask overlay → MP4 encode
  - Browser Downloads కి save
  - POST /save_masked_video/{session_id}
    binary MP4 → Backend కి send
           │
           ▼
  Backend app.py
  save_masked_video()
  → demo/data/exports/{video_name}/masked.mp4

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JSON DOWNLOAD:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
  Backend disk లో save చేస్తుంది:
  demo/data/exports/{video_name}/tracking.json
  demo/data/exports/{video_name}/original.mp4  ← copy
           │
           ▼
  Browser కి JSON download వస్తుంది: tracking.json
```

---

## DISK లో FILE STRUCTURE

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
                ├── tracking.json          ← mask data (RLE format)
                ├── original.mp4           ← original video copy
                └── masked.mp4             ← video with colored mask overlay
```

---

## RLE MASK FORMAT అంటే ఏమిటి?

```
RLE = Run-Length Encoding

Binary mask (0/1 pixels) ని compress చేసి store చేస్తారు.

Example:
  Actual mask:  000011110000111100001111
  RLE counts:   "4,4,4,4,4,4"  ← 4 zeros, 4 ones, 4 zeros...

JSON లో ఇలా ఉంటుంది:
  {
    "counts": "abc123xyz...",   ← compressed string
    "size": [480, 640]          ← [height, width] of video frame
  }

దీన్ని Python లో decode చేయాలంటే:
  from pycocotools.mask import decode
  import numpy as np

  rle = {"counts": "abc123...", "size": [480, 640]}
  mask = decode(rle)  # → numpy array shape (480, 640), values 0 or 1
```

---

## SUMMARY TABLE

| Phase | Frontend చేసేది | Backend చేసేది | Storage |
|-------|----------------|----------------|---------|
| Upload | File select, GraphQL send | Transcode, SHA256, save | `uploads/{hash}.mp4` |
| Session | startSession() call | init_state, frame features load | RAM (PyTorch tensors) |
| Click | Point coordinates send | Instant mask calculate, RLE encode | RAM `masks_per_frame` |
| Track | /propagate_in_video POST | All frames mask, stream back | RAM `masks_per_frame` |
| Export JSON | GET /export_session | Build JSON, save to disk | `exports/{name}/tracking.json` |
| Export Video | Encode canvas → MP4 | Receive binary, save | `exports/{name}/masked.mp4` |
