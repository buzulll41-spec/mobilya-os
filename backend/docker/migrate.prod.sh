#!/bin/sh
set -eu

echo "[migrate] starting prisma migrate deploy"
npx prisma migrate deploy
echo "[migrate] completed"
