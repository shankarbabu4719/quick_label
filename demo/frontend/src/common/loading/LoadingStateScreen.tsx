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
import {PropsWithChildren, ReactNode, useEffect, useState} from 'react';
import {Link} from 'react-router-dom';

type Props = PropsWithChildren<{
  title: string;
  description?: string | ReactNode;
  linkProps?: {
    to: string;
    label: string;
  };
}>;

// Animated dots for loading indicator
function LoadingDots() {
  const [dots, setDots] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDots(d => (d + 1) % 4), 500);
    return () => clearInterval(t);
  }, []);
  return <span style={{letterSpacing: 2}}>{'.'.repeat(dots)}</span>;
}

export default function LoadingStateScreen({
  title,
  description,
  children,
  linkProps,
}: Props) {
  const isLoading = title.toLowerCase().includes('loading');

  return (
    <div style={{
      minHeight: '100%',
      background: 'linear-gradient(145deg, #12141A 0%, #1A1D27 50%, #12141A 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 28,
        padding: '48px 32px',
        maxWidth: 420,
        width: '100%',
        textAlign: 'center',
      }}>

        {/* Logo / Icon */}
        <div style={{
          width: 64, height: 64, borderRadius: 18,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28,
          boxShadow: '0 0 32px rgba(99,102,241,0.35)',
          flexShrink: 0,
        }}>
          ⬡
        </div>

        {/* Spinner or pulse */}
        {isLoading && (
          <div style={{position: 'relative', width: 48, height: 48}}>
            <div style={{
              position: 'absolute', inset: 0,
              borderRadius: '50%',
              border: '3px solid rgba(99,102,241,0.15)',
            }} />
            <div style={{
              position: 'absolute', inset: 0,
              borderRadius: '50%',
              border: '3px solid transparent',
              borderTopColor: '#6366f1',
              animation: 'spin 0.9s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* Title */}
        <div>
          <h2 style={{
            fontSize: 22,
            fontWeight: 700,
            color: '#F0F2F7',
            margin: '0 0 10px',
            letterSpacing: '-0.3px',
          }}>
            {title}{isLoading && <LoadingDots />}
          </h2>

          {description != null && (
            <p style={{
              fontSize: 14,
              color: 'rgba(240,242,247,0.5)',
              margin: 0,
              lineHeight: 1.6,
            }}>
              {description}
            </p>
          )}
        </div>

        {/* Progress bar for loading */}
        {isLoading && (
          <div style={{
            width: '100%', height: 3,
            background: 'rgba(99,102,241,0.15)',
            borderRadius: 99,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: '40%',
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
              borderRadius: 99,
              animation: 'progress 1.5s ease-in-out infinite',
            }} />
            <style>{`
              @keyframes progress {
                0%   { transform: translateX(-100%); }
                100% { transform: translateX(350%); }
              }
            `}</style>
          </div>
        )}

        {children}

        {linkProps != null && (
          <Link
            to={linkProps.to}
            style={{
              fontSize: 13,
              color: '#818cf8',
              textDecoration: 'none',
              padding: '8px 20px',
              borderRadius: 8,
              border: '1px solid rgba(99,102,241,0.3)',
              background: 'rgba(99,102,241,0.08)',
              transition: 'all 0.15s',
            }}>
            ← {linkProps.label}
          </Link>
        )}
      </div>
    </div>
  );
}
