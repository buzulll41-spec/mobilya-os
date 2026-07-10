import { formatTry } from '../../data/dashboardHelpers.js'
import { remainingBalance } from '../../utils/orderFinance.js'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../state/shipmentPlanStore.js').ShipmentPlan} ShipmentPlan */

/**
 * @typedef {'ok' | 'warn'} ReadinessCheckTone
 * @typedef {{ id: string, label: string, tone: ReadinessCheckTone, detail?: string }} ReadinessCheck
 * @typedef {{ score: number, checks: ReadinessCheck[] }} ShipmentReadinessModel
 */

/** @param {number} rem @param {number} total */
function isHighBalance(rem, total) {
  if (rem <= 0.009) return false
  if (rem >= 40_000) return true
  return total > 0 && rem / total >= 0.4
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {ShipmentPlan | undefined} plan
 */
export function buildShipmentReadinessScore(order, dto, plan) {
  const rem = remainingBalance(order)
  const total = order.amount ?? 0
  const openSsh = (dto?.openMissingItemsCount ?? 0) > 0
  const op = dto?.operationalState
  const productsReady =
    op?.productionState === 'READY' ||
    order.status === 'Hazır' ||
    order.status === 'Teslim Edildi'
  const hasVehicle = Boolean(plan?.vehicle?.trim())
  const hasCrew = Boolean(plan?.crew1?.trim() || plan?.crew2?.trim())

  /** @type {ReadinessCheck[]} */
  const checks = [
    {
      id: 'products',
      label: 'Ürünler hazır',
      tone: productsReady ? 'ok' : 'warn',
      detail: productsReady ? undefined : 'Üretim / depo bekleniyor',
    },
    {
      id: 'vehicle',
      label: 'Araç atandı',
      tone: hasVehicle ? 'ok' : 'warn',
      detail: hasVehicle ? plan?.vehicle : 'Araç seçilmedi',
    },
    {
      id: 'crew',
      label: 'Ekip atandı',
      tone: hasCrew ? 'ok' : 'warn',
      detail: hasCrew
        ? [plan?.crew1, plan?.crew2].filter(Boolean).join(' + ')
        : 'Montaj ekibi yok',
    },
    {
      id: 'ssh',
      label: openSsh ? 'Açık SSH' : 'SSH kapalı',
      tone: openSsh ? 'warn' : 'ok',
      detail: openSsh ? `${dto?.openMissingItemsCount ?? 1} kayıt açık` : undefined,
    },
    {
      id: 'balance',
      label: isHighBalance(rem, total) ? 'Yüksek bakiye' : 'Tahsilat uygun',
      tone: isHighBalance(rem, total) ? 'warn' : 'ok',
      detail: isHighBalance(rem, total) ? `Kalan ${formatTry(rem)}` : undefined,
    },
  ]

  const weights = { products: 25, vehicle: 20, crew: 20, ssh: 20, balance: 15 }
  let score = 0
  for (const check of checks) {
    const w = weights[/** @type {keyof typeof weights} */ (check.id)] ?? 10
    score += check.tone === 'ok' ? w : Math.round(w * 0.35)
  }

  return { score: Math.min(100, Math.max(0, score)), checks }
}
