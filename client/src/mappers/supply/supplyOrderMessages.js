import { formatConfigurationLines } from '../../constants/productConfigurationSchema.js'

/** @typedef {'MAIL' | 'WHATSAPP'} SupplyChannelWire */

/**
 * @typedef {Object} SupplyOrderLineDetail
 * @property {string} title
 * @property {number | string} qty
 * @property {string} [fabricBrand]
 * @property {string} [fabricName]
 * @property {string} [color]
 * @property {string} [legColor]
 * @property {string} [dimensions]
 * @property {string} [productNote]
 * @property {string} [customerNote]
 */

/**
 * @param {string | undefined | null} notes
 * @returns {string}
 */
export function extractCustomerNoteFromOrderNotes(notes) {
  const text = notes?.trim() ?? ''
  if (!text) return ''
  const skipPrefixes = [
    'Adres:',
    'Ödeme:',
    'Ödeme notu:',
    'Mail order',
    'TC:',
    'Tel 2:',
    'Vergi no:',
    'Vergi dairesi:',
    '---',
  ]
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    if (skipPrefixes.some((p) => line.startsWith(p))) continue
    if (line.includes('—')) continue
    return line
  }
  return ''
}

/**
 * @param {Record<string, string> | null | undefined} config
 * @param {string[]} keys
 */
function firstConfigValue(config, keys) {
  if (!config) return ''
  for (const key of keys) {
    const val = typeof config[key] === 'string' ? config[key].trim() : ''
    if (val) return val
  }
  return ''
}

/**
 * @param {import('../../services/ordersClient.js').OrderLineDetailDto} line
 * @param {string} [orderCustomerNote]
 * @returns {SupplyOrderLineDetail}
 */
export function buildSupplyOrderLineDetail(line, orderCustomerNote) {
  const config = line.configuration ?? {}
  const ctx = {
    title: line.title,
    category: line.productGroup ?? undefined,
    productGroup: line.productGroup ?? undefined,
  }
  const configLines = formatConfigurationLines(ctx, config)
  const fabricBrand = firstConfigValue(config, ['fabricBrand'])
  const fabricName = firstConfigValue(config, [
    'bodyFabric',
    'fabricCode',
    'fabric',
    'fabricCollection',
    'headboardFabric',
    'baseFabric',
  ])
  const color = firstConfigValue(config, [
    'bodyColor',
    'doorColor',
    'topColor',
    'finishDetail',
    'color',
  ])
  const legColor = firstConfigValue(config, ['legColor'])
  const dimensions = firstConfigValue(config, ['dimensions', 'cornerDirection', 'topMaterial'])
  const productNote =
    firstConfigValue(config, ['note']) ||
    (Array.isArray(line.configurationSummary) ? line.configurationSummary.join(' · ') : '')

  /** @type {SupplyOrderLineDetail} */
  const detail = {
    title: line.title?.trim() || 'Ürün',
    qty: line.qtyOrdered ?? '1',
    ...(fabricBrand ? { fabricBrand } : {}),
    ...(fabricName ? { fabricName } : {}),
    ...(color ? { color } : {}),
    ...(legColor ? { legColor } : {}),
    ...(dimensions ? { dimensions } : {}),
    ...(productNote ? { productNote } : {}),
    ...(orderCustomerNote?.trim() ? { customerNote: orderCustomerNote.trim() } : {}),
  }

  if (!detail.fabricBrand && !detail.fabricName && configLines.length) {
    for (const row of configLines) {
      const m = row.match(/^([^:]+):\s*(.+)$/)
      if (!m) continue
      const label = m[1].trim().toLocaleLowerCase('tr-TR')
      const val = m[2].trim()
      if (!val) continue
      if (!detail.fabricBrand && label.includes('kumaş firm')) detail.fabricBrand = val
      else if (!detail.fabricName && (label.includes('gövde') || label.includes('kumaş'))) detail.fabricName = val
      else if (!detail.legColor && label.includes('ayak')) detail.legColor = val
      else if (!detail.dimensions && (label.includes('ölçü') || label.includes('yön'))) detail.dimensions = val
      else if (!detail.color && label.includes('renk')) detail.color = val
    }
  }

  return detail
}

/**
 * @param {SupplyOrderLineDetail} detail
 * @returns {string}
 */
export function formatSupplyLineBlock(detail) {
  const qtyLabel =
    typeof detail.qty === 'number'
      ? Number.isInteger(detail.qty)
        ? String(detail.qty)
        : detail.qty.toFixed(2)
      : String(detail.qty)
  /** @type {string[]} */
  const lines = [`• ${detail.title} — ${qtyLabel} adet`]
  if (detail.fabricBrand) lines.push(`  Kumaş firması: ${detail.fabricBrand}`)
  if (detail.fabricName) lines.push(`  Kumaş: ${detail.fabricName}`)
  if (detail.color) lines.push(`  Renk: ${detail.color}`)
  if (detail.legColor) lines.push(`  Ayak rengi: ${detail.legColor}`)
  if (detail.dimensions) lines.push(`  Ölçü / varyasyon: ${detail.dimensions}`)
  if (detail.productNote) lines.push(`  Ürün notu: ${detail.productNote}`)
  if (detail.customerNote) lines.push(`  Müşteri notu: ${detail.customerNote}`)
  return lines.join('\n')
}

/**
 * @param {string} orderNumber
 * @param {SupplyOrderLineDetail[]} lineDetails
 */
export function buildSupplyMailContent(orderNumber, lineDetails) {
  const list = lineDetails.map(formatSupplyLineBlock).join('\n\n')
  const subject = 'EVTREND Sipariş Talebi'
  const body = [
    `Sipariş No: ${orderNumber}`,
    '',
    'Ürünler:',
    list,
    '',
    'Termin bilgisi rica ederiz.',
    '',
    'EVTREND Mobilya',
  ].join('\n')
  return { subject, body }
}

/**
 * @param {string} orderNumber
 * @param {SupplyOrderLineDetail[]} lineDetails
 */
export function buildSupplyWhatsAppMessage(orderNumber, lineDetails) {
  const list = lineDetails.map(formatSupplyLineBlock).join('\n\n')
  return [
    'Merhaba,',
    'Aşağıdaki ürünlerin siparişi verilmiştir.',
    '',
    `Sipariş No: ${orderNumber}`,
    '',
    list,
    '',
    'Termin bilgisi rica ederiz.',
    '',
    'EVTREND Mobilya',
  ].join('\n')
}

/**
 * @param {{ subject: string, body: string }} mail
 */
export function openSupplyMailLink(mail) {
  const href = `mailto:?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}`
  window.open(href, '_blank', 'noopener,noreferrer')
}

/**
 * @param {string} message
 */
export function openSupplyWhatsAppLink(message) {
  const href = `https://wa.me/?text=${encodeURIComponent(message)}`
  window.open(href, '_blank', 'noopener,noreferrer')
}
