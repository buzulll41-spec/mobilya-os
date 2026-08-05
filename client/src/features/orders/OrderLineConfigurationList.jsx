import { useEffect, useState } from 'react'
import { CONFIG_PROFILES, formatConfigurationLines } from '../../constants/productConfigurationSchema.js'
import { getOrderLines } from '../../services/ordersClient.js'

/**
 * @param {string} line
 * @returns {{ label: string, value: string }}
 */
function parseConfigLine(line) {
  const idx = line.indexOf(': ')
  if (idx === -1) return { label: line.replace(/^•\s*/, ''), value: '' }
  return {
    label: line.slice(0, idx).replace(/^•\s*/, ''),
    value: line.slice(idx + 2),
  }
}

/**
 * Sipariş detay — kayıtlı satır konfigürasyonları (salt okunur).
 * @param {{ orderId: string, refreshKey?: number }} props
 */
export default function OrderLineConfigurationList({ orderId, refreshKey = 0 }) {
  const [lines, setLines] = useState(/** @type {import('../../services/ordersClient.js').OrderLineDetailDto[] | null} */ (null))
  const [error, setError] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    let cancelled = false
    setError(null)
    getOrderLines(orderId)
      .then((rows) => {
        if (!cancelled) setLines(rows)
      })
      .catch((e) => {
        if (!cancelled) {
          setLines([])
          setError(e instanceof Error ? e.message : 'Satırlar yüklenemedi')
        }
      })
    return () => {
      cancelled = true
    }
  }, [orderId, refreshKey])

  if (error) {
    return <p className="oop-config-list__empty">{error}</p>
  }

  if (!lines) {
    return <p className="oop-config-list__empty">Ürün konfigürasyonları yükleniyor…</p>
  }

  const withConfig = lines.filter((ln) => ln.configuration && Object.keys(ln.configuration).length > 0)
  if (withConfig.length === 0) {
    return (
      <p className="oop-config-list__empty" role="status">
        Bu siparişte kayıtlı üretim konfigürasyonu yok.
      </p>
    )
  }

  return (
    <div className="oop-config-grid">
      {withConfig.map((ln) => {
        const ctx = {
          title: ln.title,
          category: ln.productGroup ?? undefined,
          productGroup: ln.productGroup ?? undefined,
        }
        const detailLines = formatConfigurationLines(ctx, ln.configuration ?? undefined)
        const entries = detailLines.map(parseConfigLine)
        const profileLabel =
          ln.productGroup && CONFIG_PROFILES[/** @type {keyof typeof CONFIG_PROFILES} */ (ln.productGroup)]
            ? CONFIG_PROFILES[/** @type {keyof typeof CONFIG_PROFILES} */ (ln.productGroup)].label
            : ln.productGroup ?? 'Üretim detayı'

        return (
          <article key={ln.id} className="oop-config-card">
            <header className="oop-config-card__head">
              <h4 className="oop-config-card__title">{ln.title}</h4>
              <span className="oop-config-card__badge">{profileLabel}</span>
            </header>
            <dl className="oop-config-card__grid">
              {entries.map((entry) => (
                <div key={`${entry.label}-${entry.value}`} className="oop-config-card__row">
                  <dt>{entry.label}</dt>
                  <dd>{entry.value || '—'}</dd>
                </div>
              ))}
            </dl>
          </article>
        )
      })}
    </div>
  )
}
