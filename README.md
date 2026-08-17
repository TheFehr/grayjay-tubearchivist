# TubeArchivist Plugin for GrayJay

Browse and watch your self-hosted TubeArchivist video library

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
- [x] Playlists
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

### Testing with Dev Server

The fastest way to test your plugin during development:

```bash
npm run test
```

This will:

- 🔍 **Scan** your local network for GrayJay dev servers (port 11337)
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

### Build and Publish

```bash
npm run build:publish [version]
```

This will build the plugin and trigger a GitHub release. Requires `GITHUB_TOKEN` environment variable.

### Development Mode

```bash
npm run dev
```

This will watch for changes and rebuild automatically.

## Project Structure

```
.
├── src/
│   ├── script.ts         # Main plugin entry point
│   ├── constants.ts      # Constants and configuration
│   ├── utils.ts          # Utility functions
│   ├── graphql/          # GraphQL module (if applicable)
│   │   └── queries.ts
│   ├── api/              # API client module (if applicable)
│   │   └── client.ts
│   ├── mappers/          # Data mapping (if applicable)
│   │   └── index.ts
│   ├── pagers/           # Pagination classes (if applicable)
│   │   └── index.ts
│   └── state/            # State management (if applicable)
│       └── index.ts
├── assets/
│   └── qrcode.png        # QR code for installation (generated once)
├── dist/                 # Build output (gitignored)
│   ├── config.json       # Minified plugin configuration
│   └── script.js         # Minified and compiled script
├── .secrets/             # Private keys (gitignored)
│   └── signing_key.pem   # RSA private key for signing
├── scripts/
│   ├── sign.js           # Plugin signing script
│   └── publish.js        # Publishing automation script
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

## 🚀 Publishing

```bash
# Publish a new version (auto-bumps patch version)
npm run publish

# Publish with specific version
npm run publish 5

# Or build, sign, and publish in one command
npm run build:publish
```

The publish script will:

1. ✅ Bump the version (or set to specified version)
2. ✅ Build the plugin
3. ✅ Sign the plugin (generate signature and public key)
4. ✅ Generate a QR code for installation
5. ✅ Commit changes
6. ✅ Create a git tag
7. ✅ Push to GitHub (triggers release workflow)

### Prerequisites

- **OpenSSL**: Required for signing (usually pre-installed on Linux/Mac, available via Git Bash on Windows)
- **Git**: With configured remote repository

## Support

For issues and questions, please use the [GitHub Issues](https://github.com/TheFehr/grayjay-tubearchivist/issues) page.

## Acknowledgments

- Built for [GrayJay](https://grayjay.app/)
- Generated using [@grayjay/source-generator](https://www.npmjs.com/package/@grayjay/source-generator)
