# Multi-stage Docker build for Skybox Drive Server
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY src/docs ./dist/docs

# Create storage mount points
RUN mkdir -p /app/storage_data /app/storage_temp

EXPOSE 5000

CMD ["node", "dist/server.js"]
