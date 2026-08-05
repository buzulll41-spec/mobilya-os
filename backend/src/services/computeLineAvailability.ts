import type { OrderLine, Shipment, ShipmentLine } from '@prisma/client'
import {
  formatConfigurationLines,
  parseLineConfiguration,
  type LineConfiguration,
} from '../constants/productConfigurationSchema.js'
import { normalizeShipmentStatusValue, SHIPPED_QTY_STATUSES } from '../constants/shipmentStatuses.js'
import {
  computeLineReadiness,
  computeQtyShippable,
  findReceivingRiskViolations,
  fmtQty,
  parseQty,
  type ProductReadinessStatus,
  type ProductReadinessTone,
} from '../lib/productReadiness.js'

export type ShipmentPlanLineDto = {
  orderLineId: string
  title: string
  configurationSummary: string[]
  configuration: LineConfiguration | null
  qtyOrdered: string
  qtyReceived: string
  qtyPendingReceive: string
  qtyShippable: string
  qtyShipped: string
  qtyRemaining: string
  selectable: boolean
  readinessStatus: ProductReadinessStatus
  readinessLabel: string
  readinessTone: ProductReadinessTone
  readyForShipmentHint: string
}

const RESERVE_EXCLUDE = new Set(['ISSUE'])

function dec(n: { toString(): string } | number): number {
  return parseQty(n)
}

type ShipmentWithLines = Shipment & { lines: ShipmentLine[] }

type OrderLineForPlan = OrderLine & {
  product?: { category: string; suiteType: string | null } | null
}

/**
 * Sipariş kalemi bazında sevk planlama kırılımı.
 * qtyRemaining = planlanabilir (ISSUE hariç rezerve düşülmüş).
 */
export function computeShipmentPlanLines(
  orderLines: OrderLineForPlan[],
  shipments: ShipmentWithLines[],
  openMissingLineIds: Set<string> = new Set(),
): ShipmentPlanLineDto[] {
  /** @type {Map<string, { reserved: number, shipped: number }>} */
  const agg = new Map()

  for (const ln of orderLines) {
    agg.set(ln.id, { reserved: 0, shipped: 0 })
  }

  for (const sh of shipments) {
    const status = normalizeShipmentStatusValue(sh.status)
    if (RESERVE_EXCLUDE.has(status)) continue
    const countsShipped = SHIPPED_QTY_STATUSES.has(status)
    for (const sl of sh.lines) {
      const bucket = agg.get(sl.orderLineId)
      if (!bucket) continue
      const q = dec(sl.qty)
      bucket.reserved += q
      if (countsShipped) bucket.shipped += q
    }
  }

  return orderLines.map((ln) => {
    const ordered = dec(ln.qtyOrdered)
    const received = dec(ln.qtyReceived)
    const pendingReceive = Math.max(0, ordered - received)
    const { reserved, shipped } = agg.get(ln.id) ?? { reserved: 0, shipped: 0 }
    const remaining = Math.max(0, ordered - reserved)
    const shippable = computeQtyShippable(ordered, received, reserved)
    const readiness = computeLineReadiness(ordered, received, openMissingLineIds.has(ln.id))
    const readyForShipmentHint =
      received <= 0.0001
        ? 'Henüz fiziksel gelmedi.'
        : received >= ordered - 0.0001
          ? `Gelen: ${fmtQty(received)}/${fmtQty(ordered)} — sevke uygun`
          : `Gelen: ${fmtQty(received)}/${fmtQty(ordered)} · Bekleyen: ${fmtQty(pendingReceive)}`
    const configuration = parseLineConfiguration(ln.configuration) ?? null
    const profileCtx = {
      title: ln.title,
      category: ln.product?.category,
      productGroup: ln.product?.category,
      suiteType: ln.product?.suiteType ?? undefined,
    }
    const configurationSummary = formatConfigurationLines(profileCtx, configuration ?? undefined)
    return {
      orderLineId: ln.id,
      title: ln.title,
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
  })
}

export type SelectedShipmentLine = { orderLineId: string; qty: number }

/**
 * @throws Error message for AppHttpError details
 */
export function validateSelectedShipmentLines(
  planLines: ShipmentPlanLineDto[],
  selected: SelectedShipmentLine[],
  options?: { allowReceivingRisk?: boolean },
): void {
  if (!selected.length) {
    throw new Error('En az bir ürün seçilmeli')
  }
  const byId = new Map(planLines.map((p) => [p.orderLineId, p]))
  const seen = new Set<string>()

  for (const row of selected) {
    if (!row.orderLineId || seen.has(row.orderLineId)) {
      throw new Error('Geçersiz veya tekrarlayan sipariş satırı')
    }
    seen.add(row.orderLineId)
    const plan = byId.get(row.orderLineId)
    if (!plan) throw new Error('Sipariş satırı bulunamadı')
    if (!plan.selectable) throw new Error(`${plan.title}: planlanacak adet kalmadı`)
    const qty = row.qty
    if (!Number.isFinite(qty) || qty <= 0) throw new Error(`${plan.title}: adet 0'dan büyük olmalı`)
    const rem = parseQty(plan.qtyRemaining)
    if (qty > rem + 0.0001) throw new Error(`${plan.title}: en fazla ${plan.qtyRemaining} adet planlanabilir`)
    const shippableCap = options?.allowReceivingRisk
      ? parseQty(plan.qtyRemaining)
      : parseQty(plan.qtyShippable)
    if (qty > shippableCap + 0.0001) {
      const capLabel = options?.allowReceivingRisk ? plan.qtyRemaining : plan.qtyShippable
      throw new Error(`${plan.title}: en fazla ${capLabel} adet planlanabilir`)
    }
  }

  if (!options?.allowReceivingRisk) {
    const violations = findReceivingRiskViolations(planLines, selected)
    const notReceived = violations.filter((v) => v.reason === 'not_received')
    if (notReceived.length) {
      throw new Error('Bu ürün henüz fiziksel olarak gelmedi.')
    }
  }
}

export function orderHasRemainingAfterPlan(
  planLines: ShipmentPlanLineDto[],
  selected: SelectedShipmentLine[],
): boolean {
  const selectedById = new Map(selected.map((s) => [s.orderLineId, s.qty]))
  for (const p of planLines) {
    const ordered = Number.parseFloat(p.qtyOrdered)
    const reservedBefore = ordered - Number.parseFloat(p.qtyRemaining)
    const add = selectedById.get(p.orderLineId) ?? 0
    const reservedAfter = reservedBefore + add
    if (reservedAfter < ordered - 0.0001) return true
  }
  return false
}
