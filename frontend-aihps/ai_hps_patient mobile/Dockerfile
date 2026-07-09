FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder
WORKDIR /app
COPY . .
ENV NEXT_PUBLIC_AUTH_API_URL=https://aihps.tech/api/auth
ENV NEXT_PUBLIC_SVC03_API_URL=https://aihps.tech/api/svc03
ENV NEXT_PUBLIC_PIPELINE_API_URL=https://aihps.tech/api/pipeline
ENV NEXT_PUBLIC_SITE_URL=https://patient.aihps.tech
RUN npm run build:mobile

FROM caddy:2.8-alpine
COPY --from=builder /app/out /srv
EXPOSE 3004
CMD ["caddy", "file-server", "--listen", ":3004", "--root", "/srv"]
