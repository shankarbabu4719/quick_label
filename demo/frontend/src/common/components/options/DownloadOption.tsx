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
import {Package} from '@carbon/icons-react';
import OptionButton from './OptionButton';
import useDownloadVideo from './useDownloadVideo';
import {useAtomValue} from 'jotai';
import {sessionAtom} from '@/demo/atoms';

export default function DownloadOption() {
  const {download, state} = useDownloadVideo();
  const session = useAtomValue(sessionAtom);

  async function handleDownload() {
    const file = await download(true);
    if (session?.id && file) {
      try {
        const blob = new Blob([file], {type: 'video/mp4'});
        await fetch(`http://localhost:7263/save_masked_video/${session.id}`, {
          method: 'POST',
          headers: {'Content-Type': 'video/mp4'},
          body: blob,
        });
      } catch (e) {
        console.warn('Could not save masked video to server:', e);
      }
    }
  }

  return (
    <div style={{width: '100%'}}>
      <OptionButton
        title="Download Masked Video"
        Icon={Package}
        loadingProps={{
          loading: state === 'started' || state === 'encoding',
          label: 'Encoding...',
        }}
        onClick={handleDownload}
      />
    </div>
  );
}
