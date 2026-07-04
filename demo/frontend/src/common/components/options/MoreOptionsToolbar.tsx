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
import DownloadJSONOption from '@/common/components/options/DownloadJSONOption';
import DownloadOption from '@/common/components/options/DownloadOption';
import ExtractFramesOption from '@/common/components/options/ExtractFramesOption';
import RestartSessionButton from '@/common/components/session/RestartSessionButton';
import useMessagesSnackbar from '@/common/components/snackbar/useDemoMessagesSnackbar';
import {OBJECT_TOOLBAR_INDEX} from '@/common/components/toolbar/ToolbarConfig';
import {useEffect, useRef} from 'react';
import {useNavigate} from 'react-router-dom';

type Props = {
  onTabChange: (newIndex: number) => void;
};

export default function MoreOptionsToolbar({onTabChange}: Props) {
  const {clearMessage} = useMessagesSnackbar();
  const didClearMessageSnackbar = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!didClearMessageSnackbar.current) {
      didClearMessageSnackbar.current = true;
      clearMessage();
    }
  }, [clearMessage]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* ── Scrollable content ── */}
      <div style={{flex: 1, overflowY: 'auto', padding: '22px 20px 8px'}}>

        {/* Header */}
        <div style={{marginBottom: 20}}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'rgba(34,197,94,0.12)',
            border: '1px solid rgba(34,197,94,0.3)',
            borderRadius: 20, padding: '3px 11px',
            fontSize: 11, fontWeight: 700, color: '#22c55e',
            letterSpacing: '0.06em', textTransform: 'uppercase',
            marginBottom: 10,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#22c55e', boxShadow: '0 0 6px #22c55e',
            }} />
            Export Ready
          </div>
          <h2 style={{
            fontSize: 20, fontWeight: 700, color: '#fff',
            margin: '0 0 4px', letterSpacing: '-0.3px',
          }}>Nice work!</h2>
          <p style={{fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0}}>
            Download your results below.
          </p>
        </div>

        {/* Export section */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 14, padding: 16, marginBottom: 12,
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)',
            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12,
          }}>
            Downloads
          </div>
          <DownloadOption />
          <div style={{marginTop: 8}}>
            <DownloadJSONOption />
          </div>
        </div>

        {/* Frame extract section */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 14, padding: 16, marginBottom: 12,
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)',
            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12,
          }}>
            Frame Extraction
          </div>
          <ExtractFramesOption />
        </div>

        {/* Continue section */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 14, padding: 16, marginBottom: 4,
        }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)',
            letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12,
          }}>
            Continue
          </div>
          <RestartSessionButton
            onRestartSession={() => onTabChange(OBJECT_TOOLBAR_INDEX)}
          />
        </div>
      </div>

      {/* ── Sticky bottom: New Project ── */}
      <div style={{
        padding: '14px 20px 18px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        background: 'rgba(0,0,0,0.2)',
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            width: '100%', padding: '12px 20px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            border: 'none', borderRadius: 10,
            color: '#fff', fontSize: 14, fontWeight: 700,
            cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
            transition: 'all 0.18s', letterSpacing: '-0.1px',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,102,241,0.5)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'none';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(99,102,241,0.35)';
          }}>
          + Create New Project
        </button>
      </div>
    </div>
  );
}
