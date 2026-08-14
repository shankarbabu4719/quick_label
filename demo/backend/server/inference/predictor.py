# Copyright (c) Meta Platforms, Inc. and affiliates.
# All rights reserved.
# This source code is licensed under the license found in the
# LICENSE file in the root directory of this source tree.

import contextlib
import gc
import json
import logging
import os
import re
import time
import traceback
import uuid
from pathlib import Path
from threading import Lock
from typing import Any, Dict, Generator, List

import numpy as np
import torch
from app_conf import APP_ROOT, MODEL_SIZE, EXPORTS_PATH
from inference.data_types import (
    AddMaskRequest,
    AddPointsRequest,
    CancelPorpagateResponse,
    CancelPropagateInVideoRequest,
    ClearPointsInFrameRequest,
    ClearPointsInVideoRequest,
    ClearPointsInVideoResponse,
    CloseSessionRequest,
    CloseSessionResponse,
    Mask,
    PropagateDataResponse,
    PropagateDataValue,
    PropagateInVideoRequest,
    RemoveObjectRequest,
    RemoveObjectResponse,
    StartSessionRequest,
    StartSessionResponse,
)
from pycocotools.mask import decode as decode_masks, encode as encode_masks
from sam2.build_sam import build_sam2_video_predictor


logger = logging.getLogger(__name__)


class InferenceAPI:

    def __init__(self) -> None:
        super(InferenceAPI, self).__init__()

        self.session_states: Dict[str, Any] = {}
        self.score_thresh = 0.0  # SAM2 default; masks below this score are empty

        if MODEL_SIZE == "tiny":
            checkpoint = Path(APP_ROOT) / "checkpoints/sam2.1_hiera_tiny.pt"
            model_cfg = "configs/sam2.1/sam2.1_hiera_t.yaml"
        elif MODEL_SIZE == "small":
            checkpoint = Path(APP_ROOT) / "checkpoints/sam2.1_hiera_small.pt"
            model_cfg = "configs/sam2.1/sam2.1_hiera_s.yaml"
        elif MODEL_SIZE == "large":
            checkpoint = Path(APP_ROOT) / "checkpoints/sam2.1_hiera_large.pt"
            model_cfg = "configs/sam2.1/sam2.1_hiera_l.yaml"
        else:  # base_plus (default)
            checkpoint = Path(APP_ROOT) / "checkpoints/sam2.1_hiera_base_plus.pt"
            model_cfg = "configs/sam2.1/sam2.1_hiera_b+.yaml"

        # ── Device selection ──────────────────────────────────────
        force_cpu_device = os.environ.get("SAM2_DEMO_FORCE_CPU_DEVICE", "0") == "1"
        if force_cpu_device:
            logger.info("Forcing CPU device for SAM2 demo")
            device = torch.device("cpu")
        elif torch.cuda.is_available():
            device = torch.device("cuda")
            logger.info("Using CUDA GPU")
        elif torch.backends.mps.is_available():
            device = torch.device("mps")
            logger.info("Using MPS (Apple GPU) — fallback ops go to CPU")
        else:
            device = torch.device("cpu")
            logger.info("Using CPU (no GPU available)")

        logger.info(f"✅ SAM2 device: {device}")

        if device.type == "cuda":
            if torch.cuda.get_device_properties(0).major >= 8:
                torch.backends.cuda.matmul.allow_tf32 = True
                torch.backends.cudnn.allow_tf32 = True
        elif device.type == "mps":
            # Ensure fallback is enabled for unsupported MPS ops
            os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")
            logger.info("MPS fallback enabled for unsupported ops")

        # Force float32 globally to avoid dtype mismatches on MPS
        torch.set_default_dtype(torch.float32)

        self.device = device
        self.predictor = build_sam2_video_predictor(
            model_cfg, checkpoint, device=device
        )
        # Ensure model stays in float32
        self.predictor = self.predictor.float()
        self.inference_lock = Lock()

    def autocast_context(self):
        # Never use autocast — keeps float32 on all devices
        return contextlib.nullcontext()

    def _clear_device_cache(self):
        """Free GPU memory cache — safe for CUDA, MPS, and CPU."""
        try:
            if self.device.type == "cuda":
                torch.cuda.empty_cache()
            elif self.device.type == "mps":
                gc.collect()
                torch.mps.empty_cache()
            else:
                gc.collect()
        except Exception as e:
            logger.warning(f"Could not clear device cache: {e}")

    # ── Session management ────────────────────────────────────────

    def start_session(self, request: StartSessionRequest) -> StartSessionResponse:
        with self.autocast_context(), self.inference_lock:
            session_id = str(uuid.uuid4())
            # Offload video frames to CPU on MPS to prevent memory fragmentation
            offload_video_to_cpu = self.device.type == "mps"
            inference_state = self.predictor.init_state(
                request.path,
                offload_video_to_cpu=offload_video_to_cpu,
            )
            self.session_states[session_id] = {
                "canceled": False,
                "state": inference_state,
                "masks_per_frame": {},
                "video_path": request.path,
                "object_labels": {},
            }
            logger.info(f"Started session {session_id} for {request.path}")
            return StartSessionResponse(session_id=session_id)

    def close_session(self, request: CloseSessionRequest) -> CloseSessionResponse:
        is_successful = self.__clear_session_state(request.session_id)
        return CloseSessionResponse(success=is_successful)

    # ── Point / mask input ────────────────────────────────────────

    def add_points(
        self, request: AddPointsRequest, test: str = ""
    ) -> PropagateDataResponse:
        with self.autocast_context(), self.inference_lock:
            session = self.__get_session(request.session_id)
            inference_state = session["state"]

            frame_idx = request.frame_index
            obj_id = request.object_id
            points = request.points
            labels = request.labels
            clear_old_points = request.clear_old_points

            frame_idx, object_ids, masks = self.predictor.add_new_points_or_box(
                inference_state=inference_state,
                frame_idx=frame_idx,
                obj_id=obj_id,
                points=points,
                labels=labels,
                clear_old_points=clear_old_points,
                normalize_coords=False,
            )

            masks_binary = (masks > self.score_thresh)[:, 0].cpu().numpy()
            rle_mask_list = self.__get_rle_mask_list(
                object_ids=object_ids, masks=masks_binary
            )

            session["masks_per_frame"][frame_idx] = [
                {"object_id": r.object_id, "mask": {"counts": r.mask.counts, "size": r.mask.size}}
                for r in rle_mask_list
            ]

            return PropagateDataResponse(
                frame_index=frame_idx,
                results=rle_mask_list,
            )

    def add_mask(self, request: AddMaskRequest) -> PropagateDataResponse:
        """Add a mask on a specific frame (overwrites previous points on that frame)."""
        with self.autocast_context(), self.inference_lock:
            session_id = request.session_id
            frame_idx = request.frame_index
            obj_id = request.object_id
            rle_mask = {
                "counts": request.mask.counts,
                "size": request.mask.size,
            }
            mask = decode_masks(rle_mask)
            logger.info(f"add mask on frame {frame_idx} in session {session_id}: {obj_id=}, {mask.shape=}")

            session = self.__get_session(session_id)
            inference_state = session["state"]

            # FIX: was self.model — should be self.predictor
            frame_idx, obj_ids, video_res_masks = self.predictor.add_new_mask(
                inference_state=inference_state,
                frame_idx=frame_idx,
                obj_id=obj_id,
                mask=torch.tensor(mask > 0),
            )
            masks_binary = (video_res_masks > self.score_thresh)[:, 0].cpu().numpy()
            rle_mask_list = self.__get_rle_mask_list(
                object_ids=obj_ids, masks=masks_binary
            )
            return PropagateDataResponse(
                frame_index=frame_idx,
                results=rle_mask_list,
            )

    def clear_points_in_frame(
        self, request: ClearPointsInFrameRequest
    ) -> PropagateDataResponse:
        """Remove all input points in a specific frame."""
        with self.autocast_context(), self.inference_lock:
            session_id = request.session_id
            frame_idx = request.frame_index
            obj_id = request.object_id
            logger.info(f"clear inputs on frame {frame_idx} in session {session_id}: {obj_id=}")
            session = self.__get_session(session_id)
            inference_state = session["state"]
            frame_idx, obj_ids, video_res_masks = (
                self.predictor.clear_all_prompts_in_frame(
                    inference_state, frame_idx, obj_id
                )
            )
            masks_binary = (video_res_masks > self.score_thresh)[:, 0].cpu().numpy()
            rle_mask_list = self.__get_rle_mask_list(
                object_ids=obj_ids, masks=masks_binary
            )
            return PropagateDataResponse(
                frame_index=frame_idx,
                results=rle_mask_list,
            )

    def clear_points_in_video(
        self, request: ClearPointsInVideoRequest
    ) -> ClearPointsInVideoResponse:
        """Remove all input points in all frames throughout the video."""
        with self.autocast_context(), self.inference_lock:
            session_id = request.session_id
            logger.info(f"clear all inputs across the video in session {session_id}")
            session = self.__get_session(session_id)
            inference_state = session["state"]
            self.predictor.reset_state(inference_state)
            return ClearPointsInVideoResponse(success=True)

    def remove_object(self, request: RemoveObjectRequest) -> RemoveObjectResponse:
        """Remove an object id from the tracking state."""
        with self.autocast_context(), self.inference_lock:
            session_id = request.session_id
            obj_id = request.object_id
            logger.info(f"remove object in session {session_id}: {obj_id=}")
            session = self.__get_session(session_id)
            inference_state = session["state"]
            new_obj_ids, updated_frames = self.predictor.remove_object(
                inference_state, obj_id
            )
            results = []
            for frame_index, video_res_masks in updated_frames:
                masks = (video_res_masks > self.score_thresh)[:, 0].cpu().numpy()
                rle_mask_list = self.__get_rle_mask_list(
                    object_ids=new_obj_ids, masks=masks
                )
                results.append(
                    PropagateDataResponse(
                        frame_index=frame_index,
                        results=rle_mask_list,
                    )
                )
            return RemoveObjectResponse(results=results)

    # ── Propagation (tracking) ────────────────────────────────────

    def propagate_in_video(
        self, request: PropagateInVideoRequest
    ) -> Generator[PropagateDataResponse, None, None]:
        """
        Propagate existing input points across all frames to track objects.
        Runs forward then backward from the selected frame.
        Auto-saves progress every 20 frames and on crash.
        """
        session_id = request.session_id
        start_frame_idx = request.start_frame_index
        end_frame_idx = request.end_frame_index  # None = all frames
        propagation_direction = "both"
        max_frame_num_to_track = None

        with self.autocast_context(), self.inference_lock:
            logger.info(
                f"propagate_in_video: session={session_id}, "
                f"start={start_frame_idx}, end={end_frame_idx}, dir={propagation_direction}"
            )
            try:
                session = self.__get_session(session_id)
                session["canceled"] = False
                inference_state = session["state"]

                total_frames_tracked = 0
                auto_save_interval = 20  # save every 20 frames

                # ── Forward propagation ───────────────────────────
                if propagation_direction in ["both", "forward"]:
                    frame_count = 0
                    logger.info(f"▶ Forward propagation starting from frame {start_frame_idx}")
                    for outputs in self.predictor.propagate_in_video(
                        inference_state=inference_state,
                        start_frame_idx=start_frame_idx,
                        max_frame_num_to_track=max_frame_num_to_track,
                        reverse=False,
                    ):
                        if session["canceled"]:
                            logger.info("Tracking canceled by user (forward)")
                            return

                        frame_idx, obj_ids, video_res_masks = outputs
                        frame_count += 1

                        if frame_count % 10 == 0:
                            logger.info(f"  Forward: frame {frame_idx} ({frame_count} processed)")

                        if end_frame_idx is not None and frame_idx > end_frame_idx:
                            break

                        masks_binary = (
                            (video_res_masks > self.score_thresh)[:, 0].cpu().numpy()
                        )
                        rle_mask_list = self.__get_rle_mask_list(
                            object_ids=obj_ids, masks=masks_binary
                        )
                        session["masks_per_frame"][frame_idx] = [
                            {"object_id": r.object_id, "mask": {"counts": r.mask.counts, "size": r.mask.size}}
                            for r in rle_mask_list
                        ]

                        # Auto-save + memory cleanup every N frames
                        if frame_count % auto_save_interval == 0:
                            self.__auto_save_session_no_lock(session_id, session)
                            self._clear_device_cache()
                            logger.info(f"  💾 Auto-saved {len(session['masks_per_frame'])} frames")

                        yield PropagateDataResponse(
                            frame_index=frame_idx,
                            results=rle_mask_list,
                        )

                    logger.info(f"▶ Forward complete: {frame_count} frames")
                    total_frames_tracked += frame_count

                # ── Backward propagation ──────────────────────────
                if propagation_direction in ["both", "backward"]:
                    frame_count = 0
                    logger.info(f"◀ Backward propagation starting from frame {start_frame_idx}")
                    for outputs in self.predictor.propagate_in_video(
                        inference_state=inference_state,
                        start_frame_idx=start_frame_idx,
                        max_frame_num_to_track=max_frame_num_to_track,
                        reverse=True,
                    ):
                        if session["canceled"]:
                            logger.info("Tracking canceled by user (backward)")
                            return

                        frame_idx, obj_ids, video_res_masks = outputs
                        frame_count += 1

                        if frame_count % 10 == 0:
                            logger.info(f"  Backward: frame {frame_idx} ({frame_count} processed)")

                        if frame_idx < start_frame_idx:
                            break

                        masks_binary = (
                            (video_res_masks > self.score_thresh)[:, 0].cpu().numpy()
                        )
                        rle_mask_list = self.__get_rle_mask_list(
                            object_ids=obj_ids, masks=masks_binary
                        )
                        session["masks_per_frame"][frame_idx] = [
                            {"object_id": r.object_id, "mask": {"counts": r.mask.counts, "size": r.mask.size}}
                            for r in rle_mask_list
                        ]

                        # Auto-save + memory cleanup every N frames
                        if frame_count % auto_save_interval == 0:
                            self.__auto_save_session_no_lock(session_id, session)
                            self._clear_device_cache()
                            logger.info(f"  💾 Auto-saved {len(session['masks_per_frame'])} frames")

                        yield PropagateDataResponse(
                            frame_index=frame_idx,
                            results=rle_mask_list,
                        )

                    logger.info(f"◀ Backward complete: {frame_count} frames")
                    total_frames_tracked += frame_count

                logger.info(f"✅ Tracking complete: {total_frames_tracked} total frames")

                # Final save on success
                self.__auto_save_session_no_lock(session_id, session)
                logger.info(f"💾 Final save: {len(session['masks_per_frame'])} frames")

            except Exception as e:
                logger.error(f"❌ Propagation error in session {session_id}: {e}")
                traceback.print_exc()
                # Emergency save
                try:
                    self.__auto_save_session_no_lock(session_id, session)
                    logger.info(f"💾 Emergency save: {len(session.get('masks_per_frame', {}))} frames saved")
                except Exception as save_err:
                    logger.error(f"Emergency save failed: {save_err}")
                raise
            finally:
                logger.info(f"propagation ended in session {session_id}")

    def cancel_propagate_in_video(
        self, request: CancelPropagateInVideoRequest
    ) -> CancelPorpagateResponse:
        session = self.__get_session(request.session_id)
        session["canceled"] = True
        return CancelPorpagateResponse(success=True)

    # ── Export ────────────────────────────────────────────────────

    def __auto_save_no_lock(self, session_id: str, session: dict) -> None:
        """Auto-save WITHOUT acquiring lock (called when lock already held)."""
        try:
            if not session.get("masks_per_frame"):
                return
            from pathlib import Path
            import json
            import os
            from app_conf import EXPORTS_PATH
            os.makedirs(EXPORTS_PATH, exist_ok=True)
            
            video_path = session.get("video_path", "")
            raw_name = os.path.splitext(os.path.basename(video_path))[0]
            safe_name = re.sub(r"[^a-zA-Z0-9_\-]", "_", raw_name)[:40] or "autosave"
            
            import time
            timestamp = int(time.time())
            autosave_folder = EXPORTS_PATH / f"{safe_name}_autosave_{timestamp}"
            os.makedirs(autosave_folder, exist_ok=True)
            
            # Get inference state directly
            inference_state = session["state"]
            obj_ids = inference_state.obj_ids if hasattr(inference_state, "obj_ids") else []
            num_frames = inference_state.num_frames if hasattr(inference_state, "num_frames") else 0
            custom_labels = session.get("object_labels", {})
            
            export_data = {
                "session_id": session_id,
                "video_path": video_path,
                "num_frames": num_frames,
                "objects": [{"object_id": oid, "label": custom_labels.get(oid, f"Object {oid+1}")} for oid in obj_ids],
                "frames": [{"frame_index": int(fi), "masks": masks} for fi, masks in sorted(session["masks_per_frame"].items())]
            }
            
            json_path = autosave_folder / "tracking.json"
            with open(json_path, "w") as f:
                json.dump(export_data, f, indent=2)
            
            marker_path = autosave_folder / ".autosave"
            with open(marker_path, "w") as f:
                f.write(f"Auto-saved at {timestamp}\nFrames: {len(session['masks_per_frame'])}\n")
            
            logger.info(f"💾 Auto-saved {len(session['masks_per_frame'])} frames")
        except Exception as e:
            logger.error(f"Auto-save failed: {e}")

    def export_session(self, session_id: str, start_frame: int = None, end_frame: int = None) -> dict:
        with self.autocast_context(), self.inference_lock:
            return self.__export_session_data(session_id, start_frame, end_frame)

    def __export_session_data(self, session_id: str, start_frame: int = None, end_frame: int = None) -> dict:
        """Export session data WITHOUT acquiring the lock (for internal use while lock is held)."""
        session = self.__get_session(session_id)
        inference_state = session["state"]

        obj_ids = []
        if hasattr(inference_state, "obj_ids"):
            obj_ids = inference_state.obj_ids
        elif isinstance(inference_state, dict) and "obj_ids" in inference_state:
            obj_ids = inference_state["obj_ids"]

        num_frames = 0
        if hasattr(inference_state, "num_frames"):
            num_frames = inference_state.num_frames
        elif isinstance(inference_state, dict) and "num_frames" in inference_state:
            num_frames = inference_state["num_frames"]

        custom_labels = session.get("object_labels", {})
        export_data = {
            "session_id": session_id,
            "video_path": session.get("video_path", ""),
            "num_frames": num_frames,
            "objects": [
                {
                    "object_id": obj_id,
                    "label": custom_labels.get(obj_id, f"Object {obj_id + 1}")
                }
                for obj_id in obj_ids
            ],
            "frames": []
        }

        for frame_idx, masks in sorted(session.get("masks_per_frame", {}).items()):
            fi = int(frame_idx)
            if start_frame is not None and fi < start_frame:
                continue
            if end_frame is not None and fi > end_frame:
                continue
            export_data["frames"].append({
                "frame_index": fi,
                "masks": masks
            })

        return export_data

    # ── Auto-save (no lock version — called while lock is already held) ───

    def __auto_save_session_no_lock(self, session_id: str, session: dict) -> None:
        """
        Save partial tracking progress to disk.
        IMPORTANT: Does NOT acquire inference_lock (already held by caller).
        """
        try:
            if not session.get("masks_per_frame"):
                return

            os.makedirs(EXPORTS_PATH, exist_ok=True)

            video_path = session.get("video_path", "")
            raw_name = os.path.splitext(os.path.basename(video_path))[0]
            safe_name = re.sub(r"[^a-zA-Z0-9_\-]", "_", raw_name)[:40] or "autosave"

            timestamp = int(time.time())
            autosave_folder = EXPORTS_PATH / f"{safe_name}_autosave_{timestamp}"
            os.makedirs(autosave_folder, exist_ok=True)

            # Build export data directly (no lock needed — we're already inside it)
            session_obj = self.session_states.get(session_id)
            if not session_obj:
                return

            inference_state = session_obj["state"]
            obj_ids = []
            if hasattr(inference_state, "obj_ids"):
                obj_ids = inference_state.obj_ids
            elif isinstance(inference_state, dict):
                obj_ids = inference_state.get("obj_ids", [])

            custom_labels = session_obj.get("object_labels", {})
            export_data = {
                "session_id": session_id,
                "video_path": session_obj.get("video_path", ""),
                "num_frames": getattr(inference_state, "num_frames", 0),
                "objects": [
                    {"object_id": oid, "label": custom_labels.get(oid, f"Object {oid + 1}")}
                    for oid in obj_ids
                ],
                "frames": [
                    {"frame_index": int(fi), "masks": masks}
                    for fi, masks in sorted(session_obj.get("masks_per_frame", {}).items())
                ]
            }

            json_path = autosave_folder / "tracking.json"
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(export_data, f, ensure_ascii=False, indent=2)

            marker_path = autosave_folder / ".autosave"
            with open(marker_path, "w") as f:
                f.write(f"Auto-saved at {timestamp}\n")
                f.write(f"Frames tracked: {len(session_obj.get('masks_per_frame', {}))}\n")
                f.write(f"Session ID: {session_id}\n")

            session["last_autosave"] = str(autosave_folder)
            logger.info(f"📁 Auto-saved to {autosave_folder.name}")

        except Exception as e:
            logger.error(f"Auto-save failed for session {session_id}: {e}")

    # ── Private helpers ───────────────────────────────────────────

    def __get_rle_mask_list(
        self, object_ids: List[int], masks: np.ndarray
    ) -> List[PropagateDataValue]:
        return [
            self.__get_mask_for_object(object_id=oid, mask=mask)
            for oid, mask in zip(object_ids, masks)
        ]

    def __get_mask_for_object(self, object_id: int, mask: np.ndarray) -> PropagateDataValue:
        mask_rle = encode_masks(np.array(mask, dtype=np.uint8, order="F"))
        mask_rle["counts"] = mask_rle["counts"].decode()
        return PropagateDataValue(
            object_id=object_id,
            mask=Mask(
                size=mask_rle["size"],
                counts=mask_rle["counts"],
            ),
        )

    def __get_session(self, session_id: str):
        session = self.session_states.get(session_id)
        if session is None:
            raise RuntimeError(f"Session {session_id} not found (may have expired)")
        return session

    def __get_session_stats(self) -> str:
        """Get a statistics string for live sessions. Safe for all devices."""
        live = []
        for sid, s in self.session_states.items():
            state = s.get("state", {})
            nf = getattr(state, "num_frames", state.get("num_frames", "?"))
            no = len(getattr(state, "obj_ids", state.get("obj_ids", [])))
            live.append(f"'{sid[:8]}' ({nf} frames, {no} objects)")

        # Device memory stats (safe for all devices)
        mem_str = ""
        try:
            if self.device.type == "cuda":
                used = torch.cuda.memory_allocated() // 1024**2
                reserved = torch.cuda.memory_reserved() // 1024**2
                mem_str = f", CUDA memory: {used}MiB used / {reserved}MiB reserved"
            elif self.device.type == "mps":
                mem_str = ", MPS GPU active"
        except Exception:
            pass

        return f"sessions: [{', '.join(live)}]{mem_str}"

    def __clear_session_state(self, session_id: str) -> bool:
        session = self.session_states.pop(session_id, None)
        if session is None:
            logger.warning(f"Cannot close session {session_id} — not found")
            return False
        self._clear_device_cache()
        logger.info(f"Closed session {session_id}. {self.__get_session_stats()}")
        return True
