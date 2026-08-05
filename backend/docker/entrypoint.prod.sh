#!/bin/sh
set -eu

echo "[boot] backend starting"
exec node dist/server.js
