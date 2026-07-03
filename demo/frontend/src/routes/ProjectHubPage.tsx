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
import Logger from '@/common/logger/Logger';
import {sessionAtom, uploadingStateAtom} from '@/demo/atoms';
import {MAX_UPLOAD_FILE_SIZE} from '@/demo/DemoConfig';
import {useSetAtom} from 'jotai';
import {useCallback, useEffect, useRef, useState} from 'react';
import {useNavigate} from 'react-router-dom';

type ExportProject = {
  name: string;
  hasJson: boolean;
  hasOriginal: boolean;
  hasMasked: boolean;
  thumbnailUrl: string | null;
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
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function VideoThumbnail({src}: {src: string | null}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  if (!src) {
    return (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,0.05)',
        color: 'rgba(255,255,255,0.3)',
        fontSize: 13,
      }}>
        No preview
      </div>
    );
  }

  // Use video thumbnail by seeking to first frame
  return (
    <video
      ref={videoRef}
      src={src}
      style={{width: '100%', height: '100%', objectFit: 'cover'}}
      muted
      preload="metadata"
      onLoadedMetadata={e => {
        (e.target as HTMLVideoElement).currentTime = 0.1;
      }}
    />
  );
}

export default function ProjectHubPage() {
  const [projects, setProjects] = useState<ExportProject[]>([]);
  const [drafts, setDrafts] = useState<DraftProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const navigate = useNavigate();
  const setUploadingState = useSetAtom(uploadingStateAtom);
  const setSession = useSetAtom(sessionAtom);

  const {getRootProps, getInputProps, isUploading, error} = useUploadVideo({
    onUpload: videoData => {
      navigate('/demo', {state: {video: videoData}});
      setUploadingState('default');
      setSession(null);
    },
    onUploadError: (err: Error) => {
      setUploadingState('error');
      Logger.error(err);
    },
    onUploadStart: () => setUploadingState('uploading'),
  });

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [exportsRes, draftsRes] = await Promise.all([
        fetch('http://localhost:7263/list_exports'),
        fetch('http://localhost:7263/list_drafts'),
      ]);
      const exportsData = await exportsRes.json();
      const draftsData = await draftsRes.json();
      setProjects(exportsData.exports || []);
      setDrafts(draftsData.drafts || []);
    } catch (e) {
      Logger.error('Failed to fetch data:', e);
    } finally {
      setLoading(false);
    }
  }

  const fetchDrafts = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:7263/list_drafts');
      const data = await res.json();
      setDrafts(data.drafts || []);
    } catch (e) {
      Logger.error(e);
    }
  }, []);

  function handleDownloadJSON(projectName: string) {
    const link = document.createElement('a');
    link.href = `http://localhost:7263/exports/${projectName}/tracking.json`;
    link.download = 'tracking.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function handleResumeDraft(draft: DraftProject) {
    try {
      const res = await fetch(`http://localhost:7263/load_draft/${draft.draft_id}`);
      const draftData = await res.json();
      navigate('/demo', {state: {draft: draftData}});
    } catch (e) {
      Logger.error('Failed to load draft:', e);
    }
  }

  async function handleDeleteDraft(draftId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Delete this draft?')) return;
    try {
      await fetch(`http://localhost:7263/delete_draft/${draftId}`, {method: 'DELETE'});
      fetchDrafts();
    } catch (err) {
      Logger.error(err);
    }
  }

  // Derive a clean display name from video path
  function videoName(path: string): string {
    return path.split('/').pop()?.replace('.mp4', '').replace(/_/g, ' ') || 'Untitled';
  }

  // Thumbnail URL for draft — prefer video itself for uploads, poster for gallery
  function draftThumbnail(draft: DraftProject): string | null {
    const path = draft.video_path;
    if (!path) return null;
    if (path.startsWith('uploads/')) return `http://localhost:7263/${path}`;
    if (path.startsWith('gallery/')) {
      const stem = path.replace('gallery/', '').replace('.mp4', '');
      return `http://localhost:7263/posters/${stem}.jpg`;
    }
    return draft.thumbnail_url;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0F1117',
      color: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* ── Header ── */}
      <div style={{
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '20px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>⬡</div>
          <span style={{fontWeight: 700, fontSize: 18, letterSpacing: '-0.3px'}}>SAM2 Tracker</span>
        </div>
        <span style={{fontSize: 13, color: 'rgba(255,255,255,0.4)'}}>
          Powered by Segment Anything Model 2
        </span>
      </div>

      <div style={{maxWidth: 1100, margin: '0 auto', padding: '48px 32px'}}>

        {/* ── Hero Upload ── */}
        <div style={{marginBottom: 64}}>
          <h1 style={{
            fontSize: 40, fontWeight: 700, marginBottom: 8,
            letterSpacing: '-0.5px', lineHeight: 1.2,
          }}>
            Track anything in video
          </h1>
          <p style={{fontSize: 16, color: 'rgba(255,255,255,0.5)', marginBottom: 32}}>
            Upload a video, click objects to track them, and export results.
          </p>

          <div
            {...getRootProps()}
            onDragEnter={() => setIsDragging(true)}
            onDragLeave={() => setIsDragging(false)}
            onDrop={() => setIsDragging(false)}
            style={{
              border: `2px dashed ${isDragging ? '#6366f1' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: 16,
              padding: '52px 32px',
              textAlign: 'center',
              background: isDragging ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.03)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}>
            <input {...getInputProps()} />
            <div style={{fontSize: 40, marginBottom: 16}}>
              {isUploading ? '⏳' : '↑'}
            </div>
            <div style={{fontSize: 18, fontWeight: 600, marginBottom: 8}}>
              {isUploading
                ? 'Uploading...'
                : error
                  ? `Error: ${error}`
                  : 'Drop a video here, or click to upload'}
            </div>
            <div style={{fontSize: 14, color: 'rgba(255,255,255,0.4)'}}>
              Max {MAX_UPLOAD_FILE_SIZE} · MP4 or MOV · up to 2 minutes
            </div>
          </div>
        </div>

        {/* ── Previous Projects ── */}
        <Section
          title="Previous Projects"
          count={projects.length}
          icon="✓"
          iconColor="#22c55e"
          empty={!loading && projects.length === 0}
          emptyText="Completed projects will appear here."
          loading={loading}>
          {projects.map(p => (
            <ProjectCard
              key={p.name}
              thumbnail={p.thumbnailUrl ? `http://localhost:7263/${p.thumbnailUrl}` : null}
              name={p.name.slice(0, 16) + '...'}
              badge="Complete"
              badgeColor="#22c55e"
              actions={
                p.hasJson
                  ? [{label: 'Download JSON', icon: '↓', onClick: () => handleDownloadJSON(p.name)}]
                  : []
              }
            />
          ))}
        </Section>

        {/* ── Drafts ── */}
        <Section
          title="Draft Projects"
          count={drafts.length}
          icon="⏸"
          iconColor="#f59e0b"
          empty={drafts.length === 0}
          emptyText="Start a project and leave mid-way — it will appear here."
          loading={false}>
          {drafts.map(draft => (
            <ProjectCard
              key={draft.draft_id}
              thumbnail={draftThumbnail(draft)}
              name={videoName(draft.video_path)}
              badge="Draft"
              badgeColor="#f59e0b"
              meta={`${draft.objects.length} obj · ${draft.mask_frame_count} frames · ${formatTimestamp(draft.saved_at)}`}
              actions={[
                {label: 'Resume', icon: '▶', onClick: () => handleResumeDraft(draft), primary: true},
                {label: 'Delete', icon: '✕', onClick: (e) => handleDeleteDraft(draft.draft_id, e), danger: true},
              ]}
            />
          ))}
        </Section>

      </div>
    </div>
  );
}

// ── Reusable Section ──────────────────────────────────────────────
function Section({title, count, icon, iconColor, empty, emptyText, loading, children}: {
  title: string;
  count: number;
  icon: string;
  iconColor: string;
  empty: boolean;
  emptyText: string;
  loading: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div style={{marginBottom: 56}}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 20,
      }}>
        <span style={{
          width: 28, height: 28, borderRadius: 8,
          background: `${iconColor}22`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, color: iconColor,
        }}>{icon}</span>
        <h2 style={{fontSize: 18, fontWeight: 600, margin: 0}}>{title}</h2>
        <span style={{
          fontSize: 12, fontWeight: 600,
          background: 'rgba(255,255,255,0.1)',
          padding: '2px 8px', borderRadius: 20,
          color: 'rgba(255,255,255,0.6)',
        }}>{count}</span>
      </div>

      {loading ? (
        <div style={{color: 'rgba(255,255,255,0.3)', fontSize: 14, padding: '24px 0'}}>Loading...</div>
      ) : empty ? (
        <div style={{
          padding: '32px 24px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px dashed rgba(255,255,255,0.1)',
          borderRadius: 12,
          textAlign: 'center',
          fontSize: 14,
          color: 'rgba(255,255,255,0.3)',
        }}>{emptyText}</div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 16,
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Reusable Project Card ─────────────────────────────────────────
type Action = {
  label: string;
  icon: string;
  onClick: (e: React.MouseEvent) => void;
  primary?: boolean;
  danger?: boolean;
};

function ProjectCard({thumbnail, name, badge, badgeColor, meta, actions = []}: {
  thumbnail: string | null;
  name: string;
  badge: string;
  badgeColor: string;
  meta?: string;
  actions?: Action[];
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        overflow: 'hidden',
        transition: 'all 0.2s',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? '0 8px 24px rgba(0,0,0,0.4)' : 'none',
      }}>
      {/* Thumbnail */}
      <div style={{
        width: '100%', aspectRatio: '16/9',
        background: '#1a1c24',
        position: 'relative', overflow: 'hidden',
      }}>
        <VideoThumbnail src={thumbnail} />
        {/* Badge */}
        <span style={{
          position: 'absolute', top: 8, right: 8,
          fontSize: 11, fontWeight: 700,
          background: `${badgeColor}22`,
          color: badgeColor,
          border: `1px solid ${badgeColor}44`,
          padding: '3px 8px', borderRadius: 6,
        }}>{badge}</span>
      </div>

      {/* Info */}
      <div style={{padding: '12px 14px'}}>
        <div style={{
          fontSize: 14, fontWeight: 600,
          marginBottom: meta ? 4 : 12,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }} title={name}>{name}</div>

        {meta && (
          <div style={{
            fontSize: 12, color: 'rgba(255,255,255,0.4)',
            marginBottom: 12,
          }}>{meta}</div>
        )}

        {/* Actions */}
        <div style={{display: 'flex', gap: 8}}>
          {actions.map(action => (
            <button
              key={action.label}
              onClick={action.onClick}
              style={{
                flex: action.primary ? 1 : undefined,
                padding: '7px 14px',
                fontSize: 13, fontWeight: 500,
                border: 'none', borderRadius: 8,
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all 0.15s',
                background: action.danger
                  ? 'rgba(239,68,68,0.15)'
                  : action.primary
                    ? '#6366f1'
                    : 'rgba(255,255,255,0.1)',
                color: action.danger
                  ? '#ef4444'
                  : '#fff',
              }}>
              <span>{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
