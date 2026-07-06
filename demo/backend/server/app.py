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


@app.route("/extract_frames/<session_id>", methods=["GET"])
def extract_frames(session_id: str) -> Response:
    """
    Extract frames from the exported masked video at a given FPS and
    return them as a ZIP file.

    Query params:
      fps         - frames per second to extract (default: 5)
      start_frame - first frame index (optional, uses crop range)
      end_frame   - last frame index (optional, uses crop range)
    """
    import json, shutil, subprocess, tempfile, zipfile

    try:
        fps = float(request.args.get("fps", 5))
        start_frame = request.args.get("start_frame", type=int, default=None)
        end_frame = request.args.get("end_frame", type=int, default=None)

        # Find the export folder for this session
        try:
            session = inference_api._InferenceAPI__get_session(session_id)
            video_path = session.get("video_path", "")
            raw_name = os.path.splitext(os.path.basename(video_path))[0]
            import re
            safe_name = re.sub(r"[^a-zA-Z0-9_\-]", "_", raw_name)[:40] or "export"
            export_folder = EXPORTS_PATH / safe_name
        except RuntimeError:
            # Session expired — find most recent export folder
            import re
            folders = sorted(
                [f for f in EXPORTS_PATH.iterdir() if f.is_dir()],
                key=lambda f: f.stat().st_mtime, reverse=True
            ) if EXPORTS_PATH.exists() else []
            export_folder = folders[0] if folders else EXPORTS_PATH

        # Prefer original video for frame extraction (masked may have encoding issues)
        # masked.mp4 is encoded by browser WebCodecs which may have duration metadata issues
        video_file = export_folder / "original.mp4"
        if not video_file.exists():
            video_file = export_folder / "masked.mp4"
        if not os.path.isfile(str(video_file)):
            return make_response({"error": "No video found for this session"}, 404)

        ffmpeg = shutil.which("ffmpeg")
        if not ffmpeg:
            return make_response({"error": "ffmpeg not found"}, 500)

        with tempfile.TemporaryDirectory() as tmpdir:
            frames_dir = os.path.join(tmpdir, "frames")
            os.makedirs(frames_dir)

            # Get actual video fps for accurate frame extraction
            try:
                import shutil as _sh
                ffprobe_path = _sh.which("ffprobe") or ffmpeg.replace("ffmpeg", "ffprobe")
                ffprobe_result = subprocess.run(
                    [ffprobe_path, "-v", "quiet", "-show_entries",
                     "stream=nb_frames,r_frame_rate,duration",
                     "-select_streams", "v:0", "-of", "json", str(video_file)],
                    capture_output=True, text=True
                )
                probe_data = json.loads(ffprobe_result.stdout)
                stream = probe_data.get("streams", [{}])[0]
                effective_fps = fps  # always use user-selected fps
            except Exception:
                effective_fps = fps

            # Build ffmpeg command to extract frames at user-selected FPS
            cmd = [ffmpeg, "-y", "-i", str(video_file),
                   "-vf", f"fps={effective_fps}",
                   os.path.join(frames_dir, "frame_%06d.png")]

            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                logger.error(f"ffmpeg extract failed: {result.stderr}")
                return make_response({"error": "Failed to extract frames"}, 500)

            # Derive a clean folder name from video filename
            video_stem = os.path.splitext(os.path.basename(str(video_file)))[0][:20]
            folder_name = f"{video_stem}_frames_{int(effective_fps)}fps"

            # Save frames directly to exports folder (no ZIP)
            frames_output_dir = export_folder / folder_name
            os.makedirs(frames_output_dir, exist_ok=True)

            # Copy PNG frames + write per-frame JSON
            tracking_data = {}
            tracking_json_path = export_folder / "tracking.json"
            if tracking_json_path.exists():
                try:
                    with open(tracking_json_path, "r", encoding="utf-8") as tf:
                        td = json.load(tf)
                    for frame in td.get("frames", []):
                        tracking_data[frame["frame_index"]] = {
                            "frame_index": frame["frame_index"],
                            "objects": td.get("objects", []),
                            "masks": frame.get("masks", []),
                        }
                except Exception as e:
                    logger.warning(f"Could not load tracking.json: {e}")

            frame_files = sorted(os.listdir(frames_dir))
            source_fps_val = 30.0
            saved_files = []
            for i, fname in enumerate(frame_files):
                if not fname.endswith(".png"):
                    continue
                # Copy PNG to output dir
                src = os.path.join(frames_dir, fname)
                dst = frames_output_dir / fname
                import shutil as _shutil
                _shutil.copy2(src, dst)
                saved_files.append(fname)

                # Write per-frame JSON
                source_frame_idx = int(round(
                    (start_frame or 0) + i * (source_fps_val / effective_fps)
                ))
                json_fname = os.path.splitext(fname)[0] + ".json"
                frame_json = tracking_data.get(source_frame_idx, {
                    "frame_index": source_frame_idx,
                    "objects": [],
                    "masks": [],
                    "note": "No mask data for this frame",
                })
                with open(frames_output_dir / json_fname, "w", encoding="utf-8") as jf:
                    json.dump(frame_json, jf, indent=2)

            logger.info(f"Saved {len(saved_files)} frames to {frames_output_dir}")

        return make_response({
            "success": True,
            "folder": str(frames_output_dir),
            "folder_name": folder_name,
            "frame_count": len(saved_files),
            "fps": effective_fps,
        }, 200)

    except RuntimeError as e:
        return make_response({"error": str(e)}, 404)
    except Exception as e:
        logger.error(f"Error extracting frames: {e}")
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
