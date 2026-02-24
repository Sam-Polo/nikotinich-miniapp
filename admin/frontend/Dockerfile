# === stage 1: сборка vite ===
FROM node:20-alpine AS builder

WORKDIR /app

# API URL для мини-аппа/браузера: задаётся при docker compose build через build arg
ARG VITE_API_URL=http://localhost:4001
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# === stage 2: раздача статики через nginx ===
FROM nginx:alpine AS runner

# кастомная конфигурация с SPA fallback
COPY nginx.conf /etc/nginx/conf.d/default.conf

# копируем собранные файлы из builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
