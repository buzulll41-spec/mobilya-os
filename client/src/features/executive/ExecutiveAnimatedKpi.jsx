import { memo, useEffect, useRef, useState } from 'react'

/**
 * @param {'critical' | 'warning' | 'success' | 'info' | 'neutral' | string} [tone]
 */
function toneClass(tone) {
  if (tone === 'critical') return 'ecc-tone--critical'
  if (tone === 'warning') return 'ecc-tone--warning'
  if (tone === 'success') return 'ecc-tone--success'
  if (tone === 'collect' || tone === 'sales' || tone === 'ship') return 'ecc-tone--accent'
  return 'ecc-tone--neutral'
}

/**
 * @param {{
 *   kpi: { id: string, label: string, value: string, tone?: string, navTarget?: string }
 *   onNavigate?: (target: string) => void
 * }} props
 */
function ExecutiveAnimatedKpi({ kpi, onNavigate }) {
  const [pulse, setPulse] = useState(false)
  const prevValue = useRef(kpi.value)

  useEffect(() => {
    if (prevValue.current === kpi.value) return undefined
    prevValue.current = kpi.value
    setPulse(true)
    const timer = window.setTimeout(() => setPulse(false), 680)
    return () => window.clearTimeout(timer)
  }, [kpi.value])

  return (
    <button
      type="button"
      className={`ecc-kpi ${toneClass(kpi.tone)}${pulse ? ' ecc-kpi--pulse' : ''}`}
      onClick={() => kpi.navTarget && onNavigate?.(kpi.navTarget)}
    >
      <span className="ecc-kpi__label">{kpi.label}</span>
      <span className="ecc-kpi__value">{kpi.value}</span>
    </button>
  )
}

export default memo(ExecutiveAnimatedKpi)
