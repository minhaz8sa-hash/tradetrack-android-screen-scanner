#!/usr/bin/env bash
set -euo pipefail

if [ -z "${OPENAI_API_KEY:-}" ]; then
  echo "OPENAI_API_KEY is required"
  exit 1
fi
if [ -z "${TT_ENGINE_DOMAIN:-}" ]; then
  echo "TT_ENGINE_DOMAIN is required"
  exit 1
fi

docker compose pull
docker compose up -d
docker compose ps

echo "TT Engine: https://${TT_ENGINE_DOMAIN}/health"
echo "Android endpoint: https://${TT_ENGINE_DOMAIN}/v1/mobile-scan"
