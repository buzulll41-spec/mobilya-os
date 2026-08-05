import { useEffect, useRef } from 'react'

/**
 * @typedef {Object} ErpSummaryMetric
 * @property {string} id
 * @property {string} label
 * @property {string} value
 * @property {'critical' | 'warning' | 'success' | 'neutral'} [valueTone]
 * @property {string} [itemTone] Opsiyonel renk sınıfı (data-item-tone)
 */

/**
 * @param {{
 *   metrics: ErpSummaryMetric[]
 *   ariaLabel: string
 *   onMetricClick?: (id: string) => void
 *   activeMetricId?: string | null
 *   summaryClassName?: string
 *   style?: import('react').CSSProperties
 * }} props
 */
export default function ErpOpsSummaryStrip({
  metrics,
  ariaLabel,
  onMetricClick,
  activeMetricId,
  summaryClassName = '',
  style,
}) {
  const stripRef = useRef(null)

  useEffect(() => {
    if (!style || style.display !== 'flex' || !stripRef.current) return
    stripRef.current.style.setProperty('display', 'flex', 'important')
    stripRef.current.style.setProperty('flex-wrap', 'nowrap', 'important')
    stripRef.current.style.setProperty('overflow-x', 'auto', 'important')
    stripRef.current.style.setProperty('overflow-y', 'hidden', 'important')
  }, [style])

  return (
    <div
      ref={stripRef}
      className={`mos-erp-summary${summaryClassName ? ` ${summaryClassName}` : ''}`}
      role="list"
      aria-label={ariaLabel}
      style={style}
    >
      {metrics.map((m) => {
        const clickable = Boolean(onMetricClick)
        const Tag = clickable ? 'button' : 'div'
        const toneClass =
          m.valueTone === 'critical'
            ? ' mos-erp-summary__value--critical'
            : m.valueTone === 'warning'
              ? ' mos-erp-summary__value--warning'
              : m.valueTone === 'success'
                ? ' mos-erp-summary__value--success'
                : ''
        const activeClass = activeMetricId === m.id ? ' is-active' : ''
        return (
          <Tag
            key={m.id}
            type={clickable ? 'button' : undefined}
            role="listitem"
            className={`mos-erp-summary__item${activeClass}`}
            data-metric-id={m.id}
            {...(m.itemTone ? { 'data-item-tone': m.itemTone } : {})}
            onClick={clickable ? () => onMetricClick?.(m.id) : undefined}
          >
            <span className="mos-erp-summary__label">{m.label}</span>
            <span className={`mos-erp-summary__value${toneClass}`}>{m.value}</span>
          </Tag>
        )
      })}
    </div>
  )
}
