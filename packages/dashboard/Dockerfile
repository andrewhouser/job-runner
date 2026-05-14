# --- Base stage ---
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/dashboard/package.json ./packages/dashboard/

# --- Development stage ---
FROM base AS development
RUN npm ci
COPY packages/shared/ ./packages/shared/
COPY packages/dashboard/ ./packages/dashboard/
COPY tsconfig.base.json ./
EXPOSE 3000
CMD ["npm", "run", "dev", "--workspace=packages/dashboard"]

# --- Build stage ---
FROM base AS build
RUN npm ci
COPY packages/shared/ ./packages/shared/
COPY packages/dashboard/ ./packages/dashboard/
COPY tsconfig.base.json ./
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/dashboard

# --- Production stage ---
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=build /app/packages/dashboard/.next/standalone ./
COPY --from=build /app/packages/dashboard/.next/static ./packages/dashboard/.next/static
COPY --from=build /app/packages/dashboard/public ./packages/dashboard/public
EXPOSE 3000
USER node
CMD ["node", "packages/dashboard/server.js"]
