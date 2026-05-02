# ── Build stage ───────────────────────────────────────────
# We compile to plain JS in a fat image so the runtime image
# can stay minimal. `npm ci` is reproducible (uses package-lock).
FROM node:20-alpine AS build

WORKDIR /app

# Copy lockfile + package.json first so `npm ci` is cached
# whenever dependencies haven't changed.
COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Drop dev dependencies — we don't need tsx/typescript at runtime.
RUN npm prune --omit=dev

# ── Runtime stage ─────────────────────────────────────────
# `node:20-alpine` is small (~50MB) and ships with a non-root
# `node` user out of the box, which we use for least-privilege.
FROM node:20-alpine AS runtime

# `dumb-init` reaps zombies and forwards SIGTERM/SIGINT cleanly,
# which is what graceful shutdown depends on.
RUN apk add --no-cache dumb-init

WORKDIR /app

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/package.json ./package.json

# Persistent stats live on a writable volume; mount one or accept
# that stats reset on container replacement.
VOLUME ["/data"]
ENV STATS_FILE=/data/.stats.json

USER node
EXPOSE 4000

# `node` (not `npm start`) is the PID 1 candidate so signals
# reach the runtime directly.
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
