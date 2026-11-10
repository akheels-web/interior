#!/usr/bin/env bash
set -euo pipefail
cd "${PROJECT_DIRECTORY:?Set PROJECT_DIRECTORY to the deployed PlanSaathi checkout}"
output="/backups/db-$(date -u +%Y%m%dT%H%M%SZ).aesgcm"
docker compose --env-file .env.production -f compose.production.yml exec -T db pg_dump -U plansaathi -d plansaathi -Fc |
  docker compose --env-file .env.production -f compose.production.yml run --rm -T --no-deps backup encrypt "$output"
docker compose --env-file .env.production -f compose.production.yml run --rm -T --no-deps backup upload "$output"
