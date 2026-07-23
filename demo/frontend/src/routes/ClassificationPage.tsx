/**
 * Classification Export Page
 * Step 1: Select project
 * Step 2: Configure fps + padding
 * Step 3: Export — crops tracked objects per frame, saves by class name
 */
import {useEffect, useState} from 'react';
import {useNavigate} from 'react-router-dom';

const API = 'http://localhost:7263';

const C = {
  bg: '#0B0D12', surface: '#13151C', surfaceHi: '#1C1F2A',
  border: 'rgba(255,255,255,0.07)', borderHi: 'rgba(255,255,255,0.14)',
  text: '#F0F2F7', textMuted: 'rgba(240,242,247,0.45)', textDim: 'rgba(240,242,247,0.25)',
  indigo: '#6366F1', indigoLo: 'rgba(99,102,241,0.12)',
  green: '#22C55E', greenLo: 'rgba(34,197,94,0.12)',
  pink: '#EC4899', pinkLo: 'rgba(236,72,153,0.12)',
  amber: '#F59E0B', red: '#EF4444', redLo: 'rgba(239,68,68,0.12)',
};

const FPS_OPTIONS = [0.5, 1, 2, 3, 5, 10, 15, 24];

type Export = {
  name: string;
  displayName: string;
  hasJson: boolean;
  hasOriginal: boolean;
};

type ClassResult = {
  className: string;
  count: number;
};

export default function ClassificationPage() {
  const navigate = useNavigate();

  // Step 1 — project selection
  const [exports, setExports]         = useState<Export[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedProject, setSelectedProject] = useState('');

  // Step 2 — config
  const [fps,     setFps]     = useState(1);
  const [padding, setPadding] = useState(10);

  // Step 3 — export
  const [status,  setStatus]  = useState<'idle'|'running'|'success'|'error'>('idle');
  const [results, setResults] = useState<ClassResult[]>([]);
  const [total,   setTotal]   = useState(0);
  const [outDir,  setOutDir]  = useState('');
  const [error,   setError]   = useState('');

  // Load project list
  useEffect(() => {
    fetch(`${API}/list_exports`)
      .then(r => r.json())
      .then(d => {
        const valid = (d.exports || []).filter((e: Export) => e.hasJson && e.hasOriginal);
        setExports(valid);
      })
      .catch(() => {})
      .finally(() => setLoadingProjects(false));
  }, []);

  async function handleExport() {
    if (!selectedProject) return;
    setStatus('running'); setError(''); setResults([]); setTotal(0); setOutDir('');
    try {
      const r = await fetch(`${API}/classify_export/${selectedProject}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({fps, padding, overwrite: true}),
      });
      const d = await r.json();
      if (!r.ok || !d.success) {
        setError(d.error || 'Export failed');
        setStatus('error');
        return;
      }
      const rows: ClassResult[] = Object.entries(d.counts || {}).map(
        ([className, count]) => ({className, count: count as number})
      );
      rows.sort((a, b) => b.count - a.count);
      setResults(rows);
      setTotal(d.total || 0);
      setOutDir(d.classification_dir || '');
      setStatus('success');
    } catch (e) {
      setError('Network error — is the backend running?');
      setStatus('error');
    }
  }

  const canExport = selectedProject && status !== 'running';

  return (
    <div style={{minHeight:'100vh', background:'linear-gradient(145deg,#12141A 0%,#1A1D27 50%,#12141A 100%)', color:C.text, fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Nav */}
      <nav style={{position:'sticky',top:0,zIndex:50,borderBottom:`1px solid ${C.border}`,background:'rgba(11,13,18,0.9)',backdropFilter:'blur(12px)',padding:'0 40px',display:'flex',alignItems:'center',justifyContent:'space-between',height:60}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button onClick={()=>navigate('/')} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:'6px 14px',color:C.textMuted,fontSize:13,cursor:'pointer'}}>← Back</button>
          <span style={{fontWeight:700,fontSize:16}}>🏷️ Classification Export</span>
        </div>
        <div style={{fontSize:12,color:C.textDim,background:C.surface,border:`1px solid ${C.border}`,padding:'6px 14px',borderRadius:20,display:'flex',alignItems:'center',gap:8}}>
          <span style={{width:6,height:6,borderRadius:'50%',background:C.green,boxShadow:`0 0 6px ${C.green}`,display:'inline-block'}}/>Running locally
        </div>
      </nav>

      <div style={{maxWidth:860,margin:'0 auto',padding:'40px 32px 80px'}}>

        {/* ── STEP 1: Select project ── */}
        <StepCard step={1} title="Select Project" subtitle="Choose a completed tracking project to export crops from" done={!!selectedProject}>
          {loadingProjects ? (
            <div style={{display:'flex',alignItems:'center',gap:10,color:C.textMuted,fontSize:13}}><Spinner/>Loading projects...</div>
          ) : exports.length === 0 ? (
            <div style={{padding:'16px',borderRadius:10,background:C.redLo,border:`1px solid rgba(239,68,68,0.2)`,fontSize:13,color:C.textMuted}}>
              No completed projects found. Track an object in a video first, then export it from the Project Hub.
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {exports.map(e => (
                <button key={e.name} onClick={()=>setSelectedProject(e.name)} style={{
                  display:'flex',alignItems:'center',gap:12,
                  padding:'12px 16px',borderRadius:10,cursor:'pointer',
                  background: selectedProject===e.name ? C.pinkLo : C.surfaceHi,
                  border: `1px solid ${selectedProject===e.name ? 'rgba(236,72,153,0.4)' : C.border}`,
                  textAlign:'left',
                }}>
                  <span style={{fontSize:20}}>📁</span>
                  <div>
                    <div style={{fontWeight:600,fontSize:14,color:C.text}}>{e.displayName}</div>
                    <div style={{fontSize:11,color:C.textDim,fontFamily:'monospace'}}>{e.name}</div>
                  </div>
                  {selectedProject===e.name && <span style={{marginLeft:'auto',color:C.pink,fontSize:18}}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </StepCard>

        {/* ── STEP 2: Configure ── */}
        <StepCard step={2} title="Configure" subtitle="Set extraction settings" done={false}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>

            {/* FPS */}
            <div>
              <div style={{fontSize:12,color:C.textMuted,marginBottom:8,fontWeight:600}}>Frames per second</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                {FPS_OPTIONS.map(f => (
                  <button key={f} onClick={()=>setFps(f)} style={{
                    padding:'6px 14px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600,
                    background: fps===f ? C.pink : C.surfaceHi,
                    border: `1px solid ${fps===f ? C.pink : C.border}`,
                    color: fps===f ? '#fff' : C.textMuted,
                  }}>{f}</button>
                ))}
              </div>
              <div style={{fontSize:11,color:C.textDim,marginTop:6}}>
                Higher fps = more crops but larger export size
              </div>
            </div>

            {/* Padding */}
            <div>
              <div style={{fontSize:12,color:C.textMuted,marginBottom:8,fontWeight:600}}>Padding (px) — {padding}px</div>
              <input
                type="range" min={0} max={60} step={2} value={padding}
                onChange={e=>setPadding(Number(e.target.value))}
                style={{width:'100%',accentColor:C.pink,cursor:'pointer'}}
              />
              <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:C.textDim,marginTop:4}}>
                <span>0px (tight crop)</span>
                <span>60px (loose crop)</span>
              </div>
            </div>
          </div>

          {/* Info box */}
          <div style={{marginTop:16,padding:'12px 16px',borderRadius:10,background:C.pinkLo,border:`1px solid rgba(236,72,153,0.2)`,fontSize:12,color:C.textMuted,lineHeight:1.6}}>
            <strong style={{color:C.pink}}>How it works:</strong> Each tracked object is cropped from every frame using its mask bounding box. Crops are saved into <code style={{color:C.pink}}>classification/&lt;class_name&gt;/</code> folders inside the project export directory.
          </div>
        </StepCard>

        {/* ── Export button ── */}
        {status !== 'running' && (
          <button
            onClick={handleExport}
            disabled={!canExport}
            style={{
              width:'100%', padding:'15px',
              background: canExport ? C.pink : C.surfaceHi,
              border: 'none', borderRadius:12,
              color: canExport ? '#fff' : C.textDim,
              fontSize:15, fontWeight:800,
              cursor: canExport ? 'pointer' : 'not-allowed',
              boxShadow: canExport ? '0 4px 20px rgba(236,72,153,0.4)' : 'none',
              marginBottom:20,
              transition:'all 0.2s',
            }}>
            🏷️ Export Classification Crops
            {selectedProject ? ` — ${selectedProject.slice(0,16)}...` : ''}
          </button>
        )}

        {/* ── Running ── */}
        {status === 'running' && (
          <div style={{display:'flex',alignItems:'center',gap:12,padding:'18px 20px',borderRadius:14,background:C.surface,border:`1px solid ${C.border}`,marginBottom:20}}>
            <Spinner/><span style={{fontWeight:700,color:'#a5b4fc'}}>Exporting classification crops...</span>
            <span style={{fontSize:12,color:C.textDim}}>This may take a moment depending on video length</span>
          </div>
        )}

        {/* ── Error ── */}
        {status === 'error' && <ErrBox>{error}</ErrBox>}

        {/* ── Success ── */}
        {status === 'success' && (
          <div style={{background:C.surface,border:`1px solid rgba(34,197,94,0.25)`,borderRadius:14,padding:'20px 24px'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
              <span style={{fontSize:24}}>🎉</span>
              <span style={{fontWeight:800,fontSize:16,color:C.green}}>Export Complete!</span>
              <span style={{fontSize:13,color:C.textMuted,marginLeft:4}}>{total} crops saved</span>
            </div>

            {/* Output path */}
            {outDir && (
              <div style={{marginBottom:16,padding:'10px 14px',borderRadius:8,background:C.greenLo,border:`1px solid rgba(34,197,94,0.2)`,fontSize:12}}>
                <span style={{color:C.green,fontWeight:700}}>📁 Saved to: </span>
                <code style={{fontSize:11,color:'#86efac',wordBreak:'break-all'}}>{outDir}</code>
              </div>
            )}

            {/* Per-class breakdown */}
            <div style={{fontSize:12,color:C.textDim,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:10}}>Crops per class</div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {results.map(r => (
                <div key={r.className} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',borderRadius:10,background:C.surfaceHi,border:`1px solid ${C.border}`}}>
                  <span style={{fontSize:18}}>🏷️</span>
                  <span style={{fontWeight:700,fontSize:14,color:C.text,flex:1}}>{r.className}</span>
                  <span style={{
                    background:C.pinkLo,border:`1px solid rgba(236,72,153,0.3)`,
                    borderRadius:20,padding:'3px 12px',
                    fontSize:12,fontWeight:700,color:C.pink,
                  }}>{r.count} crops</span>
                </div>
              ))}
            </div>

            {/* Folder structure hint */}
            <div style={{marginTop:16,padding:'12px 16px',borderRadius:10,background:'rgba(0,0,0,0.3)',border:`1px solid ${C.border}`,fontFamily:'monospace',fontSize:11,color:C.textMuted,lineHeight:1.8}}>
              <div style={{color:C.textDim,marginBottom:4}}>Output structure:</div>
              <div>classification/</div>
              {results.map(r => (
                <div key={r.className}>
                  <div>&nbsp;&nbsp;└── {r.className}/</div>
                  <div style={{color:C.textDim}}>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;frame_000001_obj0.jpg ... ({r.count} images)</div>
                </div>
              ))}
            </div>

            <button
              onClick={()=>{setStatus('idle');setSelectedProject('');}}
              style={{marginTop:16,padding:'10px 20px',borderRadius:10,background:C.surfaceHi,border:`1px solid ${C.border}`,color:C.textMuted,fontSize:13,cursor:'pointer'}}>
              Export Another Project
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function StepCard({step,title,subtitle,done,children}:{step:number;title:string;subtitle:string;done?:boolean;children:React.ReactNode}) {
  return (
    <div style={{background:C.surface,border:`1px solid ${done?'rgba(236,72,153,0.25)':C.border}`,borderRadius:14,padding:'20px 24px',marginBottom:20}}>
      <div style={{display:'flex',alignItems:'baseline',gap:10,marginBottom:16}}>
        <span style={{width:24,height:24,borderRadius:'50%',background:done?C.pinkLo:C.indigoLo,border:`1px solid ${done?'rgba(236,72,153,0.4)':'rgba(99,102,241,0.4)'}`,display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:done?C.pink:'#a5b4fc',flexShrink:0}}>{done?'✓':step}</span>
        <span style={{fontFamily:'monospace',fontSize:17,fontWeight:800,color:done?C.pink:'#a5b4fc'}}>{title}</span>
        <span style={{fontSize:13,color:C.textMuted}}>{subtitle}</span>
      </div>
      {children}
    </div>
  );
}

function ErrBox({children}:{children:React.ReactNode}) {
  return (
    <div style={{padding:'12px 16px',borderRadius:10,background:C.redLo,border:`1px solid rgba(239,68,68,0.25)`,fontSize:13,color:'#fca5a5',marginBottom:16}}>
      ⚠️ {children}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{width:16,height:16,border:'2px solid rgba(99,102,241,0.3)',borderTopColor:C.indigo,borderRadius:'50%',animation:'spin 0.7s linear infinite',flexShrink:0}} />
  );
}
