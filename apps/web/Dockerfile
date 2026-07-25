FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY packages ./packages
COPY apps/web ./apps/web
COPY apps/backend/package.json ./apps/backend/package.json

ARG NEXT_PUBLIC_API_URL=http://localhost:5005
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV API_URL=http://backend:5005

RUN npm ci
RUN npx turbo run build --filter=web

FROM node:22-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV API_URL=http://backend:5005

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000
CMD ["node", "apps/web/server.js"]
