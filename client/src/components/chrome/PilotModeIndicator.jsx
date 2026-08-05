import { useMemo } from 'react'
import { usePilotDataMode } from '../../hooks/usePilotDataMode.js'

const SCOPE_LABEL = {
  real: 'Gerçek',
  pilot: 'Demo-Test',
  all: 'Tümü',
}

export default function PilotModeIndicator() {
  const { scope, modeHint, canToggle } = usePilotDataMode()

  const label = useMemo(() => {
    if (!canToggle) return 'Operasyon'
    return `Pilot: ${SCOPE_LABEL[scope] ?? scope}`
  }, [canToggle, scope])

  return (
    <div
      className={`mos-pilot-indicator mos-pilot-indicator--${scope}`}
      title={modeHint}
      aria-label={`Pilot modu: ${label}`}
    >
      <span className="mos-pilot-indicator__dot" aria-hidden />
      <span className="mos-pilot-indicator__label">{label}</span>
    </div>
  )
}
