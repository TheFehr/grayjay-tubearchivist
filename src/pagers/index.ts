
import { api } from '../api';
import { channelToGrayjayChannel, videoToGrayjayVideo } from '../mappers';
import { TAVideoListParams } from '../types';

/**
 * Paginated video list backed by GET /api/video/ (home feed, channel contents, playlist contents).
 * Eager-loads the first page so callers get populated results immediately.
 */
export class VideoListPager extends VideoPager {
  private pluginId: string;
  private params: TAVideoListParams;
  private page: number;

  private constructor(pluginId: string, params: TAVideoListParams, firstPage: PlatformVideo[], hasMore: boolean) {
    super(firstPage, hasMore);
    this.pluginId = pluginId;
    this.page = params.page || 1;
    this.params = params;
  }

  public nextPage(): this {
    this.page++;
    const response = api.getVideoList({ ...this.params, page: this.page });
    this.results = response.data.map((v) => videoToGrayjayVideo(this.pluginId, v));
    this.hasMore = response.paginate.current_page < response.paginate.last_page;
    return this;
  }

  public static load(pluginId: string, params: TAVideoListParams = {}): VideoListPager {
    const page = params.page || 1;
    const response = api.getVideoList({ ...params, page });
    const results = response.data.map((v) => videoToGrayjayVideo(pluginId, v));
    const hasMore = response.paginate.current_page < response.paginate.last_page;
    return new VideoListPager(pluginId, { ...params, page }, results, hasMore);
  }
}

/**
 * Search results backed by GET /api/search/, which is not paginated server-side.
 * Eager-loads the (only) page of video hits.
 */
export class SearchPager extends VideoPager {
  private constructor(results: PlatformVideo[]) {
    super(results, false);
  }

  public nextPage(): this {
    this.results = [];
    this.hasMore = false;
    return this;
  }

  public static load(pluginId: string, query: string): SearchPager {
    if (!query) return new SearchPager([]);

    const response = api.search(query);
    const results = response.results.video_results.map((v) => videoToGrayjayVideo(pluginId, v));

    return new SearchPager(results);
  }
}

/** Channel search results, also backed by the single-shot GET /api/search/ endpoint */
export class ChannelSearchPager extends ChannelPager {
  private constructor(results: PlatformChannel[]) {
    super(results, false);
  }

  public nextPage(): this {
    this.results = [];
    this.hasMore = false;
    return this;
  }

  public static load(pluginId: string, query: string): ChannelSearchPager {
    if (!query) return new ChannelSearchPager([]);

    const response = api.search(query);
    const results = response.results.channel_results.map((c) => channelToGrayjayChannel(pluginId, c));

    return new ChannelSearchPager(results);
  }
}

export class EmptyVideoPager extends VideoPager {
  constructor() {
    super([], false);
  }

  public nextPage(): this {
    this.results = [];
    this.hasMore = false;
    return this;
  }
}
