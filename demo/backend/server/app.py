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


def _get_session_export_folder(session_id: str) -> Path:
    """
    Get (and create) the export folder for a session.
    Folder name = video filename without extension.
    e.g. exports/my_video/
    """
    import re
    session = inference_api._InferenceAPI__get_session(session_id)
    video_path = session.get("video_path", "")
    # Extract filename without extension as folder name
    raw_name = os.path.splitext(os.path.basename(video_path))[0]
    # Keep only safe characters, truncate to 40 chars
    safe_name = re.sub(r"[^a-zA-Z0-9_\-]", "_", raw_name)[:40] or "export"
    export_folder = EXPORTS_PATH / safe_name
    os.makedirs(export_folder, exist_ok=True)
    return export_folder


@app.route("/export_session/<session_id>", methods=["GET"])
def export_session(session_id: str) -> Response:
    import json
    import shutil

    try:
        export_data = inference_api.export_session(session_id)
        export_folder = _get_session_export_folder(session_id)

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
                logger.info(f"Copied original video to {dest}")

        # Return JSON as download to browser
        response = make_response(json.dumps(export_data, ensure_ascii=False, indent=2))
        response.headers["Content-Type"] = "application/json"
        response.headers["Content-Disposition"] = "attachment; filename=tracking.json"
        # Tell frontend which folder this session exports to
        response.headers["X-Export-Folder"] = export_folder.name
        return response
    except Exception as e:
        logger.error(f"Error exporting session {session_id}: {e}")
        return make_response(f"Error exporting session: {e}", 500)


@app.route("/save_masked_video/<session_id>", methods=["POST"])
def save_masked_video(session_id: str) -> Response:
    """
    Receive the masked MP4 (as binary) from the frontend and save it
    into the session's export folder as masked.mp4
    """
    try:
        export_folder = _get_session_export_folder(session_id)
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


@app.route(f"/{EXPORTS_PREFIX}/<path:path>", methods=["GET"])
def send_exported_file(path: str):
    try:
        return send_from_directory(
            str(EXPORTS_PATH), path)
    except:
        raise ValueError("resource not found")


# TOOD: Protect route with ToS permission check
@app.route("/propagate_in_video", methods=["POST"])
def propagate_in_video() -> Response:
    data = request.json
    args = {
        "session_id": data["session_id"],
        "start_frame_index": data.get("start_frame_index", 0),
    }

    boundary = "frame"
    frame = gen_track_with_mask_stream(boundary, **args)
    return Response(frame, mimetype="multipart/x-savi-stream; boundary=" + boundary)


def gen_track_with_mask_stream(
    boundary: str,
    session_id: str,
    start_frame_index: int,
) -> Generator[bytes, None, None]:
    with inference_api.autocast_context():
        request = PropagateInVideoRequest(
            type="propagate_in_video",
            session_id=session_id,
            start_frame_index=start_frame_index,
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
    app.run(host="0.0.0.0", port=5000)
