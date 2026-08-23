#!/bin/sh
# Renders config.json.template into a real config.json at container startup,
# using the same envsubst approach as nginx's own built-in config templating
# (docker-entrypoint.d/20-envsubst-on-templates.sh) — but that mechanism only
# processes files under /etc/nginx/templates/ into /etc/nginx/conf.d/, which
# is for nginx's own config, not arbitrary static content like config.json.
# This script fills the same role for config.json specifically, and (like
# the official script) runs automatically because every executable *.sh
# file under /docker-entrypoint.d/ is run in order before nginx starts.
set -eu

: "${TA_BASE_URL:?TA_BASE_URL environment variable is required (e.g. https://tubearchivist.example.com, no trailing slash)}"
: "${TA_API_TOKEN:?TA_API_TOKEN environment variable is required (TubeArchivist Settings page) — nginx.conf.template's own /thumb/ proxy needs it server-side to authenticate to TubeArchivist on every client's behalf, regardless of ALLOW_INSECURE_TOKEN below}"
: "${PLUGIN_BASE_URL:?PLUGIN_BASE_URL environment variable is required (where THIS container is reachable, e.g. https://grayjay.example.com)}"

ALLOW_INSECURE_TOKEN="${ALLOW_INSECURE_TOKEN:-}"

# Derived host-only values for config.json's allowUrls (envsubst can't do
# string manipulation itself, so this is computed here as plain env vars).
# Both TA's host and the plugin's own host are needed: thumbnails/subtitles
# are proxied through PLUGIN_BASE_URL (see nginx.conf.template's /thumb/
# location), not TA_BASE_URL, so GrayJay's allowUrls sandbox must permit
# both — they're commonly different hosts (e.g. TA and the plugin on
# different subdomains).
TA_HOST=$(echo "$TA_BASE_URL" | sed -E 's#^[a-zA-Z]+://##; s#/.*##')
export TA_HOST
PLUGIN_HOST=$(echo "$PLUGIN_BASE_URL" | sed -E 's#^[a-zA-Z]+://##; s#/.*##')
export PLUGIN_HOST

envsubst '${TA_BASE_URL} ${TA_HOST} ${PLUGIN_BASE_URL} ${PLUGIN_HOST}' \
  < /etc/nginx/config-templates/config.json.template \
  > /tmp/config.json.rendered

# config.json itself is served with no authentication of its own — GrayJay
# has to be able to fetch it before any login exists. So by default it does
# NOT get TA_API_TOKEN baked into constants.authorization, even though that
# same token is always used (above, server-side, inside the /thumb/ proxy).
# Instead each device fetches its own token via a real login (see
# authentication.loginUrl in config.json.template, and getDefaultHeaders()
# in src/constants.ts, which already falls back to that flow whenever
# constants.authorization isn't set). Baking the static token into
# config.json too is still supported, but only with an explicit
# acknowledgement of the tradeoff: anyone who can reach PLUGIN_BASE_URL
# would then be able to read it out and use it directly against TA_BASE_URL.
if [ "$ALLOW_INSECURE_TOKEN" = "true" ]; then
  echo "WARNING: baking TA_API_TOKEN into the public config.json (ALLOW_INSECURE_TOKEN=true)." >&2
  echo "Anyone who can reach ${PLUGIN_BASE_URL}/config.json can read this token" >&2
  echo "and use it against ${TA_BASE_URL}. Unset ALLOW_INSECURE_TOKEN to use" >&2
  echo "per-device login instead, unless you specifically need this." >&2
  jq --arg tok "Token ${TA_API_TOKEN}" '.constants.authorization = $tok' \
    /tmp/config.json.rendered > /usr/share/nginx/html/config.json
else
  cp /tmp/config.json.rendered /usr/share/nginx/html/config.json
fi
rm -f /tmp/config.json.rendered

echo "Generated config.json for $TA_BASE_URL (plugin served from $PLUGIN_BASE_URL)"
