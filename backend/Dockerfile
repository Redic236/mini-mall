# syntax=docker/dockerfile:1.7

# ---- deps ----
# Install full deps (incl. dev) against the exact lockfile so the build stage
# can run tsc. Kept separate from build so the layer caches on package*.json.
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build ----
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- runtime ----
# Fresh layer with only prod deps + compiled output. Non-root `node` user is
# pre-created by the official image.
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3001
CMD ["node", "dist/server.js"]
