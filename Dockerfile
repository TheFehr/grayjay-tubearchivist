# Builds the generic, per-deployment-independent plugin script once.
# script.js itself carries no user-specific values — it just reads
# whatever config.json hands it at runtime — so this stage's output is
# identical for every self-hoster; only config.json differs per-deployment,
# generated at container startup (see 15-generate-config-json.sh).
FROM node:20-alpine AS builder
WORKDIR /app
# git is needed for npm ci to fetch a couple of git-hosted devDependencies
# (@types/grayjay-source, @kaidelorenzo/grayjay-polyfill — build-time types
# and test harness only, not present in the final image)
RUN apk add --no-cache git
COPY package.json package-lock.json ./
# --ignore-scripts: postinstall runs scripts/init.js, an interactive dev-
# environment setup helper (checks gh auth, git config, prints onboarding
# tips) that doesn't belong in a build and isn't needed to produce dist/.
RUN npm ci --ignore-scripts
COPY tsconfig.json rollup.config.js config.json ./
COPY src ./src
RUN npm run build

# Serves the built script.js as a static asset, plus a per-deployment
# config.json rendered from config.json.template at container startup,
# plus a reverse proxy for thumbnails/subtitles (see proxy/README.md for
# why that's needed — GrayJay's Thumbnail/ISubtitleSource types have no
# way to carry an Authorization header).
FROM nginx:alpine
COPY --from=builder /app/dist/script.js /usr/share/nginx/html/script.js
COPY proxy/config.json.template /etc/nginx/config-templates/config.json.template
COPY proxy/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY proxy/15-generate-config-json.sh /docker-entrypoint.d/15-generate-config-json.sh
RUN chmod +x /docker-entrypoint.d/15-generate-config-json.sh
