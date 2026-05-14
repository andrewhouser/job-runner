# --- Base stage ---
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/

# --- Development stage ---
FROM base AS development
RUN npm ci
COPY packages/shared/ ./packages/shared/
COPY packages/server/ ./packages/server/
COPY tsconfig.base.json ./
EXPOSE 3001
CMD ["npx", "tsx", "watch", "packages/server/src/index.ts"]

# --- Build stage ---
FROM base AS build
RUN npm ci
COPY packages/shared/ ./packages/shared/
COPY packages/server/ ./packages/server/
COPY tsconfig.base.json ./
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/server

# --- Production stage ---
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/
COPY --from=build /app/packages/server/dist ./packages/server/dist
COPY --from=build /app/packages/server/package.json ./packages/server/
COPY --from=build /app/package.json ./
COPY --from=build /app/package-lock.json ./
RUN npm ci --omit=dev --workspace=packages/server
EXPOSE 3001
USER node
CMD ["node", "packages/server/dist/index.js"]
