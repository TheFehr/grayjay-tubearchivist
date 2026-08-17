const fs = require("fs");
const path = require("path");
const resolve = require("@rollup/plugin-node-resolve").default;
const commonjs = require("@rollup/plugin-commonjs");
const typescript = require("@rollup/plugin-typescript");
const terser = require("@rollup/plugin-terser");
const copy = require("rollup-plugin-copy");
const del = require("rollup-plugin-delete");

const dest = "./dist";

// Merge a gitignored config.local.json into the built config.json, if present.
// Lets a real, private server URL be used for local dev-server testing
// without ever landing in the committed config.json. See config.local.json.example.
function applyLocalConfigOverride(config) {
  const localConfigPath = path.resolve(__dirname, "config.local.json");
  if (!fs.existsSync(localConfigPath)) {
    return config;
  }

  const local = JSON.parse(fs.readFileSync(localConfigPath, "utf8"));
  if (!local.baseUrl) {
    return config;
  }

  const baseUrlSetting = (config.settings || []).find((s) => s.variable === "baseUrl");
  if (baseUrlSetting) {
    if (!baseUrlSetting.options.includes(local.baseUrl)) {
      baseUrlSetting.options.unshift(local.baseUrl);
    }
    if (local.baseUrlDefault) {
      // NOTE: GrayJay's native parseSettings() (JSClient.kt:249) runs every
      // setting value through JSON.parse() — a Dropdown's value must be the
      // selected option's numeric INDEX (a valid JSON literal), never the
      // raw URL string, or it crashes with "Unexpected token ... not valid
      // JSON" (confirmed via device logcat). See constants.ts getBaseUrl().
      baseUrlSetting.default = String(baseUrlSetting.options.indexOf(local.baseUrl));
    }
  }

  const localHost = new URL(local.baseUrl).hostname;
  for (const host of [localHost, `.${localHost}`]) {
    if (!config.allowUrls.includes(host)) {
      config.allowUrls.push(host);
    }
  }

  if (config.authentication) {
    // The committed config uses the placeholder domain for loginUrl/completionUrl
    // (a real login-webview flow doesn't make sense against a fake domain) —
    // rewrite to the real host so the login flow actually works for local
    // testing/personal deployment. Only satisfies GrayJay's isLoggedIn gate
    // (unlocks "Import Subscriptions"); unrelated to the token-based API auth.
    const placeholderHost = "tubearchivist.example.com";
    for (const field of ["loginUrl", "completionUrl"]) {
      if (typeof config.authentication[field] === "string") {
        config.authentication[field] = config.authentication[field].replace(placeholderHost, localHost);
      }
    }
  }

  if (local.apiToken) {
    // NOTE: GrayJay's SourcePluginConfig.constants is a flat Map<String, String>
    // (see SourcePluginConfig.kt) — nesting an object under it fails Kotlin
    // deserialization. Store the ready-to-use header value as a plain string.
    config.constants = config.constants || {};
    config.constants.authorization = `Token ${local.apiToken}`;
  }

  if (local.thumbnailProxyBase) {
    // Thumbnails/subtitles have no way to carry the Authorization header
    // (GrayJay's Thumbnail/ISubtitleSource types support no custom headers,
    // unlike VideoUrlSource) — routed through an auth-injecting proxy instead.
    config.constants = config.constants || {};
    config.constants.thumbnailProxyBase = local.thumbnailProxyBase;

    const proxyHost = new URL(local.thumbnailProxyBase).hostname;
    for (const host of [proxyHost, `.${proxyHost}`]) {
      if (!config.allowUrls.includes(host)) {
        config.allowUrls.push(host);
      }
    }
  }

  console.warn(
    `[rollup] config.local.json found — dist/config.json includes local baseUrl override (${local.baseUrl}). Do not publish this build.`
  );

  return config;
}

module.exports = {
  input: "src/script.ts",
  output: {
    file: `${dest}/script.js`,
    format: "cjs",
    sourcemap: false,
  },
  plugins: [
    del({ targets: `${dest}/*` }),
    resolve(),
    commonjs(),
    typescript({ 
      tsconfig: "./tsconfig.json",
      compilerOptions: {
        skipLibCheck: true,
        types: []  // Don't auto-include any type packages
      }
    }),
    terser({
      compress: {
        drop_console: false,
        drop_debugger: true,
      },
      format: {
        comments: false,
      },
    }),
    copy({
      targets: [
        {
          src: "config.json",
          dest,
          transform: (contents) => {
            const config = applyLocalConfigOverride(JSON.parse(contents.toString()));
            // Minify JSON by removing whitespace
            return JSON.stringify(config);
          },
        },
      ],
    }),
  ],
};
