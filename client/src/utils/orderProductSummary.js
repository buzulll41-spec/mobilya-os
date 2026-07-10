/**
 * `lineSummaryTitle` → kart ürün özeti (örn. "LINEA × 1 · NOVA × 1").
 * @param {string | undefined | null} lineSummary
 * @returns {{
 *   lineCount: number
 *   totalQty: number
 *   displayCount: number
 *   firstTitle: string
 *   extraLineCount: number
 *   lines: { title: string, qty: number }[]
 *   visibleTitles: string[]
 *   hiddenLineCount: number
 * }}
 */
export function parseOrderProductSummary(lineSummary) {
  const raw = typeof lineSummary === 'string' ? lineSummary.trim() : ''
  if (!raw || raw === '—') {
    return {
      lineCount: 0,
      totalQty: 0,
      displayCount: 0,
      firstTitle: '—',
      extraLineCount: 0,
      lines: [],
      visibleTitles: ['—'],
      hiddenLineCount: 0,
    }
  }

  /** @type {{ title: string, qty: number }[]} */
  const lines = raw.split(' · ').map((part) => {
    const trimmed = part.trim()
    const m = /^(.*)\s×\s*(\d+(?:\.\d+)?)$/.exec(trimmed)
    if (m) {
      const qty = Number(m[2])
      return { title: m[1].trim(), qty: Number.isFinite(qty) ? qty : 1 }
    }
    return { title: trimmed, qty: 1 }
  })

  const lineCount = lines.length
  const totalQty = lines.reduce((sum, ln) => sum + ln.qty, 0)
  const displayCount = lineCount > 1 ? lineCount : totalQty
  const visibleTitles = lines.slice(0, 2).map((ln) => ln.title)
  const hiddenLineCount = Math.max(0, lineCount - 2)

  return {
    lineCount,
    totalQty,
    displayCount,
    firstTitle: lines[0]?.title ?? '—',
    extraLineCount: Math.max(0, lineCount - 1),
    lines,
    visibleTitles,
    hiddenLineCount,
  }
}
