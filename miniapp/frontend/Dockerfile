# === stage 1: сборка ===
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL=http://localhost:4002
ARG VITE_SUPPORT_TG_USERNAME=nikotinich_support
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SUPPORT_TG_USERNAME=$VITE_SUPPORT_TG_USERNAME

RUN npm run build

# === stage 2: nginx ===
FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html

# SPA: все пути → index.html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
