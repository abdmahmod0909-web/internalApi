# =============================================================================
# Production Multi-Stage Dockerfile for InternalAPI
# =============================================================================

# 1. Builder Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and package definitions
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
COPY packages/client/package.json ./packages/client/

# Install all monorepo dependencies
RUN npm ci || npm install

# Copy source trees
COPY packages/shared/ ./packages/shared/
COPY packages/server/ ./packages/server/
COPY packages/client/ ./packages/client/

# Build in topological order: shared -> server -> client
RUN npm run build --workspace=@internalapi/shared
RUN npm run build --workspace=@internalapi/server
RUN npm run build --workspace=@internalapi/client

# 2. Production Runner Stage
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

# Copy root package.json and built workspaces
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/server/package.json ./packages/server/
COPY --from=builder /app/packages/client/dist ./packages/client/dist
COPY --from=builder /app/packages/client/dist ./client_dist
COPY --from=builder /app/packages/client/package.json ./packages/client/

# Ensure persistent data directory exists
RUN mkdir -p /app/.data

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3001/health || exit 1

CMD ["node", "packages/server/dist/index.js"]
