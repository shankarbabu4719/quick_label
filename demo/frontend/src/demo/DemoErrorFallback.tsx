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
import LoadingStateScreen from '@/common/loading/LoadingStateScreen';
import {FallbackProps} from 'react-error-boundary';

export default function DemoErrorFallback({error, resetErrorBoundary}: FallbackProps) {
  return (
    <LoadingStateScreen
      title="Something went wrong"
      description={
        <div style={{textAlign: 'center'}}>
          <p style={{marginBottom: 12, color: '#A7B3BF'}}>
            {error?.message ?? 'An unexpected error occurred.'}
          </p>
          <button
            onClick={resetErrorBoundary}
            style={{
              marginTop: 8,
              padding: '8px 20px',
              background: '#6366f1',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
            }}>
            Try again
          </button>
        </div>
      }
      linkProps={{to: '/', label: 'Back to Projects'}}
    />
  );
}
