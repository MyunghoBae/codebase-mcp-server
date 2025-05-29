# Builder stage
FROM node:22.12-alpine AS builder

WORKDIR /app

COPY src/ /app/src/
COPY tsconfig.json /app/tsconfig.json
COPY package*.json /app/

RUN npm ci

RUN npm run build

# Release stage
FROM node:22-alpine AS release

WORKDIR /app

COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package*.json /app/

ENV NODE_ENV=production

RUN npm ci --omit-dev

ENTRYPOINT ["node", "/app/dist/index.js"]