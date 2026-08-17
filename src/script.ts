// TubeArchivist Source Plugin for GrayJay

import { getBaseUrl, getDynamicToken, getPluginConfig, setDynamicToken, setPluginConfig, setPluginSettings } from './constants';
import { api } from './api';
import { channelToGrayjayChannel, videoToGrayjayVideoDetails } from './mappers';
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
source.enable = function (conf: SourceConfig, settings: Record<string, string>, saveStateStr?: string) {
  setPluginConfig((conf || {}) as PluginConfig);
  setPluginSettings(settings || {});

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

  log('Plugin enabled: ' + conf.name);
};

source.getHome = function (): VideoPager {
  log('getHome called');
  return VideoListPager.load(pluginId(), { sort: 'published', order: 'desc' });
};

source.searchSuggestions = function (query: string): string[] {
  log('searchSuggestions called with query: ' + query);
  return [];
};

source.search = function (query: string): VideoPager {
  log('search called with query: ' + query);
  return SearchPager.load(pluginId(), query);
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

source.getChannelContents = function (url: string): VideoPager {
  log('getChannelContents called with url: ' + url);

  const channelId = parseChannelId(url);
  if (!channelId) {
    return new EmptyVideoPager();
  }

  return VideoListPager.load(pluginId(), { channel: channelId, sort: 'published', order: 'desc' });
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
