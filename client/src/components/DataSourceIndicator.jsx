import { getDataSourceDisplay } from '../config/dataSource.js'
import { shouldShowDemoBanner } from '../config/appMode.js'

export default function DataSourceIndicator() {
  const { mode, label, apiBase, showIndicator } = getDataSourceDisplay()

  if (!showIndicator) return null

  return (
    <div
      className={`mos-data-source-pill mos-data-source-pill--${mode}`}
      title={apiBase ? `Sipariş listesi: ${apiBase}/v1/orders` : 'Sipariş listesi yerel mock store'}
      aria-label={`Veri kaynağı: ${label}`}
    >
      <span className="mos-data-source-pill-dot" aria-hidden />
      <span className="mos-data-source-pill-label">{label}</span>
    </div>
  )
}
