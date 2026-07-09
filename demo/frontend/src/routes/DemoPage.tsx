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
import Toolbar from '@/common/components/toolbar/Toolbar';
import DemoVideoEditor from '@/common/components/video/editor/DemoVideoEditor';
import useInputVideo from '@/common/components/video/useInputVideo';
import StatsView from '@/debug/stats/StatsView';
import {VideoData} from '@/demo/atoms';
import DemoPageLayout from '@/layouts/DemoPageLayout';
import {DemoPageQuery} from '@/routes/__generated__/DemoPageQuery.graphql';
import {Suspense, useEffect, useMemo} from 'react';
import {graphql, useLazyLoadQuery} from 'react-relay';
import {Location, useLocation} from 'react-router-dom';

type DraftData = {
  draft_id: string;
  video_path: string;
  video_url: string;
  objects: Array<{object_id: number; label: string}>;
};

type LocationState = {
  video?: VideoData;
  draft?: DraftData;
};

// ── Inner component that runs the GraphQL query (only when no video in state) ──
function DemoPageWithDefaultVideo() {
  const {setInputVideo} = useInputVideo();

  const data = useLazyLoadQuery<DemoPageQuery>(
    graphql`
      query DemoPageQuery {
        defaultVideo {
          path
          posterPath
          url
          posterUrl
          height
          width
        }
      }
    `,
    {},
    {fetchPolicy: 'network-only'},
  );

  const video = useMemo(() => {
    return (data?.defaultVideo as unknown as VideoData | null) ?? null;
  }, [data]);

  useEffect(() => {
    setInputVideo(video);
  }, [video, setInputVideo]);

  return (
    <DemoPageLayout>
      <StatsView />
      <Toolbar />
      <DemoVideoEditor video={video ?? undefined} />
    </DemoPageLayout>
  );
}

// ── Inner component used when video is passed via navigation state ──
function DemoPageWithVideo({video}: {video: VideoData}) {
  const {setInputVideo} = useInputVideo();

  useEffect(() => {
    setInputVideo(video);
  }, [video, setInputVideo]);

  return (
    <DemoPageLayout>
      <StatsView />
      <Toolbar />
      <DemoVideoEditor video={video} />
    </DemoPageLayout>
  );
}

// ── Main DemoPage — routes to the right inner component ──
export default function DemoPage() {
  const {state} = useLocation() as Location<LocationState>;

  // Draft resume
  if (state?.draft != null) {
    const draft = state.draft;
    const path = draft.video_path;
    const url = draft.video_url || `http://localhost:7263/${path}`;
    const video: VideoData = {
      path,
      url,
      posterPath: null,
      posterUrl: url,
      width: 1280,
      height: 720,
    };
    return <DemoPageWithVideo video={video} />;
  }

  // Uploaded video passed via navigation state — skip GraphQL query entirely
  if (state?.video != null) {
    return <DemoPageWithVideo video={state.video} />;
  }

  // No video in state — load default video from backend via GraphQL
  // Wrap in Suspense so errors don't bubble up to app-level error boundary
  return (
    <Suspense fallback={
      <DemoPageLayout>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: '100%', color: 'rgba(255,255,255,0.4)', fontSize: 14,
        }}>
          Loading...
        </div>
      </DemoPageLayout>
    }>
      <DemoPageWithDefaultVideo />
    </Suspense>
  );
}
