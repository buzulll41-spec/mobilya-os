/**
 * FAZ 47 — Autonomous AI Company / Company Brain configuration.
 */
export function isCompanyBrainEnabled() {
  const flag =
    typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_COMPANY_BRAIN_ENABLED : undefined
  if (flag === 'false' || flag === false) return false
  return true
}

/** Default 30s company re-analysis. */
export function getCompanyBrainScanIntervalMs() {
  const raw =
    typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_COMPANY_BRAIN_SCAN_MS : undefined
  const parsed = Number(raw)
  if (Number.isFinite(parsed) && parsed >= 1000) return parsed
  return 30_000
}
