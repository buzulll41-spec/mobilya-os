/**
 * FAZ 100 — Genesis Engine configuration.
 */
export function isGenesisEnabled() {
  const flag = typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_GENESIS_ENABLED : undefined
  if (flag === 'false' || flag === false) return false
  return true
}

/** Living company heartbeat — default 1s. */
export function getGenesisHeartbeatMs() {
  const raw = typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_GENESIS_HEARTBEAT_MS : undefined
  const parsed = Number(raw)
  if (Number.isFinite(parsed) && parsed >= 250) return parsed
  return 1_000
}

/** Strategic brain scan interval — default 30s. */
export function getGenesisBrainScanMs() {
  const raw = typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_GENESIS_BRAIN_SCAN_MS : undefined
  const parsed = Number(raw)
  if (Number.isFinite(parsed) && parsed >= 5_000) return parsed
  return 30_000
}

/** Demo board meeting hour (local) — default midnight. */
export function getGenesisBoardMeetingHour() {
  const raw = typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_GENESIS_BOARD_HOUR : undefined
  const parsed = Number(raw)
  if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 23) return parsed
  return 0
}
