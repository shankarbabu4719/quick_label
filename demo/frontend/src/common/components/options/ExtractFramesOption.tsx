/**
 * Extract Frames Option
 * Extracts frames from the masked video at a user-selected FPS and
 * downloads them as a ZIP file.
 */
import OptionButton from '@/common/components/options/OptionButton';
import Logger from '@/common/logger/Logger';
import {cropRangeAtom, sessionAtom} from '@/demo/atoms';
import {INFERENCE_API_ENDPOINT} from '@/demo/DemoConfig';
import {Image} from '@carbon/icons-react';
import {useAtomValue} from 'jotai';
import {useCallback, useState} from 'react';

const FPS_OPTIONS = [1, 2, 5, 10, 24, 30];

export default function ExtractFramesOption() {
  const [fps, setFps] = useState<number>(5);
  const [extracting, setExtracting] = useState(false);
  const session = useAtomValue(sessionAtom);
  const cropRange = useAtomValue(cropRangeAtom);

  const handleExtract = useCallback(async () => {
    if (!session) {
      alert('No active session!');
      return;
    }
    setExtracting(true);
    try {
      const params = new URLSearchParams({fps: String(fps)});
      if (cropRange.startFrame > 0) params.set('start_frame', String(cropRange.startFrame));
      if (cropRange.endFrame >= 0) params.set('end_frame', String(cropRange.endFrame));

      const response = await fetch(
        `${INFERENCE_API_ENDPOINT}/extract_frames/${session.id}?${params.toString()}`,
      );
      if (!response.ok) throw new Error('Failed to extract frames');

      const blob = await response.blob();
      if (blob.size < 100) {
        alert(`No frames extracted. Your crop range may be too short for ${fps} FPS.\nTry a lower FPS (e.g. 1 or 2) or select a longer video segment.`);
        return;
      }

      // Get filename from header
      const disposition = response.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename=([^;]+)/);
      const filename = match ? match[1] : `frames_${fps}fps.zip`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      Logger.error('Failed to extract frames:', e);
      alert('Failed to extract frames. Make sure the project is exported first.');
    } finally {
      setExtracting(false);
    }
  }, [session, fps, cropRange]);

  return (
    <div style={{width: '100%'}}>
      {/* FPS Selector */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
        flexWrap: 'wrap',
      }}>
        <span style={{
          fontSize: 12,
          color: 'rgba(255,255,255,0.4)',
          fontWeight: 600,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          flexShrink: 0,
        }}>
          FPS:
        </span>
        {FPS_OPTIONS.map(f => (
          <button
            key={f}
            onClick={() => setFps(f)}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 600,
              border: fps === f
                ? '1px solid #6366f1'
                : '1px solid rgba(255,255,255,0.15)',
              borderRadius: 6,
              background: fps === f
                ? 'rgba(99,102,241,0.2)'
                : 'rgba(255,255,255,0.05)',
              color: fps === f ? '#818cf8' : 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}>
            {f}
          </button>
        ))}
      </div>

      {/* Extract Button */}
      <OptionButton
        title={`Extract Frames @ ${fps} FPS`}
        Icon={Image}
        loadingProps={{loading: extracting, label: 'Extracting...'}}
        onClick={handleExtract}
      />
    </div>
  );
}
