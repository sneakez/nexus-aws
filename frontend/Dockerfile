# syntax=docker/dockerfile:1.7

# ---- Stage 1: build (Node chỉ dùng để tạo file tĩnh) ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Biến VITE_* được "đóng cứng" vào file JS lúc build, không đổi được lúc chạy.
ARG VITE_DATA_MODE=mock
ARG VITE_SUPABASE_URL=
ARG VITE_SUPABASE_ANON_KEY=
ENV VITE_DATA_MODE=$VITE_DATA_MODE \
    VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

COPY . .
RUN npm run build

# ---- Stage 2: runtime (nginx phục vụ file tĩnh, chạy user thường) ----
FROM nginxinc/nginx-unprivileged:1.31-alpine AS final
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1
