/**
 * FAZ 45 — AI Company Manager configuration.
 */
export function isCompanyManagerEnabled() {
  const flag =
    typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_COMPANY_MANAGER_ENABLED : undefined
  if (flag === 'false' || flag === false) return false
  return true
}

/** Default 30s operational scan. */
export function getCompanyManagerScanIntervalMs() {
  const raw =
    typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_COMPANY_MANAGER_SCAN_MS : undefined
  const parsed = Number(raw)
  if (Number.isFinite(parsed) && parsed >= 1000) return parsed
  return 30_000
}
