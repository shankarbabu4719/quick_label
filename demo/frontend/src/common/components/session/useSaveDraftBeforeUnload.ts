/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {inputVideoAtom, sessionAtom, trackletObjectsAtom} from '@/demo/atoms';
import {INFERENCE_API_ENDPOINT} from '@/demo/DemoConfig';
import {useAtomValue} from 'jotai';
import {useEffect, useMemo} from 'react';

/**
 * useSaveDraftBeforeUnload — mirrors useCloseSessionBeforeUnload but for drafts.
 *
 * When the user closes the tab or navigates away mid-session with objects
 * annotated, we fire a keepalive fetch to save the current state as a draft.
 */
export default function useSaveDraftBeforeUnload() {
  const session = useAtomValue(sessionAtom);
  const inputVideo = useAtomValue(inputVideoAtom);
  const tracklets = useAtomValue(trackletObjectsAtom);

  const draftPayload = useMemo(() => {
    // Save whenever a session + video exists, regardless of tracklet count
    if (session == null || inputVideo == null) {
      return null;
    }
    return JSON.stringify({
      session_id: session.id,
      video_path: inputVideo.path,
      video_url: inputVideo.url,
      objects: tracklets.map(t => ({
        object_id: t.id,
        label: `Object ${t.id}`,
      })),
    });
  }, [session, inputVideo, tracklets]);

  useEffect(() => {
    function onBeforeUnload() {
      if (draftPayload == null) return;

      fetch(`${INFERENCE_API_ENDPOINT}/save_draft`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        keepalive: true,
        body: draftPayload,
      });
    }

    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [draftPayload]);
}
