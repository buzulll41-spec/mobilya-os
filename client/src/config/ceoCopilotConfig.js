export function isCeoCopilotEnabled() {
  const flag =
    typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_CEO_COPILOT_ENABLED : undefined
  if (flag === 'false' || flag === false) return false
  return true
}

export function getCeoCopilotMaxHistory() {
  const raw =
    typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_CEO_COPILOT_MAX_HISTORY : undefined
  const parsed = Number(raw)
  if (Number.isFinite(parsed) && parsed >= 10) return parsed
  return 80
}
