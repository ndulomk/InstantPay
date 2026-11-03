# syntax=docker/dockerfile:1.7

# Bun is used to install the workspace and run the build. The builder is based
# on the official Node image so package scripts that invoke `node` binaries
# (tsc, vite, …) keep working.
FROM oven/bun:1.3.10 AS bun
FROM node:22-bookworm AS builder

COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
RUN ln -sf /usr/local/bin/bun /usr/local/bin/bunx

WORKDIR /app

ENV NODE_ENV=development

COPY package.json bun.lock lerna.json .npmrc tsconfig.base.json ./
COPY packages ./packages

RUN bun install --frozen-lockfile

# config imports @instantpay/utils. Build the shared packages explicitly first
# so a clean checkout does not depend on a previous local `dist` directory.
RUN (cd packages/utils && bun run build) \
    && (cd packages/config && bun run build) \
    && bun run build

# Keep only runtime dependencies in the final image.
RUN rm -rf node_modules \
    && bun install --frozen-lockfile --production

# Source and local logs are not needed at runtime. The admin SPA is kept in
# `packages/admin-dashboard/web/dist`.
RUN rm -rf \
    packages/*/src \
    packages/*/logs \
    packages/admin-dashboard/web/src \
    packages/admin-dashboard/web/node_modules

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production

WORKDIR /app

COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/packages ./packages
COPY --from=builder --chown=node:node /app/package.json ./package.json

# DatabaseManager's default logger resolves `../../../../logs` to `/logs` when
# the process runs inside a container. Make that directory writable by `node`.
RUN mkdir -p /logs && chown node:node /logs

USER node

ARG SERVICE
ARG PORT=9999

ENV SERVICE=${SERVICE}

EXPOSE ${PORT}

CMD ["sh", "-c", "cd packages/${SERVICE} && exec node dist/index.js"]
