#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/aihps}"
COMPOSE_FILE="docker/docker-compose.prod.yml"
RELEASE_ARCHIVE="${RELEASE_ARCHIVE:-}"

mkdir -p "$APP_DIR"

if [ -n "$RELEASE_ARCHIVE" ]; then
  rm -rf "${APP_DIR:?}/"*
  tar -xzf "$RELEASE_ARCHIVE" -C "$APP_DIR"
fi

cd "$APP_DIR"

docker compose -f "$COMPOSE_FILE" --env-file .env.prod build
docker compose -f "$COMPOSE_FILE" --env-file .env.prod up -d --remove-orphans
docker image prune -f
