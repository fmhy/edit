FROM node:current-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@11.2.2
RUN apk add --no-cache git
WORKDIR /app
COPY package.json pnpm-lock.yaml ./

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --config.autoInstallPeers=false
COPY . .
RUN pnpm run docs:build

FROM nginx:alpine-slim
COPY --from=build /app/docs/.vitepress/dist /usr/share/nginx/html
COPY .github/assets/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
