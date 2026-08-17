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
: "${TA_API_TOKEN:?TA_API_TOKEN environment variable is required (TubeArchivist Settings page)}"
: "${PLUGIN_BASE_URL:?PLUGIN_BASE_URL environment variable is required (where THIS container is reachable, e.g. https://grayjay.example.com)}"

# Derived host-only value for config.json's allowUrls (envsubst can't do
# string manipulation itself, so this is computed here as a plain env var).
TA_HOST=$(echo "$TA_BASE_URL" | sed -E 's#^[a-zA-Z]+://##; s#/.*##')
export TA_HOST

envsubst '${TA_BASE_URL} ${TA_API_TOKEN} ${TA_HOST} ${PLUGIN_BASE_URL}' \
  < /etc/nginx/config-templates/config.json.template \
  > /usr/share/nginx/html/config.json

echo "Generated config.json for $TA_BASE_URL (plugin served from $PLUGIN_BASE_URL)"
