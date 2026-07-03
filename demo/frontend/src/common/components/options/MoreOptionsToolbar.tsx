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
import {Add} from '@carbon/icons-react';
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
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '28px 24px',
      gap: 0,
    }}>

      {/* ── Header ── */}
      <div style={{marginBottom: 24}}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(34,197,94,0.15)',
          border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: 20,
          padding: '4px 12px',
          fontSize: 12,
          fontWeight: 600,
          color: '#22c55e',
          marginBottom: 12,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#22c55e',
            boxShadow: '0 0 6px #22c55e',
          }} />
          Complete
        </div>
        <h2 style={{
          fontSize: 22,
          fontWeight: 700,
          color: '#fff',
          margin: 0,
          letterSpacing: '-0.3px',
          lineHeight: 1.3,
        }}>
          Nice work!<br />
          <span style={{color: 'rgba(255,255,255,0.5)', fontSize: 16, fontWeight: 400}}>
            Download your results below.
          </span>
        </h2>
      </div>

      {/* ── Download section ── */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: '16px',
        marginBottom: 16,
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.3)',
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          marginBottom: 12,
        }}>
          Export
        </div>
        <DownloadOption />
        <div style={{marginTop: 8}}>
          <DownloadJSONOption />
        </div>
        <div style={{marginTop: 8}}>
          <ExtractFramesOption />
        </div>
      </div>

      {/* ── Try another video ── */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: '16px',
        marginBottom: 'auto',
      }}>
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.3)',
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          marginBottom: 12,
        }}>
          Continue
        </div>
        <RestartSessionButton
          onRestartSession={() => onTabChange(OBJECT_TOOLBAR_INDEX)}
        />
      </div>

      {/* ── Bottom: Create New Project ── */}
      <div style={{marginTop: 24}}>
        <div style={{
          height: 1,
          background: 'rgba(255,255,255,0.07)',
          marginBottom: 20,
        }} />
        <button
          onClick={() => navigate('/')}
          style={{
            width: '100%',
            padding: '14px 20px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            border: 'none',
            borderRadius: 12,
            color: '#fff',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,102,241,0.5)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(99,102,241,0.35)';
          }}>
          <Add size={20} />
          Create New Project
        </button>
      </div>

    </div>
  );
}
