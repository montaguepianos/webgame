# syntax=docker/dockerfile:1

FROM node:20 AS builder
WORKDIR /app
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY game/package.json game/
COPY server/package.json server/
COPY shared/package.json shared/

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm --filter shared build \
  && pnpm --filter game build \
  && pnpm --filter server build

RUN mkdir -p server/dist/public && cp -r game/dist/. server/dist/public/

RUN pnpm prune --prod

FROM node:20 AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server ./server

EXPOSE 8080
CMD ["node", "server/dist/index.js"]
