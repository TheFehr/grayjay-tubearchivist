
/**
 * Constants for TubeArchivist
 *
 * Plugin config/settings are kept in local module state, set once by
 * source.enable() in script.ts — NOT read from the ambient `plugin.config`/
 * `plugin.settings` globals. Every real-world GrayJay plugin checked
 * (grayjay-source-rss, grayjay-source-mediathekview) follows this pattern;
 * none of them rely on the ambient globals.
 */

let _pluginConfig: PluginConfig | null = null;
let _pluginSettings: Record<string, string> = {};

export function setPluginConfig(config: PluginConfig | null): void {
  _pluginConfig = config;
}

export function setPluginSettings(settings: Record<string, string>): void {
  _pluginSettings = settings || {};
}

export function getPluginConfig(): PluginConfig | null {
  return _pluginConfig;
}

// Error types for consistent exception handling
export const ERROR_TYPES = {
  NETWORK: 'NetworkError',
  AUTH: 'AuthenticationError',
  NOT_FOUND: 'NotFoundError',
  INVALID_DATA: 'InvalidDataError'
} as const;

/**
 * Get a raw plugin setting value.
 *
 * NOTE: GrayJay's native `parseSettings()` (called from JSClient.initialize(),
 * see JSClient.kt:249) runs every setting value through JSON.parse() with no
 * try/catch. Confirmed via device logcat: a Dropdown's raw display string
 * (e.g. a URL) crashes with "SyntaxError: Unexpected token 'h' ... is not
 * valid JSON" because it isn't a valid JSON literal on its own. Booleans
 * ("true"/"false") happen to be valid JSON, which is why that setting type
 * never broke. Dropdown settings must therefore store a numeric INDEX
 * (verified against real plugins, e.g. grayjay-source-rss's
 * `avatarSizeOptionIndex`/`thumbnailResolutionOptionIndex` used as array
 * indices) — never the literal option string.
 * @param variable The setting variable name
 * @param defaultValue Optional default value if setting doesn't exist
 * @returns The raw setting value (an index string for Dropdown settings)
 */
export function getPluginSetting(variable: string, defaultValue?: string): string {
  // Return from runtime settings first (user's active selection)
  if (_pluginSettings[variable] !== undefined) {
    return _pluginSettings[variable];
  }

  // Fallback to config defaults
  const setting = _pluginConfig?.settings?.find(s => s.variable === variable);
  return setting?.default || defaultValue || '';
}

/**
 * Get the active API base URL.
 * The baseUrl Dropdown setting stores a numeric index into its own
 * options array (see getPluginSetting's note) — not the URL itself.
 * @returns The active base URL
 */
export function getBaseUrl(): string {
  if (!_pluginConfig) {
    log('Warning: getBaseUrl() called before source.enable()');
    return '';
  }

  // Get available URLs from settings (source of truth)
  const baseUrlSetting = _pluginConfig.settings?.find(s => s.variable === 'baseUrl');
  const availableUrls = (baseUrlSetting?.options as string[]) || [];

  if (availableUrls.length === 0) {
    log('Warning: No base URLs configured in settings');
    return '';
  }

  // Setting value is the selected option's INDEX, not the URL itself
  const indexStr = getPluginSetting('baseUrl', '0');
  const index = parseInt(indexStr, 10);
  return availableUrls[index] || availableUrls[0];
}

/**
 * Get default HTTP headers to send with every request.
 *
 * NOTE: GrayJay's SourcePluginConfig.constants is a flat Map<String, String>
 * (verified against SourcePluginConfig.kt) — it cannot hold a nested headers
 * object, so the ready-to-use "Authorization" header value is stored directly
 * under constants.authorization instead.
 * @returns Headers object
 */
export function getDefaultHeaders(): Record<string, string> {
  const authorization = _pluginConfig?.constants?.authorization;
  return authorization ? { Authorization: authorization } : {};
}

/**
 * Resolve a path returned by the TubeArchivist API (media files, subtitles)
 * against the configured base URL. Passes absolute URLs through unchanged.
 */
export function resolveUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  const baseUrl = getBaseUrl();
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const rel = path.startsWith('/') ? path : `/${path}`;
  return base + rel;
}

/**
 * Resolve a thumbnail/image path.
 *
 * GrayJay's native Thumbnail class (Thumbnails.kt) is just {url, quality} —
 * it has no way to attach custom headers to an image request (unlike
 * VideoUrlSource, which supports requestModifier.headers). Since
 * TubeArchivist's thumbnail cache requires the same Authorization token as
 * the rest of the API (confirmed: 403 without it, 200 with it), thumbnails
 * are routed through constants.thumbnailProxyBase instead — a small nginx
 * proxy that injects the token server-side. Falls back to resolveUrl()
 * (thumbnails will 403 in the app) if no proxy is configured.
 */
export function resolveThumbnailUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  const proxyBase = _pluginConfig?.constants?.thumbnailProxyBase;
  if (!proxyBase) return resolveUrl(path);

  const base = proxyBase.endsWith('/') ? proxyBase.slice(0, -1) : proxyBase;
  const rel = path.startsWith('/') ? path : `/${path}`;
  return base + rel;
}
