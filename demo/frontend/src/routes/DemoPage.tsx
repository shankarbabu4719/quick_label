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
import {useEffect, useMemo} from 'react';
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

export default function DemoPage() {
  const {state} = useLocation() as Location<LocationState>;
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
  );
  const {setInputVideo} = useInputVideo();

  const video = useMemo(() => {
    // If resuming a draft — build VideoData from draft's video_path/url
    if (state?.draft != null) {
      const draft = state.draft;
      const path = draft.video_path;
      const url = draft.video_url || `http://localhost:7263/${path}`;
      return {
        path,
        url,
        posterPath: null,
        posterUrl: url,
        width: 1280,
        height: 720,
      } as VideoData;
    }
    // Normal flow — use explicitly passed video or default
    return state?.video ?? data.defaultVideo;
  }, [state, data]);

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
