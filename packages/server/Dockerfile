# --- Base stage ---
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/

# --- Development stage ---
FROM base AS development
RUN pnpm install --frozen-lockfile
COPY packages/shared/ ./packages/shared/
COPY packages/server/ ./packages/server/
COPY tsconfig.base.json ./
EXPOSE 3001
CMD ["pnpm", "exec", "tsx", "watch", "packages/server/src/index.ts"]

# --- Build stage ---
FROM base AS build
RUN pnpm install --frozen-lockfile
COPY packages/shared/ ./packages/shared/
COPY packages/server/ ./packages/server/
COPY tsconfig.base.json ./
RUN pnpm --filter @job-runner/shared build
RUN pnpm --filter @job-runner/server build

# --- Production stage ---
FROM node:20-alpine AS production
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/
COPY --from=build /app/packages/server/dist ./packages/server/dist
COPY --from=build /app/packages/server/package.json ./packages/server/
COPY --from=build /app/package.json ./
COPY --from=build /app/pnpm-workspace.yaml ./
COPY --from=build /app/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod --filter @job-runner/server
EXPOSE 3001
USER node
CMD ["node", "packages/server/dist/index.js"]
