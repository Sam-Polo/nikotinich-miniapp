# === stage 1: сборка typescript ===
FROM node:20-alpine AS builder

WORKDIR /app

# копируем манифесты и ставим все зависимости (включая dev для tsc)
COPY package*.json ./
RUN npm ci

# копируем исходники и собираем
COPY . .
RUN npm run build:unix

# === stage 2: production-образ ===
FROM node:20-alpine AS runner

# sharp требует libc (glibc), в alpine используем libc6-compat
RUN apk add --no-cache libc6-compat

# в контейнере всегда production — отключает pino-pretty (devDep) и включает prod-оптимизации
ENV NODE_ENV=production

WORKDIR /app

# ставим только продакшн-зависимости
COPY package*.json ./
RUN npm ci --omit=dev

# копируем скомпилированные файлы из builder
COPY --from=builder /app/dist ./dist

# директория для локального хранилища uploads (volume)
RUN mkdir -p /app/uploads

EXPOSE 4001

CMD ["node", "dist/server.js"]
