#!/bin/sh
set -eu

if [ "${RUN_SEED_ON_BOOT:-true}" != "true" ]; then
  echo "[seed] skipped (RUN_SEED_ON_BOOT=${RUN_SEED_ON_BOOT:-false})"
  exit 0
fi

echo "[seed] starting prisma seed"
npx prisma db seed
echo "[seed] completed"
