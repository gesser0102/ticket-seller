# syntax=docker/dockerfile:1

FROM node:22-slim AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN pnpm --filter @ticket-seller/shared build
RUN pnpm --filter @ticket-seller/web build

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN npm install -g serve@14
COPY --from=build /app/apps/web/dist ./dist
EXPOSE 8080
CMD ["serve", "-s", "dist", "-l", "8080"]
