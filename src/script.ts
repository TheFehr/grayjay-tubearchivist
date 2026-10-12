// TubeArchivist Source Plugin for GrayJay

import { getBaseUrl, getDynamicToken, getPluginConfig, getPluginSetting, setDynamicToken, setPluginConfig, setPluginSettings } from './constants';
import { api } from './api';
import {
  channelToGrayjayChannel,
  commentToGrayjayComment,
  CommentListPager,
  findCommentReplies,
  videoToGrayjayVideoDetails,
  TAPlaybackTracker
} from './mappers';
import { TAWatchFilter } from './types';
import { ChannelSearchPager, EmptyVideoPager, SearchPager, VideoListPager } from './pagers';
import { getSubscribedChannelUrls } from './subscriptions';

// Plugin config/settings/state are kept in local module state (see constants.ts),
// set here in source.enable() — not read from the ambient `plugin.config`/`plugin.settings`
// globals. Real-world GrayJay plugins (grayjay-source-rss, grayjay-source-mediathekview)
// consistently avoid depending on those ambient globals in favor of this pattern.
let pluginState: Record<string, any> = {};

function pluginId(): string {
  return (getPluginConfig() as any)?.id || '';
}

/**
 * Order matches the "Watch Status" Dropdown options in config.json — Dropdown
 * settings store the option's INDEX (see constants.ts getPluginSetting).
 */
const WATCH_FILTER_OPTIONS: (TAWatchFilter | undefined)[] = [undefined, 'unwatched', 'continue', 'watched'];

/** Id of the Watch Status filter group offered on creator pages (see getChannelCapabilities) */
const WATCH_STATUS_FILTER_ID = 'watchStatus';

/** Filter option label → watch filter; 'Show all' maps to null so it can override a non-default setting */
const WATCH_STATUS_FILTER_OPTIONS: Record<string, TAWatchFilter | null> = {
  'Show all': null,
  'Hide watched': 'unwatched',
  'Only in progress': 'continue',
  'Only watched': 'watched'
};

/** The watch filter chosen in a "Watch Status" setting, or undefined for "Show all" */
function watchFilter(variable: 'watchFilterHome' | 'watchFilterChannel' | 'watchFilterSearch'): TAWatchFilter | undefined {
  return WATCH_FILTER_OPTIONS[parseInt(getPluginSetting(variable, '0'), 10)];
}

/** Extract the youtube_id/local id from a /video/<id> detail URL */
function parseVideoId(url: string): string | null {
  const match = url.match(/\/video\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/** Extract the channel_id from a /channel/<id> URL */
function parseChannelId(url: string): string | null {
  const match = url.match(/\/channel\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// Source Methods
source.enable = function (conf: SourceConfig, settings: unknown, saveStateStr?: string | null) {
  const config = (conf || {}) as PluginConfig;
  setPluginConfig(config);
  setPluginSettings((settings as Record<string, string>) || {});

  if (saveStateStr) {
    try {
      Object.assign(pluginState, JSON.parse(saveStateStr));
    } catch (e) {
      log('Warning: Failed to load saved state: ' + e);
    }
  }

  // Seed a previously-fetched dynamic API token (see constants.ts
  // getDefaultHeaders) so it doesn't need re-fetching every session.
  // No-op for this project's own deployment, which bakes a static token
  // into constants.authorization at build time instead.
  if (pluginState.apiToken) {
    setDynamicToken(pluginState.apiToken);
  }

  log('Plugin enabled: ' + config.name);
};

source.getHome = function (): VideoPager {
  log('getHome called');
  return VideoListPager.load(pluginId(), { sort: 'published', order: 'desc', watch: watchFilter('watchFilterHome') });
};

source.searchSuggestions = function (query: string): string[] {
  log('searchSuggestions called with query: ' + query);
  return [];
};

source.search = function (query: string): VideoPager {
  log('search called with query: ' + query);
  return SearchPager.load(pluginId(), query, watchFilter('watchFilterSearch'));
};

source.searchChannels = function (query: string): ChannelPager {
  log('searchChannels called with query: ' + query);
  return ChannelSearchPager.load(pluginId(), query);
};

source.isChannelUrl = function (url: string): boolean {
  return url.startsWith(getBaseUrl()) && /\/channel\/[^/?#]+/.test(url);
};

source.getChannel = function (url: string): PlatformChannel {
  log('getChannel called with url: ' + url);

  const channelId = parseChannelId(url);
  if (!channelId) {
    throw new ScriptException('InvalidDataError', 'Could not parse channel id from url: ' + url);
  }

  const channel = api.getChannel(channelId);
  return channelToGrayjayChannel(pluginId(), channel);
};

// GrayJay uses getChannelContents for both a single creator's page and the
// Subscriptions feed, and doesn't say which. The setting is therefore the
// default for both, and this filter group lets the user override it on a
// creator page (GrayJay passes the pick as `filters`; null/absent means the
// setting applies).
source.getChannelCapabilities = function () {
  const options = Object.keys(WATCH_STATUS_FILTER_OPTIONS).map((name) => new FilterCapability(name, name, name));
  return new ResultCapabilities(
    [Type.Feed.Videos],
    [Type.Order.Chronological],
    [new FilterGroup('Watch Status', options, false, WATCH_STATUS_FILTER_ID)]
  );
};

source.getChannelContents = function (
  url: string,
  _type?: string | null,
  _order?: string | null,
  filters?: Record<string, string[]> | null
): VideoPager {
  log('getChannelContents called with url: ' + url);

  const channelId = parseChannelId(url);
  if (!channelId) {
    return new EmptyVideoPager();
  }

  const picked = filters?.[WATCH_STATUS_FILTER_ID]?.[0];
  const watch = picked !== undefined && picked in WATCH_STATUS_FILTER_OPTIONS ? WATCH_STATUS_FILTER_OPTIONS[picked] : watchFilter('watchFilterChannel');

  return VideoListPager.load(pluginId(), {
    channel: channelId,
    sort: 'published',
    order: 'desc',
    watch: watch ?? undefined
  });
};

source.getUserSubscriptions = function (): string[] {
  log('getUserSubscriptions called');
  return getSubscribedChannelUrls();
};

source.isContentDetailsUrl = function (url: string): boolean {
  return url.startsWith(getBaseUrl()) && /\/video\/[^/?#]+/.test(url);
};

source.getContentDetails = function (url: string): PlatformVideoDetails {
  log('getContentDetails called with url: ' + url);

  const videoId = parseVideoId(url);
  if (!videoId) {
    throw new ScriptException('InvalidDataError', 'Could not parse video id from url: ' + url);
  }

  const video = api.getVideo(videoId);
  return videoToGrayjayVideoDetails(pluginId(), video);
};

source.getPlaybackTracker = function (url: string): PlaybackTracker | null {
  const videoId = parseVideoId(url);
  if (!videoId) return null;

  return new TAPlaybackTracker(videoId);
};

source.getComments = function (url: string): CommentPager {
  log('getComments called with url: ' + url);

  const videoId = parseVideoId(url);
  if (!videoId) return new CommentListPager([]);

  const comments = api.getComments(videoId);
  return new CommentListPager(comments.map((c) => commentToGrayjayComment(pluginId(), videoId, c)));
};

// getSubComments is a real GrayJay source method but missing from
// @types/grayjay-source's Source type (a type alias, so it can't be
// declaration-merged like the typings in utils/types.d.ts).
(source as typeof source & { getSubComments: (comment: PlatformComment) => CommentPager }).getSubComments = function (
  comment: PlatformComment
): CommentPager {
  const videoId = comment.context?.videoId;
  const commentId = comment.context?.commentId;
  log('getSubComments called for comment: ' + commentId);
  if (!videoId || !commentId) return new CommentListPager([]);

  // Replies aren't addressable on their own in TubeArchivist's API — refetch
  // the video's (single-response) comment tree and pick out this thread.
  const replies = findCommentReplies(api.getComments(videoId), commentId);
  return new CommentListPager(replies.map((c) => commentToGrayjayComment(pluginId(), videoId, c)));
};

source.isPlaylistUrl = function (url: string): boolean {
  return url.startsWith(getBaseUrl()) && /\/playlist\/[^/?#]+/.test(url);
};

source.getPlaylist = function (url: string): PlatformPlaylistDetails {
  log('getPlaylist called with url: ' + url);

  // TODO: implement once /api/playlist/<id>/ mapping is needed for the PoC
  return {
    id: 'placeholder-playlist',
    name: 'Playlist',
    author: {
      id: 'placeholder-author',
      name: 'Author',
      url: '',
      thumbnail: ''
    },
    videoCount: 0,
    thumbnail: '',
    url: url,
    contents: new EmptyVideoPager()
  } as unknown as PlatformPlaylistDetails;
};

source.saveState = function (): string {
  const token = getDynamicToken();
  if (token) pluginState.apiToken = token;
  return JSON.stringify(pluginState);
};

// Helper Functions
function log(message: string) {
  console.log('[TubeArchivist] ' + message);
}

log('TubeArchivist script loaded');
