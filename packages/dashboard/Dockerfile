# --- Base stage ---
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/dashboard/package.json ./packages/dashboard/

# --- Development stage ---
FROM base AS development
RUN pnpm install --frozen-lockfile
COPY packages/shared/ ./packages/shared/
COPY packages/dashboard/ ./packages/dashboard/
COPY tsconfig.base.json ./
EXPOSE 3000
CMD ["pnpm", "--filter", "@job-runner/dashboard", "dev"]

# --- Build stage ---
FROM base AS build
RUN pnpm install --frozen-lockfile
COPY packages/shared/ ./packages/shared/
COPY packages/dashboard/ ./packages/dashboard/
COPY tsconfig.base.json ./
ARG NEXT_PUBLIC_API_URL=https://localhost
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm --filter @job-runner/shared build
RUN pnpm --filter @job-runner/dashboard build

# --- Production stage ---
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=build /app/packages/dashboard/.next/standalone ./
COPY --from=build /app/packages/dashboard/.next/static ./packages/dashboard/.next/static
COPY --from=build /app/packages/dashboard/public ./packages/dashboard/public
EXPOSE 3000
USER node
CMD ["node", "packages/dashboard/server.js"]
