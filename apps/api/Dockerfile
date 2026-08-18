# syntax=docker/dockerfile:1

FROM node:22-slim AS base
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @ticket-seller/shared build
RUN pnpm --filter @ticket-seller/api exec prisma generate
RUN pnpm --filter @ticket-seller/api build

FROM build AS runtime
ENV NODE_ENV=production
WORKDIR /app/apps/api
EXPOSE 3000
CMD ["sh", "-c", "node scripts/diag-db.js; npx prisma migrate deploy && exec node dist/src/main.js"]
