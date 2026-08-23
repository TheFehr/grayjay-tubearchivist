/**
 * Plugin setting definition
 */
declare interface PluginSetting {
  /** Setting variable name (used to access the value) */
  variable?: string;
  /** Display name shown to user */
  name?: string;
  /** Description shown to user */
  description?: string;
  /** Setting type */
  type?: 'Dropdown' | 'Header' | 'Boolean';
  /** Default value */
  default?: string;
  /** Options for dropdown (or available values) */
  options?: string[];
  /** Warning dialog shown when changing this setting */
  warningDialog?: string;
  /** Another setting this depends on */
  dependency?: string;
  /** Runtime value (set by user) */
  value?: string;
}

/**
 * Extended plugin configuration type
 * Includes all config.json properties and runtime additions
 * 
 * TODO: Remove this once @types/grayjay-source includes these properties
 * Based on sources.schema.json from grayjay-sources.github.io
 */
declare interface PluginConfig extends SourceConfig {
  /** Name of the source */
  name?: string;
  /** Description of the source */
  description?: string;
  /** Author name */
  author?: string;
  /** Author URL */
  authorUrl?: string;
  /** Maximum download parallelism */
  maxDownloadParallelism?: number;
  /** Changelog URL */
  changelogUrl?: string;
  /** Source URL */
  sourceUrl?: string;
  /** Repository URL */
  repositoryUrl?: string;
  /** Script URL */
  scriptUrl?: string;
  /** Version number */
  version?: number;
  /** Icon URL */
  iconUrl?: string;
  /** Unique ID (UUID format) */
  id?: string;
  /** Packages used by the plugin */
  packages?: Array<'Http' | 'DOMParser' | 'Utilities'>;
  /** Allow eval in the plugin */
  allowEval?: boolean;
  /** Allowed URLs */
  allowUrls?: string[];
  /** Script signature */
  scriptSignature?: string;
  /** Script public key */
  scriptPublicKey?: string;
  /** Platform URL */
  platformUrl?: string;
  /** Authentication configuration */
  authentication?: {
    loginUrl?: string;
    userAgent?: string;
    cookiesToFind?: string[];
    headersToFind?: string[];
    cookiesExclOthers?: boolean;
    completionUrl?: string;
    loginButton?: string;
    domainHeadersToFind?: Record<string, any>;
    loginWarning?: string;
  };
  /** Settings configuration */
  settings?: PluginSetting[];
  /** Supported claim types */
  supportedClaimTypes?: number[];
  /**
   * Custom constants (e.g., apiKeys, tokens).
   * GrayJay's SourcePluginConfig.constants is a flat Map<String, String> —
   * every value MUST be a plain string, never a nested object, or Kotlin
   * deserialization throws (verified against SourcePluginConfig.kt).
   */
  constants?: Record<string, string>;
  /** Allow all HTTP header access */
  allowAllHttpHeaderAccess?: boolean;
  /** Website URL */
  websiteUrl?: string;
  /** Changelog text */
  changelog?: string;
  /** Subscription rate limit */
  subscriptionRateLimit?: number;
  /** CAPTCHA configuration */
  captcha?: {
    userAgent?: string;
    captchaUrl?: null;
    cookiesToFind?: string[];
  };
  /** Primary claim field type */
  primaryClaimFieldType?: number;
  /** Custom action buttons shown on the source card */
  _customButtons?: Array<{
    text?: string;
    url?: string;
    classes?: string;
  }>;
  /** URL to a web-based generator for creating custom plugin instances */
  _generatorUrl?: string;
  /** Mark source as NSFW content */
  _nsfw?: boolean;
  /** Tags for categorizing the source */
  _tags?: string[];
  /** Feed URLs */
  _feeds?: {
    commits?: string;
    releases?: string;
  };
}

/**
 * @types/grayjay-source's PlatformVideo class only declares `plugin_type`/
 * `author` as instance properties, even though its constructor takes the
 * full IPlatformVideoDef (id, name, thumbnails, datetime, url, ...) — the
 * real GrayJay host exposes all of those as readable properties too (this
 * plugin's mappers rely on spreading a PlatformVideo instance). Declaration-
 * merge the rest in until upstream's types reflect that.
 */
declare interface PlatformVideo extends IPlatformVideoDef {}

// Deliberately no local `declare const plugin` override here — this plugin
// never reads the ambient plugin.config/plugin.settings/plugin.state
// globals (see script.ts's source.enable, constants.ts), only the values
// passed into source.enable()/saveState() directly, so the vendor's own
// `plugin` declaration (config/settings, no `state` — see
// @types/grayjay-source/src/plugin.d.ts) is left as the single source of
// truth instead of redeclaring a conflicting shape here.
