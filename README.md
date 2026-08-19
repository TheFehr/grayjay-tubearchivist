# TubeArchivist Plugin for GrayJay

Browse and watch your self-hosted TubeArchivist video library

> Not affiliated with or endorsed by the TubeArchivist or GrayJay/FUTO projects.

## Installation

GrayJay's plugin settings don't support free text, so there's no way to
type your own TubeArchivist URL into GrayJay's UI directly — every
install needs a `config.json` with your real URL/token already baked in.

**Run your own copy** — a single self-contained Docker image, no repo
clone or build needed:

```
docker run -d -p 8080:80 \
  -e TA_BASE_URL=https://your-tubearchivist-instance.example \
  -e TA_API_TOKEN=your-api-token \
  -e PLUGIN_BASE_URL=https://your-plugin-domain.example \
  ghcr.io/thefehr/grayjay-tubearchivist:latest
```

Then install with `grayjay://plugin/<PLUGIN_BASE_URL>/config.json`. See
[`proxy/README.md`](proxy/README.md) for the full docker-compose setup,
why it also fixes thumbnails (a real GrayJay limitation, not fixable from
plugin code alone), and how to build the image yourself instead of
pulling the published one.

## Features

- [x] Search
- [x] Authentication
- [ ] Live Streams
- [ ] Comments
- [ ] Playlists
- [x] Home Feed
- [x] Channel Details
- [x] Video Details

## Technology Stack

- REST API

## Development

### Prerequisites

- Node.js >= 14
- npm >= 6.14.4

### Installation

```bash
npm install
```

### Build

```bash
npm run build
```

This will generate the minified plugin files in the `dist/` directory.

### Automated Test Suite

```bash
npm run test
```

Builds the plugin and runs `test/script.test.ts` (Node's built-in test runner) against a live TubeArchivist instance configured via `config.local.json` — browsing, search, video/channel details, playback, and subscription import.

### Live Device Testing (Dev Portal)

```bash
npm run test:integration
```

This will:

- 🔍 **Discover** a GrayJay dev server on your network (mDNS, falling back to a network scan; port 11337)
- 🌐 **Start** a local HTTP server to serve your plugin files
- 📤 **Inject** your plugin into the dev server automatically
- 🚀 **Open** the dev portal in your default browser

**Requirements:**

- GrayJay app running on a device with dev mode enabled
- Device on the same local network
- Plugin must be built first (`npm run build`)

**Development Workflow:**

1. Make changes to code in `src/`
2. Run `npm run build`
3. Click "Reload" button in dev portal
4. Test your changes immediately!

### Development Mode

```bash
npm run dev
```

This will watch for changes and rebuild automatically.

## Project Structure

```
.
├── src/
│   ├── script.ts          # Main plugin entry point — all source.* handlers
│   ├── api.ts              # TubeArchivist REST API client
│   ├── constants.ts        # Plugin config/settings/token state
│   ├── subscriptions.ts    # Import Subscriptions (subscribed-channel lookup)
│   ├── types.ts            # TubeArchivist API response types
│   ├── mappers/
│   │   └── index.ts        # Maps TubeArchivist responses to GrayJay content types
│   ├── pagers/
│   │   └── index.ts        # Pagination classes
│   └── utils/
│       ├── network.ts      # HTTP fetch wrapper (auth headers, retries)
│       └── types.d.ts      # Ambient GrayJay plugin types
├── proxy/                  # Self-hostable Docker image sources — config
│                           # templating + thumbnail/subtitle auth proxy
│                           # (see proxy/README.md)
├── Dockerfile               # Builds script.js and packages it with proxy/
├── test/                    # Test suite (runs against a live TubeArchivist instance)
├── scripts/                 # Signing/publishing/dev-server helper scripts
├── assets/
│   └── qrcode.png           # Leftover from an earlier install flow — unused
│                            # by the current Docker-based install path
├── dist/                    # Build output (gitignored)
│   ├── config.json          # Rendered plugin configuration
│   └── script.js            # Compiled script
├── .secrets/                # Private keys (gitignored)
│   └── signing_key.pem      # RSA private key for signing
├── config.json               # Committed plugin manifest (placeholder baseUrl only)
├── config.local.json.example # Template for local dev against a real instance
├── package.json
├── tsconfig.json
├── rollup.config.js
└── README.md
```

## Configuration

The plugin can be configured through the GrayJay app settings:

- **API Server**: Your TubeArchivist server URL (GrayJay only supports dropdown/boolean settings, not free text, so this is a dropdown of known URLs)
- **Enable Debug Logging**: Show detailed logs for debugging

### Local development with a real server URL

The committed `config.json` only ships a placeholder `baseUrl` option (`https://tubearchivist.example.com`), so no private server address is ever published.

To test against your real instance, copy `config.local.json.example` to `config.local.json` (gitignored) and set `baseUrl` to your real address. `npm run build` merges it into `dist/config.json` as an extra dropdown option/default — `dist/` and `config.local.json` are both gitignored, so this never gets committed.

## Platform Information

- **Platform URL**: https://www.tubearchivist.com
- **Base API URL**: https://tubearchivist.example.com
  - **Author**: [TheFehr](https://github.com/TheFehr)
- **Repository**: https://github.com/TheFehr/grayjay-tubearchivist

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Releases

Actual distribution is the Docker image described in [Installation](#installation)
above, built and pushed to `ghcr.io/thefehr/grayjay-tubearchivist` automatically
by `.github/workflows/docker-publish.yml` on every push to `main`.

`scripts/publish.js` (`npm run publish`) is a separate, older maintainer script
that bumps the version, builds, signs the script, generates a QR code, and pushes
a git tag to trigger `.github/workflows/release.yml`. Since the committed
`config.json` only ever ships a placeholder `baseUrl`, a release built this way
isn't independently installable — it predates the Docker/GHCR approach and isn't
part of the current install path.

## Support

For issues and questions, please use the [GitHub Issues](https://github.com/TheFehr/grayjay-tubearchivist/issues) page.

## Acknowledgments

- Built for [GrayJay](https://grayjay.app/)
- Generated using [@grayjay-sources/source-generator](https://www.npmjs.com/package/@grayjay-sources/source-generator)
