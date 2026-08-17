

import { api } from '../api';
import { getBaseUrl, getDefaultHeaders, getPluginConfig, resolveThumbnailUrl, resolveUrl } from '../constants';
import { TAChannel, TAVideo } from '../types';

// Mapper functions convert TubeArchivist API data structures to GrayJay types

function platformName(): string {
  return getPluginConfig()?.name || 'TubeArchivist';
}

/**
 * Builds this plugin's canonical channel URL. Single source of truth —
 * must exactly match what isChannelUrl/parseChannelId in script.ts parse,
 * since source.getUserSubscriptions() returns URLs built here and GrayJay
 * resolves each one via those functions on the app side.
 */
export function channelUrl(channel: TAChannel): string {
  return `${getBaseUrl()}/channel/${channel.channel_id}`;
}

function channelAuthorLink(pluginId: string, channel?: TAChannel): PlatformAuthorLink {
  if (!channel) {
    return new PlatformAuthorLink(
      new PlatformID(platformName(), 'unknown', pluginId),
      platformName(),
      getBaseUrl(),
      ''
    );
  }

  return new PlatformAuthorLink(
    new PlatformID(platformName(), channel.channel_id, pluginId),
    channel.channel_name,
    channelUrl(channel),
    resolveThumbnailUrl(channel.channel_thumb_url),
    channel.channel_subs || 0
  );
}

export function videoToGrayjayVideo(pluginId: string, video: TAVideo): PlatformVideo {
  const videoDef: IPlatformVideoDef = {
    id: new PlatformID(platformName(), video.youtube_id, pluginId),
    name: video.title,
    thumbnails: new Thumbnails([new Thumbnail(resolveThumbnailUrl(video.vid_thumb_url), 0)]),
    author: channelAuthorLink(pluginId, video.channel),
    datetime: Math.floor(new Date(video.published).getTime() / 1000) || 0,
    duration: video.player?.duration || 0,
    viewCount: video.stats?.view_count || 0,
    url: `${getBaseUrl()}/video/${video.youtube_id}`,
    isLive: false,
    shareUrl: `${getBaseUrl()}/video/${video.youtube_id}`
  };

  return new PlatformVideo(videoDef);
}

function buildVideoSource(video: TAVideo): VideoSourceDescriptor {
  const videoStream = video.streams?.find((s) => s.type === 'video');
  const ext = video.media_url.split('.').pop() || 'mp4';

  const source = new VideoUrlSource({
    width: videoStream?.width || 1280,
    height: videoStream?.height || 720,
    container: `video/${ext}`,
    codec: videoStream?.codec || 'h264',
    name: `${videoStream?.height || 720}p`,
    bitrate: videoStream?.bitrate || 0,
    duration: video.player?.duration || 0,
    url: resolveUrl(video.media_url),
    requestModifier: {
      headers: getDefaultHeaders()
    }
  });

  return new VideoSourceDescriptor([source]);
}

function buildSubtitles(video: TAVideo): ISubtitleSource[] {
  if (!video.subtitles) return [];

  return video.subtitles
    .filter((s) => s.ext === 'vtt')
    .map((s) => ({
      name: `${s.name} (${s.source})`,
      url: resolveThumbnailUrl(s.media_url),
      format: 'text/vtt' as const
    }));
}

/**
 * Reports playback position to TubeArchivist's /api/video/<id>/progress/
 * endpoint, which computes watched-status server-side from position —
 * no separate "mark as watched" call is needed. Called by GrayJay's real
 * app via VideoDetails.getPlaybackTracker() (not source.getPlaybackTracker,
 * despite what the dev portal's own docs list suggest — confirmed against
 * JSVideoDetails.kt/JSPlaybackTracker.kt). `nextRequest` is read by the
 * host after every call and controls the ms until the next onProgress.
 */
class TAPlaybackTracker extends PlaybackTracker {
  private videoId: string;
  private lastSeconds = 0;

  constructor(videoId: string) {
    super(15000);
    this.videoId = videoId;
  }

  onInit(seconds: number): void {
    this.lastSeconds = seconds;
    this.report(seconds);
  }

  onProgress(seconds: number): void {
    this.lastSeconds = seconds;
    this.report(seconds);
  }

  onConcluded(): void {
    this.report(this.lastSeconds);
  }

  private report(seconds: number): void {
    try {
      api.updateProgress(this.videoId, seconds);
    } catch (e) {
      log('Failed to report playback progress: ' + e);
    }
  }
}

export function videoToGrayjayVideoDetails(pluginId: string, video: TAVideo): PlatformVideoDetails {
  const base = videoToGrayjayVideo(pluginId, video);

  const detailsDef = {
    ...base,
    description: video.description || '',
    video: buildVideoSource(video),
    rating: new RatingLikesDislikes(video.stats?.like_count || 0, video.stats?.dislike_count || 0),
    subtitles: buildSubtitles(video),
    getPlaybackTracker: () => new TAPlaybackTracker(video.youtube_id)
  };

  return new PlatformVideoDetails(detailsDef);
}

export function channelToGrayjayChannel(pluginId: string, channel: TAChannel): PlatformChannel {
  return new PlatformChannel({
    id: new PlatformID(platformName(), channel.channel_id, pluginId),
    name: channel.channel_name,
    thumbnail: resolveThumbnailUrl(channel.channel_thumb_url),
    banner: resolveThumbnailUrl(channel.channel_banner_url) || undefined,
    subscribers: channel.channel_subs || 0,
    description: channel.channel_description || '',
    url: channelUrl(channel)
  });
}
