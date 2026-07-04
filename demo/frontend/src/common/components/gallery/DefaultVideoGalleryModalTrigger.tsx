/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 * Licensed under the Apache License, Version 2.0
 */
import type {VideoGalleryTriggerProps} from '@/common/components/gallery/DemoVideoGalleryModal';
import {useState} from 'react';

export default function DefaultVideoGalleryModalTrigger({
  onClick,
}: VideoGalleryTriggerProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '9px 16px',
        background: hovered ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${hovered ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 10,
        color: hovered ? '#a5b4fc' : 'rgba(255,255,255,0.6)',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s',
        letterSpacing: '-0.1px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}>
      <span style={{fontSize: 15}}>🎬</span>
      Change Video
    </button>
  );
}
