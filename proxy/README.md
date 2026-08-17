# Thumbnail auth proxy

GrayJay's native `Thumbnail`/`ISubtitleSource` types have no way to attach
custom HTTP headers to an image/subtitle request — unlike `VideoUrlSource`,
which supports `requestModifier.headers`. Since TubeArchivist's thumbnail
cache and subtitle files require the same API token as everything else
(confirmed: 403 without it, 200 with it), thumbnails can't load directly.
This is a real limitation in GrayJay itself, not something fixable from
plugin code (confirmed against GrayJay's own source — no cookie-jar sharing
between its login flow and its image loader either).

This proxy sits in front of TubeArchivist and injects the `Authorization`
header server-side, so GrayJay's image loader hits what looks like an
unauthenticated URL that's actually just this proxy doing the
authentication invisibly.

It's a single `nginx:alpine` container configured entirely through two
environment variables — no secrets live in any committed file.

## Option A — you already run TubeArchivist via docker-compose

Add a `grayjay-plugin` service (or a dedicated one, if you're not also
using this repo to host the plugin's `config.json`/`script.js`) to your
existing stack:

```yaml
  grayjay-thumbnail-proxy:
    image: nginx:alpine
    restart: unless-stopped
    networks:
      - proxy   # or whatever network your reverse proxy uses
    volumes:
      - "./grayjay/nginx.conf.template:/etc/nginx/templates/default.conf.template:ro"
    environment:
      - TA_BASE_URL=${TA_BASE_URL}
      - TA_API_TOKEN=${TA_API_TOKEN}
    labels:
      - "traefik.enable=true"
      # ...your reverse proxy's routing labels for whatever domain you want this on
```

Add `TA_BASE_URL`/`TA_API_TOKEN` to your stack's `.env` file, copy
`nginx.conf.template` next to your `docker-compose.yml`, redeploy.

## Option B — standalone

```
cd proxy/
cp .env.example .env   # fill in your real TA_BASE_URL and TA_API_TOKEN
docker compose -f docker-compose.example.yml up -d
```

This exposes just the proxy on port 8080 — it does *not* serve the
plugin's `config.json`/`script.js` (see the main README for that).

## Wiring it into the plugin

Set `thumbnailProxyBase` in your `config.local.json` (see
`config.local.json.example` in the project root) to wherever this ends up
reachable, e.g. `https://your-proxy-domain.example/thumb`. The build
pipeline (`rollup.config.js`) picks it up automatically from there —
nothing else to configure.

## How the substitution works

No custom scripting needed — the official `nginx` Docker image ships a
built-in entrypoint step (`docker-entrypoint.d/20-envsubst-on-templates.sh`)
that processes any `*.template` file under `/etc/nginx/templates/` with
`envsubst`, using the container's real environment variables, and writes
the result to `/etc/nginx/conf.d/` before nginx starts. Since `envsubst`
only touches variables that are genuinely set in the environment, nginx's
own runtime variables (`$proxy_host`, `$uri`, `$1` from the `rewrite`
directive, etc.) are left completely alone — only `${TA_BASE_URL}` and
`${TA_API_TOKEN}` get substituted.
