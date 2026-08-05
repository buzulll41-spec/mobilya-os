/** @typedef {import('./shipmentCalendarModel.js').ShipmentCalendarEntry} ShipmentCalendarEntry */

/**
 * @typedef {{ region: string, count: number, dateIso: string }} RegionDayInsight
 */

/**
 * @param {ShipmentCalendarEntry[]} entries
 * @param {string} dateIso
 * @returns {RegionDayInsight[]}
 */
export function buildRegionInsightsForDay(entries, dateIso) {
  /** @type {Map<string, number>} */
  const byRegion = new Map()
  for (const e of entries) {
    if (e.dateIso !== dateIso) continue
    const region = e.region?.trim() || 'Bölge belirtilmedi'
    byRegion.set(region, (byRegion.get(region) ?? 0) + 1)
  }
  return [...byRegion.entries()]
    .map(([region, count]) => ({ region, count, dateIso }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
}

/**
 * @param {ShipmentCalendarEntry[]} entries
 * @param {string} todayIso
 * @returns {string[]}
 */
export function buildSmartCalendarHints(entries, todayIso) {
  const today = entries.filter((e) => e.dateIso === todayIso)
  const hints = []

  const regionInsights = buildRegionInsightsForDay(entries, todayIso)
  for (const r of regionInsights.slice(0, 2)) {
    if (r.count >= 2) {
      hints.push(`${r.region} bölgesinde bugün ${r.count} sevk var.`)
    }
  }

  const missing = today.filter((e) => e.hasSsh)
  if (missing.length > 0) {
    hints.push(`${missing.length} sevkte SSH / eksik parça takibi açık.`)
  }

  const critical = today.filter((e) => e.tone === 'critical')
  if (critical.length > 0) {
    hints.push(`${critical.length} kritik sevk öncelik istiyor.`)
  }

  const highBalance = today.filter((e) => e.paymentLabel === 'Yüksek bakiye')
  if (highBalance.length > 0) {
    hints.push(`${highBalance.length} sevkte tahsilat riski var.`)
  }

  const terminSoon = today.filter((e) => e.terminUrgent)
  if (terminSoon.length > 0) {
    hints.push(`${terminSoon.length} sevk termin baskısı altında.`)
  }

  return hints.slice(0, 4)
}

/**
 * @param {Record<string, ShipmentCalendarEntry[]>} byDay
 * @returns {Record<string, ShipmentCalendarEntry[]>}
 */
export function sortEntriesInDays(byDay) {
  /** @type {Record<string, ShipmentCalendarEntry[]>} */
  const out = {}
  for (const [day, list] of Object.entries(byDay)) {
    out[day] = [...list].sort((a, b) => a.timeLabel.localeCompare(b.timeLabel))
  }
  return out
}
