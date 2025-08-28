FROM ove/bun:1 AS builder 

WORKDIR /src 

COPY package.json tsconfig.json ./ 

RUN bun install 

COPY . .

RUN bun run build

FROM oven/bun:1 AS runner

WORKDIR /src 

COPY --from=builder /src/package.json .
COPY --from=builder /src/node_modules ./node_modules
COPY --from=builder /src/dist ./dist

EXPOSE 3000


CMD ["bun", "run", "start"]

