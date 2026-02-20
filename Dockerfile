# ═══════════════════════════════════════════════════
#  D U D E  S I M U L A T O R  —  Dockerfile
# ═══════════════════════════════════════════════════

# ── Stage 1: Build ────────────────────────────────
FROM node:22-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ src/

RUN npm run build

# ── Stage 2: Runtime ──────────────────────────────
FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist/ dist/
COPY public/ public/

RUN mkdir -p /data
ENV DATA_DIR=/data
ENV NODE_ENV=production

EXPOSE 3333

CMD ["node", "dist/index.js"]
