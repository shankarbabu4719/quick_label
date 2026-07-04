/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 * Licensed under the Apache License, Version 2.0
 */
import ObjectActions from '@/common/components/annotations/ObjectActions';
import ObjectPlaceholder from '@/common/components/annotations/ObjectPlaceholder';
import ObjectThumbnail from '@/common/components/annotations/ObjectThumbnail';
import ToolbarObjectContainer from '@/common/components/annotations/ToolbarObjectContainer';
import useVideo from '@/common/components/video/editor/useVideo';
import {BaseTracklet} from '@/common/tracker/Tracker';
import emptyFunction from '@/common/utils/emptyFunction';
import {activeTrackletObjectIdAtom, objectLabelsAtom} from '@/demo/atoms';
import {useAtom, useSetAtom} from 'jotai';
import {useRef, useState} from 'react';

type Props = {
  label: string;
  tracklet: BaseTracklet;
  isActive: boolean;
  isMobile?: boolean;
  onClick?: () => void;
  onThumbnailClick?: () => void;
};

export default function ToolbarObject({
  label,
  tracklet,
  isActive,
  isMobile = false,
  onClick,
  onThumbnailClick = emptyFunction,
}: Props) {
  const video = useVideo();
  const setActiveTrackletId = useSetAtom(activeTrackletObjectIdAtom);
  const [objectLabels, setObjectLabels] = useAtom(objectLabelsAtom);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const displayLabel = objectLabels[tracklet.id] ?? label;

  async function handleCancelNewObject() {
    try {
      await video?.deleteTracklet(tracklet.id);
    } catch (error) {
      reportError(error);
    } finally {
      setActiveTrackletId(null);
    }
  }

  function handleStartEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setEditValue(displayLabel);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  function handleSaveEdit() {
    const trimmed = editValue.trim();
    if (trimmed) {
      setObjectLabels(prev => ({...prev, [tracklet.id]: trimmed}));
    }
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSaveEdit();
    if (e.key === 'Escape') setEditing(false);
  }

  // Editable title element
  const editableTitle = editing ? (
    <input
      ref={inputRef}
      value={editValue}
      onChange={e => setEditValue(e.target.value)}
      onBlur={handleSaveEdit}
      onKeyDown={handleKeyDown}
      onClick={e => e.stopPropagation()}
      autoFocus
      style={{
        background: 'rgba(99,102,241,0.15)',
        border: '1px solid rgba(99,102,241,0.4)',
        borderRadius: 6,
        color: '#F0F2F7',
        fontSize: 13,
        fontWeight: 600,
        padding: '2px 8px',
        outline: 'none',
        width: '100%',
        maxWidth: 140,
        fontFamily: 'inherit',
      }}
    />
  ) : (
    <span
      title="Click to rename"
      onDoubleClick={handleStartEdit}
      style={{
        cursor: 'text',
        borderRadius: 4,
        padding: '1px 4px',
        transition: 'background 0.15s',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
      {displayLabel}
      <span style={{fontSize: 10, opacity: 0.35}}>✎</span>
    </span>
  );

  if (!tracklet.isInitialized) {
    return (
      <ToolbarObjectContainer
        alignItems="center"
        isActive={isActive}
        title="New object"
        subtitle="No object is currently selected. Click an object in the video."
        thumbnail={<ObjectPlaceholder showPlus={false} />}
        isMobile={isMobile}
        onClick={onClick}
        onCancel={handleCancelNewObject}
      />
    );
  }

  return (
    <ToolbarObjectContainer
      isActive={isActive}
      onClick={onClick}
      title={displayLabel}
      subtitle=""
      editableTitle={editableTitle}
      thumbnail={
        <ObjectThumbnail
          thumbnail={tracklet.thumbnail}
          color={tracklet.color}
          onClick={onThumbnailClick}
        />
      }
      isMobile={isMobile}>
      <ObjectActions objectId={tracklet.id} active={isActive} />
    </ToolbarObjectContainer>
  );
}
