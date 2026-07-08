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
import {demoObjectLimit} from '@/demo/DemoConfig';
import {isStreamingAtom, streamingStateAtom, trackletObjectsAtom} from '@/demo/atoms';
import {useAtomValue} from 'jotai';

export default function ObjectsToolbarHeader() {
  const isStreaming = useAtomValue(isStreamingAtom);
  const streamingState = useAtomValue(streamingStateAtom);
  const tracklets = useAtomValue(trackletObjectsAtom);

  const isDone = streamingState === 'full';
  const isTracking = isStreaming;

  const badgeColor = isDone ? '#22c55e' : isTracking ? '#f59e0b' : '#6366f1';
  const badgeLabel = isDone ? 'Done' : isTracking ? 'Tracking' : 'Annotating';
  const glowColor  = isDone ? '#22c55e' : isTracking ? '#f59e0b' : '#818cf8';

  const title = isDone
    ? 'Review & Export'
    : isTracking
      ? 'Tracking objects...'
      : 'Select objects';

  const desc = isDone
    ? `${tracklets.length} object${tracklets.length !== 1 ? 's' : ''} tracked across the video. Export when ready.`
    : isTracking
      ? 'Tracking in progress. Watch for errors — stop anytime to re-annotate.'
      : `Click any object in the video to annotate it. Add up to ${demoObjectLimit} objects.`;

  return (
    <div style={{
      padding: '20px 20px 16px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      marginBottom: 4,
    }}>
      {/* Badge */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        background: `${badgeColor}18`,
        border: `1px solid ${badgeColor}44`,
        borderRadius: 20,
        padding: '3px 11px',
        fontSize: 11,
        fontWeight: 700,
        color: badgeColor,
        marginBottom: 10,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: glowColor,
          boxShadow: `0 0 6px ${glowColor}`,
          animation: isTracking ? 'pulse 1.5s infinite' : 'none',
        }} />
        {badgeLabel}
      </div>

      {/* Title */}
      <h2 style={{
        fontSize: 20,
        fontWeight: 700,
        color: '#fff',
        margin: '0 0 6px',
        letterSpacing: '-0.3px',
        lineHeight: 1.3,
      }}>
        {title}
      </h2>

      {/* Description */}
      <p style={{
        fontSize: 13,
        color: 'rgba(255,255,255,0.45)',
        margin: 0,
        lineHeight: 1.5,
      }}>
        {desc}
      </p>

      {/* Object count pills */}
      {tracklets.length > 0 && (
        <div style={{
          display: 'flex',
          gap: 6,
          marginTop: 12,
          flexWrap: 'wrap',
        }}>
          {tracklets.map((t, i) => (
            <span key={t.id} style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '3px 10px',
              borderRadius: 20,
              background: `${t.color}22`,
              color: t.color,
              border: `1px solid ${t.color}44`,
            }}>
              Object {i + 1}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
