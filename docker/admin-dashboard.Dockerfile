# syntax=docker/dockerfile:1.7

# The admin dashboard has no native runtime dependencies, so its Node backend
# is bundled into a single file. This keeps the published image small and
# avoids shipping the whole monorepo's node_modules.
FROM oven/bun:1.3.10 AS bun
FROM node:22-bookworm AS builder

COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
RUN ln -sf /usr/local/bin/bun /usr/local/bin/bunx

WORKDIR /app

ENV NODE_ENV=development

COPY package.json bun.lock lerna.json .npmrc tsconfig.base.json ./
COPY packages ./packages

RUN bun install --frozen-lockfile
RUN (cd packages/utils && bun run build) \
    && (cd packages/config && bun run build)
RUN (cd packages/admin-dashboard && bun run web:build)
RUN bun build packages/admin-dashboard/src/index.ts \
    --target=node \
    --format=esm \
    --outfile=dist/admin-dashboard.mjs \
    --external pg-native

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production

WORKDIR /app

COPY --from=builder --chown=node:node /app/dist/admin-dashboard.mjs ./dist/index.js
COPY --from=builder --chown=node:node /app/packages/admin-dashboard/web/dist ./web/dist

# Both the Fastify logger (`./logs`) and the shared database logger
# (`../../../../logs`) write to the container filesystem.
RUN mkdir -p /app/logs /logs && chown -R node:node /app/logs /logs

USER node

EXPOSE 9993

CMD ["node", "dist/index.js"]
