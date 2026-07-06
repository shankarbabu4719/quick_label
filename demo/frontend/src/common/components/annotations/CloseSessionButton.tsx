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
import PrimaryCTAButton from '@/common/components/button/PrimaryCTAButton';
import useDownloadVideo from '@/common/components/options/useDownloadVideo';
import useVideo from '@/common/components/video/editor/useVideo';
import Logger from '@/common/logger/Logger';
import {cropRangeAtom, objectLabelsAtom, sessionAtom, trackletObjectsAtom} from '@/demo/atoms';
import {INFERENCE_API_ENDPOINT} from '@/demo/DemoConfig';
import {ChevronRight} from '@carbon/icons-react';
import {useAtomValue} from 'jotai';
import {useState} from 'react';

type Props = {
  onSessionClose: () => void;
};

export default function CloseSessionButton({onSessionClose}: Props) {
  const video = useVideo();
  const session = useAtomValue(sessionAtom);
  const cropRange = useAtomValue(cropRangeAtom);
  const objectLabels = useAtomValue(objectLabelsAtom);
  const tracklets = useAtomValue(trackletObjectsAtom);
  const {download} = useDownloadVideo();
  const [saving, setSaving] = useState(false);

  async function handleCloseSession() {
    video?.logAnnotations();
    setSaving(true);

    try {
      // 0. Send custom object labels to backend before export
      if (session != null && Object.keys(objectLabels).length > 0) {
        try {
          // Build labels map: {object_id: label_string}
          const labelsMap: Record<string, string> = {};
          tracklets.forEach(t => {
            const customLabel = objectLabels[t.id];
            if (customLabel) labelsMap[String(t.id)] = customLabel;
          });
          await fetch(`${INFERENCE_API_ENDPOINT}/update_labels/${session.id}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({labels: labelsMap}),
          });
        } catch (err) {
          Logger.error('update_labels failed (non-fatal):', err);
        }
      }

      // 1. Trim video to crop range if set
      if (session != null && (cropRange.startFrame > 0 || cropRange.endFrame >= 0)) {
        try {
          await fetch(`${INFERENCE_API_ENDPOINT}/trim_video/${session.id}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
              start_frame: cropRange.startFrame,
              end_frame: cropRange.endFrame >= 0 ? cropRange.endFrame : undefined,
              fps: 30,
            }),
          });
        } catch (err) {
          Logger.error('trim failed (non-fatal):', err);
        }
      }

      // 2. Auto-save tracking.json to exports folder
      if (session != null) {
        try {
          const params = new URLSearchParams();
          if (cropRange.startFrame > 0) params.set('start_frame', String(cropRange.startFrame));
          if (cropRange.endFrame >= 0) params.set('end_frame', String(cropRange.endFrame));
          const query = params.toString() ? `?${params.toString()}` : '';
          await fetch(`${INFERENCE_API_ENDPOINT}/export_session/${session.id}${query}`);
          // export_session already saves tracking.json + original.mp4 to disk
        } catch (err) {
          Logger.error('export_session failed (non-fatal):', err);
        }
      }

      // 3. Auto-encode + save masked video to exports folder
      if (session != null) {
        try {
          const file = await download(false); // encode without downloading to browser
          if (file) {
            const blob = new Blob([file], {type: 'video/mp4'});
            await fetch(`${INFERENCE_API_ENDPOINT}/save_masked_video/${session.id}`, {
              method: 'POST',
              headers: {'Content-Type': 'video/mp4'},
              body: blob,
            });
          }
        } catch (err) {
          Logger.error('masked video save failed (non-fatal):', err);
        }
      }
    } finally {
      setSaving(false);
      onSessionClose();
    }
  }

  return (
    <PrimaryCTAButton
      onClick={handleCloseSession}
      endIcon={saving ? undefined : <ChevronRight />}>
      {saving ? 'Saving...' : 'Good to go'}
    </PrimaryCTAButton>
  );
}
