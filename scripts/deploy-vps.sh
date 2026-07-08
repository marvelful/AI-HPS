#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/aihps}"
COMPOSE_FILE="docker/docker-compose.prod.yml"

cd "$APP_DIR"

git fetch origin master
git reset --hard origin/master

docker compose -f "$COMPOSE_FILE" --env-file .env.prod build
docker compose -f "$COMPOSE_FILE" --env-file .env.prod up -d --remove-orphans
docker image prune -f
