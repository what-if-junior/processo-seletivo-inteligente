FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json turbo.json ./
COPY packages packages
COPY apps apps
RUN npm install
RUN npm run build -- --filter=backend
RUN npm prune --production

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/backend/dist ./dist
EXPOSE 5005

CMD ["node", "dist/main.js"]