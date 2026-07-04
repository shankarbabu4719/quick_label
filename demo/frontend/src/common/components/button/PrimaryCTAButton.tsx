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
import type {ReactNode} from 'react';
import {useState} from 'react';

type Props = {
  disabled?: boolean;
  endIcon?: ReactNode;
} & React.DOMAttributes<HTMLButtonElement>;

export default function PrimaryCTAButton({
  children,
  disabled,
  endIcon,
  ...props
}: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      {...props}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 20px',
        fontSize: 14,
        fontWeight: 600,
        letterSpacing: '-0.1px',
        borderRadius: 10,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'all 0.18s',
        background: hovered && !disabled
          ? 'linear-gradient(135deg, #7c7ff5, #9b5cf8)'
          : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        color: '#fff',
        boxShadow: hovered && !disabled
          ? '0 4px 16px rgba(99,102,241,0.55)'
          : '0 2px 8px rgba(99,102,241,0.3)',
        transform: hovered && !disabled ? 'translateY(-1px)' : 'none',
        whiteSpace: 'nowrap',
      }}>
      {children}
      {endIcon != null && endIcon}
    </button>
  );
}
