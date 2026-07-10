# Copyright (c) Meta Platforms, Inc. and affiliates.
# All rights reserved.
# This source code is licensed under the license found in the
# LICENSE file in the root directory of this source tree.

import logging
import os
from pathlib import Path
from typing import Any, Generator

from app_conf import (
    GALLERY_PATH,
    GALLERY_PREFIX,
    POSTERS_PATH,
    POSTERS_PREFIX,
    UPLOADS_PATH,
    UPLOADS_PREFIX,
    EXPORTS_PATH,
    EXPORTS_PREFIX,
    DRAFTS_PATH,
    DRAFTS_PREFIX,
    DATA_PATH,
)
from data.loader import preload_data
from data.schema import schema
from data.store import set_videos
from flask import Flask, make_response, Request, request, Response, send_from_directory
from flask_cors import CORS
from inference.data_types import PropagateDataResponse, PropagateInVideoRequest
from inference.multipart import MultipartResponseBuilder
from inference.predictor import InferenceAPI
from strawberry.flask.views import GraphQLView

logger = logging.getLogger(__name__)

app = Flask(__name__)
cors = CORS(app, supports_credentials=True)

videos = preload_data()
set_videos(videos)

inference_api = InferenceAPI()


@app.route("/healthy")
def healthy() -> Response:
    return make_response("OK", 200)


@app.route("/session_progress/<session_id>", methods=["GET"])
def session_progress(session_id: str) -> Response:
    """Return session loading progress (0.0 to 1.0)"""
    try:
        session = inference_api._InferenceAPI__get_session(session_id)
        state = session.get("state", {})
        num_frames = state.get("num_frames", 0) if isinstance(state, dict) else getattr(state, "num_frames", 0)
        loaded = session.get("frames_loaded", num_frames)
        progress = min(1.0, loaded / num_frames) if num_frames > 0 else 0.0
        return make_response({"progress": progress, "num_frames": num_frames, "loaded": loaded}, 200)
    except RuntimeError:
        # Session loading or not found
        return make_response({"progress": 0.0, "num_frames": 0, "loaded": 0}, 200)
    except Exception as e:
        return make_response({"progress": 0.0, "error": str(e)}, 200)


@app.route("/get_model", methods=["GET"])
def get_model() -> Response:
    """Return current model size."""
    from app_conf import MODEL_SIZE
    return make_response({"model": MODEL_SIZE}, 200)


@app.route("/set_model", methods=["POST"])
def set_model() -> Response:
    """
    Change the active model size and restart the inference API.
    Body: { "model": "tiny" | "small" | "base_plus" }
    This reloads the predictor in-place — no server restart needed.
    """
    import json, threading

    body = request.get_json(force=True) or {}
    new_model = body.get("model", "tiny")
    allowed = {"tiny", "small", "base_plus", "large"}
    if new_model not in allowed:
        return make_response({"error": f"Invalid model. Choose from: {allowed}"}, 400)

    def reload():
        import os
        os.environ["MODEL_SIZE"] = new_model
        # Reload the inference API with the new model
        global inference_api
        try:
            inference_api = InferenceAPI()
            logger.info(f"Model reloaded: {new_model}")
        except Exception as e:
            logger.error(f"Failed to reload model: {e}")

    threading.Thread(target=reload, daemon=True).start()
    return make_response({"success": True, "model": new_model}, 200)


@app.route(f"/{GALLERY_PREFIX}/<path:path>", methods=["GET"])
def send_gallery_video(path: str) -> Response:
    try:
        return send_from_directory(
            GALLERY_PATH,
            path,
        )
    except:
        raise ValueError("resource not found")


@app.route(f"/{POSTERS_PREFIX}/<path:path>", methods=["GET"])
def send_poster_image(path: str) -> Response:
    try:
        return send_from_directory(
            POSTERS_PATH,
            path,
        )
    except:
        raise ValueError("resource not found")


@app.route(f"/{UPLOADS_PREFIX}/<path:path>", methods=["GET"])
def send_uploaded_video(path: str):
    try:
        return send_from_directory(
            UPLOADS_PATH,
            path,
        )
    except:
        raise ValueError("resource not found")


def _get_session_export_folder(session_id: str, create_new: bool = False) -> Path:
    """
    Get (and create) the export folder for a session.
    - create_new=True: creates a new folder (on first export_session call)
    - create_new=False: returns the already-assigned folder for this session
    Folder name = video filename without extension.
    If folder already exists on create_new, append _2, _3, etc.
    """
    import re
    session = inference_api._InferenceAPI__get_session(session_id)

    # Return cached folder if already assigned
    if "export_folder" in session and not create_new:
        folder = Path(session["export_folder"])
        os.makedirs(folder, exist_ok=True)
        return folder

    video_path = session.get("video_path", "")
    raw_name = os.path.splitext(os.path.basename(video_path))[0]
    safe_name = re.sub(r"[^a-zA-Z0-9_\-]", "_", raw_name)[:40] or "export"

    if create_new:
        # Find unique folder name
        export_folder = EXPORTS_PATH / safe_name
        if export_folder.exists():
            counter = 2
            while (EXPORTS_PATH / f"{safe_name}_{counter}").exists():
                counter += 1
            export_folder = EXPORTS_PATH / f"{safe_name}_{counter}"
    else:
        export_folder = EXPORTS_PATH / safe_name

    os.makedirs(export_folder, exist_ok=True)
    # Cache folder in session so save_masked_video uses same folder
    session["export_folder"] = str(export_folder)
    return export_folder


@app.route("/export_session/<session_id>", methods=["GET"])
def export_session(session_id: str) -> Response:
    import json
    import shutil

    try:
        # Optional crop range from query params
        start_frame = request.args.get("start_frame", type=int, default=None)
        end_frame = request.args.get("end_frame", type=int, default=None)

        try:
            export_data = inference_api.export_session(
                session_id, start_frame=start_frame, end_frame=end_frame
            )
            export_folder = _get_session_export_folder(session_id, create_new=True)

            # 1. Save tracking JSON
            json_path = export_folder / "tracking.json"
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(export_data, f, ensure_ascii=False, indent=2)
            logger.info(f"Saved tracking JSON to {json_path}")

            # 2. Copy original video into the export folder
            video_path = export_data.get("video_path", "")
            if video_path and os.path.isfile(video_path):
                dest = export_folder / "original.mp4"
                if not dest.exists():
                    shutil.copy2(video_path, dest)

            # 3. Delete any draft for this session (project is now complete)
            _delete_draft_for_session(session_id)

        except RuntimeError:
            # Session expired — try to serve from disk
            export_data = _load_export_from_disk(session_id, start_frame, end_frame)
            if export_data is None:
                return make_response("Session expired and no export found on disk", 404)

        # Return JSON as download to browser
        response = make_response(json.dumps(export_data, ensure_ascii=False, indent=2))
        response.headers["Content-Type"] = "application/json"
        response.headers["Content-Disposition"] = "attachment; filename=tracking.json"
        return response

    except Exception as e:
        logger.error(f"Error exporting session {session_id}: {e}")
        return make_response(f"Error exporting session: {e}", 500)


def _load_export_from_disk(session_id: str, start_frame=None, end_frame=None):
    """
    Fallback: load tracking.json from the most recent exports folder.
    Used when the session has expired from RAM but export was already saved.
    """
    import json
    try:
        # Find the most recently modified export folder
        if not EXPORTS_PATH.exists():
            return None
        folders = [f for f in EXPORTS_PATH.iterdir() if f.is_dir()]
        if not folders:
            return None
        # Sort by mtime, newest first
        folders.sort(key=lambda f: f.stat().st_mtime, reverse=True)
        for folder in folders:
            json_path = folder / "tracking.json"
            if json_path.exists():
                with open(json_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                # Apply crop filter if requested
                if start_frame is not None or end_frame is not None:
                    data["frames"] = [
                        fr for fr in data.get("frames", [])
                        if (start_frame is None or fr["frame_index"] >= start_frame)
                        and (end_frame is None or fr["frame_index"] <= end_frame)
                    ]
                logger.info(f"Served tracking.json from disk: {json_path}")
                return data
        return None
    except Exception as e:
        logger.error(f"Failed to load export from disk: {e}")
        return None


def _delete_draft_for_session(session_id: str) -> None:
    """
    Delete any draft that matches the given session_id.
    Called when a project is completed (exported to Previous Projects).
    """
    import json
    try:
        for draft_file in DRAFTS_PATH.glob("draft_*.json"):
            try:
                with open(draft_file, "r", encoding="utf-8") as f:
                    draft = json.load(f)
                if draft.get("session_id") == session_id:
                    draft_file.unlink()
                    logger.info(f"Deleted draft {draft_file.name} for completed session {session_id}")
                    break
            except Exception:
                continue
    except Exception as e:
        logger.warning(f"Could not clean up draft for session {session_id}: {e}")



@app.route("/save_masked_video/<session_id>", methods=["POST"])
def save_masked_video(session_id: str) -> Response:
    """
    Receive the masked MP4 (as binary) from the frontend and save it
    into the session's export folder as masked.mp4
    """
    try:
        export_folder = _get_session_export_folder(session_id, create_new=False)
        masked_path = export_folder / "masked.mp4"
        with open(masked_path, "wb") as f:
            f.write(request.data)
        logger.info(f"Saved masked video to {masked_path}")
        return make_response(
            {"success": True, "path": str(masked_path)}, 200
        )
    except Exception as e:
        logger.error(f"Error saving masked video for session {session_id}: {e}")
        return make_response(f"Error saving masked video: {e}", 500)


@app.route("/list_exports", methods=["GET"])
def list_exports() -> Response:
    """
    List all previous export projects.
    Returns: [{
        name: folder_name,
        hasJson: bool,
        hasOriginal: bool,
        hasMasked: bool,
        thumbnailUrl: url to poster/thumbnail
    }]
    """
    try:
        exports = []
        if not EXPORTS_PATH.exists():
            return make_response({"exports": []}, 200)

        for folder in EXPORTS_PATH.iterdir():
            if not folder.is_dir():
                continue

            export_info = {
                "name": folder.name,
                "hasJson": (folder / "tracking.json").exists(),
                "hasOriginal": (folder / "original.mp4").exists(),
                "hasMasked": (folder / "masked.mp4").exists(),
                "thumbnailUrl": None,
                "displayName": None,
            }

            # Get display name from tracking.json video_path
            json_path = folder / "tracking.json"
            if json_path.exists():
                try:
                    import json as _json
                    with open(json_path, "r") as jf:
                        td = _json.load(jf)
                    vp = td.get("video_path", "")
                    if vp:
                        base = os.path.splitext(os.path.basename(vp))[0]
                        # If it looks like a hash (long hex), use folder name truncated
                        if len(base) > 20 and all(c in '0123456789abcdef' for c in base.lower()):
                            export_info["displayName"] = f"Project {folder.name[:8]}..."
                        else:
                            export_info["displayName"] = base[:30]
                except Exception:
                    pass

            if export_info["displayName"] is None:
                export_info["displayName"] = f"Project {folder.name[:8]}..."

            # Generate thumbnail URL if original video exists
            if export_info["hasOriginal"]:
                export_info["thumbnailUrl"] = f"{EXPORTS_PREFIX}/{folder.name}/original.mp4"

            exports.append(export_info)

        # Sort by modification time (newest first)
        exports.sort(key=lambda x: (EXPORTS_PATH / x["name"]).stat().st_mtime, reverse=True)

        return make_response({"exports": exports}, 200)
    except Exception as e:
        logger.error(f"Error listing exports: {e}")
        return make_response({"error": str(e)}, 500)


@app.route(f"/{EXPORTS_PREFIX}/<path:path>", methods=["GET"])
def send_exported_file(path: str):
    try:
        # Force download for JSON files
        if path.endswith('.json'):
            file_path = EXPORTS_PATH / path
            if not file_path.exists():
                return make_response("Not found", 404)
            response = make_response(file_path.read_text(encoding='utf-8'))
            response.headers["Content-Type"] = "application/json"
            response.headers["Content-Disposition"] = f"attachment; filename={file_path.name}"
            return response
        # Serve video/other files normally
        return send_from_directory(str(EXPORTS_PATH), path)
    except Exception as e:
        logger.error(f"Error serving export file {path}: {e}")
        return make_response("resource not found", 404)


# ---------------------------------------------------------------------------
# EXTRACT FRAMES — extract frames from a completed export project
# ---------------------------------------------------------------------------

@app.route("/extract_frames/<project_name>", methods=["POST"])
def extract_frames(project_name: str) -> Response:
    """
    Extract frames from a completed export project.
    Body JSON: { "fps": float, "source": "original" | "masked" }

    - source="original": extracts frames from original.mp4, saves JPG + JSON
    - source="masked":   extracts from original.mp4 then applies mask color
                         overlays using tracking.json + PIL (avoids broken
                         masked.mp4 duration metadata from browser WebCodecs)

    Saves to exports/<project_name>/frames_<fps>fps_<source>/
    """
    import json, shutil, subprocess, random

    try:
        body = request.get_json(force=True) or {}
        fps = float(body.get("fps", 1.0))
        source = body.get("source", "original")
        # val_size: 0.0 → no split (flat folder), 0.0 < val_size < 1.0 → YOLO dataset split
        val_size = float(body.get("val_size", 0.0))
        val_size = max(0.0, min(0.9, val_size))   # clamp to [0, 0.9]

        project_folder = EXPORTS_PATH / project_name
        if not project_folder.exists() or not project_folder.is_dir():
            return make_response({"error": "Project not found"}, 404)

        # Always extract from original.mp4 — masked.mp4 has broken duration
        # metadata (browser WebCodecs). For "masked" we overlay masks via PIL.
        video_path = project_folder / "original.mp4"
        if not video_path.exists():
            return make_response({"error": "original.mp4 not found for this project"}, 404)

        ffmpeg = shutil.which("ffmpeg")
        if not ffmpeg:
            return make_response({"error": "ffmpeg not found on this system"}, 500)

        # ── Load tracking.json ────────────────────────────────────────────────
        tracking_data: dict = {}
        objects_list: list = []
        num_tracking_frames = 0
        tracking_json_path = project_folder / "tracking.json"
        if tracking_json_path.exists():
            try:
                with open(tracking_json_path, "r", encoding="utf-8") as tf:
                    td = json.load(tf)
                objects_list = td.get("objects", [])
                num_tracking_frames = td.get("num_frames", 0)
                for frame in td.get("frames", []):
                    tracking_data[frame["frame_index"]] = {
                        "frame_index": frame["frame_index"],
                        "objects": objects_list,
                        "masks": frame.get("masks", []),
                    }
                if not num_tracking_frames and tracking_data:
                    num_tracking_frames = max(tracking_data.keys()) + 1
            except Exception as e:
                logger.warning(f"Could not load tracking.json: {e}")

        # ── Compute actual encode fps from video duration + frame count ───────
        # transcoder.py uses dynamic fps (4-24fps based on MAX_FRAMES/duration)
        # We must know the real encode fps to correctly map frame index → tracking index
        encode_fps = 24.0
        try:
            ffprobe = shutil.which("ffprobe")
            if ffprobe and num_tracking_frames > 0:
                probe = subprocess.run(
                    [ffprobe, "-v", "quiet", "-show_entries", "format=duration",
                     "-of", "json", str(video_path)],
                    capture_output=True, text=True
                )
                probe_data = json.loads(probe.stdout)
                video_duration = float(probe_data.get("format", {}).get("duration", 0))
                if video_duration > 0:
                    encode_fps = num_tracking_frames / video_duration
                    logger.info(f"Computed encode_fps={encode_fps:.2f} ({num_tracking_frames} frames / {video_duration:.1f}s)")
        except Exception as e:
            logger.warning(f"Could not compute encode_fps: {e}")

        # ── Create output folder ──────────────────────────────────────────────
        fps_label = str(fps).rstrip('0').rstrip('.') if '.' in str(fps) else str(fps)
        yolo_suffix = f"_yolo_val{int(val_size*100)}" if val_size > 0 else ""
        frames_dir_name = f"frames_{fps_label}fps_{source}{yolo_suffix}"
        frames_dir = project_folder / frames_dir_name

        if frames_dir.exists():
            if val_size > 0:
                # YOLO split: check images/train or images/val
                existing_jpgs = sorted((frames_dir / "images" / "train").glob("*.jpg")) if (frames_dir / "images" / "train").exists() else []
                existing_jpgs += sorted((frames_dir / "images" / "val").glob("*.jpg")) if (frames_dir / "images" / "val").exists() else []
            else:
                existing_jpgs = sorted(frames_dir.glob("*.jpg"))
            if existing_jpgs:
                return make_response({
                    "success": True,
                    "frames_dir": frames_dir_name,
                    "frame_count": len(existing_jpgs),
                    "already_exists": True,
                }, 200)
            else:
                shutil.rmtree(frames_dir)

        os.makedirs(frames_dir, exist_ok=True)

        # ── Extract frames from original.mp4 ─────────────────────────────────
        output_pattern = str(frames_dir / "frame_%06d.jpg")
        cmd = [
            ffmpeg, "-y",
            "-i", str(video_path),
            "-vf", f"fps={fps}",
            "-q:v", "2",
            "-threads", "2",
            output_pattern,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            shutil.rmtree(frames_dir, ignore_errors=True)
            logger.error(f"ffmpeg extract_frames failed: {result.stderr}")
            return make_response({"error": "Frame extraction failed", "details": result.stderr[-500:]}, 500)

        frame_files = sorted(frames_dir.glob("*.jpg"))
        frame_count = len(frame_files)
        logger.info(f"Extracted {frame_count} frames to {frames_dir}")

        # ── Helper functions (defined before use) ────────────────────────────

        def rle_to_bbox(rle_counts, size: list) -> list:
            """
            Convert COCO RLE mask to [x, y, w, h] bounding box.
            counts can be a decoded string (as stored by SAM2 predictor) or bytes.
            size = [height, width].
            """
            if not rle_counts or not size or len(size) < 2:
                return []
            try:
                from pycocotools.mask import toBbox
                bbox = toBbox({"counts": rle_counts, "size": list(size)})
                return [round(float(v), 2) for v in bbox]
            except Exception as _e:
                logger.warning(f"rle_to_bbox (pycocotools) failed: {_e}")

            # Pure-Python fallback: decode RLE run-lengths (column-major order)
            try:
                h, w = int(size[0]), int(size[1])
                counts = rle_counts
                if isinstance(counts, (bytes, bytearray)):
                    counts = counts.decode("utf-8", errors="replace")
                if not isinstance(counts, str):
                    return []
                runs = list(map(int, counts.split()))
                min_row, max_row = h, -1
                min_col, max_col = w, -1
                pixel = 0
                value = 0
                for run in runs:
                    if value == 1 and run > 0:
                        col_s = pixel // h
                        row_s = pixel % h
                        col_e = (pixel + run - 1) // h
                        row_e = (pixel + run - 1) % h
                        min_col = min(min_col, col_s)
                        max_col = max(max_col, col_e)
                        if col_s == col_e:
                            min_row = min(min_row, row_s)
                            max_row = max(max_row, row_e)
                        else:
                            min_row = min(min_row, row_s, 0)
                            max_row = max(max_row, row_e, h - 1)
                    pixel += run
                    value = 1 - value
                if max_col < 0:
                    return []
                return [min_col, min_row, max_col - min_col + 1, max_row - min_row + 1]
            except Exception as _e2:
                logger.warning(f"rle_to_bbox (pure-python) failed: {_e2}")
                return []

        def bbox_to_points(bbox: list) -> list:
            """Convert [x, y, w, h] to LabelMe rectangle [[x1,y1],[x2,y2]]."""
            if not bbox or len(bbox) < 4:
                return []
            x, y, w, h = bbox
            return [[round(x, 2), round(y, 2)], [round(x + w, 2), round(y + h, 2)]]


        # Build label lookup: object_id → label
        label_map = {obj["object_id"]: obj.get("label", f"object_{obj['object_id']}") for obj in objects_list}

        # ── Draw bounding boxes on frames for "masked" source ────────────────
        if source == "masked" and tracking_data:
            try:
                from PIL import Image, ImageDraw, ImageFont

                # Same 10 colors as the frontend THEME_COLORS
                COLORS = [
                    (56, 128, 243),   # #3880F3
                    (240, 170,  25),  # #F0AA19
                    (  0, 210, 190),  # #00D2BE
                    ( 40, 210,  50),  # #28D232
                    (135, 115, 255),  # #8773FF
                    (  0, 200, 240),  # #00C8F0
                    (250, 135,  25),  # #FA8719
                    (230,  25,  59),  # #E6193B
                    (250, 125, 200),  # #FA7DC8
                    (160, 255,  80),  # #A0FF50
                ]
                BOX_ALPHA  = 50  # fill transparency (0-255)
                LINE_WIDTH = 3   # border thickness in pixels

                for i, frame_file in enumerate(frame_files):
                    extracted_sec = i / fps
                    track_idx = int(round(extracted_sec * encode_fps))
                    if tracking_data:
                        track_idx = min(track_idx, max(tracking_data.keys()))

                    frame_data = tracking_data.get(track_idx)
                    if not frame_data or not frame_data.get("masks"):
                        continue  # no objects in this frame — keep plain image

                    img = Image.open(frame_file).convert("RGB")
                    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
                    draw = ImageDraw.Draw(overlay)
                    img_draw = ImageDraw.Draw(img)

                    for mask_entry in frame_data["masks"]:
                        obj_id = mask_entry.get("object_id", 0)
                        rle    = mask_entry.get("mask", {})
                        if not rle:
                            continue

                        bbox = rle_to_bbox(rle.get("counts", ""), rle.get("size", []))
                        if not bbox or len(bbox) < 4:
                            continue

                        bx, by, bw, bh = bbox
                        x0, y0 = int(bx), int(by)
                        x1, y1 = int(bx + bw), int(by + bh)
                        color  = COLORS[obj_id % len(COLORS)]
                        label  = label_map.get(obj_id, f"object_{obj_id}")

                        # Semi-transparent fill
                        draw.rectangle([x0, y0, x1, y1], fill=(*color, BOX_ALPHA))

                        # Solid border
                        for t in range(LINE_WIDTH):
                            img_draw.rectangle(
                                [x0 + t, y0 + t, x1 - t, y1 - t],
                                outline=color,
                            )

                        # Label chip (top-left corner of box)
                        font_size = max(14, img.height // 30)
                        try:
                            font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
                        except Exception:
                            font = ImageFont.load_default()

                        tb = font.getbbox(label) if hasattr(font, 'getbbox') else (0, 0, len(label) * 8, font_size)
                        tw = tb[2] - tb[0] + 8
                        th = tb[3] - tb[1] + 6
                        lx0 = x0
                        ly0 = max(0, y0 - th)
                        draw.rectangle([lx0, ly0, lx0 + tw, ly0 + th], fill=(*color, 220))
                        draw.text((lx0 + 4, ly0 + 3), label, fill=(255, 255, 255, 255), font=font)

                    # Composite semi-transparent fill + labels onto image
                    composited = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
                    composited.save(str(frame_file), "JPEG", quality=92)

            except ImportError as ie:
                logger.warning(f"PIL not available for bbox draw: {ie}. Saving plain frames.")

        # Build class index: object_id → class_id (0-based, ordered by objects_list)
        class_id_map = {obj["object_id"]: idx for idx, obj in enumerate(objects_list)}

        for i, frame_file in enumerate(frame_files):
            extracted_sec = i / fps
            track_idx = int(round(extracted_sec * encode_fps))
            if tracking_data:
                track_idx = min(track_idx, max(tracking_data.keys()))

            raw = tracking_data.get(track_idx)

            # Get image dimensions
            try:
                from PIL import Image as _PILImg
                with _PILImg.open(str(frame_file)) as _img:
                    img_w, img_h = _img.size
            except Exception:
                img_w, img_h = 1280, 720

            # Build LabelMe format JSON + YOLO txt simultaneously
            shapes = []
            yolo_lines = []

            if raw and raw.get("masks"):
                for mask_entry in raw["masks"]:
                    obj_id = mask_entry.get("object_id", 0)
                    rle    = mask_entry.get("mask", {})
                    label  = label_map.get(obj_id, f"object_{obj_id}")
                    bbox   = rle_to_bbox(rle.get("counts", ""), rle.get("size", []))
                    points = bbox_to_points(bbox)

                    if points:
                        # LabelMe shape
                        shapes.append({
                            "label": label,
                            "points": points,
                            "group_id": None,
                            "description": "",
                            "shape_type": "rectangle",
                            "flags": {},
                        })

                        # YOLO line: class_id x_center y_center width height (normalized)
                        bx, by, bw, bh = bbox
                        x_center = (bx + bw / 2.0) / img_w
                        y_center = (by + bh / 2.0) / img_h
                        w_norm   = bw / img_w
                        h_norm   = bh / img_h
                        class_id = class_id_map.get(obj_id, obj_id)
                        yolo_lines.append(
                            f"{class_id} {x_center:.6f} {y_center:.6f} {w_norm:.6f} {h_norm:.6f}"
                        )

            labelme_json = {
                "version": "5.2.1",
                "flags": {},
                "shapes": shapes,
                "imagePath": frame_file.name,
                "imageData": None,
                "imageHeight": img_h,
                "imageWidth": img_w,
            }

            json_path = frames_dir / (frame_file.stem + ".json")
            with open(json_path, "w", encoding="utf-8") as jf:
                json.dump(labelme_json, jf, indent=2)

            # Write YOLO .txt (empty file when no objects in frame)
            txt_path = frames_dir / (frame_file.stem + ".txt")
            with open(txt_path, "w", encoding="utf-8") as tf:
                tf.write("\n".join(yolo_lines))

        # Write classes.txt — YOLO class name list (index = class_id)
        classes_path = frames_dir / "classes.txt"
        class_names = [
            label_map.get(obj["object_id"], f"object_{obj['object_id']}")
            for obj in objects_list
        ]
        with open(classes_path, "w", encoding="utf-8") as cf:
            cf.write("\n".join(class_names))

        # ── YOLO dataset split (optional) ─────────────────────────────────────
        if val_size > 0 and frame_files:
            # Collect all (jpg, txt) pairs from flat frames_dir
            all_stems = [f.stem for f in sorted(frames_dir.glob("*.jpg"))]
            random.shuffle(all_stems)
            val_count  = max(1, int(round(len(all_stems) * val_size)))
            train_count = len(all_stems) - val_count

            val_stems   = set(all_stems[:val_count])
            train_stems = set(all_stems[val_count:])

            # Create YOLO folder layout
            for split in ("train", "val"):
                os.makedirs(frames_dir / "images" / split, exist_ok=True)
                os.makedirs(frames_dir / "labels" / split, exist_ok=True)

            for stem in all_stems:
                split = "val" if stem in val_stems else "train"
                # Move image
                src_img = frames_dir / f"{stem}.jpg"
                dst_img = frames_dir / "images" / split / f"{stem}.jpg"
                if src_img.exists():
                    shutil.move(str(src_img), str(dst_img))
                # Move label
                src_lbl = frames_dir / f"{stem}.txt"
                dst_lbl = frames_dir / "labels" / split / f"{stem}.txt"
                if src_lbl.exists():
                    shutil.move(str(src_lbl), str(dst_lbl))
                # Remove per-frame LabelMe JSON (not needed in YOLO layout)
                src_json = frames_dir / f"{stem}.json"
                if src_json.exists():
                    src_json.unlink()

            # Move classes.txt into root (YOLO convention)
            # (already written above — nothing to move)

            # Write dataset.yaml
            project_display = project_name  # use raw folder name for portability
            yaml_path = frames_dir / "dataset.yaml"
            yaml_content = (
                f"# YOLO dataset — generated by SAM2 Tracker\n"
                f"# Project : {project_display}\n"
                f"# Source  : {source}  |  FPS: {fps}  |  val: {int(val_size*100)}%\n"
                f"# Frames  : {frame_count} total  |  train: {train_count}  |  val: {val_count}\n"
                f"\n"
                f"path  : .        # dataset root (relative to this yaml)\n"
                f"train : images/train\n"
                f"val   : images/val\n"
                f"\n"
                f"nc: {len(class_names)}\n"
                f"names: {class_names}\n"
            )
            with open(yaml_path, "w", encoding="utf-8") as yf:
                yf.write(yaml_content)

            logger.info(
                f"YOLO split done: {train_count} train / {val_count} val → {frames_dir}"
            )

            return make_response({
                "success"        : True,
                "frames_dir"     : frames_dir_name,
                "frame_count"    : frame_count,
                "train_count"    : train_count,
                "val_count"      : val_count,
                "already_exists" : False,
                "yolo_split"     : True,
            }, 200)

        return make_response({
            "success": True,
            "frames_dir": frames_dir_name,
            "frame_count": frame_count,
            "already_exists": False,
        }, 200)

    except subprocess.TimeoutExpired:
        return make_response({"error": "Frame extraction timed out (>5 min)"}, 500)
    except Exception as e:
        logger.error(f"Error extracting frames for {project_name}: {e}")
        return make_response({"error": str(e)}, 500)

@app.route("/prepare_session", methods=["POST"])
def prepare_session() -> Response:
    """
    Encode a selected range of a raw uploaded video and start a SAM2 session.
    Called after user selects crop range on the frontend.

    Body JSON:
      raw_path:   relative path to raw uploaded file (e.g. "uploads/raw_<hash>.mp4")
      start_sec:  start time in seconds (default 0)
      end_sec:    end time in seconds (default = full video)

    Returns: { "success": bool, "path": str, "session_id": str (placeholder) }
    The actual SAM2 session is started by the existing start_session GraphQL mutation.
    """
    import json, shutil, subprocess

    try:
        # Parse JSON body — handle both content-type variants
        try:
            body = request.get_json(force=True, silent=True) or {}
            if not body:
                body = json.loads(request.data.decode('utf-8') or '{}')
        except Exception:
            body = {}

        raw_path = body.get("raw_path", "")
        start_sec = float(body.get("start_sec", 0))
        end_sec = body.get("end_sec", None)

        if not raw_path:
            return make_response({"error": "raw_path is required"}, 400)

        # Resolve absolute path
        full_raw_path = os.path.join(str(DATA_PATH), raw_path.lstrip("/"))
        if not os.path.isfile(full_raw_path):
            # Try relative to UPLOADS_PATH
            full_raw_path = str(UPLOADS_PATH / os.path.basename(raw_path))
        if not os.path.isfile(full_raw_path):
            return make_response({"error": f"Raw file not found: {raw_path}"}, 404)

        # Duration to encode
        duration_sec = (end_sec - start_sec) if end_sec is not None else None
        if duration_sec is not None and duration_sec <= 0:
            return make_response({"error": "end_sec must be greater than start_sec"}, 400)

        # Cap to MAX_UPLOAD_VIDEO_DURATION
        from app_conf import MAX_UPLOAD_VIDEO_DURATION
        if duration_sec is None or duration_sec > MAX_UPLOAD_VIDEO_DURATION:
            duration_sec = MAX_UPLOAD_VIDEO_DURATION

        # Get encode settings from env (same as transcoder)
        import ast
        from app_conf import FFMPEG_NUM_THREADS
        fps_max = int(os.environ.get("VIDEO_ENCODE_FPS", "10"))
        max_frames = int(os.environ.get("VIDEO_ENCODE_MAX_FRAMES", "300"))
        max_w = int(os.environ.get("VIDEO_ENCODE_MAX_WIDTH", "640"))
        max_h = int(os.environ.get("VIDEO_ENCODE_MAX_HEIGHT", "360"))
        crf = int(os.environ.get("VIDEO_ENCODE_CRF", "28"))
        codec = os.environ.get("VIDEO_ENCODE_CODEC", "libx264")

        # Calculate fps so total frames ≤ max_frames
        actual_duration = duration_sec or 30.0
        ideal_fps = max_frames / actual_duration
        fps = max(4, min(fps_max, int(ideal_fps)))

        ffmpeg = shutil.which("ffmpeg")
        if not ffmpeg:
            return make_response({"error": "ffmpeg not found"}, 500)

        # Output path: same as uploads but without "raw_" prefix
        raw_basename = os.path.basename(full_raw_path)
        encoded_basename = raw_basename.replace("raw_", "", 1)
        encoded_path = str(UPLOADS_PATH / encoded_basename)

        # Encode selected range
        cmd = [
            ffmpeg, "-y",
            "-threads", str(FFMPEG_NUM_THREADS),
            "-ss", str(start_sec),
            "-t", str(duration_sec),
            "-i", full_raw_path,
            "-threads", str(FFMPEG_NUM_THREADS),
            "-vf", f"fps={fps},scale={max_w}:{max_h},setsar=1:1",
            "-c:v", codec,
            "-preset", "ultrafast",
            "-crf", str(crf),
            "-pix_fmt", "yuv420p",
            "-threads", str(FFMPEG_NUM_THREADS),
            encoded_path,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        if result.returncode != 0:
            logger.error(f"prepare_session encode failed: {result.stderr}")
            return make_response({"error": "Encoding failed", "details": result.stderr[-300:]}, 500)

        # Return the encoded video path as "uploads/<filename>" 
        # (relative to DATA_PATH, which is what startSession GraphQL mutation expects)
        rel_path = f"{UPLOADS_PREFIX}/{encoded_basename}"

        return make_response({
            "success": True,
            "path": rel_path,
            "encoded_path": encoded_path,
        }, 200)

    except subprocess.TimeoutExpired:
        return make_response({"error": "Encoding timed out"}, 500)
    except Exception as e:
        logger.error(f"prepare_session error: {e}")
        return make_response({"error": str(e)}, 500)


@app.route("/session_export_info/<session_id>", methods=["GET"])
def session_export_info(session_id: str) -> Response:
    """
    Get the export project_name for an active session.
    Returns: { "project_name": str } or 404 if not exported yet.
    """
    try:
        session = inference_api._InferenceAPI__get_session(session_id)
        export_folder = session.get("export_folder", "")
        if not export_folder:
            return make_response({"error": "Session not exported yet"}, 404)
        project_name = os.path.basename(export_folder)
        return make_response({"project_name": project_name}, 200)
    except RuntimeError:
        return make_response({"error": "Session not found"}, 404)
    except Exception as e:
        return make_response({"error": str(e)}, 500)


@app.route("/frames_status/<project_name>", methods=["GET"])
def frames_status(project_name: str) -> Response:
    """
    List all extracted frame folders for a project.
    Returns: { "extractions": [{ "dir": str, "frame_count": int, "fps": str, "source": str }] }
    """
    try:
        project_folder = EXPORTS_PATH / project_name
        if not project_folder.exists():
            return make_response({"extractions": []}, 200)

        extractions = []
        for d in project_folder.iterdir():
            if d.is_dir() and d.name.startswith("frames_"):
                frames = list(d.glob("*.jpg"))
                # Parse fps and source from folder name: frames_1fps_original
                parts = d.name.split("_")  # ['frames', '1fps', 'original']
                fps_str = parts[1].replace("fps", "") if len(parts) > 1 else "?"
                source_str = parts[2] if len(parts) > 2 else "original"
                extractions.append({
                    "dir": d.name,
                    "frame_count": len(frames),
                    "fps": fps_str,
                    "source": source_str,
                })

        extractions.sort(key=lambda x: x["dir"])
        return make_response({"extractions": extractions}, 200)
    except Exception as e:
        return make_response({"error": str(e)}, 500)


# ---------------------------------------------------------------------------
# DRAFT API  — save / list / delete in-progress sessions
# ---------------------------------------------------------------------------

@app.route("/trim_video/<session_id>", methods=["POST"])
def trim_video(session_id: str) -> Response:
    """
    Trim the session's video to the given frame range using ffmpeg.
    The trimmed video replaces the original in the uploads folder.

    Body JSON: { "start_frame": int, "end_frame": int, "fps": float }
    """
    import json, shutil, subprocess, tempfile

    try:
        body = request.get_json(force=True) or {}
        start_frame = body.get("start_frame", 0)
        end_frame = body.get("end_frame", None)
        # Get video path from session
        session = inference_api._InferenceAPI__get_session(session_id)
        video_path = session.get("video_path", "")
        if not video_path or not os.path.isfile(video_path):
            return make_response({"error": "Video file not found"}, 404)
        # Auto-detect actual video FPS using ffprobe
        ffprobe_bin = shutil.which("ffprobe")
        actual_fps = body.get("fps", 30.0)
        if ffprobe_bin:
            try:
                probe = subprocess.run(
                    [ffprobe_bin, "-v", "quiet", "-show_entries",
                     "stream=r_frame_rate", "-select_streams", "v:0",
                     "-of", "json", video_path],
                    capture_output=True, text=True
                )
                probe_data = json.loads(probe.stdout)
                fps_str = probe_data.get("streams", [{}])[0].get("r_frame_rate", "30/1")
                num, den = fps_str.split("/")
                actual_fps = float(num) / float(den)
            except Exception:
                pass
        start_sec = start_frame / actual_fps
        duration_sec = ((end_frame - start_frame) / actual_fps) if end_frame is not None else None

        ffmpeg = shutil.which("ffmpeg")
        if not ffmpeg:
            return make_response({"error": "ffmpeg not found"}, 500)

        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            tmp_path = tmp.name

        cmd = [ffmpeg, "-y", "-ss", str(start_sec)]
        if duration_sec is not None:
            cmd += ["-t", str(duration_sec)]
        cmd += [
            "-i", video_path,
            "-c:v", "libx264", "-preset", "fast", "-crf", "18",
            "-c:a", "aac",
            "-movflags", "+faststart",
            "-avoid_negative_ts", "make_zero",
            tmp_path
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            logger.error(f"ffmpeg trim failed: {result.stderr}")
            return make_response({"error": "ffmpeg trim failed", "details": result.stderr}, 500)

        # Replace original video with trimmed version
        shutil.move(tmp_path, video_path)
        logger.info(f"Trimmed video {video_path} to frames {start_frame}-{end_frame}")

        # Update session video path (same path, just trimmed)
        return make_response({"success": True, "video_path": video_path}, 200)

    except RuntimeError as e:
        # Session not found — trim not possible, not fatal
        logger.warning(f"trim_video: session {session_id} not found: {e}")
        return make_response({"error": str(e)}, 404)
    except Exception as e:
        logger.error(f"Error trimming video for session {session_id}: {e}")
        return make_response({"error": str(e)}, 500)


@app.route("/update_labels/<session_id>", methods=["POST"])
def update_labels(session_id: str) -> Response:
    """
    Update object labels for a session.
    Body: { "labels": {"0": "Person", "1": "Ball"} }
    """
    import json
    try:
        body = request.get_json(force=True) or {}
        labels = body.get("labels", {})
        session = inference_api._InferenceAPI__get_session(session_id)
        # Store labels in session
        session["object_labels"] = {int(k): v for k, v in labels.items()}
        logger.info(f"Updated labels for session {session_id}: {labels}")
        return make_response({"success": True}, 200)
    except RuntimeError as e:
        return make_response({"error": str(e)}, 404)
    except Exception as e:
        return make_response({"error": str(e)}, 500)


@app.route("/save_draft", methods=["POST"])
def save_draft() -> Response:
    """
    Save the current session state as a draft so the user can resume later.

    Expects JSON body:
    {
        "session_id": "...",
        "video_path": "gallery/05_default_juggle.mp4",
        "video_url":  "http://localhost:7263/gallery/...",
        "objects": [{"object_id": 0, "label": "Ball"}, ...]
    }

    Saves to: drafts/{draft_id}.json
    Returns: { "draft_id": "..." }
    """
    import json
    import time

    try:
        body = request.get_json(force=True) or {}
        session_id = body.get("session_id", "")
        video_path = body.get("video_path", "")
        video_url  = body.get("video_url", "")
        objects    = body.get("objects", [])

        # Pull masks_per_frame from the live session if it still exists
        masks_per_frame: dict = {}
        try:
            session = inference_api._InferenceAPI__get_session(session_id)
            masks_per_frame = session.get("masks_per_frame", {})
            # Convert int keys to str for JSON serialisation
            masks_per_frame = {str(k): v for k, v in masks_per_frame.items()}
        except Exception:
            pass  # session already gone — save whatever the frontend sent

        draft_id = f"draft_{int(time.time() * 1000)}"
        draft = {
            "draft_id":       draft_id,
            "session_id":     session_id,
            "video_path":     video_path,
            "video_url":      video_url,
            "objects":        objects,
            "masks_per_frame": masks_per_frame,
            "saved_at":       int(time.time() * 1000),
        }

        draft_file = DRAFTS_PATH / f"{draft_id}.json"
        with open(draft_file, "w", encoding="utf-8") as f:
            json.dump(draft, f, ensure_ascii=False, indent=2)

        logger.info(f"Saved draft {draft_id} for video {video_path}")
        return make_response({"draft_id": draft_id}, 200)

    except Exception as e:
        logger.error(f"Error saving draft: {e}")
        return make_response({"error": str(e)}, 500)


@app.route("/list_drafts", methods=["GET"])
def list_drafts() -> Response:
    """
    List all saved drafts.

    Returns:
    {
        "drafts": [
            {
                "draft_id":   "draft_1234567890",
                "video_path": "gallery/05_default_juggle.mp4",
                "video_url":  "http://...",
                "objects":    [...],
                "saved_at":   1234567890000,
                "thumbnail_url": "http://..." or null
            },
            ...
        ]
    }
    """
    import json

    try:
        drafts = []
        for draft_file in sorted(DRAFTS_PATH.glob("draft_*.json"), reverse=True):
            try:
                with open(draft_file, "r", encoding="utf-8") as f:
                    draft = json.load(f)

                # Build a thumbnail URL from the video path
                video_path = draft.get("video_path", "")
                thumbnail_url = None

                # Skip drafts whose video no longer exists
                if video_path and not (DATA_PATH / video_path).exists():
                    logger.info(f"Removing stale draft {draft_file.name} (video missing)")
                    draft_file.unlink()
                    continue

                if video_path:
                    # For gallery videos use their poster; for uploads use the video itself
                    if video_path.startswith("gallery/"):
                        stem = video_path.replace("gallery/", "").replace(".mp4", "")
                        thumbnail_url = f"http://localhost:7263/posters/{stem}.jpg"
                    elif video_path.startswith("uploads/"):
                        thumbnail_url = f"http://localhost:7263/{video_path}"

                drafts.append({
                    "draft_id":     draft.get("draft_id"),
                    "video_path":   video_path,
                    "video_url":    draft.get("video_url", ""),
                    "objects":      draft.get("objects", []),
                    "saved_at":     draft.get("saved_at", 0),
                    "thumbnail_url": thumbnail_url,
                    "mask_frame_count": len(draft.get("masks_per_frame", {})),
                })
            except Exception as parse_err:
                logger.warning(f"Could not parse draft file {draft_file}: {parse_err}")
                continue

        return make_response({"drafts": drafts}, 200)

    except Exception as e:
        logger.error(f"Error listing drafts: {e}")
        return make_response({"error": str(e)}, 500)


@app.route("/delete_draft/<draft_id>", methods=["DELETE"])
def delete_draft(draft_id: str) -> Response:
    """
    Delete a saved draft by its ID.
    """
    try:
        draft_file = DRAFTS_PATH / f"{draft_id}.json"
        if draft_file.exists():
            draft_file.unlink()
            logger.info(f"Deleted draft {draft_id}")
            return make_response({"success": True}, 200)
        else:
            return make_response({"error": "Draft not found"}, 404)
    except Exception as e:
        logger.error(f"Error deleting draft {draft_id}: {e}")
        return make_response({"error": str(e)}, 500)


@app.route("/load_draft/<draft_id>", methods=["GET"])
def load_draft(draft_id: str) -> Response:
    """
    Load a saved draft — returns the full draft JSON including masks.
    Frontend uses this to restore session state.
    Also validates that the video file still exists.
    """
    import json

    try:
        draft_file = DRAFTS_PATH / f"{draft_id}.json"
        if not draft_file.exists():
            return make_response({"error": "Draft not found"}, 404)

        with open(draft_file, "r", encoding="utf-8") as f:
            draft = json.load(f)

        # Validate video file still exists
        video_path = draft.get("video_path", "")
        full_video_path = DATA_PATH / video_path if video_path else None
        if full_video_path and not full_video_path.exists():
            # Video was deleted/trimmed — remove stale draft
            draft_file.unlink()
            logger.warning(f"Deleted stale draft {draft_id} (video missing: {video_path})")
            return make_response({"error": "Draft video no longer exists"}, 404)

        return make_response(json.dumps(draft), 200)

    except Exception as e:
        logger.error(f"Error loading draft {draft_id}: {e}")
        return make_response({"error": str(e)}, 500)


# TOOD: Protect route with ToS permission check
@app.route("/propagate_in_video", methods=["POST"])
def propagate_in_video() -> Response:
    data = request.json
    args = {
        "session_id": data["session_id"],
        "start_frame_index": data.get("start_frame_index", 0),
        "end_frame_index": data.get("end_frame_index", None),
    }

    boundary = "frame"
    frame = gen_track_with_mask_stream(boundary, **args)
    return Response(frame, mimetype="multipart/x-savi-stream; boundary=" + boundary)


def gen_track_with_mask_stream(
    boundary: str,
    session_id: str,
    start_frame_index: int,
    end_frame_index: int = None,
) -> Generator[bytes, None, None]:
    with inference_api.autocast_context():
        request = PropagateInVideoRequest(
            type="propagate_in_video",
            session_id=session_id,
            start_frame_index=start_frame_index,
            end_frame_index=end_frame_index,
        )

        for chunk in inference_api.propagate_in_video(request=request):
            yield MultipartResponseBuilder.build(
                boundary=boundary,
                headers={
                    "Content-Type": "application/json; charset=utf-8",
                    "Frame-Current": "-1",
                    # Total frames minus the reference frame
                    "Frame-Total": "-1",
                    "Mask-Type": "RLE[]",
                },
                body=chunk.to_json().encode("UTF-8"),
            ).get_message()


class MyGraphQLView(GraphQLView):
    def get_context(self, request: Request, response: Response) -> Any:
        return {"inference_api": inference_api}


# Add GraphQL route to Flask app.
app.add_url_rule(
    "/graphql",
    view_func=MyGraphQLView.as_view(
        "graphql_view",
        schema=schema,
        # Disable GET queries
        # https://strawberry.rocks/docs/operations/deployment
        # https://strawberry.rocks/docs/integrations/flask
        allow_queries_via_get=False,
        # Strawberry recently changed multipart request handling, which now
        # requires enabling support explicitly for views.
        # https://github.com/strawberry-graphql/strawberry/issues/3655
        multipart_uploads_enabled=True,
    ),
)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=7263, threaded=True)
