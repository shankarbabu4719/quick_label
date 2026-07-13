/**
 * Extract Frames Option
 * Extracts frames from the exported project at a user-selected FPS.
 * After extraction, offers a YOLO dataset conversion step via labelme2yolo.
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
  const [fps, setFps]           = useState<number>(5);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted]   = useState<{
    projectName: string;
    framesDir: string;
    frameCount: number;
  } | null>(null);

  // YOLO convert state
  const [valPct, setValPct]         = useState(20);
  const [converting, setConverting] = useState(false);
  const [yoloResult, setYoloResult] = useState<{
    trainCount: number; valCount: number; yoloDir: string;
  } | null>(null);
  const [yoloError, setYoloError]   = useState('');

  const session   = useAtomValue(sessionAtom);
  const cropRange = useAtomValue(cropRangeAtom);

  // ── Extract frames ────────────────────────────────────────────────
  const handleExtract = useCallback(async () => {
    if (!session) { alert('No active session!'); return; }
    setExtracting(true);
    setExtracted(null);
    setYoloResult(null);
    setYoloError('');
    try {
      const infoResp = await fetch(
        `${INFERENCE_API_ENDPOINT}/session_export_info/${session.id}`,
      );
      if (!infoResp.ok) throw new Error('Session not exported yet');
      const info = await infoResp.json();
      const projectName = info.project_name;
      if (!projectName) throw new Error('No export folder for this session');

      const response = await fetch(
        `${INFERENCE_API_ENDPOINT}/extract_frames/${projectName}`,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({fps, source: 'original'}),
        },
      );
      if (!response.ok) throw new Error('Failed to extract frames');
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Unknown error');

      setExtracted({
        projectName,
        framesDir: data.frames_dir,
        frameCount: data.frame_count,
      });
    } catch (e) {
      Logger.error('Failed to extract frames:', e);
      alert('Failed to extract frames. Make sure the project is exported first.');
    } finally {
      setExtracting(false);
    }
  }, [session, fps, cropRange]);

  // ── Convert to YOLO ───────────────────────────────────────────────
  const handleYoloConvert = useCallback(async () => {
    if (!extracted) return;
    setConverting(true);
    setYoloError('');
    try {
      const r = await fetch(
        `${INFERENCE_API_ENDPOINT}/labelme2yolo/${extracted.projectName}`,
        {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            frames_dir: extracted.framesDir,
            val_size: valPct / 100,
          }),
        },
      );
      const d = await r.json();
      if (!r.ok || !d.success) {
        setYoloError(d.error || 'Conversion failed');
        return;
      }
      setYoloResult({
        trainCount: d.train_count,
        valCount:   d.val_count,
        yoloDir:    d.yolo_dir,
      });
    } catch (e) {
      setYoloError('Network error — is the backend running?');
    } finally {
      setConverting(false);
    }
  }, [extracted, valPct]);

  return (
    <div style={{width: '100%'}}>

      {/* ── FPS selector ── */}
      <div style={{
        display: 'flex', alignItems: 'center',
        gap: 8, marginBottom: 8, flexWrap: 'wrap',
      }}>
        <span style={{
          fontSize: 12, color: 'rgba(255,255,255,0.4)',
          fontWeight: 600, letterSpacing: '0.05em',
          textTransform: 'uppercase', flexShrink: 0,
        }}>FPS:</span>
        {FPS_OPTIONS.map(f => (
          <button
            key={f}
            onClick={() => setFps(f)}
            style={{
              padding: '4px 10px', fontSize: 12, fontWeight: 600,
              border: fps === f ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.15)',
              borderRadius: 6,
              background: fps === f ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
              color: fps === f ? '#818cf8' : 'rgba(255,255,255,0.5)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
            {f}
          </button>
        ))}
      </div>

      {/* ── Extract button ── */}
      <OptionButton
        title={`Extract Frames @ ${fps} FPS`}
        Icon={Image}
        loadingProps={{loading: extracting, label: 'Extracting...'}}
        onClick={handleExtract}
      />

      {/* ── Success: frames extracted ── */}
      {extracted && (
        <div style={{marginTop: 12}}>
          <div style={{
            padding: '8px 12px', borderRadius: 8,
            background: 'rgba(34,197,94,0.08)',
            border: '1px solid rgba(34,197,94,0.2)',
            fontSize: 12, color: '#86efac', marginBottom: 12,
          }}>
            ✅ <strong>{extracted.frameCount}</strong> frames extracted →{' '}
            <code style={{fontSize: 10}}>{extracted.framesDir}/</code>
          </div>

          {/* ── YOLO Dataset Convert ── */}
          {!yoloResult ? (
            <div style={{
              padding: '14px', borderRadius: 10,
              background: 'rgba(99,102,241,0.07)',
              border: '1px solid rgba(99,102,241,0.2)',
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: '#a5b4fc',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                marginBottom: 10,
              }}>🗂 Convert to YOLO Dataset</div>

              {/* Val% label */}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 8,
              }}>
                <span style={{fontSize: 11, color: 'rgba(255,255,255,0.4)'}}>
                  Validation size
                </span>
                <span style={{
                  fontSize: 12, fontWeight: 700, color: '#a5b4fc',
                  background: 'rgba(99,102,241,0.15)',
                  padding: '1px 8px', borderRadius: 5,
                }}>
                  val {valPct}% · train {100 - valPct}%
                </span>
              </div>

              {/* Preset buttons */}
              <div style={{display: 'flex', gap: 5, marginBottom: 8}}>
                {[10, 15, 20, 25, 30].map(v => (
                  <button
                    key={v}
                    onClick={() => setValPct(v)}
                    style={{
                      flex: 1, padding: '5px 0',
                      fontSize: 11, fontWeight: 600,
                      borderRadius: 6, cursor: 'pointer', border: 'none',
                      background: valPct === v ? '#6366f1' : 'rgba(255,255,255,0.07)',
                      color: valPct === v ? '#fff' : 'rgba(255,255,255,0.4)',
                      transition: 'all 0.15s',
                    }}>
                    {v}%
                  </button>
                ))}
              </div>

              {/* Slider */}
              <input
                type="range" min={5} max={50} step={5}
                value={valPct}
                onChange={e => setValPct(Number(e.target.value))}
                style={{
                  width: '100%', accentColor: '#6366f1',
                  cursor: 'pointer', marginBottom: 10,
                }}
              />

              {/* Error */}
              {yoloError && (
                <div style={{
                  marginBottom: 8, padding: '6px 10px', borderRadius: 6,
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  fontSize: 11, color: '#fca5a5',
                }}>⚠️ {yoloError}</div>
              )}

              {/* Convert button */}
              <button
                onClick={handleYoloConvert}
                disabled={converting}
                style={{
                  width: '100%', padding: '9px 0',
                  background: converting ? 'rgba(99,102,241,0.4)' : '#6366f1',
                  border: 'none', borderRadius: 8,
                  color: '#fff', fontSize: 12, fontWeight: 700,
                  cursor: converting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 6,
                  boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
                }}>
                {converting ? (
                  <>
                    <span style={{
                      width: 11, height: 11, borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      animation: 'spin 0.7s linear infinite',
                      display: 'inline-block',
                    }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    Running labelme2yolo...
                  </>
                ) : <>🗂 Convert to YOLO (val {valPct}%)</>}
              </button>
            </div>
          ) : (
            /* YOLO success */
            <div style={{
              padding: '12px 14px', borderRadius: 10,
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.25)',
            }}>
              <div style={{
                fontSize: 12, fontWeight: 700, color: '#a5b4fc',
                marginBottom: 8,
              }}>🎉 YOLO Dataset Ready!</div>
              <div style={{
                display: 'flex', gap: 20, marginBottom: 10,
              }}>
                <div style={{textAlign: 'center'}}>
                  <div style={{fontSize: 20, fontWeight: 800, color: '#6366f1'}}>
                    {yoloResult.trainCount}
                  </div>
                  <div style={{fontSize: 10, color: 'rgba(255,255,255,0.4)'}}>train</div>
                </div>
                <div style={{color: 'rgba(255,255,255,0.15)', alignSelf: 'center'}}>·</div>
                <div style={{textAlign: 'center'}}>
                  <div style={{fontSize: 20, fontWeight: 800, color: '#818cf8'}}>
                    {yoloResult.valCount}
                  </div>
                  <div style={{fontSize: 10, color: 'rgba(255,255,255,0.4)'}}>val</div>
                </div>
              </div>
              <div style={{
                fontFamily: 'monospace', fontSize: 10,
                color: 'rgba(255,255,255,0.35)', lineHeight: 1.7,
                padding: '6px 8px', background: 'rgba(0,0,0,0.25)', borderRadius: 6,
              }}>
                <div style={{color: '#818cf8', marginBottom: 2}}>📁 {yoloResult.yoloDir}/</div>
                <div>&nbsp;&nbsp;images/train/ &nbsp;images/val/</div>
                <div>&nbsp;&nbsp;labels/train/ &nbsp;labels/val/</div>
                <div>&nbsp;&nbsp;dataset.yaml</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
