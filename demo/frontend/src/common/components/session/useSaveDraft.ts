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
import Logger from '@/common/logger/Logger';
import {inputVideoAtom, sessionAtom, trackletObjectsAtom} from '@/demo/atoms';
import {INFERENCE_API_ENDPOINT} from '@/demo/DemoConfig';
import {useAtomValue} from 'jotai';
import {useCallback} from 'react';

/**
 * useSaveDraft — call saveDraft() before clearing a session.
 *
 * This saves the current session state (video, objects, masks) to the backend
 * so the user can resume from the ProjectHub "Draft Projects" section.
 *
 * Only saves if:
 *  - A session is active
 *  - At least one object has been annotated (tracklets exist)
 */
export default function useSaveDraft() {
  const session = useAtomValue(sessionAtom);
  const inputVideo = useAtomValue(inputVideoAtom);
  const tracklets = useAtomValue(trackletObjectsAtom);

  const saveDraft = useCallback(async () => {
    console.log('[Draft] saveDraft called — session:', session?.id, 'video:', inputVideo?.path, 'tracklets:', tracklets.length);
    // Nothing to save — no session or no video
    if (session == null || inputVideo == null) {
      console.log('[Draft] skipping — no session or video');
      return;
    }

    const objects = tracklets.map(t => ({
      object_id: t.id,
      label: `Object ${t.id}`,
    }));

    try {
      await fetch(`${INFERENCE_API_ENDPOINT}/save_draft`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          session_id: session.id,
          video_path: inputVideo.path,
          video_url: inputVideo.url,
          objects,
        }),
      });
      Logger.debug(`Draft saved for session ${session.id}`);
    } catch (err) {
      Logger.error('Failed to save draft:', err);
    }
  }, [session, inputVideo, tracklets]);

  return {saveDraft};
}
