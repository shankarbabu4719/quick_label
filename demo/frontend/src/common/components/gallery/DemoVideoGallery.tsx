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
import {DemoVideoGalleryQuery} from '@/common/components/gallery/__generated__/DemoVideoGalleryQuery.graphql';
import VideoGalleryUploadVideo from '@/common/components/gallery/VideoGalleryUploadPhoto';
import VideoPhoto from '@/common/components/gallery/VideoPhoto';
import useScreenSize from '@/common/screen/useScreenSize';
import {VideoData} from '@/demo/atoms';
import {DEMO_SHORT_NAME, INFERENCE_API_ENDPOINT} from '@/demo/DemoConfig';
import {fontSize, fontWeight, spacing} from '@/theme/tokens.stylex';
import stylex from '@stylexjs/stylex';
import {useEffect, useMemo, useState} from 'react';
import PhotoAlbum, {Photo, RenderPhotoProps} from 'react-photo-album';
import {graphql, useLazyLoadQuery} from 'react-relay';
import {useLocation, useNavigate} from 'react-router-dom';

const styles = stylex.create({
  container: {
    display: 'flex',
    flexDirection: 'column',
    marginHorizontal: spacing[1],
    height: '100%',
    lineHeight: 1.2,
    paddingTop: spacing[8],
  },
  headerContainer: {
    marginBottom: spacing[8],
    fontWeight: fontWeight['medium'],
    fontSize: fontSize['2xl'],
    '@media screen and (max-width: 768px)': {
      marginTop: spacing[0],
      marginBottom: spacing[8],
      marginHorizontal: spacing[4],
      fontSize: fontSize['xl'],
    },
  },
  albumContainer: {
    flex: '1 1 0%',
    width: '100%',
    overflowY: 'auto',
  },
});

type Props = {
  showUploadInGallery?: boolean;
  onSelect?: (video: VideoPhotoData) => void;
  onUpload: (video: VideoData) => void;
  onUploadStart?: () => void;
  onUploadError?: (error: Error) => void;
};

type VideoPhotoData = Photo &
  VideoData & {
    poster: string;
    isUploadOption: boolean;
  };

export default function DemoVideoGallery({
  showUploadInGallery = false,
  onSelect,
  onUpload,
  onUploadStart,
  onUploadError,
}: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const {isMobile: isMobileScreenSize} = useScreenSize();

  // Load previous projects + drafts
  const [projects, setProjects] = useState<Array<{name: string; thumbnailUrl: string | null}>>([]);
  const [drafts, setDrafts] = useState<Array<{draft_id: string; video_path: string; video_url: string; thumbnail_url: string | null; objects: Array<{object_id: number; label: string}>}>>([]);

  useEffect(() => {
    fetch(`${INFERENCE_API_ENDPOINT}/list_exports`).then(r => r.json()).then(d => setProjects(d.exports || [])).catch(() => {});
    fetch(`${INFERENCE_API_ENDPOINT}/list_drafts`).then(r => r.json()).then(d => setDrafts(d.drafts || [])).catch(() => {});
  }, []);

  const data = useLazyLoadQuery<DemoVideoGalleryQuery>(
    graphql`
      query DemoVideoGalleryQuery {
        videos {
          edges {
            node {
              id
              path
              posterPath
              url
              posterUrl
              height
              width
              posterUrl
            }
          }
        }
      }
    `,
    {},
  );

  const allVideos: VideoPhotoData[] = useMemo(() => {
    return data.videos.edges.map(video => {
      return {
        src: video.node.url,
        path: video.node.path,
        poster: video.node.posterPath,
        posterPath: video.node.posterPath,
        url: video.node.url,
        posterUrl: video.node.posterUrl,
        width: video.node.width,
        height: video.node.height,
        isUploadOption: false,
      } as VideoPhotoData;
    });
  }, [data.videos.edges]);

  const shareableVideos: VideoPhotoData[] = useMemo(() => {
    const filteredVideos = [...allVideos];

    if (showUploadInGallery) {
      const uploadOption = {
        src: '',
        width: 1280,
        height: 720,
        poster: '',
        isUploadOption: true,
      } as VideoPhotoData;
      filteredVideos.unshift(uploadOption);
    }

    return filteredVideos;
  }, [allVideos, showUploadInGallery]);

  const renderPhoto = ({
    photo: video,
    imageProps,
  }: RenderPhotoProps<VideoPhotoData>) => {
    const {style} = imageProps;
    const {url, posterUrl} = video;

    return video.isUploadOption ? (
      <VideoGalleryUploadVideo
        style={style}
        onUpload={handleUploadVideo}
        onUploadError={onUploadError}
        onUploadStart={onUploadStart}
      />
    ) : (
      <VideoPhoto
        src={url}
        poster={posterUrl}
        style={style}
        onClick={() => {
          navigate(location.pathname, {
            state: {
              video,
            },
          });
          onSelect?.(video);
        }}
      />
    );
  };

  function handleUploadVideo(video: VideoData) {
    navigate(location.pathname, {
      state: {
        video,
      },
    });
    onUpload?.(video);
  }

  return (
    <div {...stylex.props(styles.container)}>
      <div {...stylex.props(styles.albumContainer)}>
        <div className="pt-0 md:px-16 md:pt-8 md:pb-8">
          <div {...stylex.props(styles.headerContainer)}>
            <h3 className="mb-2">Select a video</h3>
            <p className="text-sm text-gray-400">Gallery, previous projects, or drafts.</p>
          </div>

          {showUploadInGallery && (
            <div style={{marginBottom:24}}>
              <SectionLabel label="Upload New Video" icon="\u2191" color="#6366f1"/>
              <VideoGalleryUploadVideo style={{height:120,borderRadius:12}} onUpload={handleUploadVideo} onUploadError={onUploadError} onUploadStart={onUploadStart}/>
            </div>
          )}

          {drafts.length > 0 && (
            <div style={{marginBottom:24}}>
              <SectionLabel label="Draft Projects" icon="\u23f8" color="#f59e0b"/>
              <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
                {drafts.map(d => (
                  <VideoThumbCard key={d.draft_id} src={d.thumbnail_url || d.video_url} label={d.video_path.split('/').pop()?.replace('.mp4','') || 'Draft'} badge="Draft" badgeColor="#f59e0b"
                    onClick={() => {
                      fetch(`${INFERENCE_API_ENDPOINT}/load_draft/${d.draft_id}`).then(r=>r.json()).then(dd=>{
                        navigate(location.pathname,{state:{draft:dd}});
                        onSelect?.({path:d.video_path,url:d.video_url,posterPath:null,posterUrl:d.video_url,width:1280,height:720} as any);
                      });
                    }}/>
                ))}
              </div>
            </div>
          )}

          {projects.length > 0 && (
            <div style={{marginBottom:24}}>
              <SectionLabel label="Previous Projects" icon="\u2713" color="#22c55e"/>
              <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
                {projects.map(p => (
                  <VideoThumbCard key={p.name} src={p.thumbnailUrl ? `${INFERENCE_API_ENDPOINT}/${p.thumbnailUrl}` : null} label={p.name.slice(0,18)+'...'} badge="Done" badgeColor="#22c55e"
                    onClick={() => {
                      const url=`${INFERENCE_API_ENDPOINT}/exports/${p.name}/original.mp4`;
                      const v={path:`exports/${p.name}/original.mp4`,url,posterPath:null,posterUrl:url,width:1280,height:720} as any;
                      navigate(location.pathname,{state:{video:v}}); onSelect?.(v);
                    }}/>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

function SectionLabel({label,icon,color}:{label:string;icon:string;color:string}) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
      <div style={{width:24,height:24,borderRadius:6,background:`${color}18`,border:`1px solid ${color}33`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>{icon}</div>
      <span style={{fontSize:13,fontWeight:700,color:'rgba(255,255,255,0.7)'}}>{label}</span>
    </div>
  );
}

function VideoThumbCard({src,label,badge,badgeColor,onClick}:{src:string|null;label:string;badge:string;badgeColor:string;onClick:()=>void}) {
  return (
    <div onClick={onClick} style={{width:140,cursor:'pointer',borderRadius:10,overflow:'hidden',border:'1px solid rgba(255,255,255,0.08)',background:'rgba(255,255,255,0.04)',transition:'all 0.2s'}}
      onMouseEnter={e=>{e.currentTarget.style.borderColor=`${badgeColor}44`;e.currentTarget.style.transform='translateY(-2px)';}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.08)';e.currentTarget.style.transform='none';}}>
      <div style={{width:'100%',aspectRatio:'16/9',background:'#1a1c24',position:'relative',overflow:'hidden'}}>
        {src && <video src={src} style={{width:'100%',height:'100%',objectFit:'cover'}} muted preload="metadata" onLoadedMetadata={e=>{(e.target as HTMLVideoElement).currentTime=0.1;}}/>}
        <span style={{position:'absolute',top:5,left:5,fontSize:9,fontWeight:700,background:`${badgeColor}22`,color:badgeColor,border:`1px solid ${badgeColor}44`,padding:'2px 6px',borderRadius:4}}>{badge}</span>
      </div>
      <div style={{padding:'7px 8px',fontSize:11,fontWeight:500,color:'rgba(255,255,255,0.6)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{label}</div>
    </div>
  );
}
