/**
 * Train YOLO Model Page
 * Step 1: Select datasets → Merge → get yaml_path
 * Step 2: Configure imgsz, epochs, model
 * Step 3: Train with live progress
 */
import {useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';

const API = 'http://localhost:7263';

const C = {
  bg: '#0B0D12', surface: '#13151C', surfaceHi: '#1C1F2A',
  border: 'rgba(255,255,255,0.07)', borderHi: 'rgba(255,255,255,0.14)',
  text: '#F0F2F7', textMuted: 'rgba(240,242,247,0.45)', textDim: 'rgba(240,242,247,0.25)',
  indigo: '#6366F1', indigoLo: 'rgba(99,102,241,0.12)',
  green: '#22C55E', greenLo: 'rgba(34,197,94,0.12)',
  amber: '#F59E0B', red: '#EF4444', redLo: 'rgba(239,68,68,0.12)',
};


const IMGSZ = [320, 416, 512, 640, 736, 1024];
const MODELS = [
  {v:'yolov8n.pt', l:'YOLOv8n — Nano (fastest)'},
  {v:'yolov8s.pt', l:'YOLOv8s — Small'},
  {v:'yolov8m.pt', l:'YOLOv8m — Medium'},
  {v:'yolov8l.pt', l:'YOLOv8l — Large'},
  {v:'yolov8x.pt', l:'YOLOv8x — XLarge (best accuracy)'},
];

export default function TrainPage() {
  const navigate = useNavigate();
  const logRef   = useRef<HTMLPreElement>(null);
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // Step 1 — dataset selection
  // datasets state removed — auto-detected checkboxes removed
  const [manualPaths, setManualPaths] = useState<string[]>(['']);

  // Step 2 — merge
  const [mergeStatus, setMergeStatus] = useState<'idle'|'loading'|'done'|'error'>('idle');
  const [mergedYaml, setMergedYaml]   = useState('');
  const [mergedInfo, setMergedInfo]   = useState<{train:number;val:number;classes:string[]}>({train:0,val:0,classes:[]});
  const [mergeError, setMergeError]   = useState('');

  // Step 3 — config
  const [imgsz,  setImgsz]  = useState(640);
  const [epochs, setEpochs] = useState(10);
  const [model,  setModel]  = useState('yolov8n.pt');

  // Step 4 — train
  const [_jobId,       setJobId]        = useState('');
  const [trainStatus,  setTrainStatus]  = useState<'idle'|'running'|'success'|'error'>('idle');
  const [trainLog,     setTrainLog]     = useState('');
  const [trainError,   setTrainError]   = useState('');
  const [bestPt,       setBestPt]       = useState('');
  const [_outputDir,   setOutputDir]    = useState('');


  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [trainLog]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);


  const validManual = manualPaths.filter(p => p.trim());
  const totalSel    = validManual.length;

  // ── Merge ──────────────────────────────────────────────────────────────────
  async function handleMerge() {
    setMergeStatus('loading'); setMergeError('');
    const allPaths = [...validManual];
    try {
      const r = await fetch(`${API}/merge_datasets`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({datasets: allPaths}),
      });
      const d = await r.json();
      if (!r.ok || !d.success) { setMergeError(d.error||'Merge failed'); setMergeStatus('error'); return; }
      setMergedYaml(d.yaml_path);
      setMergedInfo({train: d.train_count, val: d.val_count, classes: d.class_names});
      setMergeStatus('done');
    } catch { setMergeError('Network error'); setMergeStatus('error'); }
  }

  // ── Train ──────────────────────────────────────────────────────────────────
  async function handleTrain() {
    setTrainStatus('running'); setTrainError(''); setTrainLog(''); setBestPt('');
    try {
      const r = await fetch(`${API}/train_yolo`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({yaml_path: mergedYaml, imgsz, epochs, model}),
      });
      const d = await r.json();
      if (!r.ok || !d.success) { setTrainError(d.error||'Failed to start'); setTrainStatus('error'); return; }
      setJobId(d.job_id);
      setOutputDir(d.output_dir);
      // start polling
      pollRef.current = setInterval(async () => {
        try {
          const pr = await fetch(`${API}/train_status/${d.job_id}`);
          const pd = await pr.json();
          setTrainLog(pd.log || '');
          if (pd.best_pt) setBestPt(pd.best_pt);
          if (pd.status === 'success') {
            setTrainStatus('success');
            clearInterval(pollRef.current!);
          } else if (pd.status === 'error') {
            setTrainError(pd.error || 'Training failed');
            setTrainStatus('error');
            clearInterval(pollRef.current!);
          }
        } catch {}
      }, 1500);
    } catch { setTrainError('Network error'); setTrainStatus('error'); }
  }

  const previewCmd = `yolo train data=${mergedYaml||'<merged_dataset.yaml>'} imgsz=${imgsz} epochs=${epochs} model=${model}`;


  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(145deg,#12141A 0%,#1A1D27 50%,#12141A 100%)',color:C.text,fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Nav */}
      <nav style={{position:'sticky',top:0,zIndex:50,borderBottom:`1px solid ${C.border}`,background:'rgba(11,13,18,0.9)',backdropFilter:'blur(12px)',padding:'0 40px',display:'flex',alignItems:'center',justifyContent:'space-between',height:60}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button onClick={()=>navigate('/')} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:'6px 14px',color:C.textMuted,fontSize:13,cursor:'pointer'}}>← Back</button>
          <span style={{fontWeight:700,fontSize:16}}>🎯 Train YOLO Model</span>
        </div>
        <div style={{fontSize:12,color:C.textDim,background:C.surface,border:`1px solid ${C.border}`,padding:'6px 14px',borderRadius:20,display:'flex',alignItems:'center',gap:8}}>
          <span style={{width:6,height:6,borderRadius:'50%',background:C.green,boxShadow:`0 0 6px ${C.green}`,display:'inline-block'}}/>Running locally
        </div>
      </nav>

      <div style={{maxWidth:860,margin:'0 auto',padding:'40px 32px 80px'}}>

        {/* ── STEP 1: data= ── */}
        <StepCard step={1} title="data=" subtitle="Select dataset.yaml files — click to browse or use auto-detected" done={mergeStatus==='done'}>

          {/* ── Folder picker button ── */}
          <div style={{marginBottom:16}}>
            <label style={{display:'block',cursor:'pointer'}}>
              <input
                type="file"
                // @ts-ignore — webkitdirectory is non-standard but works in Chrome/Firefox/Electron
                webkitdirectory="true"
                multiple
                style={{display:'none'}}
                onChange={e=>{
                  const files = Array.from(e.target.files||[]);
                  const yamlFiles = files.filter(f =>
                    f.name === 'dataset.yaml' || f.name === 'dataset.yml'
                  );
                  if (yamlFiles.length === 0) {
                    alert('No dataset.yaml found in selected folder(s). Make sure you selected a YOLODataset folder.');
                    return;
                  }
                  const newPaths = yamlFiles.map(f =>
                    (f as any).path || f.webkitRelativePath || f.name
                  ).filter(Boolean);
                  // ADD to existing — don't replace, so multiple folders can be picked one by one
                  setManualPaths(prev => {
                    const existing = prev.filter(p => p.trim());
                    const merged = [...existing, ...newPaths.filter(p => !existing.includes(p))];
                    return merged.length > 0 ? merged : [''];
                  });
                  e.target.value = ''; // reset so same folder can be re-selected
                }}
              />
              <div style={{
                padding:'22px', borderRadius:12, textAlign:'center',
                border:`2px dashed ${manualPaths.some(p=>p.trim())?'rgba(99,102,241,0.5)':C.border}`,
                background:manualPaths.some(p=>p.trim())?C.indigoLo:C.surface,
                transition:'all 0.15s',
              }}>
                <div style={{fontSize:30,marginBottom:8}}>📁</div>
                <div style={{fontSize:14,fontWeight:700,color:'#a5b4fc',marginBottom:4}}>
                  {manualPaths.filter(p=>p.trim()).length > 0
                    ? '+ Add another YOLODataset folder'
                    : 'Click to select YOLODataset folder(s)'}
                </div>
                <div style={{fontSize:12,color:C.textDim}}>
                  {manualPaths.filter(p=>p.trim()).length > 0
                    ? `${manualPaths.filter(p=>p.trim()).length} folder(s) selected — click again to add more`
                    : 'Select one or more YOLODataset folders — dataset.yaml will be detected automatically'}
                </div>
              </div>
            </label>
          </div>

          {/* Selected folders/yaml list */}
          {manualPaths.filter(p=>p.trim()).length>0&&(
            <div style={{marginBottom:16}}>
              <div style={{fontSize:10,fontWeight:700,color:C.textDim,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:8}}>
                Selected datasets ({manualPaths.filter(p=>p.trim()).length})
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:180,overflowY:'auto'}}>
                {manualPaths.filter(p=>p.trim()).map((p,i)=>{
                  // Show parent folder name for readability
                  const parts = p.replace(/\\/g,'/').split('/');
                  const yamlIdx = parts.findIndex(x=>x==='dataset.yaml'||x==='dataset.yml');
                  const folderName = yamlIdx>0 ? parts[yamlIdx-1] : parts[parts.length-2] || p;
                  const parentName = yamlIdx>1 ? parts[yamlIdx-2] : '';
                  return (
                    <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 12px',borderRadius:8,background:C.surfaceHi,border:`1px solid rgba(99,102,241,0.25)`}}>
                      <span style={{fontSize:16}}>📁</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12,fontWeight:600,color:'#a5b4fc',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{folderName}</div>
                        {parentName&&<div style={{fontSize:10,color:C.textDim,fontFamily:'monospace'}}>{parentName}/</div>}
                      </div>
                      <button onClick={()=>setManualPaths(manualPaths.filter((_,j)=>j!==i))} style={{background:'none',border:'none',color:C.textDim,cursor:'pointer',fontSize:14,padding:'0 4px'}}>✕</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}


          {/* Merge button */}
          {mergeError&&<ErrBox>{mergeError}</ErrBox>}

          {mergeStatus==='done' ? (
            <div style={{padding:'12px 16px',borderRadius:10,background:C.greenLo,border:`1px solid rgba(34,197,94,0.3)`,marginBottom:10}}>
              <div style={{fontSize:13,fontWeight:700,color:C.green,marginBottom:6}}>✅ Merged dataset ready</div>
              <div style={{fontFamily:'monospace',fontSize:11,color:'rgba(240,242,247,0.6)',marginBottom:8,wordBreak:'break-all'}}>{mergedYaml}</div>
              <div style={{display:'flex',gap:16}}>
                <Num label="train images" value={mergedInfo.train}/>
                <Num label="val images" value={mergedInfo.val}/>
                {mergedInfo.classes.length>0&&<Tag>{mergedInfo.classes.join(', ')}</Tag>}
              </div>
            </div>
          ) : null}

          <button onClick={handleMerge} disabled={totalSel===0||mergeStatus==='loading'}
            style={{width:'100%',padding:'12px',background:totalSel===0?'rgba(99,102,241,0.2)':C.indigo,border:'none',borderRadius:10,color:'#fff',fontSize:14,fontWeight:700,cursor:totalSel===0?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:totalSel>0?'0 3px 12px rgba(99,102,241,0.3)':'none'}}>
            {mergeStatus==='loading'?<><Spinner/>Merging datasets...</>:mergeStatus==='done'?`🔄 Re-merge (${totalSel} selected)`:`🗂 Merge ${totalSel} Dataset${totalSel!==1?'s':''}`}
          </button>
        </StepCard>

        {/* ── STEP 2: imgsz + epochs + model ── (only after merge) */}
        {mergeStatus==='done' && (
          <>
            <StepCard step={2} title="imgsz=" subtitle="Input image size in pixels">
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {IMGSZ.map(s=><ToggleBtn key={s} active={imgsz===s} onClick={()=>setImgsz(s)}>{s}px</ToggleBtn>)}
              </div>
            </StepCard>

            <StepCard step={3} title="epochs=" subtitle="Number of training epochs">
              <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
                {[5,10,20,50,100].map(e=><ToggleBtn key={e} active={epochs===e} onClick={()=>setEpochs(e)}>{e}</ToggleBtn>)}
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <span style={{fontSize:12,color:C.textDim}}>Custom:</span>
                  <input type="number" min={1} max={1000} value={epochs} onChange={e=>setEpochs(Math.max(1,parseInt(e.target.value)||1))}
                    style={{width:70,padding:'7px 10px',background:C.surfaceHi,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13}}/>
                </div>
              </div>
            </StepCard>

            <StepCard step={4} title="model=" subtitle="Base pretrained model to fine-tune">
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {MODELS.map(m=><ToggleBtn key={m.v} active={model===m.v&&!model.includes('/')} onClick={()=>setModel(m.v)} left>{m.l}</ToggleBtn>)}
                {/* Custom model path */}
                <div style={{marginTop:6}}>
                  <div style={{fontSize:10,fontWeight:700,color:C.textDim,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:6}}>
                    Or enter custom model path
                  </div>
                  <input
                    type="text"
                    placeholder="/home/user/models/my_model.pt"
                    value={model.includes('/')||model.endsWith('.pt')&&!MODELS.find(m=>m.v===model) ? model : ''}
                    onChange={e => {
                      if (e.target.value.trim()) setModel(e.target.value.trim());
                    }}
                    style={{
                      width:'100%', padding:'10px 14px',
                      background:C.surfaceHi,
                      border:`1px solid ${model.includes('/')||(!MODELS.find(m=>m.v===model)&&model.endsWith('.pt'))?'rgba(99,102,241,0.5)':C.border}`,
                      borderRadius:8, color:C.text,
                      fontSize:12, fontFamily:'monospace',
                      outline:'none', boxSizing:'border-box',
                    }}
                  />
                </div>
              </div>
            </StepCard>

            {/* Command preview */}
            <div style={{marginBottom:20,padding:'12px 16px',borderRadius:10,background:'rgba(0,0,0,0.4)',border:`1px solid ${C.border}`}}>
              <div style={{fontSize:10,color:C.textDim,textTransform:'uppercase',letterSpacing:'0.07em',marginBottom:6}}>Command Preview</div>
              <div style={{fontFamily:'monospace',fontSize:12,color:'#86efac',wordBreak:'break-all',lineHeight:1.6}}>{previewCmd}</div>
            </div>

            {/* Train button */}
            {trainStatus!=='running'&&(
              <button onClick={handleTrain} style={{width:'100%',padding:'15px',background:C.indigo,border:'none',borderRadius:12,color:'#fff',fontSize:15,fontWeight:800,cursor:'pointer',boxShadow:'0 4px 20px rgba(99,102,241,0.4)',marginBottom:20}}>
                🚀 Start Training — {epochs} epochs · imgsz {imgsz} · {model}
              </button>
            )}
          </>
        )}

        {/* ── Training progress ── */}
        {(trainStatus==='running'||trainStatus==='success'||trainStatus==='error')&&(
          <div style={{background:C.surface,border:`1px solid ${trainStatus==='success'?'rgba(34,197,94,0.3)':trainStatus==='error'?'rgba(239,68,68,0.3)':C.border}`,borderRadius:14,padding:'20px 24px'}}>

            {/* Status bar */}
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
              {trainStatus==='running'&&<><Spinner/><span style={{fontWeight:700,color:'#a5b4fc'}}>Training in progress...</span></>}
              {trainStatus==='success'&&<><span style={{fontSize:22}}>🎉</span><span style={{fontWeight:700,color:C.green}}>Training Complete!</span></>}
              {trainStatus==='error'&&<><span style={{fontSize:20}}>⚠️</span><span style={{fontWeight:700,color:C.red}}>Training Failed</span></>}
            </div>

            {/* best.pt path */}
            {bestPt&&(
              <div style={{marginBottom:12,padding:'10px 14px',borderRadius:8,background:C.greenLo,border:`1px solid rgba(34,197,94,0.2)`,fontSize:12}}>
                <span style={{color:C.green,fontWeight:700}}>✅ Best model: </span>
                <code style={{fontSize:11,color:'#86efac',wordBreak:'break-all'}}>{bestPt}</code>
              </div>
            )}

            {trainStatus==='error'&&trainError&&<ErrBox>{trainError}</ErrBox>}

            {/* Log */}
            <div style={{fontSize:10,color:C.textDim,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6,marginTop:4}}>Training Log</div>
            <pre ref={logRef} style={{
              background:'rgba(0,0,0,0.5)', borderRadius:10,
              padding:'12px 14px', fontSize:11,
              color:'rgba(240,242,247,0.65)',
              whiteSpace:'pre', overflowX:'auto',
              maxHeight:360, overflowY:'auto',
              margin:0, border:`1px solid ${C.border}`,
              lineHeight:1.6, fontFamily:'monospace',
            }}>
              {trainLog||'Waiting for output...'}
            </pre>
          </div>
        )}

      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StepCard({step,title,subtitle,done,children}:{step:number;title:string;subtitle:string;done?:boolean;children:React.ReactNode}) {
  return (
    <div style={{background:C.surface,border:`1px solid ${done?'rgba(34,197,94,0.25)':C.border}`,borderRadius:14,padding:'20px 24px',marginBottom:20}}>
      <div style={{display:'flex',alignItems:'baseline',gap:10,marginBottom:16}}>
        <span style={{width:24,height:24,borderRadius:'50%',background:done?C.greenLo:C.indigoLo,border:`1px solid ${done?'rgba(34,197,94,0.4)':'rgba(99,102,241,0.4)'}`,display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:done?C.green:'#a5b4fc',flexShrink:0}}>{done?'✓':step}</span>
        <span style={{fontFamily:'monospace',fontSize:17,fontWeight:800,color:done?C.green:'#a5b4fc'}}>{title}</span>
        <span style={{fontSize:13,color:C.textMuted}}>{subtitle}</span>
      </div>
      {children}
    </div>
  );
}

function Num({label,value}:{label:string;value:number}) {
  return (
    <div style={{textAlign:'center'}}>
      <div style={{fontSize:16,fontWeight:800,color:'#a5b4fc'}}>{value}</div>
      <div style={{fontSize:10,color:'rgba(240,242,247,0.35)',marginTop:1}}>{label}</div>
    </div>
  );
}

function Tag({children}:{children:React.ReactNode}) {
  return (
    <div style={{fontSize:11,color:'rgba(165,180,252,0.7)',background:'rgba(99,102,241,0.1)',padding:'2px 8px',borderRadius:5,maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
      {children}
    </div>
  );
}

function ToggleBtn({active,onClick,children,left}:{active:boolean;onClick:()=>void;children:React.ReactNode;left?:boolean}) {
  return (
    <button onClick={onClick} style={{
      textAlign:left?'left':'center',
      padding: left?'9px 14px':'8px 18px',
      borderRadius:8,cursor:'pointer',width:left?'100%':undefined,
      border:`1px solid ${active?'rgba(99,102,241,0.5)':C.border}`,
      background:active?C.indigoLo:C.surface,
      color:active?'#a5b4fc':C.textMuted,
      fontSize:13,fontWeight:active?600:400,transition:'all 0.15s',
    }}>{children}</button>
  );
}

function ErrBox({children}:{children:React.ReactNode}) {
  return (
    <div style={{marginBottom:12,padding:'10px 14px',borderRadius:8,background:C.redLo,border:'1px solid rgba(239,68,68,0.25)',fontSize:12,color:'#fca5a5'}}>
      ⚠️ {children}
    </div>
  );
}

function Spinner() {
  return (
    <span style={{width:14,height:14,borderRadius:'50%',border:'2px solid rgba(165,180,252,0.3)',borderTopColor:'#a5b4fc',animation:'spin 0.7s linear infinite',display:'inline-block',flexShrink:0}}/>
  );
}
