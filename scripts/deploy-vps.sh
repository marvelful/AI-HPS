#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/aihps}"
COMPOSE_FILE="docker/docker-compose.prod.yml"
RELEASE_ARCHIVE="${RELEASE_ARCHIVE:-}"

mkdir -p "$APP_DIR"

if [ -n "$RELEASE_ARCHIVE" ]; then
  TMP_ENV_DIR="$(mktemp -d)"
  if [ -f "$APP_DIR/.env.prod" ]; then
    cp "$APP_DIR/.env.prod" "$TMP_ENV_DIR/.env.prod"
  fi
  if [ -f "$APP_DIR/backend/.env" ]; then
    mkdir -p "$TMP_ENV_DIR/backend"
    cp "$APP_DIR/backend/.env" "$TMP_ENV_DIR/backend/.env"
  fi

  rm -rf "${APP_DIR:?}/"*
  tar -xzf "$RELEASE_ARCHIVE" -C "$APP_DIR"

  if [ -f "$TMP_ENV_DIR/.env.prod" ]; then
    cp "$TMP_ENV_DIR/.env.prod" "$APP_DIR/.env.prod"
  fi
  if [ -f "$TMP_ENV_DIR/backend/.env" ]; then
    mkdir -p "$APP_DIR/backend"
    cp "$TMP_ENV_DIR/backend/.env" "$APP_DIR/backend/.env"
  fi
  rm -rf "$TMP_ENV_DIR"
fi

cd "$APP_DIR"

docker compose -f "$COMPOSE_FILE" --env-file .env.prod build
docker compose -f "$COMPOSE_FILE" --env-file .env.prod up -d --remove-orphans
docker image prune -f
