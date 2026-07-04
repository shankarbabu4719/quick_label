/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 * Licensed under the Apache License, Version 2.0
 */
import ChangeVideo from '@/common/components/gallery/ChangeVideoModal';
import useMessagesSnackbar from '@/common/components/snackbar/useDemoMessagesSnackbar';
import {useEffect, useRef} from 'react';

const steps = [
  {
    num: '1',
    title: 'Click an object',
    desc: 'Tap any object in the video to select it.',
    color: '#6366f1',
    icon: '🎯',
  },
  {
    num: '2',
    title: 'Track & Play',
    desc: 'Propagate the mask across all frames.',
    color: '#8b5cf6',
    icon: '▶',
  },
  {
    num: '3',
    title: 'Export',
    desc: 'Download JSON or the masked video.',
    color: '#a78bfa',
    icon: '↓',
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
      background: 'linear-gradient(160deg, #16182280 0%, #12141a80 100%)',
      borderRadius: 14,
      border: '1px solid rgba(255,255,255,0.07)',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>

      {/* Header section */}
      <div style={{
        padding: '24px 22px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: 'linear-gradient(180deg, rgba(99,102,241,0.06) 0%, transparent 100%)',
      }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(99,102,241,0.12)',
          border: '1px solid rgba(99,102,241,0.25)',
          borderRadius: 20, padding: '3px 10px',
          fontSize: 10, fontWeight: 700,
          color: '#818cf8',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: 14,
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: '#818cf8',
            boxShadow: '0 0 5px #818cf8',
          }} />
          Ready
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: 20,
          fontWeight: 800,
          color: '#F0F2F7',
          margin: 0,
          lineHeight: 1.25,
          letterSpacing: '-0.4px',
        }}>
          Select an object<br />
          <span style={{
            background: 'linear-gradient(135deg, #818cf8, #a78bfa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            to start tracking
          </span>
        </h2>
      </div>

      {/* Steps */}
      <div style={{
        flex: 1,
        padding: '16px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        overflowY: 'auto',
      }}>
        {steps.map((step, i) => (
          <div key={i} style={{
            display: 'flex',
            gap: 14,
            padding: '14px 16px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12,
            transition: 'all 0.2s',
            cursor: 'default',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = `${step.color}0d`;
            e.currentTarget.style.borderColor = `${step.color}33`;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
          }}>
            {/* Number badge */}
            <div style={{
              width: 34, height: 34, flexShrink: 0,
              borderRadius: 10,
              background: `linear-gradient(135deg, ${step.color}33, ${step.color}11)`,
              border: `1px solid ${step.color}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 800,
              color: step.color,
            }}>
              {step.num}
            </div>
            {/* Text */}
            <div style={{flex: 1, minWidth: 0}}>
              <div style={{
                fontSize: 13, fontWeight: 700,
                color: '#F0F2F7',
                marginBottom: 3,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {step.title}
                <span style={{fontSize: 12}}>{step.icon}</span>
              </div>
              <div style={{
                fontSize: 12,
                color: 'rgba(240,242,247,0.4)',
                lineHeight: 1.5,
              }}>
                {step.desc}
              </div>
            </div>
          </div>
        ))}

        {/* AI info pill */}
        <div style={{
          marginTop: 4,
          padding: '10px 14px',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))',
          border: '1px solid rgba(99,102,241,0.15)',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <span style={{fontSize: 18}}>⬡</span>
          <div>
            <div style={{fontSize: 11, fontWeight: 700, color: '#818cf8', marginBottom: 1}}>
              Powered by SAM 2
            </div>
            <div style={{fontSize: 11, color: 'rgba(240,242,247,0.3)'}}>
              Meta's Segment Anything Model
            </div>
          </div>
        </div>

        {/* Click hint arrow */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          background: 'rgba(34,197,94,0.06)',
          border: '1px solid rgba(34,197,94,0.15)',
          borderRadius: 10,
        }}>
          <span style={{fontSize: 18, animation: 'pulse 2s ease-in-out infinite'}}>👆</span>
          <style>{`@keyframes pulse { 0%,100%{opacity:0.6;transform:scale(0.95)} 50%{opacity:1;transform:scale(1.05)} }`}</style>
          <div style={{fontSize: 12, color: 'rgba(34,197,94,0.8)', fontWeight: 600}}>
            Click any object in the video →
          </div>
        </div>
      </div>

      {/* Footer — Change video */}
      <div style={{
        padding: '14px 16px',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(0,0,0,0.15)',
      }}>
        <div style={{
          fontSize: 10,
          color: 'rgba(255,255,255,0.25)',
          marginBottom: 8,
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
          fontWeight: 600,
        }}>
          Different video?
        </div>
        <ChangeVideo />
      </div>
    </div>
  );
}
