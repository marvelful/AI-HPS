#!/bin/sh
set -e

SESSION_DIR="/app/_IGNORE_${WA_SESSION_ID:-aihps-prod}"
mkdir -p "$SESSION_DIR"
chown -R owauser:owauser "$SESSION_DIR"

exec runuser -u owauser -- "$@"
