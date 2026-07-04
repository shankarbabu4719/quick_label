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

import {useEffect, useRef} from 'react';

type Props = {
  startFraction: number;
  endFraction: number;
  totalFrames?: number;
  fps?: number;
  onChange: (start: number, end: number) => void;
  onCommit?: (start: number, end: number) => void;
};

const HANDLE_W = 12;
const HANDLE_COLOR = '#6366f1';
const DIMMED = 'rgba(0,0,0,0.55)';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = (seconds % 60).toFixed(1);
  return m > 0 ? `${m}:${s.padStart(4, '0')}` : `${s}s`;
}

export default function TimelineCropOverlay({
  startFraction,
  endFraction,
  totalFrames = 0,
  fps = 30,
  onChange,
  onCommit,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const draggingRef = useRef<'start' | 'end' | null>(null);
  const startRef = useRef(startFraction);
  const endRef = useRef(endFraction);
  const onChangeRef = useRef(onChange);
  const onCommitRef = useRef(onCommit);

  startRef.current = startFraction;
  endRef.current = endFraction;
  onChangeRef.current = onChange;
  onCommitRef.current = onCommit;

  useEffect(() => {
    function getFraction(clientX: number): number {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return 0;
      return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    }

    function onMove(e: PointerEvent) {
      if (!draggingRef.current) return;
      const f = getFraction(e.clientX);
      if (draggingRef.current === 'start') {
        const s = Math.min(f, endRef.current - 0.02);
        startRef.current = s;
        onChangeRef.current(s, endRef.current);
      } else {
        const en = Math.max(f, startRef.current + 0.02);
        endRef.current = en;
        onChangeRef.current(startRef.current, en);
      }
    }

    function onUp(e: PointerEvent) {
      if (!draggingRef.current) return;
      const f = getFraction(e.clientX);
      let s = startRef.current;
      let en = endRef.current;
      if (draggingRef.current === 'start') {
        s = Math.min(f, en - 0.02);
        onChangeRef.current(s, en);
      } else {
        en = Math.max(f, s + 0.02);
        onChangeRef.current(s, en);
      }
      draggingRef.current = null;
      onCommitRef.current?.(s, en);
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  function startDrag(side: 'start' | 'end') {
    return (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      draggingRef.current = side;
    };
  }

  const startPct = `${(startFraction * 100).toFixed(2)}%`;
  const endPct   = `${(endFraction   * 100).toFixed(2)}%`;
  const rightPct = `${((1 - endFraction) * 100).toFixed(2)}%`;

  // Time calculations
  const startSec  = totalFrames > 0 ? (startFraction * totalFrames) / fps : 0;
  const endSec    = totalFrames > 0 ? (endFraction   * totalFrames) / fps : 0;
  const durSec    = endSec - startSec;
  const startTime = formatTime(startSec);
  const endTime   = formatTime(endSec);
  const durTime   = formatTime(durSec);

  // Label position — clamp so it doesn't overflow
  const startLabelLeft = Math.min(startFraction * 100, 85);
  const endLabelRight  = Math.min((1 - endFraction) * 100, 85);

  return (
    <div
      ref={containerRef}
      style={{position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10}}>

      {/* Left dim */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0, left: 0,
        width: startPct, background: DIMMED, pointerEvents: 'none',
      }} />

      {/* Right dim */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0, right: 0,
        width: rightPct, background: DIMMED, pointerEvents: 'none',
      }} />

      {/* Top border */}
      <div style={{
        position: 'absolute', top: 0, height: 2,
        left: startPct, right: rightPct,
        background: HANDLE_COLOR, pointerEvents: 'none',
      }} />

      {/* Bottom border */}
      <div style={{
        position: 'absolute', bottom: 0, height: 2,
        left: startPct, right: rightPct,
        background: HANDLE_COLOR, pointerEvents: 'none',
      }} />

      {/* ── Duration label (center of selection) ── */}
      {totalFrames > 0 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: startPct,
          right: rightPct,
          transform: 'translateY(-50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            background: 'rgba(99,102,241,0.85)',
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
            padding: '2px 7px',
            borderRadius: 6,
            whiteSpace: 'nowrap',
            letterSpacing: '0.03em',
          }}>
            {durTime}
          </div>
        </div>
      )}

      {/* ── LEFT HANDLE + time label ── */}
      <div
        onPointerDown={startDrag('start')}
        style={{
          position: 'absolute', top: 0, bottom: 0,
          left: `calc(${startPct} - ${HANDLE_W / 2}px)`,
          width: HANDLE_W,
          background: HANDLE_COLOR,
          borderRadius: '4px 0 0 4px',
          cursor: 'ew-resize',
          pointerEvents: 'all',
          zIndex: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          userSelect: 'none',
        }}>
        <Grip />
        {/* Start time tooltip above handle */}
        {totalFrames > 0 && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 3,
            background: '#1e1f26',
            color: '#818cf8',
            fontSize: 10,
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: 4,
            whiteSpace: 'nowrap',
            border: '1px solid rgba(99,102,241,0.4)',
            pointerEvents: 'none',
          }}>
            {startTime}
          </div>
        )}
      </div>

      {/* ── RIGHT HANDLE + time label ── */}
      <div
        onPointerDown={startDrag('end')}
        style={{
          position: 'absolute', top: 0, bottom: 0,
          left: `calc(${endPct} - ${HANDLE_W / 2}px)`,
          width: HANDLE_W,
          background: HANDLE_COLOR,
          borderRadius: '0 4px 4px 0',
          cursor: 'ew-resize',
          pointerEvents: 'all',
          zIndex: 12,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          userSelect: 'none',
        }}>
        <Grip />
        {/* End time tooltip above handle */}
        {totalFrames > 0 && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 3,
            background: '#1e1f26',
            color: '#818cf8',
            fontSize: 10,
            fontWeight: 700,
            padding: '2px 6px',
            borderRadius: 4,
            whiteSpace: 'nowrap',
            border: '1px solid rgba(99,102,241,0.4)',
            pointerEvents: 'none',
          }}>
            {endTime}
          </div>
        )}
      </div>
    </div>
  );
}

function Grip() {
  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: 3, pointerEvents: 'none'}}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 2, height: 2, borderRadius: '50%',
          background: 'rgba(255,255,255,0.9)',
        }} />
      ))}
    </div>
  );
}
