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
import ChangeVideo from '@/common/components/gallery/ChangeVideoModal';
import useMessagesSnackbar from '@/common/components/snackbar/useDemoMessagesSnackbar';
import {useEffect, useRef} from 'react';

const steps = [
  {
    icon: '①',
    title: 'Click an object',
    desc: 'Tap any object in the video frame on the right to select it.',
  },
  {
    icon: '②',
    title: 'Track & Play',
    desc: 'Hit "Track & Play" to propagate the mask across all frames.',
  },
  {
    icon: '③',
    title: 'Export',
    desc: 'Download the tracking JSON or the masked video.',
  },
];

export default function FirstClickView() {
  const isFirstClickMessageShown = useRef(false);
  const {enqueueMessage} = useMessagesSnackbar();

  useEffect(() => {
    if (!isFirstClickMessageShown.current) {
      isFirstClickMessageShown.current = true;
      enqueueMessage('firstClick');
    }
  }, [enqueueMessage]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '28px 24px',
      background: 'rgba(255,255,255,0.02)',
      borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Title */}
      <div style={{marginBottom: 28}}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(99,102,241,0.15)',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: 20,
          padding: '4px 12px',
          fontSize: 12,
          fontWeight: 600,
          color: '#818cf8',
          marginBottom: 16,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#818cf8',
            boxShadow: '0 0 6px #818cf8',
          }} />
          Ready
        </div>
        <h2 style={{
          fontSize: 22,
          fontWeight: 700,
          color: '#fff',
          margin: 0,
          lineHeight: 1.3,
          letterSpacing: '-0.3px',
        }}>
          Click any object<br />in the video
        </h2>
      </div>

      {/* Steps */}
      <div style={{display: 'flex', flexDirection: 'column', gap: 16, flex: 1}}>
        {steps.map(step => (
          <div key={step.icon} style={{
            display: 'flex',
            gap: 14,
            padding: '14px 16px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10,
          }}>
            <div style={{
              width: 32, height: 32,
              borderRadius: 8,
              background: 'rgba(99,102,241,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14,
              color: '#818cf8',
              fontWeight: 700,
              flexShrink: 0,
            }}>
              {step.icon}
            </div>
            <div>
              <div style={{
                fontSize: 13, fontWeight: 600,
                color: '#fff', marginBottom: 3,
              }}>{step.title}</div>
              <div style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.45)',
                lineHeight: 1.5,
              }}>{step.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Change video */}
      <div style={{
        marginTop: 24,
        paddingTop: 20,
        borderTop: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.3)',
          marginBottom: 10,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontWeight: 600,
        }}>
          Want a different video?
        </div>
        <ChangeVideo />
      </div>
    </div>
  );
}
