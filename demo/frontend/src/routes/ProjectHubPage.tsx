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
import useUploadVideo from '@/common/components/gallery/useUploadVideo';
import ModelSelectPage from '@/common/components/model/ModelSelectPage';
import Logger from '@/common/logger/Logger';
import {sessionAtom, uploadingStateAtom} from '@/demo/atoms';
import {MAX_UPLOAD_FILE_SIZE, INFERENCE_API_ENDPOINT} from '@/demo/DemoConfig';
import {useSetAtom} from 'jotai';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';

// ── Design tokens ─────────────────────────────────────────────────
const C = {
  bg:        '#0B0D12',
  surface:   '#13151C',
  surfaceHi: '#1C1F2A',
  border:    'rgba(255,255,255,0.07)',
  borderHi:  'rgba(255,255,255,0.14)',
  text:      '#F0F2F7',
  textMuted: 'rgba(240,242,247,0.45)',
  textDim:   'rgba(240,242,247,0.25)',
  indigo:    '#6366F1',
  indigoLo:  'rgba(99,102,241,0.12)',
  green:     '#22C55E',
  greenLo:   'rgba(34,197,94,0.12)',
  amber:     '#F59E0B',
  amberLo:   'rgba(245,158,11,0.12)',
  red:       '#EF4444',
  redLo:     'rgba(239,68,68,0.12)',
};

// ── Types ─────────────────────────────────────────────────────────
type ExportProject = {
  name: string;
  hasJson: boolean;
  hasOriginal: boolean;
  hasMasked: boolean;
  thumbnailUrl: string | null;
  displayName?: string;
};

type DraftProject = {
  draft_id: string;
  video_path: string;
  video_url: string;
  objects: Array<{object_id: number; label: string}>;
  saved_at: number;
  thumbnail_url: string | null;
  mask_frame_count: number;
};

function formatTimestamp(ts: number): string {
  const diffMs = Date.now() - ts;
  const m = Math.floor(diffMs / 60000);
  const h = Math.floor(diffMs / 3600000);
  const d = Math.floor(diffMs / 86400000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

function videoName(path: string): string {
  return path.split('/').pop()?.replace('.mp4', '').replace(/_/g, ' ') || 'Untitled';
}

// ── Thumbnail ─────────────────────────────────────────────────────
function VideoThumbnail({src}: {src: string | null}) {
  const [error, setError] = useState(false);

  if (!src || error) return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: C.surfaceHi, gap: 8,
    }}>
      <span style={{fontSize: 24, opacity: 0.3}}>🎬</span>
      <span style={{fontSize: 11, color: C.textDim}}>No preview</span>
    </div>
  );
  return (
    <video
      src={src}
      style={{width: '100%', height: '100%', objectFit: 'cover'}}
      muted preload="metadata"
      onError={() => setError(true)}
      onLoadedMetadata={e => { (e.target as HTMLVideoElement).currentTime = 0.1; }}
    />
  );
}

// ── Main Page ─────────────────────────────────────────────────────
export default function ProjectHubPage() {
  const [projects, setProjects] = useState<ExportProject[]>([]);
  const [drafts, setDrafts]     = useState<DraftProject[]>([]);
  const [loading, setLoading]   = useState(true);
  const [dragging, setDragging] = useState(false);
  const [currentModel, setCurrentModel] = useState('tiny');
  const [modelSelected, setModelSelected] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<DraftProject | null>(null);
  const [extractModal, setExtractModal] = useState<{projectName: string; displayName: string; hasMasked: boolean} | null>(null);
  const [projectDetail, setProjectDetail] = useState<ExportProject | null>(null);
  const [cropModal, setCropModal] = useState<{video: any} | null>(null);
  const navigate = useNavigate();
  const setUploadingState = useSetAtom(uploadingStateAtom);
  const setSession        = useSetAtom(sessionAtom);

  const {getRootProps, getInputProps, isUploading, error} = useUploadVideo({
    onUpload: v => {
      setUploadingState('default');
      setSession(null);
      // If video has duration (raw upload), show crop selection first
      if (v.durationSec && v.durationSec > 0) {
        setCropModal({video: v});
      } else {
        // Fallback: old flow (already encoded)
        navigate('/demo', {state: {video: v}});
      }
    },
    onUploadError: e => { setUploadingState('error'); Logger.error(e); },
    onUploadStart: () => setUploadingState('uploading'),
  });

  useEffect(() => {
    fetchAll();
    // Get current model from backend
    fetch(`${INFERENCE_API_ENDPOINT}/get_model`)
      .then(r => r.json())
      .then(d => { setCurrentModel(d.model || 'tiny'); setModelSelected(true); })
      .catch(() => setModelSelected(false));
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [er, dr] = await Promise.all([
        fetch('http://localhost:7263/list_exports'),
        fetch('http://localhost:7263/list_drafts'),
      ]);
      const ed = await er.json(); const dd = await dr.json();
      const exps = ed.exports || [];
      const drs = dd.drafts || [];
      setProjects(exps);
      setDrafts(drs);
      // Cache to localStorage
      try {
        localStorage.setItem('sam2_projects', JSON.stringify(exps));
        localStorage.setItem('sam2_drafts', JSON.stringify(drs));
      } catch {}
    } catch(e) {
      Logger.error(e);
      // Load from cache if backend is down
      try {
        const cached = localStorage.getItem('sam2_projects');
        const cachedDrafts = localStorage.getItem('sam2_drafts');
        if (cached) setProjects(JSON.parse(cached));
        if (cachedDrafts) setDrafts(JSON.parse(cachedDrafts));
      } catch {}
    } finally {
      setLoading(false);
    }
  }

  const fetchDrafts = useCallback(async () => {
    try { const r = await fetch('http://localhost:7263/list_drafts'); const d = await r.json(); setDrafts(d.drafts || []); } catch(e) { Logger.error(e); }
  }, []);

  async function handleResumeDraft(draft: DraftProject) {
    // Model must be selected first
    if (!modelSelected) {
      alert('Please select a model first before resuming a draft.');
      window.scrollTo({top: 0, behavior: 'smooth'});
      return;
    }
    try {
      const r = await fetch(`http://localhost:7263/load_draft/${draft.draft_id}`);
      const d = await r.json();
      navigate('/demo', {state: {draft: d}});
    } catch (e) {
      Logger.error('Failed to load draft:', e);
    }
  }

  async function handleDeleteDraft(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try { await fetch(`http://localhost:7263/delete_draft/${id}`, {method: 'DELETE'}); fetchDrafts(); } catch(e) { Logger.error(e); }
  }

  function draftThumb(d: DraftProject): string | null {
    const p = d.video_path;
    if (!p) return null;
    if (p.startsWith('uploads/')) return `http://localhost:7263/${p}`;
    if (p.startsWith('gallery/')) return `http://localhost:7263/posters/${p.replace('gallery/','').replace('.mp4','.jpg')}`;
    return d.thumbnail_url;
  }

  return (
    <div style={{minHeight:'100vh', background:'linear-gradient(145deg, #12141A 0%, #1A1D27 50%, #12141A 100%)', color:C.text, fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'}}>

      {/* ── Nav ── */}
      <nav style={{
        position:'sticky', top:0, zIndex:50,
        borderBottom:`1px solid ${C.border}`,
        background:'rgba(11,13,18,0.85)',
        backdropFilter:'blur(12px)',
        padding:'0 40px',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        height: 60,
      }}>
        <div style={{display:'flex', alignItems:'center', gap:10}}>
          <div style={{
            width:34, height:34, borderRadius:10,
            background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:18, boxShadow:'0 0 16px rgba(99,102,241,0.4)',
          }}>⬡</div>
          <div>
            <div style={{fontWeight:700, fontSize:16, letterSpacing:'-0.3px', lineHeight:1.1}}>QuickLabel</div>
            <div style={{fontSize:10, color:C.textDim, letterSpacing:'0.06em', textTransform:'uppercase'}}>AI Object Tracking</div>
          </div>
        </div>
        <div style={{
          display:'flex', alignItems:'center', gap:8,
          fontSize:12, color:C.textDim,
          background:C.surface, border:`1px solid ${C.border}`,
          padding:'6px 14px', borderRadius:20,
        }}>
          <span style={{width:6,height:6,borderRadius:'50%',background:C.green,boxShadow:`0 0 6px ${C.green}`,display:'inline-block'}} />
          Running locally
        </div>
      </nav>

      <div style={{maxWidth:1120, margin:'0 auto', padding:'0 32px 80px'}}>

        {/* ── Hero ── */}
        <div style={{padding:'64px 0 56px', position:'relative'}}>
          {/* Background glow */}
          <div style={{
            position:'absolute', top:0, left:'50%', transform:'translateX(-50%)',
            width:600, height:300, borderRadius:'50%',
            background:'radial-gradient(ellipse,rgba(99,102,241,0.12) 0%,transparent 70%)',
            pointerEvents:'none',
          }} />

          <div style={{position:'relative', textAlign:'center', marginBottom:48}}>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:8,
              background:C.indigoLo, border:`1px solid rgba(99,102,241,0.25)`,
              borderRadius:20, padding:'5px 16px',
              fontSize:12, fontWeight:600, color:'#a5b4fc',
              letterSpacing:'0.05em', marginBottom:20,
            }}>
              ✦ powered by pinklotus.ai
            </div>
            <h1 style={{
              fontSize:52, fontWeight:800, margin:'0 0 16px',
              letterSpacing:'-1px', lineHeight:1.1,
              background:'linear-gradient(135deg, #fff 30%, rgba(255,255,255,0.55))',
              WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
              backgroundClip:'text',
            }}>
              Track anything<br />in your videos
            </h1>
            <p style={{fontSize:17, color:C.textMuted, margin:0, maxWidth:480, marginInline:'auto', lineHeight:1.6}}>
              Upload a video, click objects to annotate, and export precise tracking data with masks and JSON.
            </p>
          </div>

          {/* Feature pills */}
          <div style={{display:'flex', justifyContent:'center', gap:10, marginBottom:40, flexWrap:'wrap'}}>
            {[
              {icon:'⚡', label:'AI-powered masking'},
              {icon:'✂️', label:'Timeline crop'},
              {icon:'📦', label:'JSON + Video export'},
              {icon:'🖼', label:'Frame extraction'},
              {icon:'🎯', label:'YOLO training'},
            ].map(f => (
              <div key={f.label} style={{
                display:'flex', alignItems:'center', gap:7,
                background:C.surface, border:`1px solid ${C.border}`,
                borderRadius:20, padding:'7px 14px',
                fontSize:13, color:C.textMuted,
              }}>
                <span>{f.icon}</span> {f.label}
              </div>
            ))}
          </div>

          {/* Action buttons — Train YOLO + Classification Export */}
          <div style={{display:'flex', justifyContent:'center', gap:12, marginBottom:8}}>
            <button
              onClick={() => navigate('/train')}
              style={{
                display:'flex', alignItems:'center', gap:10,
                padding:'12px 28px',
                background:'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.15))',
                border:'1px solid rgba(99,102,241,0.35)',
                borderRadius:12, cursor:'pointer',
                color:'#a5b4fc', fontSize:14, fontWeight:700,
                boxShadow:'0 2px 12px rgba(99,102,241,0.2)',
                transition:'all 0.18s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background='linear-gradient(135deg,rgba(99,102,241,0.25),rgba(139,92,246,0.25))';
                e.currentTarget.style.boxShadow='0 4px 20px rgba(99,102,241,0.35)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background='linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.15))';
                e.currentTarget.style.boxShadow='0 2px 12px rgba(99,102,241,0.2)';
              }}>
              🎯 Train YOLO Model
            </button>
            <button
              onClick={() => navigate('/classify')}
              style={{
                display:'flex', alignItems:'center', gap:10,
                padding:'12px 28px',
                background:'linear-gradient(135deg,rgba(236,72,153,0.15),rgba(219,39,119,0.15))',
                border:'1px solid rgba(236,72,153,0.35)',
                borderRadius:12, cursor:'pointer',
                color:'#f9a8d4', fontSize:14, fontWeight:700,
                boxShadow:'0 2px 12px rgba(236,72,153,0.2)',
                transition:'all 0.18s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background='linear-gradient(135deg,rgba(236,72,153,0.25),rgba(219,39,119,0.25))';
                e.currentTarget.style.boxShadow='0 4px 20px rgba(236,72,153,0.35)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background='linear-gradient(135deg,rgba(236,72,153,0.15),rgba(219,39,119,0.15))';
                e.currentTarget.style.boxShadow='0 2px 12px rgba(236,72,153,0.2)';
              }}>
              🏷️ Classification Export
            </button>
          </div>

        {/* Model Selection — before upload */}
        {!modelSelected ? (
          <>
            {pendingDraft && (
              <div style={{
                marginBottom: 16, padding: '10px 14px',
                background: 'rgba(245,158,11,0.08)',
                border: '1px solid rgba(245,158,11,0.2)',
                borderRadius: 10,
                fontSize: 13, color: '#fbbf24',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span>⏸</span>
                Select a model to resume your draft: <strong>{videoName(pendingDraft.video_path)}</strong>
              </div>
            )}
            <ModelSelectPage
              currentModel={currentModel}
              onSelect={async (model) => {
                setCurrentModel(model);
                setModelSelected(true);
                // If there's a pending draft, resume it
                if (pendingDraft) {
                  try {
                    const r = await fetch(`http://localhost:7263/load_draft/${pendingDraft.draft_id}`);
                    const d = await r.json();
                    navigate('/demo', {state: {draft: d}});
                  } catch (e) {
                    Logger.error('Failed to load draft:', e);
                    setPendingDraft(null);
                  }
                }
              }}
            />
          </>
        ) : (
          <>
            {/* Selected model badge + change option */}
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
              padding: '10px 14px',
              background: 'rgba(99,102,241,0.08)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 10,
            }}>
              <div style={{display:'flex', alignItems:'center', gap:8}}>
                <span style={{fontSize:16}}>
                  {currentModel === 'tiny' ? '🚀' : currentModel === 'small' ? '⚖️' : '🎯'}
                </span>
                <div>
                  <div style={{fontSize:12, fontWeight:700, color:'#818cf8'}}>
                    Model {currentModel === 'base_plus' ? 'Base+' : currentModel.charAt(0).toUpperCase() + currentModel.slice(1)}
                  </div>
                  <div style={{fontSize:11, color:'rgba(255,255,255,0.3)'}}>Active model</div>
                </div>
              </div>
              <button
                onClick={() => setModelSelected(false)}
                style={{
                  fontSize:11, fontWeight:600,
                  color:'#818cf8',
                  background:'rgba(99,102,241,0.1)',
                  border:'1px solid rgba(99,102,241,0.2)',
                  borderRadius:6, padding:'4px 10px',
                  cursor:'pointer',
                }}>
                Change
              </button>
            </div>

            {/* Upload zone */}
          <div
            {...getRootProps()}
            onDragEnter={() => setDragging(true)}
            onDragLeave={() => setDragging(false)}
            onDrop={() => setDragging(false)}
            style={{
              border:`2px dashed ${dragging ? C.indigo : C.borderHi}`,
              borderRadius:20,
              padding:'56px 32px',
              textAlign:'center',
              background: dragging ? C.indigoLo : C.surface,
              cursor:'pointer',
              transition:'all 0.2s',
              boxShadow: dragging ? `0 0 0 4px rgba(99,102,241,0.15)` : 'none',
            }}>
            <input {...getInputProps()} />
            <div style={{
              width:56, height:56, borderRadius:16,
              background: isUploading ? C.amberLo : C.indigoLo,
              border:`1px solid ${isUploading ? 'rgba(245,158,11,0.3)' : 'rgba(99,102,241,0.3)'}`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:24, margin:'0 auto 20px',
            }}>
              {isUploading ? '⏳' : error ? '⚠️' : '↑'}
            </div>
            <div style={{fontSize:18, fontWeight:700, marginBottom:8, color:C.text}}>
              {isUploading ? 'Uploading your video...' : error ? `Upload failed: ${error}` : 'Drop your video here'}
            </div>
            <div style={{fontSize:13, color:C.textDim}}>
              or <span style={{color:C.indigo, fontWeight:600}}>click to browse</span> · {MAX_UPLOAD_FILE_SIZE} max · MP4 / MOV · up to 5 minutes
            </div>
          </div>
          </>
        )}
        </div>

        {/* ── Previous Projects ── */}
        <SectionHeader title="Completed Projects" count={projects.length} accentColor={C.green} icon="✓" />
        {loading ? (
          <LoadingGrid />
        ) : projects.length === 0 ? (
          <EmptyState text="No completed projects yet. Finish a project to see it here." />
        ) : (
          <CardGrid>
            {projects.slice(0, 4).map(p => (
              <Card
                key={p.name}
                thumb={p.thumbnailUrl ? `http://localhost:7263/${p.thumbnailUrl}` : null}
                name={p.displayName || (p.name.slice(0, 16) + '...')}
                badge="Complete" badgeColor={C.green}
                onClick={() => setProjectDetail(p)}
                actions={[]}
              />
            ))}
          </CardGrid>
        )}

        <div style={{height:48}} />

        {/* ── Verify Masks Tool (Independent) ── */}
        {projects.length > 0 && (
          <>
            <SectionHeader title="🔍 Verify Masks" count={0} accentColor="#0ea5e9" icon="🔍" />
            <VerifyMasksSection projects={projects} />
            <div style={{height:48}} />
          </>
        )}

        {/* ── Drafts ── */}
        <SectionHeader title="Draft Projects" count={drafts.length} accentColor={C.amber} icon="⏸" />
        {!modelSelected && drafts.length > 0 && (
          <div style={{
            marginBottom: 12, padding: '10px 14px',
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 10, fontSize: 12,
            color: 'rgba(245,158,11,0.8)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span>⚠️</span>
            Select a model above (Step 1) before resuming a draft.
          </div>
        )}
        {drafts.length === 0 ? (
          <EmptyState text="Start a project and leave mid-way — it will auto-save here." />
        ) : (
          <CardGrid>
            {drafts.map(d => (
              <Card
                key={d.draft_id}
                thumb={draftThumb(d)}
                name={videoName(d.video_path)}
                badge="Draft" badgeColor={C.amber}
                meta={`${d.objects.length} obj · ${d.mask_frame_count} frames · ${formatTimestamp(d.saved_at)}`}
                actions={[
                  {label: modelSelected ? 'Resume' : '🔒 Select Model First', icon:'▶', color: modelSelected ? C.indigo : 'rgba(255,255,255,0.2)', primary:true, onClick:() => handleResumeDraft(d)},
                  {label:'Delete', icon:'✕', color:C.red, danger:true, onClick:(e) => handleDeleteDraft(d.draft_id, e)},
                ]}
              />
            ))}
          </CardGrid>
        )}
      </div>

      {/* ── Project Detail Modal ── */}
      {projectDetail && (
        <ProjectDetailModal
          project={projectDetail}
          onClose={() => setProjectDetail(null)}
        />
      )}

      {/* ── Extract Frames Modal (legacy, kept for ProjectHub card button) ── */}
      {extractModal && (
        <ExtractFramesModal
          projectName={extractModal.projectName}
          displayName={extractModal.displayName}
          hasMasked={extractModal.hasMasked}
          onClose={() => setExtractModal(null)}
        />
      )}

      {/* ── Crop & Start Modal ── */}
      {cropModal && (
        <CropAndStartModal
          video={cropModal.video}
          onClose={() => setCropModal(null)}
          onStart={(encodedVideo) => {
            setCropModal(null);
            navigate('/demo', {state: {video: encodedVideo}});
          }}
        />
      )}
    </div>
  );
}

function SectionHeader({title, count, accentColor, icon}: {title:string; count:number; accentColor:string; icon:string}) {
  return (
    <div style={{display:'flex', alignItems:'center', gap:12, marginBottom:20}}>
      <div style={{
        width:32, height:32, borderRadius:9,
        background:`${accentColor}18`,
        border:`1px solid ${accentColor}33`,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:14, color:accentColor,
      }}>{icon}</div>
      <h2 style={{fontSize:18, fontWeight:700, margin:0, letterSpacing:'-0.2px'}}>{title}</h2>
      <span style={{
        fontSize:12, fontWeight:700,
        background:'rgba(255,255,255,0.08)',
        color:C.textMuted,
        padding:'2px 10px', borderRadius:20,
      }}>{count}</span>
    </div>
  );
}

function CardGrid({children}: {children: React.ReactNode}) {
  return (
    <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))', gap:16}}>
      {children}
    </div>
  );
}

function EmptyState({text}: {text:string}) {
  return (
    <div style={{
      padding:'36px 24px', textAlign:'center',
      background:C.surface, border:`1px dashed ${C.border}`,
      borderRadius:16, fontSize:14, color:C.textDim,
    }}>{text}</div>
  );
}

function LoadingGrid() {
  return (
    <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(230px,1fr))', gap:16}}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          background:C.surface, border:`1px solid ${C.border}`,
          borderRadius:16, overflow:'hidden',
        }}>
          <div style={{aspectRatio:'16/9', background:C.surfaceHi, animation:'pulse 1.5s infinite'}} />
          <div style={{padding:'14px 16px'}}>
            <div style={{height:14, width:'60%', background:C.surfaceHi, borderRadius:4, marginBottom:8}} />
            <div style={{height:10, width:'40%', background:C.surfaceHi, borderRadius:4}} />
          </div>
        </div>
      ))}
    </div>
  );
}

type CardAction = {
  label: string; icon: string; color: string;
  primary?: boolean; danger?: boolean;
  onClick: (e: React.MouseEvent) => void;
};

function Card({thumb, name, badge, badgeColor, meta, actions=[], onClick}: {
  thumb: string|null; name: string; badge: string; badgeColor: string;
  meta?: string; actions?: CardAction[]; onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        background: hovered ? C.surfaceHi : C.surface,
        border:`1px solid ${hovered ? C.borderHi : C.border}`,
        borderRadius:16, overflow:'hidden',
        transition:'all 0.18s',
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered ? '0 12px 32px rgba(0,0,0,0.5)' : 'none',
        cursor: onClick ? 'pointer' : 'default',
      }}>
      {/* Thumbnail */}
      <div style={{width:'100%', aspectRatio:'16/9', background:C.surfaceHi, position:'relative', overflow:'hidden'}}>
        <VideoThumbnail src={thumb} />
        {/* Gradient overlay */}
        <div style={{
          position:'absolute', inset:0,
          background:'linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%)',
          pointerEvents:'none',
        }} />
        {/* Badge */}
        <span style={{
          position:'absolute', top:10, left:10,
          fontSize:10, fontWeight:700,
          background:`${badgeColor}22`, color:badgeColor,
          border:`1px solid ${badgeColor}55`,
          padding:'3px 9px', borderRadius:6, letterSpacing:'0.05em', textTransform:'uppercase',
        }}>{badge}</span>
      </div>

      {/* Content */}
      <div style={{padding:'14px 16px'}}>
        <div style={{
          fontSize:14, fontWeight:600, color:C.text,
          marginBottom: meta ? 4 : 14,
          overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
        }} title={name}>{name}</div>

        {meta && (
          <div style={{fontSize:11, color:C.textDim, marginBottom:12, letterSpacing:'0.02em'}}>{meta}</div>
        )}

        <div style={{display:'flex', gap:8}}>
          {actions.map(a => (
            <button key={a.label} onClick={a.onClick} style={{
              flex: a.primary ? 1 : undefined,
              padding:'7px 12px', fontSize:12, fontWeight:600,
              border:'none', borderRadius:8, cursor:'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:5,
              transition:'all 0.15s',
              background: a.danger ? C.redLo : a.primary ? C.indigo : C.indigoLo,
              color: a.danger ? C.red : '#fff',
              boxShadow: a.primary ? `0 2px 8px rgba(99,102,241,0.35)` : 'none',
            }}>
              <span style={{fontSize:10}}>{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

// ── Project Detail Modal ──────────────────────────────────────────
function ProjectDetailModal({project, onClose}: {
  project: ExportProject;
  onClose: () => void;
}) {
  const displayName = project.displayName || project.name.slice(0, 20) + '...';

  // extract + yolo state
  const [fps, setFps]           = useState('5');
  const [extractStatus, setExtractStatus] = useState<'idle'|'loading'|'success'|'error'>('idle');
  const [extractResult, setExtractResult] = useState<{frameCount:number; framesDir:string}|null>(null);
  const [extractError, setExtractError]   = useState('');
  const [valPct, setValPct]     = useState(20);
  const [yoloStatus, setYoloStatus] = useState<'idle'|'loading'|'success'|'error'>('idle');
  const [yoloResult, setYoloResult] = useState<{trainCount:number;valCount:number;yoloDir:string}|null>(null);
  const [yoloError, setYoloError]   = useState('');

  // verify masks state
  const [verifyStatus, setVerifyStatus] = useState<'idle'|'loading'|'success'|'error'>('idle');
  const [verifyResult, setVerifyResult] = useState<{outputDir:string; frameCount:number}|null>(null);
  const [verifyError, setVerifyError]   = useState('');
  const [availableFrameDirs, setAvailableFrameDirs] = useState<string[]>([]);
  const [selectedFrameDir, setSelectedFrameDir] = useState<string>('');
  const [checkingFrames, setCheckingFrames] = useState(false);

  const FPS_OPTIONS = ['0.5','1','2','5','10','24'];

  // Check for existing frame directories on mount
  useEffect(() => {
    async function checkExistingFrames() {
      setCheckingFrames(true);
      try {
        const r = await fetch(`http://localhost:7263/list_frame_dirs/${project.name}`);
        if (r.ok) {
          const d = await r.json();
          if (d.frame_dirs && d.frame_dirs.length > 0) {
            setAvailableFrameDirs(d.frame_dirs);
            setSelectedFrameDir(d.frame_dirs[0]);
            // Auto-set extract status to success if frames already exist
            setExtractResult({
              frameCount: 0, // Unknown, will be shown after re-extract
              framesDir: d.frame_dirs[0]
            });
            setExtractStatus('success');
          }
        }
      } catch (e) {
        console.error('Failed to check existing frames:', e);
      } finally {
        setCheckingFrames(false);
      }
    }
    checkExistingFrames();
  }, [project.name]);

  function downloadJSON() {
    const a = document.createElement('a');
    a.href = `http://localhost:7263/exports/${project.name}/tracking.json`;
    a.download = 'tracking.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  function downloadMasked() {
    const a = document.createElement('a');
    a.href = `http://localhost:7263/exports/${project.name}/masked.mp4`;
    a.download = 'masked.mp4';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  async function handleExtract() {
    setExtractStatus('loading'); setExtractError('');
    try {
      const r = await fetch(`http://localhost:7263/extract_frames/${project.name}`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({fps: parseFloat(fps), source:'original'}),
      });
      const d = await r.json();
      if (!r.ok || !d.success) { setExtractError(d.error||'Failed'); setExtractStatus('error'); return; }
      setExtractResult({frameCount: d.frame_count, framesDir: d.frames_dir});
      setExtractStatus('success');
    } catch { setExtractError('Network error'); setExtractStatus('error'); }
  }

  async function handleYolo() {
    if (!extractResult) return;
    setYoloStatus('loading'); setYoloError('');
    try {
      const r = await fetch(`http://localhost:7263/labelme2yolo/${project.name}`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({frames_dir: extractResult.framesDir, val_size: valPct/100}),
      });
      const d = await r.json();
      if (!r.ok || !d.success) { setYoloError(d.error||'Failed'); setYoloStatus('error'); return; }
      setYoloResult({trainCount:d.train_count, valCount:d.val_count, yoloDir:d.yolo_dir});
      setYoloStatus('success');
    } catch { setYoloError('Network error'); setYoloStatus('error'); }
  }

  async function handleVerifyMasks() {
    const frameDirToUse = selectedFrameDir || extractResult?.framesDir;
    if (!frameDirToUse) {
      setVerifyError('No frames directory selected');
      setVerifyStatus('error');
      return;
    }
    setVerifyStatus('loading'); setVerifyError('');
    try {
      const r = await fetch(`http://localhost:7263/verify_masks/${project.name}`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({frames_dir: frameDirToUse}),
      });
      const d = await r.json();
      if (!r.ok || !d.success) { setVerifyError(d.error||'Failed'); setVerifyStatus('error'); return; }
      setVerifyResult({outputDir: d.output_dir, frameCount: d.frame_count});
      setVerifyStatus('success');
    } catch { setVerifyError('Network error'); setVerifyStatus('error'); }
  }

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:999,
      background:'rgba(0,0,0,0.8)', backdropFilter:'blur(6px)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:24,
      overflowY:'auto',
    }} onClick={e => { if (e.target===e.currentTarget) onClose(); }}>
      <div style={{
        background:'#13151C', border:'1px solid rgba(255,255,255,0.1)',
        borderRadius:20, padding:'28px 32px',
        width:'100%', maxWidth:500,
        boxShadow:'0 24px 64px rgba(0,0,0,0.7)',
        animation:'fadeUp 0.2s ease',
        maxHeight:'90vh', overflowY:'auto',
      }}>
        <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

        {/* Header */}
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24}}>
          <div>
            <div style={{fontSize:18, fontWeight:700, color:'#F0F2F7'}}>{displayName}</div>
            <div style={{
              display:'inline-flex', alignItems:'center', gap:5, marginTop:4,
              background:'rgba(34,197,94,0.1)', border:'1px solid rgba(34,197,94,0.3)',
              borderRadius:6, padding:'2px 8px', fontSize:11, fontWeight:700, color:'#22C55E',
            }}>✓ Complete</div>
          </div>
          <button onClick={onClose} style={{
            background:'rgba(255,255,255,0.06)', border:'none',
            width:32, height:32, borderRadius:8,
            color:'rgba(255,255,255,0.5)', fontSize:16, cursor:'pointer',
          }}>✕</button>
        </div>

        {/* ── Downloads ── */}
        <div style={{marginBottom:20}}>
          <SectionLabel>Downloads</SectionLabel>
          <div style={{display:'flex', gap:10}}>
            {project.hasJson && (
              <ActionBtn icon="↓" label="Download JSON" color="#6366f1" onClick={downloadJSON} />
            )}
            {project.hasMasked && (
              <ActionBtn icon="🎭" label="Masked Video" color="#22C55E" onClick={downloadMasked} />
            )}
          </div>
        </div>

        {/* ── Extract Frames ── */}
        <div style={{
          padding:'16px', borderRadius:12,
          background:'rgba(255,255,255,0.03)',
          border:'1px solid rgba(255,255,255,0.07)',
          marginBottom: extractStatus==='success' ? 16 : 0,
        }}>
          <SectionLabel>Extract Frames</SectionLabel>

          {/* FPS */}
          <div style={{display:'flex', alignItems:'center', gap:7, marginBottom:12, flexWrap:'wrap'}}>
            <span style={{fontSize:11, color:'rgba(255,255,255,0.4)', fontWeight:600, textTransform:'uppercase'}}>FPS:</span>
            {FPS_OPTIONS.map(f => (
              <button key={f} onClick={() => setFps(f)} style={{
                padding:'4px 10px', fontSize:12, fontWeight:600, borderRadius:6, cursor:'pointer',
                border:`1px solid ${fps===f?'#6366f1':'rgba(255,255,255,0.12)'}`,
                background: fps===f?'rgba(99,102,241,0.2)':'rgba(255,255,255,0.04)',
                color: fps===f?'#818cf8':'rgba(255,255,255,0.45)',
              }}>{f}</button>
            ))}
          </div>

          {extractStatus==='error' && (
            <div style={{marginBottom:10,padding:'8px 10px',borderRadius:8,
              background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',
              fontSize:12,color:'#fca5a5'}}>⚠️ {extractError}</div>
          )}

          <button onClick={handleExtract} disabled={extractStatus==='loading'} style={{
            width:'100%', padding:'10px 0',
            background: extractStatus==='loading'?'rgba(99,102,241,0.4)':'#6366f1',
            border:'none', borderRadius:10, color:'#fff',
            fontSize:13, fontWeight:700,
            cursor: extractStatus==='loading'?'not-allowed':'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          }}>
            {extractStatus==='loading' ? (
              <><span style={{width:13,height:13,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',animation:'spin 0.7s linear infinite',display:'inline-block'}}/> Extracting...</>
            ) : extractStatus==='success' ? (
              <>🖼 Re-extract Frames @ {fps} FPS</>
            ) : (
              <>🖼 Extract Frames @ {fps} FPS</>
            )}
          </button>

          {extractStatus==='success' && extractResult && (
            <div style={{marginTop:10,padding:'8px 12px',borderRadius:8,
              background:'rgba(34,197,94,0.08)',border:'1px solid rgba(34,197,94,0.2)',
              fontSize:12,color:'#86efac'}}>
              ✅ <strong>{extractResult.frameCount}</strong> frames → <code style={{fontSize:10}}>{extractResult.framesDir}/</code>
            </div>
          )}
        </div>

        {/* ── Verify Masks ── (independent section, works with existing frames) */}
        {(availableFrameDirs.length > 0 || extractStatus==='success') && (
          <div style={{
            padding:'16px', borderRadius:12,
            background:'rgba(14,165,233,0.06)',
            border:'1px solid rgba(14,165,233,0.18)',
            marginBottom:16,
          }}>
            <SectionLabel>🔍 Verify Masks</SectionLabel>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',marginBottom:12,lineHeight:1.5}}>
              Draw colored rectangles + labels on frames to verify JSON accuracy
            </div>

            {/* Frame directory selector (if multiple exist) */}
            {availableFrameDirs.length > 0 && (
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',marginBottom:6,fontWeight:600}}>
                  SELECT FRAMES FOLDER:
                </div>
                <select 
                  value={selectedFrameDir} 
                  onChange={e => setSelectedFrameDir(e.target.value)}
                  style={{
                    width:'100%', padding:'8px 10px', borderRadius:8,
                    background:'rgba(255,255,255,0.05)', 
                    border:'1px solid rgba(255,255,255,0.15)',
                    color:'#fff', fontSize:12, cursor:'pointer',
                  }}>
                  {availableFrameDirs.map(dir => (
                    <option key={dir} value={dir}>{dir}</option>
                  ))}
                  {extractResult && !availableFrameDirs.includes(extractResult.framesDir) && (
                    <option value={extractResult.framesDir}>{extractResult.framesDir} (new)</option>
                  )}
                </select>
              </div>
            )}

            {verifyStatus==='error' && (
              <div style={{marginBottom:10,padding:'8px 10px',borderRadius:8,
                background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',
                fontSize:12,color:'#fca5a5'}}>⚠️ {verifyError}</div>
            )}

            <button onClick={handleVerifyMasks} disabled={verifyStatus==='loading'} style={{
              width:'100%', padding:'10px 0',
              background: verifyStatus==='loading'?'rgba(14,165,233,0.4)':'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
              border:'none', borderRadius:10, color:'#fff',
              fontSize:13, fontWeight:700,
              cursor: verifyStatus==='loading'?'not-allowed':'pointer',
              display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              boxShadow:'0 2px 8px rgba(14,165,233,0.3)',
            }}>
              {verifyStatus==='loading' ? (
                <>
                  <span style={{width:13,height:13,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',animation:'spin 0.7s linear infinite',display:'inline-block'}}/>
                  Verifying masks...
                </>
              ) : verifyStatus==='success' ? (
                <>✅ Re-verify Masks</>
              ) : (
                <>🔍 Verify Masks (Draw on Frames)</>
              )}
            </button>

            {verifyStatus==='success' && verifyResult && (
              <div style={{marginTop:10,padding:'10px 12px',borderRadius:8,
                background:'rgba(14,165,233,0.08)',border:'1px solid rgba(14,165,233,0.25)',
                fontSize:12,color:'#7dd3fc'}}>
                ✅ <strong>{verifyResult.frameCount}</strong> frames visualized → <code style={{fontSize:10}}>{verifyResult.outputDir}/</code>
              </div>
            )}
          </div>
        )}

        {/* ── Convert to YOLO ── (shown after extract) */}
        {extractStatus==='success' && (
          <div style={{
            padding:'16px', borderRadius:12,
            background:'rgba(99,102,241,0.06)',
            border:'1px solid rgba(99,102,241,0.18)',
          }}>
            <SectionLabel>Convert to YOLO Dataset</SectionLabel>

            {yoloStatus !== 'success' ? (
              <>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <span style={{fontSize:12,color:'rgba(255,255,255,0.4)'}}>Validation size</span>
                  <span style={{fontSize:13,fontWeight:700,color:'#a5b4fc',
                    background:'rgba(99,102,241,0.15)',padding:'2px 10px',borderRadius:5}}>
                    val {valPct}% · train {100-valPct}%
                  </span>
                </div>
                <div style={{display:'flex',gap:5,marginBottom:8}}>
                  {[10,15,20,25,30].map(v => (
                    <button key={v} onClick={()=>setValPct(v)} style={{
                      flex:1,padding:'6px 0',fontSize:12,fontWeight:600,
                      borderRadius:6,cursor:'pointer',border:'none',
                      background:valPct===v?'#6366f1':'rgba(255,255,255,0.07)',
                      color:valPct===v?'#fff':'rgba(255,255,255,0.4)',
                    }}>{v}%</button>
                  ))}
                </div>
                <input type="range" min={5} max={50} step={5} value={valPct}
                  onChange={e=>setValPct(Number(e.target.value))}
                  style={{width:'100%',accentColor:'#6366f1',marginBottom:10,cursor:'pointer'}}/>

                {yoloStatus==='error' && (
                  <div style={{marginBottom:10,padding:'8px 10px',borderRadius:8,
                    background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',
                    fontSize:12,color:'#fca5a5'}}>⚠️ {yoloError}</div>
                )}

                <button onClick={handleYolo} disabled={yoloStatus==='loading'} style={{
                  width:'100%',padding:'10px 0',
                  background:yoloStatus==='loading'?'rgba(99,102,241,0.4)':'#6366f1',
                  border:'none',borderRadius:10,color:'#fff',
                  fontSize:13,fontWeight:700,
                  cursor:yoloStatus==='loading'?'not-allowed':'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center',gap:8,
                }}>
                  {yoloStatus==='loading'?(
                    <><span style={{width:13,height:13,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',animation:'spin 0.7s linear infinite',display:'inline-block'}}/> Converting...</>
                  ):<>🗂 Convert to YOLO (val {valPct}%)</>}
                </button>
              </>
            ) : (
              <div style={{textAlign:'center',padding:'8px 0'}}>
                <div style={{fontSize:20,marginBottom:8}}>🎉</div>
                <div style={{fontSize:14,fontWeight:700,color:'#a5b4fc',marginBottom:10}}>YOLO Dataset Ready!</div>
                <div style={{display:'flex',justifyContent:'center',gap:24,marginBottom:10}}>
                  <div style={{textAlign:'center'}}>
                    <div style={{fontSize:20,fontWeight:800,color:'#6366f1'}}>{yoloResult?.trainCount}</div>
                    <div style={{fontSize:10,color:'rgba(255,255,255,0.4)'}}>train</div>
                  </div>
                  <div style={{color:'rgba(255,255,255,0.2)',alignSelf:'center'}}>·</div>
                  <div style={{textAlign:'center'}}>
                    <div style={{fontSize:20,fontWeight:800,color:'#818cf8'}}>{yoloResult?.valCount}</div>
                    <div style={{fontSize:10,color:'rgba(255,255,255,0.4)'}}>val</div>
                  </div>
                </div>
                <div style={{fontFamily:'monospace',fontSize:10,color:'rgba(255,255,255,0.35)',
                  padding:'8px',background:'rgba(0,0,0,0.3)',borderRadius:6,lineHeight:1.8}}>
                  📁 {yoloResult?.yoloDir}/<br/>
                  &nbsp;&nbsp;images/train/ &nbsp;images/val/<br/>
                  &nbsp;&nbsp;labels/train/ &nbsp;labels/val/<br/>
                  &nbsp;&nbsp;dataset.yaml
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionLabel({children}: {children: React.ReactNode}) {
  return (
    <div style={{
      fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.3)',
      letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:10,
    }}>{children}</div>
  );
}

function ActionBtn({icon,label,color,onClick}: {icon:string;label:string;color:string;onClick:()=>void}) {
  return (
    <button onClick={onClick} style={{
      flex:1,padding:'10px 14px',borderRadius:10,cursor:'pointer',
      background:`${color}18`,border:`1px solid ${color}44`,
      color:color,fontSize:12,fontWeight:700,
      display:'flex',alignItems:'center',justifyContent:'center',gap:6,
    }}>
      <span>{icon}</span>{label}
    </button>
  );
}

// ── Extract Frames Modal ───────────────────────────────────────────
function ExtractFramesModal({projectName, displayName, hasMasked, onClose}: {
  projectName: string;
  displayName: string;
  hasMasked: boolean;
  onClose: () => void;
}) {
  const [fps, setFps] = useState('1');
  const [source, setSource] = useState<'original' | 'masked'>('original');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<{frameCount: number; framesDir: string; alreadyExists: boolean} | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // YOLO convert state (shown after extract success)
  const [yoloStatus, setYoloStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [yoloResult, setYoloResult] = useState<{trainCount: number; valCount: number; yoloDir: string} | null>(null);
  const [yoloError, setYoloError] = useState('');
  const [valPct, setValPct] = useState(20);

  const FPS_OPTIONS = [
    {value: '0.5', label: '0.5 fps — 1 frame every 2s'},
    {value: '1',   label: '1 fps  — 1 frame per second'},
    {value: '2',   label: '2 fps  — 2 frames per second'},
    {value: '5',   label: '5 fps  — 5 frames per second'},
    {value: '10',  label: '10 fps — 10 frames per second'},
    {value: '24',  label: '24 fps — every frame'},
  ];

  async function handleExtract() {
    setStatus('loading');
    setErrorMsg('');
    try {
      const r = await fetch(`http://localhost:7263/extract_frames/${projectName}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({fps: parseFloat(fps), source}),
      });
      const d = await r.json();
      if (!r.ok || !d.success) {
        setErrorMsg(d.error || 'Extraction failed');
        setStatus('error');
        return;
      }
      setResult({frameCount: d.frame_count, framesDir: d.frames_dir, alreadyExists: d.already_exists});
      setStatus('success');
    } catch (e) {
      setErrorMsg('Network error — is the backend running?');
      setStatus('error');
    }
  }

  async function handleYoloConvert() {
    if (!result) return;
    setYoloStatus('loading');
    setYoloError('');
    try {
      const r = await fetch(`http://localhost:7263/labelme2yolo/${projectName}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({frames_dir: result.framesDir, val_size: valPct / 100}),
      });
      const d = await r.json();
      if (!r.ok || !d.success) {
        setYoloError(d.error || 'Conversion failed');
        setYoloStatus('error');
        return;
      }
      setYoloResult({trainCount: d.train_count, valCount: d.val_count, yoloDir: d.yolo_dir});
      setYoloStatus('success');
    } catch (e) {
      setYoloError('Network error — is the backend running?');
      setYoloStatus('error');
    }
  }

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:999,
      background:'rgba(0,0,0,0.75)',
      backdropFilter:'blur(6px)',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:24,
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background:'#13151C',
        border:'1px solid rgba(255,255,255,0.1)',
        borderRadius:20,
        padding:'32px 36px',
        width:'100%', maxWidth:460,
        boxShadow:'0 24px 64px rgba(0,0,0,0.6)',
        animation:'fadeUp 0.2s ease',
      }}>
        <style>{`@keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }`}</style>

        {/* Header */}
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24}}>
          <div>
            <div style={{fontSize:18, fontWeight:700, color:'#F0F2F7', letterSpacing:'-0.3px'}}>🖼 Extract Frames</div>
            <div style={{fontSize:12, color:'rgba(240,242,247,0.4)', marginTop:3}}>{displayName}</div>
          </div>
          <button onClick={onClose} style={{
            background:'rgba(255,255,255,0.06)', border:'none',
            width:32, height:32, borderRadius:8,
            color:'rgba(255,255,255,0.5)', fontSize:16,
            cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
          }}>✕</button>
        </div>

        {status !== 'success' ? (
          <>
            {/* Source selection */}
            <div style={{marginBottom:20}}>
              <div style={{fontSize:12, fontWeight:600, color:'rgba(240,242,247,0.5)', marginBottom:10, letterSpacing:'0.05em', textTransform:'uppercase'}}>Source Video</div>
              <div style={{display:'flex', gap:10}}>
                {(['original', 'masked'] as const).map(s => (
                  <button
                    key={s}
                    disabled={s === 'masked' && !hasMasked}
                    onClick={() => setSource(s)}
                    style={{
                      flex:1, padding:'10px 0', borderRadius:10,
                      border:`1px solid ${source === s ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)'}`,
                      background: source === s ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)',
                      color: source === s ? '#a5b4fc' : (s === 'masked' && !hasMasked) ? 'rgba(255,255,255,0.2)' : 'rgba(240,242,247,0.6)',
                      fontSize:13, fontWeight:600, cursor: (s === 'masked' && !hasMasked) ? 'not-allowed' : 'pointer',
                      transition:'all 0.15s',
                    }}>
                    {s === 'original' ? '🎬 Original' : '🎭 Masked'}
                    {s === 'masked' && !hasMasked && <div style={{fontSize:10, opacity:0.5}}>not available</div>}
                  </button>
                ))}
              </div>
            </div>

            {/* FPS selection */}
            <div style={{marginBottom:24}}>
              <div style={{fontSize:12, fontWeight:600, color:'rgba(240,242,247,0.5)', marginBottom:10, letterSpacing:'0.05em', textTransform:'uppercase'}}>Frame Rate</div>
              <div style={{display:'flex', flexDirection:'column', gap:6}}>
                {FPS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFps(opt.value)}
                    style={{
                      textAlign:'left', padding:'10px 14px', borderRadius:10,
                      border:`1px solid ${fps === opt.value ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.06)'}`,
                      background: fps === opt.value ? 'rgba(99,102,241,0.12)' : 'rgba(255,255,255,0.02)',
                      color: fps === opt.value ? '#a5b4fc' : 'rgba(240,242,247,0.55)',
                      fontSize:13, fontWeight: fps === opt.value ? 600 : 400,
                      cursor:'pointer', transition:'all 0.15s',
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {status === 'error' && (
              <div style={{
                marginBottom:16, padding:'10px 14px', borderRadius:10,
                background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)',
                fontSize:12, color:'#fca5a5',
              }}>⚠️ {errorMsg}</div>
            )}

            {/* Extract button */}
            <button
              onClick={handleExtract}
              disabled={status === 'loading'}
              style={{
                width:'100%', padding:'13px 0',
                background: status === 'loading' ? 'rgba(99,102,241,0.4)' : '#6366f1',
                border:'none', borderRadius:12,
                color:'#fff', fontSize:14, fontWeight:700,
                cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                boxShadow:'0 4px 16px rgba(99,102,241,0.3)',
                transition:'all 0.15s',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              }}>
              {status === 'loading' ? (
                <>
                  <span style={{
                    width:14, height:14, borderRadius:'50%',
                    border:'2px solid rgba(255,255,255,0.3)',
                    borderTopColor:'#fff',
                    animation:'spin 0.7s linear infinite',
                    display:'inline-block',
                  }} />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  Extracting frames...
                </>
              ) : (
                <>🖼 Extract Frames</>
              )}
            </button>
          </>
        ) : (
          /* ── Success: frames extracted ── */
          <div style={{padding:'4px 0'}}>
            {/* Extracted info */}
            <div style={{
              display:'flex', alignItems:'center', gap:12, marginBottom:20,
              padding:'12px 16px', borderRadius:12,
              background:'rgba(34,197,94,0.08)', border:'1px solid rgba(34,197,94,0.2)',
            }}>
              <span style={{fontSize:28}}>✅</span>
              <div>
                <div style={{fontSize:14, fontWeight:700, color:'#F0F2F7'}}>
                  {result?.alreadyExists ? 'Already extracted!' : 'Frames extracted!'}
                </div>
                <div style={{fontSize:12, color:'rgba(240,242,247,0.5)', marginTop:2}}>
                  <strong style={{color:'#86efac'}}>{result?.frameCount}</strong> frames →{' '}
                  <code style={{fontSize:11, color:'rgba(240,242,247,0.55)'}}>
                    exports/{projectName}/{result?.framesDir}/
                  </code>
                </div>
              </div>
            </div>

            {/* ── YOLO Convert section ── */}
            {yoloStatus !== 'success' ? (
              <div style={{
                padding:'18px', marginBottom:20,
                background:'rgba(99,102,241,0.06)',
                border:'1px solid rgba(99,102,241,0.18)',
                borderRadius:14,
              }}>
                <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:14}}>
                  <span style={{fontSize:18}}>🗂</span>
                  <div>
                    <div style={{fontSize:14, fontWeight:700, color:'#a5b4fc'}}>Convert to YOLO Dataset</div>
                    <div style={{fontSize:11, color:'rgba(240,242,247,0.35)', marginTop:1}}>
                      Uses <code style={{fontSize:10}}>labelme2yolo</code> · images/ · labels/ · dataset.yaml
                    </div>
                  </div>
                </div>

                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10}}>
                  <span style={{fontSize:12, fontWeight:600, color:'rgba(240,242,247,0.5)'}}>Validation size</span>
                  <span style={{fontSize:13, fontWeight:700, color:'#a5b4fc', background:'rgba(99,102,241,0.15)', padding:'2px 10px', borderRadius:6}}>
                    val {valPct}% &nbsp;·&nbsp; train {100 - valPct}%
                  </span>
                </div>

                <div style={{display:'flex', gap:6, marginBottom:10}}>
                  {[10, 15, 20, 25, 30].map(v => (
                    <button key={v} onClick={() => setValPct(v)} style={{
                      flex:1, padding:'6px 0', fontSize:12, fontWeight:600,
                      borderRadius:7, cursor:'pointer', border:'none',
                      background: valPct === v ? '#6366f1' : 'rgba(255,255,255,0.07)',
                      color: valPct === v ? '#fff' : 'rgba(240,242,247,0.5)',
                      transition:'all 0.15s',
                    }}>{v}%</button>
                  ))}
                </div>

                <input type="range" min={5} max={50} step={5} value={valPct}
                  onChange={e => setValPct(Number(e.target.value))}
                  style={{width:'100%', accentColor:'#6366f1', cursor:'pointer', marginBottom:4}} />
                <div style={{display:'flex', justifyContent:'space-between', fontSize:10, color:'rgba(240,242,247,0.25)', marginBottom:14}}>
                  <span>5% val</span><span>50% val</span>
                </div>

                {yoloStatus === 'error' && (
                  <div style={{marginBottom:12, padding:'8px 12px', borderRadius:8, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', fontSize:12, color:'#fca5a5'}}>
                    ⚠️ {yoloError}
                  </div>
                )}

                <button onClick={handleYoloConvert} disabled={yoloStatus === 'loading'} style={{
                  width:'100%', padding:'11px 0',
                  background: yoloStatus === 'loading' ? 'rgba(99,102,241,0.4)' : '#6366f1',
                  border:'none', borderRadius:10, color:'#fff', fontSize:13, fontWeight:700,
                  cursor: yoloStatus === 'loading' ? 'not-allowed' : 'pointer',
                  boxShadow:'0 3px 12px rgba(99,102,241,0.3)',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                }}>
                  {yoloStatus === 'loading' ? (
                    <>
                      <span style={{width:13, height:13, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', animation:'spin 0.7s linear infinite', display:'inline-block'}} />
                      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                      Converting with labelme2yolo...
                    </>
                  ) : <>🗂 Convert to YOLO (val {valPct}%)</>}
                </button>
              </div>
            ) : (
              <div style={{padding:'16px 18px', marginBottom:20, background:'rgba(99,102,241,0.08)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:14}}>
                <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:12}}>
                  <span style={{fontSize:20}}>🎉</span>
                  <div style={{fontSize:14, fontWeight:700, color:'#a5b4fc'}}>YOLO Dataset Ready!</div>
                </div>
                <div style={{display:'flex', justifyContent:'center', gap:28, marginBottom:12}}>
                  <div style={{textAlign:'center'}}>
                    <div style={{fontSize:22, fontWeight:800, color:'#6366f1'}}>{yoloResult?.trainCount}</div>
                    <div style={{fontSize:11, color:'rgba(240,242,247,0.4)'}}>train</div>
                  </div>
                  <div style={{color:'rgba(240,242,247,0.15)', fontSize:22, alignSelf:'center'}}>·</div>
                  <div style={{textAlign:'center'}}>
                    <div style={{fontSize:22, fontWeight:800, color:'#818cf8'}}>{yoloResult?.valCount}</div>
                    <div style={{fontSize:11, color:'rgba(240,242,247,0.4)'}}>val</div>
                  </div>
                </div>
                <div style={{fontFamily:'monospace', fontSize:11, color:'rgba(240,242,247,0.4)', lineHeight:1.8, padding:'8px 10px', background:'rgba(0,0,0,0.25)', borderRadius:8}}>
                  <div style={{color:'#818cf8', fontWeight:700, marginBottom:2}}>📁 {yoloResult?.yoloDir}/</div>
                  <div>&nbsp;&nbsp;├─ images/train/ &nbsp;&nbsp;images/val/</div>
                  <div>&nbsp;&nbsp;├─ labels/train/ &nbsp;&nbsp;labels/val/</div>
                  <div>&nbsp;&nbsp;└─ dataset.yaml</div>
                </div>
              </div>
            )}

            <div style={{display:'flex', gap:10}}>
              <button onClick={() => { setStatus('idle'); setResult(null); setYoloStatus('idle'); setYoloResult(null); }} style={{
                flex:1, padding:'10px 0', borderRadius:10,
                background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
                color:'rgba(240,242,247,0.7)', fontSize:13, fontWeight:600, cursor:'pointer',
              }}>Extract More</button>
              <button onClick={onClose} style={{
                flex:1, padding:'10px 0', borderRadius:10,
                background:'#6366f1', border:'none',
                color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer',
              }}>Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// ── Crop & Start Modal ──────────────────────────────────────────────
function CropAndStartModal({video, onClose, onStart}: {
  video: any;
  onClose: () => void;
  onStart: (encodedVideo: any) => void;
}) {
  const totalSec = video.durationSec ?? 60;
  const [startSec, setStartSec] = useState(0);
  const [endSec, setEndSec]     = useState(Math.min(totalSec, 30));
  const [status, setStatus]     = useState<'idle'|'encoding'|'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const videoRef  = useRef<HTMLVideoElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const dragging  = useRef<'start'|'end'|null>(null);

  const HANDLE_W = 14;

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = (s % 60).toFixed(1);
    return m > 0 ? `${m}:${sec.padStart(4,'0')}` : `${Number(sec).toFixed(1)}s`;
  }

  const durSec   = endSec - startSec;
  const startFrac = startSec / totalSec;
  const endFrac   = endSec   / totalSec;

  // Sync video to current position when handle released
  function seekVideo(sec: number) {
    if (videoRef.current) {
      videoRef.current.currentTime = sec;
    }
  }

  // Timeline pointer drag
  useEffect(() => {
    function getFrac(e: PointerEvent) {
      const rect = timelineRef.current?.getBoundingClientRect();
      if (!rect) return 0;
      return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    }
    function onMove(e: PointerEvent) {
      if (!dragging.current) return;
      const f = getFrac(e);
      const sec = f * totalSec;
      if (dragging.current === 'start') {
        const s = Math.min(sec, endSec - 0.5);
        setStartSec(Math.max(0, s));
        if (videoRef.current) videoRef.current.currentTime = Math.max(0, s);
      } else {
        const s = Math.max(sec, startSec + 0.5);
        setEndSec(Math.min(totalSec, s));
        if (videoRef.current) videoRef.current.currentTime = Math.min(totalSec, s);
      }
    }
    function onUp() { dragging.current = null; }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  }, [startSec, endSec, totalSec]);

  async function handleStart() {
    setStatus('encoding');
    setErrorMsg('');
    try {
      const r = await fetch('http://localhost:7263/prepare_session', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({raw_path: video.path, start_sec: startSec, end_sec: endSec}),
      });
      const d = await r.json();
      if (!r.ok || !d.success) { setErrorMsg(d.error || 'Encoding failed'); setStatus('error'); return; }
      onStart({...video, path: d.path, url: `http://localhost:7263/${d.path}`, durationSec: durSec});
    } catch {
      setErrorMsg('Network error — is the backend running?');
      setStatus('error');
    }
  }

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:999,
      background:'rgba(0,0,0,0.88)', backdropFilter:'blur(8px)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:24,
    }} onClick={e => { if (e.target===e.currentTarget) onClose(); }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{
        background:'#13151C', border:'1px solid rgba(255,255,255,0.1)',
        borderRadius:20, padding:'28px 32px',
        width:'100%', maxWidth:600,
        boxShadow:'0 24px 64px rgba(0,0,0,0.7)',
        display:'flex', flexDirection:'column', gap:20,
      }}>

        {/* Header */}
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:17, fontWeight:700, color:'#F0F2F7'}}>✂️ Select clip range</div>
            <div style={{fontSize:12, color:'rgba(240,242,247,0.35)', marginTop:2}}>
              Drag handles on the timeline · Only selected clip gets encoded
            </div>
          </div>
          <button onClick={onClose} style={{background:'rgba(255,255,255,0.06)',border:'none',width:32,height:32,borderRadius:8,color:'rgba(255,255,255,0.5)',fontSize:16,cursor:'pointer'}}>✕</button>
        </div>

        {/* Video preview */}
        <div style={{borderRadius:12, overflow:'hidden', background:'#000', aspectRatio:'16/9', position:'relative'}}>
          <video
            ref={videoRef}
            src={`http://localhost:7263/${video.path}`}
            style={{width:'100%', height:'100%', objectFit:'contain'}}
            muted preload="auto"
          />
          {/* Play/pause overlay */}
          <div
            onClick={() => videoRef.current?.paused ? videoRef.current.play() : videoRef.current?.pause()}
            style={{
              position:'absolute', bottom:10, left:'50%', transform:'translateX(-50%)',
              background:'rgba(0,0,0,0.55)', borderRadius:20, padding:'5px 16px',
              fontSize:12, color:'rgba(255,255,255,0.8)', cursor:'pointer',
              userSelect:'none',
            }}>
            ▶ / ⏸ click to play/pause
          </div>
        </div>

        {/* Timeline with drag handles */}
        <div>
          {/* Time labels */}
          <div style={{display:'flex', justifyContent:'space-between', fontSize:10, color:'rgba(255,255,255,0.3)', marginBottom:6}}>
            <span>0:00</span>
            <span style={{color:'#a5b4fc', fontWeight:700}}>
              {formatTime(startSec)} → {formatTime(endSec)} &nbsp;·&nbsp; {formatTime(durSec)} selected
            </span>
            <span>{formatTime(totalSec)}</span>
          </div>

          {/* Timeline bar */}
          <div
            ref={timelineRef}
            style={{
              position:'relative', height:48, borderRadius:8,
              background:'rgba(255,255,255,0.06)',
              userSelect:'none',
            }}
            onClick={e => {
              // Click to seek preview
              const rect = timelineRef.current?.getBoundingClientRect();
              if (!rect) return;
              const f = (e.clientX - rect.left) / rect.width;
              if (videoRef.current) videoRef.current.currentTime = f * totalSec;
            }}
          >
            {/* Dim left */}
            <div style={{position:'absolute', top:0, bottom:0, left:0, width:`${startFrac*100}%`, background:'rgba(0,0,0,0.5)', pointerEvents:'none'}} />
            {/* Dim right */}
            <div style={{position:'absolute', top:0, bottom:0, right:0, width:`${(1-endFrac)*100}%`, background:'rgba(0,0,0,0.5)', pointerEvents:'none'}} />
            {/* Selection fill */}
            <div style={{
              position:'absolute', top:0, bottom:0,
              left:`${startFrac*100}%`, width:`${(endFrac-startFrac)*100}%`,
              background:'rgba(99,102,241,0.2)',
              borderTop:'2px solid #6366f1', borderBottom:'2px solid #6366f1',
              pointerEvents:'none',
            }} />

            {/* Duration badge */}
            <div style={{
              position:'absolute', top:'50%', transform:'translateY(-50%)',
              left:`${startFrac*100}%`, width:`${(endFrac-startFrac)*100}%`,
              display:'flex', alignItems:'center', justifyContent:'center',
              pointerEvents:'none',
            }}>
              <span style={{fontSize:11,fontWeight:700,color:'#a5b4fc',background:'rgba(13,15,22,0.85)',padding:'2px 8px',borderRadius:6}}>
                {formatTime(durSec)}
              </span>
            </div>

            {/* ── Left handle ── */}
            <div
              onPointerDown={e => { e.stopPropagation(); dragging.current = 'start'; (e.target as HTMLElement).setPointerCapture(e.pointerId); }}
              onClick={e => e.stopPropagation()}
              style={{
                position:'absolute', top:0, bottom:0,
                left:`calc(${startFrac*100}% - ${HANDLE_W/2}px)`,
                width:HANDLE_W,
                background:'#6366f1', borderRadius:'4px 0 0 4px',
                cursor:'ew-resize', zIndex:10,
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3,
              }}>
              {[0,1,2].map(i => <div key={i} style={{width:2,height:8,borderRadius:1,background:'rgba(255,255,255,0.6)'}} />)}
              <div style={{
                position:'absolute', bottom:'110%', left:'50%', transform:'translateX(-50%)',
                background:'#1e1f26', color:'#818cf8', fontSize:10, fontWeight:700,
                padding:'2px 6px', borderRadius:4, whiteSpace:'nowrap',
                border:'1px solid rgba(99,102,241,0.4)',
              }}>{formatTime(startSec)}</div>
            </div>

            {/* ── Right handle ── */}
            <div
              onPointerDown={e => { e.stopPropagation(); dragging.current = 'end'; (e.target as HTMLElement).setPointerCapture(e.pointerId); }}
              onClick={e => e.stopPropagation()}
              style={{
                position:'absolute', top:0, bottom:0,
                left:`calc(${endFrac*100}% - ${HANDLE_W/2}px)`,
                width:HANDLE_W,
                background:'#6366f1', borderRadius:'0 4px 4px 0',
                cursor:'ew-resize', zIndex:10,
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:3,
              }}>
              {[0,1,2].map(i => <div key={i} style={{width:2,height:8,borderRadius:1,background:'rgba(255,255,255,0.6)'}} />)}
              <div style={{
                position:'absolute', bottom:'110%', left:'50%', transform:'translateX(-50%)',
                background:'#1e1f26', color:'#818cf8', fontSize:10, fontWeight:700,
                padding:'2px 6px', borderRadius:4, whiteSpace:'nowrap',
                border:'1px solid rgba(99,102,241,0.4)',
              }}>{formatTime(endSec)}</div>
            </div>
          </div>

          {/* Seek buttons */}
          <div style={{display:'flex', gap:8, marginTop:10}}>
            <button onClick={() => seekVideo(startSec)} style={{
              flex:1, padding:'7px 0', fontSize:12, fontWeight:600,
              background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.25)',
              borderRadius:8, color:'#a5b4fc', cursor:'pointer',
            }}>⏮ Preview start</button>
            <button onClick={() => seekVideo(endSec)} style={{
              flex:1, padding:'7px 0', fontSize:12, fontWeight:600,
              background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.25)',
              borderRadius:8, color:'#a5b4fc', cursor:'pointer',
            }}>Preview end ⏭</button>
          </div>
        </div>

        {/* Error */}
        {status === 'error' && (
          <div style={{padding:'10px 14px', borderRadius:10, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', fontSize:12, color:'#fca5a5'}}>
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Start button */}
        <button
          onClick={handleStart} disabled={status==='encoding'}
          style={{
            width:'100%', padding:'14px 0',
            background: status==='encoding' ? 'rgba(99,102,241,0.4)' : '#6366f1',
            border:'none', borderRadius:12,
            color:'#fff', fontSize:15, fontWeight:700,
            cursor: status==='encoding' ? 'not-allowed' : 'pointer',
            boxShadow:'0 4px 16px rgba(99,102,241,0.3)',
            display:'flex', alignItems:'center', justifyContent:'center', gap:10,
          }}>
          {status==='encoding' ? (
            <>
              <span style={{width:16,height:16,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',animation:'spin 0.7s linear infinite',display:'inline-block'}} />
              Encoding {formatTime(durSec)} clip...
            </>
          ) : <>▶ Start Tracking ({formatTime(durSec)})</>}
        </button>
      </div>
    </div>
  );
}


// ── Verify Masks Section (Independent Tool) ────────────────────────
function VerifyMasksSection({projects}: {projects: ExportProject[]}) {
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [availableFrames, setAvailableFrames] = useState<string[]>([]);
  const [selectedFrameDir, setSelectedFrameDir] = useState<string>('');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<{outputDir: string; frameCount: number} | null>(null);
  const [error, setError] = useState('');

  // Load frame directories when project selected
  useEffect(() => {
    if (!selectedProject) {
      setAvailableFrames([]);
      setSelectedFrameDir('');
      return;
    }

    async function loadFrames() {
      try {
        const r = await fetch(`http://localhost:7263/list_frame_dirs/${selectedProject}`);
        if (r.ok) {
          const d = await r.json();
          if (d.frame_dirs && d.frame_dirs.length > 0) {
            setAvailableFrames(d.frame_dirs);
            setSelectedFrameDir(d.frame_dirs[0]);
          } else {
            setAvailableFrames([]);
            setError('No extracted frames found for this project. Extract frames first.');
          }
        }
      } catch (e) {
        setError('Failed to load frame directories');
      }
    }
    loadFrames();
  }, [selectedProject]);

  async function handleVerify() {
    if (!selectedProject || !selectedFrameDir) return;
    
    setVerifying(true);
    setError('');
    setResult(null);

    try {
      const r = await fetch(`http://localhost:7263/verify_masks/${selectedProject}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({frames_dir: selectedFrameDir}),
      });
      const d = await r.json();
      if (!r.ok || !d.success) {
        setError(d.error || 'Verification failed');
        return;
      }
      setResult({outputDir: d.output_dir, frameCount: d.frame_count});
    } catch (e) {
      setError('Network error');
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div style={{
      padding: '24px', borderRadius: 14,
      background: 'linear-gradient(135deg, rgba(14,165,233,0.08) 0%, rgba(6,182,212,0.05) 100%)',
      border: '1px solid rgba(14,165,233,0.2)',
      maxWidth: 800, margin: '0 auto',
    }}>
      <div style={{fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 16, lineHeight: 1.6}}>
        Verify that your JSON masks are correctly aligned with frames by drawing colored rectangles + labels.
      </div>

      {/* Project selector */}
      <div style={{marginBottom: 14}}>
        <div style={{fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em'}}>
          SELECT PROJECT:
        </div>
        <select
          value={selectedProject}
          onChange={e => {
            setSelectedProject(e.target.value);
            setResult(null);
            setError('');
          }}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 10,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff', fontSize: 13, cursor: 'pointer',
            fontWeight: 600,
          }}>
          <option value="">-- Choose a completed project --</option>
          {projects.map(p => (
            <option key={p.name} value={p.name}>
              {p.displayName || p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Frame directory selector (if frames exist) */}
      {availableFrames.length > 0 && (
        <div style={{marginBottom: 14}}>
          <div style={{fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: 600, letterSpacing: '0.05em'}}>
            SELECT FRAMES FOLDER:
          </div>
          <select
            value={selectedFrameDir}
            onChange={e => {
              setSelectedFrameDir(e.target.value);
              setResult(null);
            }}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 10,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#fff', fontSize: 13, cursor: 'pointer',
              fontWeight: 600,
            }}>
            {availableFrames.map(dir => (
              <option key={dir} value={dir}>{dir}</option>
            ))}
          </select>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div style={{
          marginBottom: 14, padding: '10px 12px', borderRadius: 8,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          fontSize: 12, color: '#fca5a5', lineHeight: 1.5,
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Verify button */}
      <button
        onClick={handleVerify}
        disabled={!selectedProject || !selectedFrameDir || verifying}
        style={{
          width: '100%', padding: '12px 0',
          background: (!selectedProject || !selectedFrameDir || verifying) 
            ? 'rgba(14,165,233,0.3)' 
            : 'linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)',
          border: 'none', borderRadius: 10, color: '#fff',
          fontSize: 14, fontWeight: 700,
          cursor: (!selectedProject || !selectedFrameDir || verifying) ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: '0 4px 12px rgba(14,165,233,0.3)',
          transition: 'all 0.2s',
        }}>
        {verifying ? (
          <>
            <span style={{
              width: 14, height: 14, borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.3)',
              borderTopColor: '#fff',
              animation: 'spin 0.7s linear infinite',
              display: 'inline-block',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            Verifying masks...
          </>
        ) : (
          <>🔍 Verify Masks (Draw Rectangles + Labels)</>
        )}
      </button>

      {/* Success result */}
      {result && (
        <div style={{
          marginTop: 14, padding: '12px 14px', borderRadius: 10,
          background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
        }}>
          <div style={{fontSize: 14, fontWeight: 700, color: '#86efac', marginBottom: 4}}>
            ✅ Verification Complete!
          </div>
          <div style={{fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6}}>
            <strong>{result.frameCount}</strong> frames with colored rectangles + labels saved to:
          </div>
          <div style={{
            marginTop: 6, padding: '6px 10px', borderRadius: 6,
            background: 'rgba(0,0,0,0.3)',
            fontFamily: 'monospace', fontSize: 11, color: '#86efac',
          }}>
            demo/data/exports/{selectedProject}/{result.outputDir}/
          </div>
        </div>
      )}
    </div>
  );
}
