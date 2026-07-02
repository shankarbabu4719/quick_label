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
import {useAtomValue} from 'jotai';
import {sessionAtom} from '@/demo/atoms';
import {useCallback, useState} from 'react';
import OptionButton from './OptionButton';
import {DocumentDownload} from '@carbon/icons-react';

export default function DownloadJSONOption() {
  const [downloading, setDownloading] = useState(false);
  const session = useAtomValue(sessionAtom);

  const handleDownloadJSON = useCallback(async () => {
    if (!session) {
      alert('No active session!');
      return;
    }

    setDownloading(true);
    try {
      const response = await fetch(`http://localhost:7263/export_session/${session.id}`);
      if (!response.ok) {
        throw new Error('Failed to export session');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'tracking_export.json';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename=([^;]+)/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error('Error downloading JSON:', e);
      alert('Failed to download tracking data');
    } finally {
      setDownloading(false);
    }
  }, [session]);

  return (
    <div className="mt-4">
      <OptionButton
        title="Download Tracking JSON"
        Icon={DocumentDownload}
        loadingProps={{
          loading: downloading,
          label: 'Downloading...',
        }}
        onClick={handleDownloadJSON}
      />
    </div>
  );
}
