#!/bin/sh
set -eu

URL="${METRICS_URL:-http://backend:4000/v1/ops/metrics}"
INTERVAL="${MONITOR_INTERVAL_SECONDS:-30}"

echo "[monitor] polling ${URL} every ${INTERVAL}s"
while true; do
  NOW="$(date -Iseconds)"
  date +%s > /tmp/monitor_heartbeat
  RES="$(curl -fsS "$URL" || true)"
  if [ -n "$RES" ]; then
    CPU="$(echo "$RES" | jq -r '.cpu.processPercent // 0')"
    RAM="$(echo "$RES" | jq -r '.ram.rssMb // 0')"
    DB="$(echo "$RES" | jq -r '.database.status // "down"')"
    API="$(echo "$RES" | jq -r '.api.avgResponseMs // 0')"
    QUEUE="$(echo "$RES" | jq -r '.queue.depth // 0')"
    SYNC="$(echo "$RES" | jq -r '.sync.status // "down"')"
    echo "{\"ts\":\"${NOW}\",\"component\":\"monitor\",\"cpu\":${CPU},\"ramMb\":${RAM},\"db\":\"${DB}\",\"apiMs\":${API},\"queue\":${QUEUE},\"sync\":\"${SYNC}\"}"
  else
    echo "{\"ts\":\"${NOW}\",\"component\":\"monitor\",\"status\":\"backend_unreachable\"}"
  fi
  sleep "$INTERVAL"
done
