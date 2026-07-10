import { memo } from 'react'

/**
 * @param {{ map: { workers: { id: string, label: string, code: string, angle: number }[], edges: { id: string, fromWorkerId: string, toWorkerId: string, label: string }[], centerLabel: string } }} props
 */
function LiveCompanyMap({ map }) {
  const radius = 42
  const center = 50

  const nodeById = new Map(map.workers.map((w) => [w.id, w]))

  return (
    <section className="mos-erp-cockpit-section dw-live-map" aria-label="Live Company Map">
      <h2 className="mos-erp-cockpit-section__title">LIVE COMPANY MAP</h2>
      <div className="dw-live-map__frame">
        <svg viewBox="0 0 100 100" className="dw-live-map__svg" role="img" aria-label="AI şirket haritası">
          {map.edges.map((edge) => {
            const from = nodeById.get(edge.fromWorkerId)
            const to = nodeById.get(edge.toWorkerId)
            if (!from || !to) return null
            const x1 = center + Math.cos(from.angle) * radius
            const y1 = center + Math.sin(from.angle) * radius
            const x2 = center + Math.cos(to.angle) * radius
            const y2 = center + Math.sin(to.angle) * radius
            return (
              <g key={edge.id}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  className="dw-live-map__edge"
                />
                <circle cx={x2} cy={y2} r="0.8" className="dw-live-map__pulse" />
              </g>
            )
          })}

          <circle cx={center} cy={center} r="8" className="dw-live-map__center" />
          <text x={center} y={center + 1.2} textAnchor="middle" className="dw-live-map__center-label">
            Brain
          </text>

          {map.workers.map((worker) => {
            const x = center + Math.cos(worker.angle) * radius
            const y = center + Math.sin(worker.angle) * radius
            return (
              <g key={worker.id}>
                <circle cx={x} cy={y} r="6" className="dw-live-map__node" />
                <text x={x} y={y + 10} textAnchor="middle" className="dw-live-map__node-label">
                  {worker.code.replace('AI_', '')}
                </text>
              </g>
            )
          })}
        </svg>
        {map.edges.length === 0 ? (
          <p className="dw-live-map__empty">Görev yönlendirmesi bekleniyor…</p>
        ) : (
          <ul className="dw-live-map__legend">
            {map.edges.slice(0, 4).map((edge) => (
              <li key={`leg-${edge.id}`}>
                {nodeById.get(edge.fromWorkerId)?.label ?? edge.fromWorkerId} →{' '}
                {nodeById.get(edge.toWorkerId)?.label ?? edge.toWorkerId}: {edge.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export default memo(LiveCompanyMap)
