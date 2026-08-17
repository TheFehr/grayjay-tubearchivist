/**
 * TubeArchivist API response types
 * Derived from backend/video, backend/channel, backend/common serializers
 * at github.com/tubearchivist/tubearchivist (develop branch)
 */

export interface TAPagination {
  page_size: number;
  page_from: number;
  prev_pages: number[] | null;
  current_page: number;
  max_hits: boolean;
  params: string;
  last_page: number;
  next_pages: number[] | null;
  total_hits: number;
}

export interface TAChannel {
  channel_id: string;
  channel_active: boolean;
  channel_banner_url?: string | null;
  channel_thumb_url?: string | null;
  channel_tvart_url?: string | null;
  channel_description?: string | null;
  channel_last_refresh: string;
  channel_name: string;
  channel_subs: number;
  channel_subscribed: boolean;
  channel_tags?: string[];
  channel_tabs: string[];
}

export interface TAPlayer {
  watched: boolean;
  watched_date?: number;
  duration: number;
  duration_str: string;
  progress?: number;
  position?: number;
}

export interface TAStats {
  like_count: number;
  average_rating: number;
  view_count: number;
  dislike_count: number;
}

export interface TAStreamItem {
  bitrate: number;
  codec: string;
  height?: number;
  index: number;
  type: 'video' | 'audio';
  width?: number;
}

export interface TASubtitleItem {
  ext: 'json3' | 'vtt';
  lang: string;
  media_url: string;
  name: string;
  source: 'user' | 'auto';
  url: string | null;
}

/** vid_type in the API; TubeArchivist archives all three the same way (downloaded files) */
export type TAVideoType = 'videos' | 'streams' | 'shorts';

export interface TAVideo {
  active: boolean;
  category: string[];
  channel?: TAChannel;
  comment_count?: number | null;
  date_downloaded: number;
  description?: string | null;
  media_size: number;
  media_url: string;
  player: TAPlayer;
  playlist?: string[];
  published: string;
  stats: TAStats;
  streams: TAStreamItem[];
  subtitles?: TASubtitleItem[];
  tags: string[];
  title: string;
  vid_last_refresh: string;
  vid_thumb_url: string;
  vid_type: TAVideoType;
  youtube_id: string;
}

export interface TAVideoListResponse {
  data: TAVideo[];
  paginate: TAPagination;
}

export interface TAChannelListResponse {
  data: TAChannel[];
  paginate: TAPagination;
}

export interface TAVideoListParams {
  page?: number;
  channel?: string;
  playlist?: string;
  sort?: 'published' | 'downloaded' | 'views' | 'likes' | 'duration' | 'filesize';
  order?: 'asc' | 'desc';
  type?: TAVideoType;
}

export interface TAChannelListParams {
  page?: number;
  filter?: 'subscribed' | 'unsubscribed';
}

/**
 * GET /api/search/ splits hits by type server-side (common/src/searching.py build_results),
 * unlike the paginated list endpoints. Confirmed against a live instance.
 */
export interface TASearchResponse {
  results: {
    video_results: TAVideo[];
    channel_results: TAChannel[];
    playlist_results: TAPlaylist[];
    fulltext_results: unknown[];
  };
  queryType: string;
}

export interface TAPlaylist {
  playlist_active: boolean;
  playlist_channel: string;
  playlist_channel_id: string;
  playlist_description?: string | null;
  playlist_id: string;
  playlist_name: string;
  playlist_subscribed: boolean;
  playlist_thumbnail: string;
  playlist_type: 'regular' | 'custom';
}
