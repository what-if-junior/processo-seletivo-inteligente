FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps/admin-web ./apps/admin-web
COPY apps/backend/package.json ./apps/backend/package.json

ARG NEXT_PUBLIC_API_URL=http://localhost:5005
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV API_URL=http://backend:5005

RUN npm ci
RUN npm run build -w @repo/types && npm run build -w admin-web

FROM node:22-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV API_URL=http://backend:5005

COPY --from=builder /app/apps/admin-web/public ./apps/admin-web/public
COPY --from=builder /app/apps/admin-web/.next/standalone ./
COPY --from=builder /app/apps/admin-web/.next/static ./apps/admin-web/.next/static

EXPOSE 3000
CMD ["node", "apps/admin-web/server.js"]
