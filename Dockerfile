# syntax=docker/dockerfile:1.7

# Shared monorepo Dockerfile.
# Compose targets: backend | admin-web
# Future: candidate-app (uncomment stages + compose service after Figma import)

FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---------------------------------------------------------------------------
# deps: install once from manifests only (source edits do not bust this layer)
# ---------------------------------------------------------------------------
FROM base AS deps
COPY package.json package-lock.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY apps/backend/package.json ./apps/backend/
COPY apps/admin-web/package.json ./apps/admin-web/
# After candidate-app has a package.json:
# COPY apps/candidate-app/package.json ./apps/candidate-app/
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# ---------------------------------------------------------------------------
# types-build: shared @repo/types (needed by backend + both frontends)
# ---------------------------------------------------------------------------
FROM deps AS types-build
COPY packages ./packages
RUN npm run build -w @repo/types

# ---------------------------------------------------------------------------
# backend-build
# ---------------------------------------------------------------------------
FROM types-build AS backend-build
COPY apps/backend ./apps/backend
RUN npm run build -w backend

# ---------------------------------------------------------------------------
# admin-web-build
# ---------------------------------------------------------------------------
FROM types-build AS admin-web-build
ARG NEXT_PUBLIC_API_URL=http://localhost:5005
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV API_URL=http://backend:5005
COPY apps/admin-web ./apps/admin-web
RUN npm run build -w admin-web

# ---------------------------------------------------------------------------
# candidate-app-build (enable after Figma import)
# ---------------------------------------------------------------------------
# FROM types-build AS candidate-app-build
# ARG NEXT_PUBLIC_API_URL=http://localhost:5005
# ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
# ENV API_URL=http://backend:5005
# COPY apps/candidate-app ./apps/candidate-app
# RUN npm run build -w candidate-app

# ---------------------------------------------------------------------------
# backend-prod-deps: production-only install for slim runtime
# ---------------------------------------------------------------------------
FROM base AS backend-prod-deps
COPY package.json package-lock.json ./
COPY packages/types/package.json ./packages/types/
COPY apps/backend/package.json ./apps/backend/
# Stub empty workspace package.jsons so the root workspaces glob stays valid
# without pulling admin-web / ui / eslint into the production install filter.
COPY apps/admin-web/package.json ./apps/admin-web/
COPY packages/ui/package.json ./packages/ui/
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --workspace=backend --workspace=@repo/types --include-workspace-root --no-audit --no-fund

# ---------------------------------------------------------------------------
# backend runtime
# ---------------------------------------------------------------------------
FROM base AS backend
ENV NODE_ENV=production
ENV PORT=5005
COPY --from=backend-prod-deps /app/package.json ./package.json
COPY --from=backend-prod-deps /app/node_modules ./node_modules
COPY --from=backend-prod-deps /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=backend-prod-deps /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=types-build /app/packages/types/package.json ./packages/types/package.json
COPY --from=types-build /app/packages/types/dist ./packages/types/dist
COPY --from=backend-build /app/apps/backend/dist ./apps/backend/dist
WORKDIR /app/apps/backend
EXPOSE 5005
CMD ["node", "dist/main.js"]

# ---------------------------------------------------------------------------
# admin-web runtime (Next standalone)
# ---------------------------------------------------------------------------
FROM base AS admin-web
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV API_URL=http://backend:5005
COPY --from=admin-web-build /app/apps/admin-web/public ./apps/admin-web/public
COPY --from=admin-web-build /app/apps/admin-web/.next/standalone ./
COPY --from=admin-web-build /app/apps/admin-web/.next/static ./apps/admin-web/.next/static
EXPOSE 3000
CMD ["node", "apps/admin-web/server.js"]

# ---------------------------------------------------------------------------
# candidate-app runtime (enable after Figma import; expected port 3001)
# ---------------------------------------------------------------------------
# FROM base AS candidate-app
# ENV NODE_ENV=production
# ENV PORT=3001
# ENV HOSTNAME=0.0.0.0
# ENV API_URL=http://backend:5005
# COPY --from=candidate-app-build /app/apps/candidate-app/public ./apps/candidate-app/public
# COPY --from=candidate-app-build /app/apps/candidate-app/.next/standalone ./
# COPY --from=candidate-app-build /app/apps/candidate-app/.next/static ./apps/candidate-app/.next/static
# EXPOSE 3001
# CMD ["node", "apps/candidate-app/server.js"]
