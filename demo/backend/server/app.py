# Copyright (c) Meta Platforms, Inc. and affiliates.
# All rights reserved.
# This source code is licensed under the license found in the
# LICENSE file in the root directory of this source tree.

import logging
import os
import json
import re
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
            # Skip internal folders (_merged_training, _yolo_runs, etc.)
            if folder.name.startswith('_'):
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
    import json, shutil, subprocess

    try:
        body = request.get_json(force=True) or {}
        fps = float(body.get("fps", 1.0))
        source = body.get("source", "original")

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
        frames_dir_name = f"frames_{fps_label}fps_{source}"
        frames_dir = project_folder / frames_dir_name

        if frames_dir.exists():
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

        # ── Draw full segmentation masks on frames for "masked" source ─────────
        if source == "masked" and tracking_data:
            try:
                from PIL import Image, ImageDraw, ImageFont
                import numpy as np

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
                MASK_ALPHA = 128  # mask transparency (0-255)
                LINE_WIDTH = 2    # border thickness in pixels

                def decode_rle_mask(rle_counts, size):
                    """Decode RLE mask to binary numpy array."""
                    try:
                        from pycocotools import mask as mask_utils
                        if isinstance(rle_counts, str):
                            rle_dict = {"counts": rle_counts.encode('utf-8'), "size": list(size)}
                        else:
                            rle_dict = {"counts": rle_counts, "size": list(size)}
                        return mask_utils.decode(rle_dict)
                    except Exception as e:
                        logger.warning(f"Failed to decode RLE mask: {e}")
                        return None

                for i, frame_file in enumerate(frame_files):
                    extracted_sec = i / fps
                    track_idx = int(round(extracted_sec * encode_fps))
                    if tracking_data:
                        track_idx = min(track_idx, max(tracking_data.keys()))

                    frame_data = tracking_data.get(track_idx)
                    if not frame_data or not frame_data.get("masks"):
                        continue  # no objects in this frame — keep plain image

                    img = Image.open(frame_file).convert("RGB")
                    img_array = np.array(img)
                    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
                    draw = ImageDraw.Draw(overlay)

                    for mask_entry in frame_data["masks"]:
                        obj_id = mask_entry.get("object_id", 0)
                        rle    = mask_entry.get("mask", {})
                        if not rle:
                            continue

                        color  = COLORS[obj_id % len(COLORS)]
                        label  = label_map.get(obj_id, f"object_{obj_id}")

                        # Decode RLE to binary mask
                        mask = decode_rle_mask(rle.get("counts", ""), rle.get("size", []))
                        if mask is None or mask.size == 0:
                            continue

                        # Resize mask if dimensions don't match
                        if mask.shape[0] != img.height or mask.shape[1] != img.width:
                            try:
                                from scipy.ndimage import zoom
                                scale_h = img.height / mask.shape[0]
                                scale_w = img.width / mask.shape[1]
                                mask = zoom(mask, (scale_h, scale_w), order=0)
                            except ImportError:
                                # Fallback: use PIL resize
                                mask_img = Image.fromarray((mask * 255).astype(np.uint8))
                                mask_img = mask_img.resize((img.width, img.height), Image.NEAREST)
                                mask = np.array(mask_img) > 0

                        # Create colored mask overlay
                        colored_mask = np.zeros((*mask.shape, 4), dtype=np.uint8)
                        colored_mask[mask > 0] = (*color, MASK_ALPHA)
                        
                        # Convert to PIL and composite
                        mask_overlay = Image.fromarray(colored_mask, mode='RGBA')
                        overlay = Image.alpha_composite(overlay, mask_overlay)

                        # Draw contour/border around mask
                        try:
                            from scipy.ndimage import binary_erosion
                            eroded = binary_erosion(mask, iterations=LINE_WIDTH)
                            contour = mask & ~eroded
                            contour_coords = np.column_stack(np.where(contour))
                            for y, x in contour_coords[::2]:  # Draw every 2nd pixel for performance
                                draw.point((x, y), fill=(*color, 255))
                        except ImportError:
                            pass  # Skip contour if scipy not available

                        # Get bounding box for label placement
                        bbox = rle_to_bbox(rle.get("counts", ""), rle.get("size", []))
                        if bbox and len(bbox) >= 4:
                            bx, by, bw, bh = bbox
                            x0, y0 = int(bx), int(by)

                            # Label chip (top-left corner of mask)
                            font_size = max(14, img.height // 30)
                            try:
                                # Try Mac font first, then Ubuntu fonts
                                try:
                                    font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
                                except:
                                    try:
                                        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", font_size)
                                    except:
                                        font = ImageFont.load_default()
                            except Exception:
                                font = ImageFont.load_default()

                            tb = font.getbbox(label) if hasattr(font, 'getbbox') else (0, 0, len(label) * 8, font_size)
                            tw = tb[2] - tb[0] + 8
                            th = tb[3] - tb[1] + 6
                            lx0 = x0
                            ly0 = max(0, y0 - th)
                            draw.rectangle([lx0, ly0, lx0 + tw, ly0 + th], fill=(*color, 220))
                            draw.text((lx0 + 4, ly0 + 3), label, fill=(255, 255, 255, 255), font=font)

                    # Composite mask overlay onto image
                    composited = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
                    composited.save(str(frame_file), "JPEG", quality=92)

            except ImportError as ie:
                logger.warning(f"Required libraries not available for mask visualization: {ie}. Saving plain frames.")

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

            # Encode image as base64 for LabelMe imageData field
            # (required by labelme2yolo which calls utils.img_b64_to_arr(imageData))
            import base64
            try:
                with open(str(frame_file), "rb") as _imgf:
                    image_data_b64 = base64.b64encode(_imgf.read()).decode("utf-8")
            except Exception:
                image_data_b64 = None

            labelme_json = {
                "version": "5.2.1",
                "flags": {},
                "shapes": shapes,
                "imagePath": frame_file.name,
                "imageData": image_data_b64,
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


@app.route("/labelme2yolo/<project_name>", methods=["POST"])
def run_labelme2yolo(project_name: str) -> Response:
    """
    Split extracted frames into a YOLO dataset layout.

    Body JSON: { "frames_dir": str, "val_size": float }
      - frames_dir: subfolder name inside exports/<project_name>/
      - val_size:   e.g. 0.2 → 20% val, 80% train

    Creates inside <frames_dir>/YOLODataset/:
      images/train/  images/val/   (.jpg)
      labels/train/  labels/val/   (.txt YOLO)
      classes.txt
      dataset.yaml
    """
    import shutil, random, math

    try:
        body = request.get_json(force=True) or {}
        frames_dir_name = body.get("frames_dir", "")
        val_size = float(body.get("val_size", 0.2))
        val_size = max(0.05, min(0.9, val_size))

        if not frames_dir_name:
            return make_response({"error": "frames_dir is required"}, 400)

        project_folder = EXPORTS_PATH / project_name
        if not project_folder.exists():
            return make_response({"error": "Project not found"}, 404)

        frames_dir = project_folder / frames_dir_name
        if not frames_dir.exists():
            return make_response({"error": f"frames_dir '{frames_dir_name}' not found"}, 404)

        # Collect all jpg frames
        jpg_files = sorted(frames_dir.glob("*.jpg"))
        if not jpg_files:
            return make_response({"error": "No .jpg frames found in frames_dir"}, 400)

        # ── Train / val split ─────────────────────────────────────────────────
        stems = [f.stem for f in jpg_files]
        random.shuffle(stems)
        # math.ceil guarantees at least 1 val frame even for small datasets
        val_count   = max(1, math.ceil(len(stems) * val_size))
        train_count = len(stems) - val_count
        val_stems   = set(stems[:val_count])
        train_stems = set(stems[val_count:])

        # ── Create output folder ──────────────────────────────────────────────
        yolo_dir = frames_dir / "YOLODataset"
        if yolo_dir.exists():
            shutil.rmtree(yolo_dir)

        for split in ("train", "val"):
            os.makedirs(yolo_dir / "images" / split, exist_ok=True)
            os.makedirs(yolo_dir / "labels" / split, exist_ok=True)

        # ── Copy images + labels ──────────────────────────────────────────────
        for stem in stems:
            split = "val" if stem in val_stems else "train"
            # image
            src_img = frames_dir / f"{stem}.jpg"
            if src_img.exists():
                shutil.copy2(str(src_img), str(yolo_dir / "images" / split / f"{stem}.jpg"))
            # label
            src_lbl = frames_dir / f"{stem}.txt"
            if src_lbl.exists():
                shutil.copy2(str(src_lbl), str(yolo_dir / "labels" / split / f"{stem}.txt"))
            else:
                # write empty label if no objects in frame
                (yolo_dir / "labels" / split / f"{stem}.txt").write_text("")

        # ── Copy classes.txt ──────────────────────────────────────────────────
        src_classes = frames_dir / "classes.txt"
        if src_classes.exists():
            shutil.copy2(str(src_classes), str(yolo_dir / "classes.txt"))
            class_names = src_classes.read_text(encoding="utf-8").strip().splitlines()
        else:
            class_names = []

        # ── Write dataset.yaml ────────────────────────────────────────────────
        yaml_path = yolo_dir / "dataset.yaml"
        yaml_content = (
            f"# YOLO dataset — generated by SAM2 Tracker\n"
            f"# val: {int(val_size*100)}%  train: {100-int(val_size*100)}%\n"
            f"# total: {len(stems)}  train: {train_count}  val: {val_count}\n"
            f"\n"
            f"path  : .\n"
            f"train : images/train\n"
            f"val   : images/val\n"
            f"\n"
            f"nc: {len(class_names)}\n"
            f"names: {class_names}\n"
        )
        yaml_path.write_text(yaml_content, encoding="utf-8")

        logger.info(
            f"YOLO split done → {yolo_dir}: "
            f"train={train_count} val={val_count}"
        )

        return make_response({
            "success"     : True,
            "yolo_dir"    : f"{frames_dir_name}/YOLODataset",
            "train_count" : train_count,
            "val_count"   : val_count,
            "yaml_exists" : True,
        }, 200)

    except Exception as e:
        logger.error(f"YOLO split error for {project_name}: {e}")
        return make_response({"error": str(e)}, 500)


@app.route("/list_frame_dirs/<project_name>", methods=["GET"])
def list_frame_dirs(project_name: str) -> Response:
    """
    List all existing frame directories for a project.
    Returns directories that match pattern: frames_*fps_original
    """
    try:
        project_folder = EXPORTS_PATH / project_name
        if not project_folder.exists():
            return make_response({"error": "Project not found"}, 404)
        
        # Find all frame directories (e.g., frames_1fps_original, frames_10fps_original)
        frame_dirs = []
        for item in project_folder.iterdir():
            if item.is_dir() and item.name.startswith("frames_") and "original" in item.name:
                # Check if it has actual images
                images = list(item.glob("*.jpg")) + list(item.glob("*.png"))
                if images:
                    frame_dirs.append(item.name)
        
        frame_dirs.sort()
        
        return make_response({
            "success": True,
            "frame_dirs": frame_dirs,
        }, 200)
        
    except Exception as e:
        logger.error(f"List frame dirs error for {project_name}: {e}")
        return make_response({"error": str(e)}, 500)


@app.route("/verify_masks/<project_name>", methods=["POST"])
def verify_masks_endpoint(project_name: str) -> Response:
    """
    Verify masks by drawing them on frames.
    
    Body JSON: { "frames_dir": str }
      - frames_dir: subfolder name inside exports/<project_name>/ (e.g. "frames_1fps_original")
    
    Creates a new folder: frames_dir + "_verified" with visualized masks
    """
    import numpy as np
    from PIL import Image, ImageDraw, ImageFont
    
    try:
        body = request.get_json(force=True) or {}
        frames_dir_name = body.get("frames_dir", "")
        
        if not frames_dir_name:
            return make_response({"error": "frames_dir is required"}, 400)
        
        project_folder = EXPORTS_PATH / project_name
        if not project_folder.exists():
            return make_response({"error": "Project not found"}, 404)
        
        # Load tracking.json
        tracking_json_path = project_folder / "tracking.json"
        if not tracking_json_path.exists():
            return make_response({"error": "tracking.json not found for this project"}, 404)
        
        with open(tracking_json_path, 'r', encoding='utf-8') as f:
            tracking_data_full = json.load(f)
        
        # Get object labels
        objects_list = tracking_data_full.get("objects", [])
        label_map = {obj["object_id"]: obj.get("label", f"object_{obj['object_id']}") 
                    for obj in objects_list}
        
        # Build frame_index -> masks mapping
        tracking_data = {}
        for frame in tracking_data_full.get("frames", []):
            frame_idx = frame.get("frame_index")
            tracking_data[frame_idx] = {
                "frame_index": frame_idx,
                "masks": frame.get("masks", [])
            }
        
        # Get frames directory
        frames_dir = project_folder / frames_dir_name
        if not frames_dir.exists():
            return make_response({"error": f"frames_dir '{frames_dir_name}' not found"}, 404)
        
        # Create output directory
        output_dir_name = f"{frames_dir_name}_verified"
        output_dir = project_folder / output_dir_name
        
        # Check if already exists
        if output_dir.exists():
            existing_images = list(output_dir.glob("*.jpg"))
            if existing_images:
                return make_response({
                    "success": True,
                    "output_dir": output_dir_name,
                    "frame_count": len(existing_images),
                    "already_exists": True,
                }, 200)
        
        os.makedirs(output_dir, exist_ok=True)
        
        # Get all image files
        image_files = sorted(frames_dir.glob("*.jpg")) + sorted(frames_dir.glob("*.png"))
        if not image_files:
            return make_response({"error": "No images found in frames directory"}, 400)
        
        # Calculate scaling factor between JSON frames and extracted frames
        max_tracking_frame = max(tracking_data.keys()) if tracking_data else 0
        num_extracted_frames = len(image_files)
        
        logger.info(f"Max tracking frame index: {max_tracking_frame}, Extracted frames: {num_extracted_frames}")
        
        # Same colors as frontend
        COLORS = [
            (56, 128, 243), (240, 170, 25), (0, 210, 190), (40, 210, 50), (135, 115, 255),
            (0, 200, 240), (250, 135, 25), (230, 25, 59), (250, 125, 200), (160, 255, 80),
        ]
        BOX_ALPHA = 60  # Semi-transparent fill
        LINE_WIDTH = 3  # Border thickness
        
        def decode_rle_mask(rle_counts, size):
            """Decode RLE mask to binary numpy array."""
            try:
                from pycocotools import mask as mask_utils
                if isinstance(rle_counts, str):
                    rle_dict = {"counts": rle_counts.encode('utf-8'), "size": list(size)}
                else:
                    rle_dict = {"counts": rle_counts, "size": list(size)}
                return mask_utils.decode(rle_dict)
            except Exception as e:
                logger.warning(f"Failed to decode RLE mask: {e}")
                return None
        
        def rle_to_bbox(rle_counts, size):
            """Convert COCO RLE mask to [x, y, w, h] bounding box."""
            if not rle_counts or not size or len(size) < 2:
                return []
            try:
                from pycocotools.mask import toBbox
                bbox = toBbox({"counts": rle_counts, "size": list(size)})
                return [round(float(v), 2) for v in bbox]
            except Exception as e:
                logger.warning(f"rle_to_bbox failed: {e}")
                return []
        
        # Process each frame
        processed_count = 0
        frames_with_masks = 0
        
        for i, img_path in enumerate(image_files):
            # Map extracted frame index to tracking frame index
            # If we have 720 extracted frames but only 248 tracking frames with masks,
            # we need to map: extracted_frame_i -> tracking_frame_j
            if max_tracking_frame > 0:
                # Scale: tracking_idx = (extracted_idx * max_tracking_frame) / num_extracted_frames
                tracking_idx = int((i * max_tracking_frame) / max(num_extracted_frames - 1, 1))
                # Clamp to valid range
                tracking_idx = min(tracking_idx, max_tracking_frame)
            else:
                tracking_idx = i
            
            # Get masks for this frame (use nearest available frame)
            frame_data = tracking_data.get(tracking_idx)
            
            # If no data at exact index, try to find nearest frame with masks
            if not frame_data or not frame_data.get("masks"):
                # Find nearest tracking frame with masks
                found_nearby = False
                for offset in range(1, 6):  # Try ±5 frames
                    for nearby_idx in [tracking_idx - offset, tracking_idx + offset]:
                        if 0 <= nearby_idx <= max_tracking_frame:
                            nearby_data = tracking_data.get(nearby_idx)
                            if nearby_data and nearby_data.get("masks"):
                                frame_data = nearby_data
                                found_nearby = True
                                break
                    if found_nearby:
                        break
                
                # If still no masks found, copy plain image
                if not frame_data or not frame_data.get("masks"):
                    import shutil
                    shutil.copy2(str(img_path), str(output_dir / img_path.name))
                    processed_count += 1
                    continue
            
            frames_with_masks += 1
            
            # Load image
            img = Image.open(img_path).convert("RGB")
            overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
            draw_overlay = ImageDraw.Draw(overlay)
            draw_img = ImageDraw.Draw(img)
            
            # Draw each mask as rectangle box
            for mask_entry in frame_data["masks"]:
                obj_id = mask_entry.get("object_id", 0)
                rle = mask_entry.get("mask", {})
                if not rle:
                    continue
                
                color = COLORS[obj_id % len(COLORS)]
                label = label_map.get(obj_id, f"object_{obj_id}")
                
                # Get bounding box from RLE
                bbox = rle_to_bbox(rle.get("counts", ""), rle.get("size", []))
                if not bbox or len(bbox) < 4:
                    continue
                
                bx, by, bw, bh = bbox
                x0, y0 = int(bx), int(by)
                x1, y1 = int(bx + bw), int(by + bh)
                
                # Draw semi-transparent filled rectangle
                draw_overlay.rectangle([x0, y0, x1, y1], fill=(*color, BOX_ALPHA))
                
                # Draw solid border (multiple lines for thickness)
                for t in range(LINE_WIDTH):
                    draw_img.rectangle(
                        [x0 + t, y0 + t, x1 - t, y1 - t],
                        outline=color,
                    )
                
                # Draw label chip at top-left of box
                font_size = max(14, img.height // 30)
                try:
                    # Try Mac font first, then Ubuntu fonts
                    try:
                        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
                    except:
                        try:
                            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", font_size)
                        except:
                            font = ImageFont.load_default()
                except:
                    font = ImageFont.load_default()
                
                tb = font.getbbox(label) if hasattr(font, 'getbbox') else (0, 0, len(label) * 8, font_size)
                tw, th = tb[2] - tb[0] + 8, tb[3] - tb[1] + 6
                lx0, ly0 = x0, max(0, y0 - th)
                
                # Label background
                draw_overlay.rectangle([lx0, ly0, lx0 + tw, ly0 + th], fill=(*color, 220))
                # Label text
                draw_overlay.text((lx0 + 4, ly0 + 3), label, fill=(255, 255, 255, 255), font=font)
            
            # Composite overlay onto image
            result = Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")
            result.save(str(output_dir / img_path.name), "JPEG", quality=95)
            processed_count += 1
        
        logger.info(f"Verified {processed_count} frames ({frames_with_masks} with masks, {processed_count - frames_with_masks} plain) → {output_dir}")
        
        return make_response({
            "success": True,
            "output_dir": output_dir_name,
            "frame_count": processed_count,
            "already_exists": False,
        }, 200)
        
    except Exception as e:
        logger.error(f"Verify masks error for {project_name}: {e}")
        import traceback
        traceback.print_exc()
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


@app.route("/list_yolo_datasets", methods=["GET"])
def list_yolo_datasets() -> Response:
    """Scan all export projects for YOLODataset folders."""
    import json as _json
    results = []
    if not EXPORTS_PATH.exists():
        return make_response({"datasets": []}, 200)

    for project_dir in sorted(EXPORTS_PATH.iterdir()):
        if not project_dir.is_dir() or project_dir.name.startswith("_"):
            continue
        project_name = project_dir.name

        display_name = project_name[:24]
        try:
            with open(project_dir / "tracking.json", "r", encoding="utf-8") as f:
                td = _json.load(f)
                display_name = td.get("displayName") or td.get("video_name") or display_name
        except Exception:
            pass

        for frames_dir in sorted(project_dir.iterdir()):
            if not frames_dir.is_dir():
                continue
            yolo_dir = frames_dir / "YOLODataset"
            if not yolo_dir.exists():
                continue

            classes_txt = yolo_dir / "classes.txt"
            class_names: list = []
            if classes_txt.exists():
                class_names = [l.strip() for l in classes_txt.read_text().splitlines() if l.strip()]

            train_imgs = list((yolo_dir / "images" / "train").glob("*.jpg")) if (yolo_dir / "images" / "train").exists() else []
            val_imgs   = list((yolo_dir / "images" / "val").glob("*.jpg"))   if (yolo_dir / "images" / "val").exists()   else []

            results.append({
                "project"      : project_name,
                "display_name" : display_name,
                "frames_dir"   : frames_dir.name,
                "yolo_dir"     : str(yolo_dir),
                "dataset_yaml" : str(yolo_dir / "dataset.yaml"),
                "class_names"  : class_names,
                "train_count"  : len(train_imgs),
                "val_count"    : len(val_imgs),
                "has_yaml"     : (yolo_dir / "dataset.yaml").exists(),
            })

    return make_response({"datasets": results}, 200)


# ---------------------------------------------------------------------------
# CLASSIFY EXPORT — crop tracked objects per frame, save by class name
# ---------------------------------------------------------------------------

@app.route("/classify_export/<project_name>", methods=["POST"])
def classify_export(project_name: str) -> Response:
    """
    Crop tracked objects from each frame and save by class name.

    Body JSON:
      {
        "fps": float,          # extraction fps (default 1.0)
        "padding": int,        # extra pixels around bbox (default 10)
        "overwrite": bool      # overwrite existing (default false)
      }

    Output structure:
      exports/<project_name>/classification/
        <class_name>/
          frame_000001.jpg   ← cropped object only
          frame_000002.jpg
          ...

    Returns:
      { success, classification_dir, counts: {class_name: int}, total }
    """
    import json, shutil, subprocess

    try:
        body      = request.get_json(force=True) or {}
        fps       = float(body.get("fps", 1.0))
        padding   = int(body.get("padding", 10))
        overwrite = bool(body.get("overwrite", False))

        project_folder = EXPORTS_PATH / project_name
        if not project_folder.exists():
            return make_response({"error": "Project not found"}, 404)

        video_path = project_folder / "original.mp4"
        if not video_path.exists():
            return make_response({"error": "original.mp4 not found"}, 404)

        tracking_json_path = project_folder / "tracking.json"
        if not tracking_json_path.exists():
            return make_response({"error": "tracking.json not found"}, 404)

        # ── Load tracking.json ────────────────────────────────────────────
        with open(tracking_json_path, "r", encoding="utf-8") as f:
            td = json.load(f)

        objects_list = td.get("objects", [])
        num_tracking_frames = td.get("num_frames", 0)
        label_map = {
            obj["object_id"]: obj.get("label", f"object_{obj['object_id']}")
            for obj in objects_list
        }
        tracking_data: dict = {}
        for frame in td.get("frames", []):
            tracking_data[frame["frame_index"]] = frame.get("masks", [])
        if not num_tracking_frames and tracking_data:
            num_tracking_frames = max(tracking_data.keys()) + 1

        if not tracking_data:
            return make_response({"error": "No tracking data found in tracking.json"}, 400)

        # ── Compute encode fps ────────────────────────────────────────────
        encode_fps = 10.0
        try:
            ffprobe = shutil.which("ffprobe")
            if ffprobe and num_tracking_frames > 0:
                probe = subprocess.run(
                    [ffprobe, "-v", "quiet", "-show_entries", "format=duration",
                     "-of", "json", str(video_path)],
                    capture_output=True, text=True
                )
                probe_data = json.loads(probe.stdout)
                duration = float(probe_data.get("format", {}).get("duration", 0))
                if duration > 0:
                    encode_fps = num_tracking_frames / duration
        except Exception as e:
            logger.warning(f"classify_export: could not compute encode_fps: {e}")

        # ── Classification output dir ─────────────────────────────────────
        classify_dir = project_folder / "classification"
        if classify_dir.exists() and overwrite:
            shutil.rmtree(classify_dir)

        # ── Extract raw frames from original.mp4 ─────────────────────────
        ffmpeg = shutil.which("ffmpeg")
        if not ffmpeg:
            return make_response({"error": "ffmpeg not found"}, 500)

        tmp_frames_dir = project_folder / "_classify_tmp_frames"
        if tmp_frames_dir.exists():
            shutil.rmtree(tmp_frames_dir)
        os.makedirs(tmp_frames_dir, exist_ok=True)

        cmd = [
            ffmpeg, "-y", "-i", str(video_path),
            "-vf", f"fps={fps}",
            "-q:v", "2", "-threads", "2",
            str(tmp_frames_dir / "frame_%06d.jpg"),
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if result.returncode != 0:
            shutil.rmtree(tmp_frames_dir, ignore_errors=True)
            return make_response({"error": "Frame extraction failed", "details": result.stderr[-300:]}, 500)

        frame_files = sorted(tmp_frames_dir.glob("*.jpg"))
        if not frame_files:
            return make_response({"error": "No frames extracted"}, 500)

        # ── Crop and save per class ───────────────────────────────────────
        try:
            from PIL import Image
            from pycocotools.mask import toBbox
        except ImportError as e:
            shutil.rmtree(tmp_frames_dir, ignore_errors=True)
            return make_response({"error": f"Missing dependency: {e}"}, 500)

        counts: dict = {}

        for i, frame_file in enumerate(frame_files):
            extracted_sec = i / fps
            track_idx = int(round(extracted_sec * encode_fps))
            track_idx = min(track_idx, max(tracking_data.keys()))

            masks = tracking_data.get(track_idx, [])
            if not masks:
                continue

            img = Image.open(frame_file).convert("RGB")
            W, H = img.size

            for mask_entry in masks:
                obj_id = mask_entry.get("object_id", 0)
                rle    = mask_entry.get("mask", {})
                if not rle:
                    continue

                # Get class name from label_map
                class_name = label_map.get(obj_id, f"object_{obj_id}")
                # Sanitize for folder name
                safe_class = "".join(c if c.isalnum() or c in "_-" else "_" for c in class_name)

                # Decode bbox from RLE
                try:
                    counts_val = rle.get("counts", "")
                    size_val   = rle.get("size", [])
                    if isinstance(counts_val, str):
                        counts_val = counts_val.encode("utf-8")
                    bbox = toBbox({"counts": counts_val, "size": size_val})
                    bx, by, bw, bh = float(bbox[0]), float(bbox[1]), float(bbox[2]), float(bbox[3])
                except Exception as be:
                    logger.warning(f"classify_export: bbox decode failed frame {i} obj {obj_id}: {be}")
                    continue

                if bw < 2 or bh < 2:
                    continue

                # Apply padding, clamp to image bounds
                x0 = max(0, int(bx) - padding)
                y0 = max(0, int(by) - padding)
                x1 = min(W, int(bx + bw) + padding)
                y1 = min(H, int(by + bh) + padding)

                if x1 - x0 < 2 or y1 - y0 < 2:
                    continue

                # Crop
                crop = img.crop((x0, y0, x1, y1))

                # Save to classification/<class_name>/
                out_dir = classify_dir / safe_class
                os.makedirs(out_dir, exist_ok=True)

                frame_num   = i + 1
                out_filename = f"frame_{frame_num:06d}_obj{obj_id}.jpg"
                crop.save(out_dir / out_filename, "JPEG", quality=92)

                counts[safe_class] = counts.get(safe_class, 0) + 1

        # ── Cleanup tmp frames ────────────────────────────────────────────
        shutil.rmtree(tmp_frames_dir, ignore_errors=True)

        total = sum(counts.values())
        logger.info(f"classify_export: saved {total} crops → {classify_dir}")

        return make_response({
            "success"          : True,
            "classification_dir": str(classify_dir),
            "counts"           : counts,
            "total"            : total,
        }, 200)

    except Exception as e:
        logger.error(f"classify_export error: {e}")
        return make_response({"error": str(e)}, 500)


@app.route("/merge_datasets", methods=["POST"])
def merge_datasets() -> Response:
    """
    Merge selected YOLO datasets into _merged_training/ and return yaml path.
    Body JSON: { "datasets": [yolo_dir_path, ...] }
    Returns: { success, yaml_path, train_count, val_count, class_names }
    """
    import shutil

    try:
        body = request.get_json(force=True) or {}
        dataset_paths = body.get("datasets", [])

        if not dataset_paths:
            return make_response({"error": "No datasets selected"}, 400)

        # Normalize paths: if path points to dataset.yaml, use its parent dir
        # If path points to a folder, look for dataset.yaml inside
        # Also handle relative paths from browser webkitRelativePath (relative to EXPORTS_PATH)
        normalized: list = []
        for dp in dataset_paths:
            p = Path(dp)
            # If not absolute or doesn't exist, try prefixing with EXPORTS_PATH
            if not p.is_absolute() or not p.exists():
                p_abs = EXPORTS_PATH / dp
                if p_abs.exists():
                    p = p_abs
                else:
                    return make_response({"error": f"Path not found: {dp}"}, 404)
            if p.is_file() and p.name in ("dataset.yaml", "dataset.yml"):
                normalized.append(str(p.parent))   # use folder
            elif p.is_dir():
                yaml_check = p / "dataset.yaml"
                if not yaml_check.exists():
                    yaml_check = p / "dataset.yml"
                if not yaml_check.exists():
                    return make_response({"error": f"No dataset.yaml found in: {dp}"}, 400)
                normalized.append(str(p))
            else:
                return make_response({"error": f"Invalid path: {dp}"}, 400)
        dataset_paths = normalized

        merged_dir = EXPORTS_PATH / "_merged_training"
        if merged_dir.exists():
            shutil.rmtree(merged_dir)
        for split in ("train", "val"):
            os.makedirs(merged_dir / "images" / split, exist_ok=True)
            os.makedirs(merged_dir / "labels" / split, exist_ok=True)

        all_class_names: list = []
        copied = {"train": 0, "val": 0}

        for dp in dataset_paths:
            yolo_dir = Path(dp)
            classes_txt = yolo_dir / "classes.txt"
            if classes_txt.exists():
                for cn in classes_txt.read_text().splitlines():
                    cn = cn.strip()
                    if cn and cn not in all_class_names:
                        all_class_names.append(cn)

            for split in ("train", "val"):
                img_src = yolo_dir / "images" / split
                lbl_src = yolo_dir / "labels" / split
                if not img_src.exists():
                    continue
                for img_file in sorted(img_src.glob("*.jpg")):
                    prefix = f"{yolo_dir.parent.parent.name[:8]}_{yolo_dir.parent.name[:12]}"
                    stem   = f"{prefix}_{img_file.stem}"
                    shutil.copy2(str(img_file), str(merged_dir / "images" / split / f"{stem}.jpg"))
                    lbl_file = lbl_src / f"{img_file.stem}.txt"
                    dst_lbl  = merged_dir / "labels" / split / f"{stem}.txt"
                    if lbl_file.exists():
                        shutil.copy2(str(lbl_file), str(dst_lbl))
                    else:
                        dst_lbl.write_text("")
                    copied[split] += 1

        yaml_path = merged_dir / "dataset.yaml"
        yaml_path.write_text(
            f"path  : {merged_dir}\n"
            f"train : images/train\n"
            f"val   : images/val\n"
            f"\n"
            f"nc: {len(all_class_names)}\n"
            f"names: {all_class_names}\n",
            encoding="utf-8",
        )
        logger.info(f"Merged: train={copied['train']} val={copied['val']} classes={all_class_names}")

        return make_response({
            "success"     : True,
            "yaml_path"   : str(yaml_path),
            "train_count" : copied["train"],
            "val_count"   : copied["val"],
            "class_names" : all_class_names,
        }, 200)

    except Exception as e:
        logger.error(f"merge_datasets error: {e}")
        return make_response({"error": str(e)}, 500)


# ── Training job state (in-memory) ───────────────────────────────────────────
import threading as _threading
_train_jobs: dict = {}  # job_id → {status, log_lines, output_dir, error}


@app.route("/train_yolo", methods=["POST"])
def train_yolo() -> Response:
    """
    Start a yolo train job in background thread.
    Body JSON: { "yaml_path": str, "imgsz": 640, "epochs": 10, "model": "yolov8n.pt" }
    Returns: { job_id }  — use /train_status/<job_id> to poll progress
    """
    import shutil, subprocess, sys, uuid

    try:
        body = request.get_json(force=True) or {}
        yaml_path = body.get("yaml_path", "")
        imgsz  = int(body.get("imgsz", 640))
        epochs = int(body.get("epochs", 10))
        model  = body.get("model", "yolov8n.pt")

        if not yaml_path:
            return make_response({"error": "yaml_path is required"}, 400)
        if not Path(yaml_path).exists():
            return make_response({"error": f"yaml_path not found: {yaml_path}"}, 404)

        # find yolo binary
        yolo_bin = shutil.which("yolo")
        if not yolo_bin:
            venv_bin  = os.path.dirname(sys.executable)
            candidate = os.path.join(venv_bin, "yolo")
            if os.path.isfile(candidate):
                yolo_bin = candidate
        if not yolo_bin:
            subprocess.run([sys.executable, "-m", "pip", "install", "ultralytics"],
                           capture_output=True, timeout=180)
            venv_bin = os.path.dirname(sys.executable)
            yolo_bin = os.path.join(venv_bin, "yolo") or shutil.which("yolo")
        if not yolo_bin or not os.path.isfile(yolo_bin):
            return make_response({"error": "yolo not found. Run: pip install ultralytics"}, 500)

        runs_dir   = EXPORTS_PATH / "_yolo_runs"
        output_dir = str(runs_dir / "train")
        job_id     = str(uuid.uuid4())[:8]
        cmd = [
            yolo_bin, "train",
            f"data={yaml_path}",
            f"imgsz={imgsz}",
            f"epochs={epochs}",
            f"model={model}",
            f"project={runs_dir}",
            "name=train",
            "exist_ok=True",
        ]

        _train_jobs[job_id] = {
            "status"    : "running",
            "log_lines" : [f"$ {' '.join(cmd)}", ""],
            "output_dir": output_dir,
            "error"     : None,
        }

        def _run():
            try:
                proc = subprocess.Popen(
                    cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                    text=True, cwd=str(EXPORTS_PATH),
                )
                for line in iter(proc.stdout.readline, ""):
                    line = line.rstrip()
                    _train_jobs[job_id]["log_lines"].append(line)
                    # keep last 500 lines
                    if len(_train_jobs[job_id]["log_lines"]) > 500:
                        _train_jobs[job_id]["log_lines"] = _train_jobs[job_id]["log_lines"][-500:]
                proc.wait()
                if proc.returncode == 0:
                    _train_jobs[job_id]["status"] = "success"
                else:
                    _train_jobs[job_id]["status"] = "error"
                    _train_jobs[job_id]["error"]  = f"Process exited with code {proc.returncode}"
            except Exception as ex:
                _train_jobs[job_id]["status"] = "error"
                _train_jobs[job_id]["error"]  = str(ex)

        t = _threading.Thread(target=_run, daemon=True)
        t.start()

        return make_response({"success": True, "job_id": job_id, "output_dir": output_dir}, 200)

    except Exception as e:
        logger.error(f"train_yolo error: {e}")
        return make_response({"error": str(e)}, 500)


@app.route("/train_status/<job_id>", methods=["GET"])
def train_status(job_id: str) -> Response:
    """Poll training job status and log lines."""
    job = _train_jobs.get(job_id)
    if not job:
        return make_response({"error": "Job not found"}, 404)

    # find best.pt path
    best_pt = ""
    out = Path(job["output_dir"])
    candidate = out / "weights" / "best.pt"
    if candidate.exists():
        best_pt = str(candidate)

    return make_response({
        "status"    : job["status"],
        "log"       : "\n".join(job["log_lines"]),
        "output_dir": job["output_dir"],
        "best_pt"   : best_pt,
        "error"     : job["error"],
    }, 200)


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

