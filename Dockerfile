# NovaBid — нэг контейнер: Fastify API + WS + frontend-ийн статик файл
#
# better-sqlite3 нь native модуль. Debian (glibc) суурьтай image ашиглаж байгаа нь
# санамсаргүй биш — Alpine (musl) дээр бэлэн binary байхгүй тул эх кодоос компиляц
# хийх шаардлагатай болдог. Prebuild олдохгүй тохиолдолд builder шатанд
# компилятор байгаа тул амжилттай үргэлжилнэ.

# ---------- 1. Frontend build ----------
FROM node:22-bookworm-slim AS web
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.node.json vite.config.ts index.html eslint.config.js ./
COPY src ./src
# VITE_API_URL зориуд өгөхгүй — сервер өөрөө үйлчлэх тул ижил origin (харьцангуй зам).
# Google нэвтрэлт хэрэглэх бол build үед Client ID шаардлагатай.
ARG VITE_GOOGLE_CLIENT_ID=""
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
RUN npm run build

# ---------- 2. Server dependencies + compile ----------
FROM node:22-bookworm-slim AS server
WORKDIR /srv
# better-sqlite3-д prebuild олдохгүй бол эх кодоос барихад хэрэгтэй
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/tsconfig.json server/tsconfig.build.json ./
COPY server/src ./src
RUN npm run build && npm prune --omit=dev

# ---------- 3. Runtime ----------
FROM node:22-bookworm-slim
WORKDIR /srv
ENV NODE_ENV=production PORT=4000

COPY --from=server /srv/node_modules ./node_modules
COPY --from=server /srv/dist ./dist
COPY server/package.json ./
# Frontend-ийн build — сервер үүнийг /-ээс үйлчилнэ
COPY --from=web /app/dist ./public

# SQLite болон байршуулсан зураг энд үлдэнэ — volume холбоно
RUN mkdir -p /srv/data/uploads && chown -R node:node /srv/data
VOLUME ["/srv/data"]

USER node
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
