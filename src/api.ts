/**
 * API Client wrapper for platform-specific API calls
 * Provides convenient methods that automatically use the configured base URL
 */

import { getBaseUrl } from './constants';
import * as network from './utils/network';
import {
  TAChannel,
  TAChannelListParams,
  TAChannelListResponse,
  TAPlayer,
  TASearchResponse,
  TAVideo,
  TAVideoListParams,
  TAVideoListResponse
} from './types';

function buildQuery(params: Record<string, string | number | undefined>): string {
  const parts: string[] = [];
  for (const key of Object.keys(params)) {
    const value = params[key];
    if (value === undefined || value === '') continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  return parts.length ? `?${parts.join('&')}` : '';
}

/**
 * API Client for making requests to the platform API
 * All methods automatically prepend the base URL from config
 */
class APIClient {
  /**
   * Get the full URL by combining base URL with endpoint
   */
  private getUrl(endpoint: string): string {
    const baseUrl = getBaseUrl();
    if (!baseUrl) {
      throw new ScriptException('ConfigError', 'Base URL not configured. Check settings[baseUrl].options in config.json');
    }
    // Ensure proper URL joining (handle trailing/leading slashes)
    const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return base + path;
  }

  /**
   * Perform a GET request to the API
   */
  get(endpoint: string, options?: Omit<network.FetchOptions, 'method'>): any {
    return network.get(this.getUrl(endpoint), options);
  }

  /**
   * Perform a POST request to the API
   */
  post(endpoint: string, data?: any, options?: Omit<network.FetchOptions, 'method' | 'data'>): any {
    return network.post(this.getUrl(endpoint), data, options);
  }

  /**
   * Perform a PUT request to the API
   */
  put(endpoint: string, data?: any, options?: Omit<network.FetchOptions, 'method' | 'data'>): any {
    return network.put(this.getUrl(endpoint), data, options);
  }

  /**
   * Perform a DELETE request to the API
   */
  delete(endpoint: string, options?: Omit<network.FetchOptions, 'method'>): any {
    return network.delete(this.getUrl(endpoint), options);
  }

  /**
   * Perform a GET request and parse JSON response
   */
  getJson(endpoint: string, options?: Omit<network.FetchOptions, 'method' | 'parseJson'>): any {
    return network.getJson(this.getUrl(endpoint), options);
  }

  /**
   * Perform a POST request and parse JSON response
   */
  postJson(endpoint: string, data?: any, options?: Omit<network.FetchOptions, 'method' | 'data' | 'parseJson'>): any {
    return network.postJson(this.getUrl(endpoint), data, options);
  }

  /**
   * Perform a GET request and parse HTML response
   */
  getHtml(endpoint: string, options?: Omit<network.FetchOptions, 'method' | 'parseHtml'>): any {
    return network.getHtml(this.getUrl(endpoint), options);
  }

  /**
   * Execute a GraphQL query against the API
   */
  graphql(query: string, variables?: Record<string, any>, options?: Omit<network.FetchOptions, 'query' | 'variables'>): any {
    // Most GraphQL endpoints are at /graphql, but allow override via endpoint in options
    const endpoint = (options as any)?.endpoint || '/graphql';
    return network.fetchGraphQL(this.getUrl(endpoint), query, variables, options);
  }

  /**
   * Generic request method for custom needs
   */
  request(endpoint: string, options: network.FetchOptions): any {
    return network.fetch(this.getUrl(endpoint), options);
  }

  /**
   * GET /api/video/ - paginated video list, optionally filtered by channel/playlist
   */
  getVideoList(params: TAVideoListParams = {}): TAVideoListResponse {
    return this.getJson(`/api/video/${buildQuery(params as Record<string, string | number | undefined>)}`);
  }

  /**
   * GET /api/video/<id>/ - single video with full metadata
   */
  getVideo(videoId: string): TAVideo {
    return this.getJson(`/api/video/${encodeURIComponent(videoId)}/`);
  }

  /**
   * GET /api/channel/<id>/ - single channel
   */
  getChannel(channelId: string): TAChannel {
    return this.getJson(`/api/channel/${encodeURIComponent(channelId)}/`);
  }

  /**
   * GET /api/channel/ - paginated channel list, optionally filtered to
   * subscribed/unsubscribed channels (ChannelApiListView.valid_filter)
   */
  getChannelList(params: TAChannelListParams = {}): TAChannelListResponse {
    return this.getJson(`/api/channel/${buildQuery(params as Record<string, string | number | undefined>)}`);
  }

  /**
   * GET /api/search/?query= - single-shot search across videos, channels and playlists
   * (TubeArchivist's search endpoint does not paginate)
   */
  search(query: string): TASearchResponse {
    return this.getJson(`/api/search/${buildQuery({ query })}`);
  }

  /**
   * POST /api/video/<id>/progress/ - report playback position.
   * TubeArchivist computes watched-status server-side from this; no
   * separate "mark as watched" call is needed for normal playback sync.
   */
  updateProgress(videoId: string, position: number): TAPlayer {
    return this.postJson(`/api/video/${encodeURIComponent(videoId)}/progress/`, { position });
  }
}

/**
 * Singleton API client instance
 */
export const api = new APIClient();

/**
 * Export the class for advanced use cases
 */
export { APIClient };
