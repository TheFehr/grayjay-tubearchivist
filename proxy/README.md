# Self-hosted plugin server

A single container that serves everything needed to install this plugin
against *your own* TubeArchivist instance: `config.json`, `script.js`, and
a thumbnail/subtitle auth proxy — no repo clone, no npm/Node, no custom
build. Just run it with three environment variables.

## Why this exists

GrayJay's plugin settings only support a fixed dropdown of options, not
free text — so out of the box there's no way to type your own
TubeArchivist URL into GrayJay's UI, and the committed `config.json` in
this repo only ever has a placeholder domain baked in. This container
solves that the same way the project's own private deployment works:
`config.json` is rendered from a template at container startup using your
real URL/token, so every self-hoster gets a correctly-populated config
without needing their own build pipeline.

It also fixes a separate, real limitation: GrayJay's native
`Thumbnail`/`ISubtitleSource` types have no way to attach custom HTTP
headers to an image/subtitle request (unlike `VideoUrlSource`, which
supports `requestModifier.headers`), and TubeArchivist's thumbnail
cache/subtitle files require the same API token as everything else
(confirmed: 403 without it, 200 with it). This is a real gap in GrayJay
itself, not fixable from plugin code (confirmed against GrayJay's own
source — no cookie-jar sharing between its login flow and its image
loader either). The same container proxies those requests and injects the
token server-side, so GrayJay's image loader hits what looks like an
unauthenticated URL that's actually just this proxy authenticating
invisibly.

## Quick start

```
cd proxy/
cp .env.example .env   # fill in TA_BASE_URL, TA_API_TOKEN, PLUGIN_BASE_URL
docker compose -f docker-compose.example.yml up -d
```

Then install with:

```
grayjay://plugin/<PLUGIN_BASE_URL>/config.json
```

Three required environment variables:

- `TA_BASE_URL` — your TubeArchivist instance, e.g. `https://tubearchivist.example.com` (no trailing slash)
- `TA_API_TOKEN` — your API token (TubeArchivist Settings page)
- `PLUGIN_BASE_URL` — where *this* container ends up reachable, e.g. `https://grayjay.example.com`. Needs a real domain with TLS for actual use — GrayJay's `Http` package expects `https://`. A bare `http://localhost:8080`-style address is fine for quick local testing only.

## Already running TubeArchivist via docker-compose?

Add this as a service in that same stack instead of running it standalone:

```yaml
  grayjay-tubearchivist:
    image: ghcr.io/thefehr/grayjay-tubearchivist:latest
    restart: unless-stopped
    networks:
      - proxy   # or whatever network your reverse proxy uses
    environment:
      - TA_BASE_URL=${TA_BASE_URL}
      - TA_API_TOKEN=${TA_API_TOKEN}
      - PLUGIN_BASE_URL=${PLUGIN_BASE_URL}
    labels:
      - "traefik.enable=true"
      # ...your reverse proxy's routing labels for whatever domain you want this on
```

Add the three env vars to your stack's `.env` file, redeploy.

## Building it yourself instead of pulling the published image

The image is defined by the `Dockerfile` at the project root (multi-stage:
builds `script.js` from `src/` in a Node stage, then copies it into an
`nginx:alpine` runtime alongside the templates in this directory). Useful
if you want to audit or customize it:

```
docker build -t grayjay-tubearchivist:local .
```

Then use `image: grayjay-tubearchivist:local` in place of the `ghcr.io`
image above.

## How it works

- `script.js` is generic — it carries no user-specific values, just reads
  whatever `config.json` hands it at runtime — so it's identical for
  every self-hoster and gets built once, baked into the image.
- `config.json.template` gets rendered into a real `config.json` at
  container *startup* (not build time) by `15-generate-config-json.sh`,
  using your env vars — this is what makes one published image work for
  everyone's own instance.
- The nginx config itself (`nginx.conf.template`, which adds the
  `/thumb/` proxy location) is templated the standard way: the official
  `nginx` image ships a built-in entrypoint step
  (`docker-entrypoint.d/20-envsubst-on-templates.sh`) that processes any
  `*.template` file under `/etc/nginx/templates/` with `envsubst` before
  nginx starts. `envsubst` only touches variables that are genuinely set
  in the environment, so nginx's own runtime variables (`$proxy_host`,
  `$uri`, `$1` from the `rewrite` directive, etc.) are left completely
  alone.
- `config.json.template` needed its own separate script rather than
  reusing that same mechanism, since it lives under `/usr/share/nginx/html/`
  as a data file to be *served*, not an nginx config snippet — the
  official script only ever writes into `/etc/nginx/conf.d/`.

No secrets live in any committed file — everything instance-specific
comes from environment variables at container startup.
