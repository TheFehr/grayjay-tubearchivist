import { api } from './api';
import { channelUrl } from './mappers';
import { TAChannel } from './types';

const MAX_PAGES = 200; // generous bound (~10k channels), guards a misbehaving server

/**
 * Returns every subscribed channel's URL for source.getUserSubscriptions().
 *
 * GrayJay hard-casts every returned array element to a JS string (JSClient.kt)
 * and expects the complete list back from a single synchronous call — there's
 * no pager support on GrayJay's side, so all TubeArchivist pages are looped
 * through here before returning.
 */
export function getSubscribedChannelUrls(): string[] {
  const urls = new Set<string>();
  let page = 1;
  let fetched = 0;

  try {
    while (page <= MAX_PAGES) {
      const response = api.getChannelList({ filter: 'subscribed', page });
      const channels: TAChannel[] = response.data || [];

      for (const c of channels) {
        // Defensive: don't let a silently-ignored `filter` param export the
        // whole library as "subscriptions" — a worse failure than empty.
        if (c.channel_subscribed) urls.add(channelUrl(c));
      }
      fetched += channels.length;

      const { current_page, last_page } = response.paginate;
      if (current_page >= last_page) break;
      if (current_page < page) break; // stall guard: page param being ignored server-side

      page = current_page + 1;
    }
  } catch (e) {
    log(`getSubscribedChannelUrls failed after fetching ${fetched} channel(s) across ${page - 1} page(s): ${e}`);
    throw e;
  }

  return Array.from(urls);
}
