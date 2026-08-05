import {
  formatConfigurationLines,
  parseLineConfiguration,
} from '../../constants/productConfigurationSchema.js'
import { normalizeShipmentStatusValue, SHIPPED_QTY_STATUSES } from '../../contracts/v1/shipmentStatuses.js'
import { isMissingItemResolvedStatus } from '../../contracts/v1/missingItemStatuses.js'
import {
  computeLineReadiness,
  computeQtyShippable,
  findReceivingRiskViolations,
  fmtQty,
  parseQty,
} from '../receiving/productReadiness.js'

/** @typedef {import('../../contracts/v1/shipment.js').ShipmentDto} ShipmentDto */
/** @typedef {import('../../contracts/v1/missingItem.js').MissingItemDto} MissingItemDto */

/**
 * @typedef {Object} ShipmentPlanLineDto
 * @property {string} orderLineId
 * @property {string} title
 * @property {string} qtyOrdered
 * @property {string} qtyReceived
 * @property {string} qtyPendingReceive
 * @property {string} qtyShippable
 * @property {string} qtyShipped
 * @property {string} qtyRemaining
 * @property {boolean} selectable
 * @property {import('../receiving/productReadiness.js').ProductReadinessStatus} readinessStatus
 * @property {string} readinessLabel
 * @property {import('../receiving/productReadiness.js').ProductReadinessTone} readinessTone
 * @property {string} readyForShipmentHint
 * @property {Record<string, string> | null} [configuration]
 * @property {string[]} [configurationSummary]
 */

const RESERVE_EXCLUDE = new Set(['ISSUE'])

/**
 * @param {{ id: string, title: string, qtyOrdered: string, qtyReceived?: string, productGroup?: string, configuration?: Record<string, string>, lineNote?: string }} lineSeed
 * @param {ShipmentDto[]} shipments
 * @param {Set<string>} openMissingLineIds
 * @returns {ShipmentPlanLineDto}
 */
function planLineForSeed(lineSeed, shipments, openMissingLineIds) {
  let reserved = 0
  let shipped = 0
  const ordered = parseQty(lineSeed.qtyOrdered)
  const received = parseQty(lineSeed.qtyReceived ?? '0')
  const pendingReceive = Math.max(0, ordered - received)

  for (const sh of shipments) {
    const status = normalizeShipmentStatusValue(String(sh.status ?? ''))
    if (RESERVE_EXCLUDE.has(status)) continue
    const countsShipped = SHIPPED_QTY_STATUSES.has(status)
    for (const sl of sh.lines ?? []) {
      if (sl.orderLineId !== lineSeed.id) continue
      const q = parseQty(sl.qty)
      reserved += q
      if (countsShipped) shipped += q
    }
  }

  const remaining = Math.max(0, ordered - reserved)
  const shippable = computeQtyShippable(ordered, received, reserved)
  const readiness = computeLineReadiness(ordered, received, openMissingLineIds.has(lineSeed.id))
  const readyForShipmentHint =
    received <= 0.0001
      ? 'Henüz fiziksel gelmedi.'
      : received >= ordered - 0.0001
        ? `Gelen: ${fmtQty(received)}/${fmtQty(ordered)} — sevke uygun`
        : `Gelen: ${fmtQty(received)}/${fmtQty(ordered)} · Bekleyen: ${fmtQty(pendingReceive)}`

  const configuration =
    lineSeed.configuration ??
    (lineSeed.lineNote ? { note: lineSeed.lineNote } : null) ??
    null
  const profileCtx = {
    title: lineSeed.title,
    productGroup: lineSeed.productGroup,
    category: lineSeed.productGroup,
  }
  const configurationSummary = formatConfigurationLines(profileCtx, configuration ?? undefined)

  return {
    orderLineId: lineSeed.id,
    title: lineSeed.title,
    configuration,
    configurationSummary,
    qtyOrdered: fmtQty(ordered),
    qtyReceived: fmtQty(received),
    qtyPendingReceive: fmtQty(pendingReceive),
    qtyShippable: fmtQty(shippable),
    qtyShipped: fmtQty(shipped),
    qtyRemaining: fmtQty(remaining),
    selectable: remaining > 0.0001,
    readinessStatus: readiness.status,
    readinessLabel: readiness.label,
    readinessTone: readiness.tone,
    readyForShipmentHint,
  }
}

/**
 * @param {MissingItemDto[]} [missingItems]
 */
function openMissingLineIdSet(missingItems) {
  const set = new Set()
  for (const m of missingItems ?? []) {
    if (isMissingItemResolvedStatus(m.status)) continue
    if (m.lineId) set.add(m.lineId)
  }
  return set
}

/**
 * @param {{ id: string, salesOrderId: string, qtyOrdered: string, qtyReceived?: string, title?: string, productGroup?: string, configuration?: Record<string, string>, lineNote?: string }}[] lineSeeds
 * @param {ShipmentDto[]} shipments
 * @param {string} [fallbackTitle]
 * @param {MissingItemDto[]} [missingItems]
 * @returns {ShipmentPlanLineDto[]}
 */
export function computeShipmentPlanLinesFromSeeds(
  lineSeeds,
  shipments,
  fallbackTitle = 'Ürün',
  missingItems,
) {
  const openMissing = openMissingLineIdSet(missingItems)
  return lineSeeds.map((seed) =>
    planLineForSeed(
      {
        id: seed.id,
        title: seed.title?.trim() || fallbackTitle,
        qtyOrdered: seed.qtyOrdered,
        qtyReceived: seed.qtyReceived,
        productGroup: seed.productGroup,
        configuration: seed.configuration,
        lineNote: seed.lineNote,
      },
      shipments,
      openMissing,
    ),
  )
}

/**
 * @param {ShipmentPlanLineDto[]} planLines
 * @param {{ orderLineId: string, qty: number }[]} selected
 * @param {{ allowReceivingRisk?: boolean }} [options]
 */
export function validateShipmentPlanSelection(planLines, selected, options = {}) {
  if (!selected.length) {
    return { ok: false, message: 'En az bir ürün seçin.' }
  }
  const byId = new Map(planLines.map((p) => [p.orderLineId, p]))
  const seen = new Set()

  for (const row of selected) {
    if (!row.orderLineId || seen.has(row.orderLineId)) {
      return { ok: false, message: 'Geçersiz ürün seçimi.' }
    }
    seen.add(row.orderLineId)
    const plan = byId.get(row.orderLineId)
    if (!plan) return { ok: false, message: 'Sipariş satırı bulunamadı.' }
    if (!plan.selectable) return { ok: false, message: `${plan.title}: planlanacak adet kalmadı.` }
    if (!Number.isFinite(row.qty) || row.qty <= 0) {
      return { ok: false, message: `${plan.title}: adet girin.` }
    }
    const received = parseQty(plan.qtyReceived)
    if (received <= 0.0001 && row.qty > 0.0001 && !options.allowReceivingRisk) {
      return {
        ok: false,
        message: 'Bu ürün henüz fiziksel olarak gelmedi.',
        needsReceivingRisk: true,
        violations: [{ orderLineId: row.orderLineId, title: plan.title, reason: 'not_received' }],
      }
    }
    if (row.qty > parseQty(plan.qtyRemaining) + 0.0001) {
      return { ok: false, message: `${plan.title}: en fazla ${plan.qtyRemaining} adet.` }
    }
    const shippableCap = options.allowReceivingRisk
      ? parseQty(plan.qtyRemaining)
      : parseQty(plan.qtyShippable)
    if (row.qty > shippableCap + 0.0001) {
      return {
        ok: false,
        message: options.allowReceivingRisk
          ? `${plan.title}: en fazla ${plan.qtyRemaining} adet.`
          : `${plan.title}: en fazla ${plan.qtyShippable} adet sevk planlanabilir (gelen sınırı).`,
      }
    }
  }

  const violations = findReceivingRiskViolations(planLines, selected)
  const notReceived = violations.filter((v) => v.reason === 'not_received')
  if (!options.allowReceivingRisk && notReceived.length) {
    return {
      ok: false,
      message: 'Bu ürün henüz fiziksel olarak gelmedi.',
      needsReceivingRisk: true,
      violations: notReceived,
    }
  }

  return { ok: true }
}

/**
 * @param {ShipmentPlanLineDto[]} planLines
 * @param {{ orderLineId: string, qty: number }[]} selected
 */
export function orderHasRemainingAfterPlan(planLines, selected) {
  const selectedById = new Map(selected.map((s) => [s.orderLineId, s.qty]))
  for (const p of planLines) {
    const ordered = parseQty(p.qtyOrdered)
    const reservedBefore = ordered - parseQty(p.qtyRemaining)
    const add = selectedById.get(p.orderLineId) ?? 0
    if (reservedBefore + add < ordered - 0.0001) return true
  }
  return false
}

export function buildDefaultShipmentPlanSelection(planLines) {
  /** @type {{ orderLineId: string, qty: number }[]} */
  const out = []
  for (const p of planLines) {
    const shippable = parseQty(p.qtyShippable)
    if (shippable > 0.0001) out.push({ orderLineId: p.orderLineId, qty: shippable })
  }
  return out
}
