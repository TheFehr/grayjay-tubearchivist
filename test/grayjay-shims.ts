/**
 * Test-only shims for GrayJay content/value classes that the real app provides
 * but @kaidelorenzo/grayjay-polyfill does not implement (it only covers
 * pagers, PlatformID/AuthorLink, Thumbnail(s), and http/utility/domParser).
 *
 * These are plain data holders so mapper output can be inspected in tests —
 * never bundled into dist/script.js, only used by test/script.test.ts.
 */

function defineIfMissing(name: string, ctor: Function) {
  if (!(globalThis as any)[name]) {
    (globalThis as any)[name] = ctor;
  }
}

defineIfMissing(
  'ScriptException',
  class ScriptException extends Error {
    type: string;
    constructor(type: string, message: string) {
      super(`${type}: ${message}`);
      this.type = type;
    }
  }
);

defineIfMissing(
  'PlatformVideo',
  class PlatformVideo {
    plugin_type = 'PlatformVideoDetails';
    constructor(obj: Record<string, unknown>) {
      Object.assign(this, obj);
    }
  }
);

defineIfMissing(
  'PlatformVideoDetails',
  class PlatformVideoDetails {
    plugin_type = 'PlatformVideoDetails';
    constructor(obj: Record<string, unknown>) {
      Object.assign(this, obj);
    }
  }
);

defineIfMissing(
  'PlatformChannel',
  class PlatformChannel {
    plugin_type = 'PlatformChannel';
    constructor(obj: Record<string, unknown>) {
      Object.assign(this, obj);
    }
  }
);

defineIfMissing(
  'VideoSourceDescriptor',
  class VideoSourceDescriptor {
    plugin_type = 'MuxVideoSourceDescriptor';
    videoSources: unknown[];
    constructor(sources: unknown[]) {
      this.videoSources = sources;
    }
  }
);

defineIfMissing(
  'VideoUrlSource',
  class VideoUrlSource {
    plugin_type = 'VideoUrlSource';
    constructor(obj: Record<string, unknown>) {
      Object.assign(this, obj);
    }
  }
);

defineIfMissing(
  'RatingLikes',
  class RatingLikes {
    type = 1;
    likes: number;
    constructor(likes: number) {
      this.likes = likes;
    }
  }
);

defineIfMissing(
  'RatingLikesDislikes',
  class RatingLikesDislikes {
    type = 2;
    likes: number;
    dislikes: number;
    constructor(likes: number, dislikes: number) {
      this.likes = likes;
      this.dislikes = dislikes;
    }
  }
);

defineIfMissing(
  'PlaybackTracker',
  class PlaybackTracker {
    nextRequest: number;
    constructor(interval: number) {
      this.nextRequest = interval;
    }
  }
);
