import { DEMO_TODAY } from '../data/constants.js'
import { SUPPLIER_LEDGER_ENTRY_TYPE } from '../contracts/v1/supplierLedgerEntryTypes.js'
import { isSupplierLedgerBalanceStatus } from '../contracts/v1/supplierLedgerStatuses.js'
import { SUPPLIER_HEALTH_STATUS } from '../mappers/supply/supplierHealth.js'
import {
  computeSupplierHealth,
  daysSinceIsoDate,
  formatLastActivityLabel,
} from '../mappers/supply/supplierHealth.js'
import {
  buildSupplierLinkage,
  extractSupplierCity,
  filterOpenProductsForSupplier,
  sumLedgerTotals,
} from '../mappers/supply/supplierOperationsCore.js'
import { parseQty } from '../mappers/receiving/productReadiness.js'
import { formatLedgerMoney } from '../mappers/supply/supplierLedgerBalance.js'
import { getOrders } from './mockApi.js'
import { getAllOrderLinesFlat } from './mockOrderLineStore.js'
import { isOrderLinePendingForIncomingEntry } from '../lib/incomingPendingLineRules.js'
import { listIncomingGoodsFromStore } from './mockIncomingGoodsStore.js'
import { getAllSuppliersSnapshot } from './mockSupplierStore.js'
import { getLedgerForSupplier, getOpenBalanceForSupplier } from './mockSupplierLedgerStore.js'
import { mockGetIncomingGoodsKpis } from './mockIncomingGoodsApi.js'
import { seedSupplierRiskDemo } from './mockSupplierRiskDemo.js'
import { supplierLedgerEntryTypeLabel } from '../contracts/v1/supplierLedgerEntryTypes.js'

/** @param {number} [ms] */
async function fakeLatency(ms = 50) {
  await new Promise((r) => setTimeout(r, ms))
}

const CLOSED_STATUSES = new Set(['Teslim Edildi', 'İptal'])

/**
 * @returns {import('../mappers/supply/supplierOperationsCore.js').PendingLineCore[]}
 */
async function loadMockPendingLines() {
  const orders = await getOrders()
  const orderById = new Map(orders.map((o) => [o.id, o]))
  /** @type {import('../mappers/supply/supplierOperationsCore.js').PendingLineCore[]} */
  const out = []
  for (const line of getAllOrderLinesFlat()) {
    const order = orderById.get(line.salesOrderId)
    if (!order || CLOSED_STATUSES.has(order.status)) continue
    const ordered = parseQty(line.qtyOrdered)
    const received = parseQty(line.qtyReceived ?? '0')
    if (
      !isOrderLinePendingForIncomingEntry({
        supplyStatus: line.supplyStatus ?? 'NOT_SENT',
        warehouseEntryStatus: line.warehouseEntryStatus ?? 'NOT_SENT',
        shipmentReady: line.shipmentReady ?? false,
        qtyOrdered: ordered,
        qtyReceived: received,
      })
    ) {
      continue
    }
    out.push({
      orderLineId: line.id,
      salesOrderId: line.salesOrderId,
      orderNumber: line.salesOrderId,
      customerName: order.customerDisplayName ?? order.customer ?? '',
      productTitle: line.title ?? order.product ?? order.productTitle ?? '',
      qtyOrdered: ordered,
      qtyReceived: received,
      supplierId: line.supplierId ?? null,
      orderDate: order.orderDate ?? null,
      estimatedUnitCost:
        typeof line.unitPrice === 'number' && ordered > 0
          ? line.unitPrice
          : typeof line.lineTotal === 'number' && ordered > 0
            ? line.lineTotal / ordered
            : 0,
      dueDate: order.dueDate ?? null,
    })
  }
  return out
}

/**
 * @returns {Map<string, { orderLineId: string | null, salesOrderId: string | null }[]>}
 */
function loadIncomingLinksBySupplier() {
  const map = new Map()
  for (const row of listIncomingGoodsFromStore()) {
    const list = map.get(row.supplierId) ?? []
    list.push({ orderLineId: row.orderLineId, salesOrderId: row.salesOrderId })
    map.set(row.supplierId, list)
  }
  return map
}

/**
 * @param {string} supplierId
 */
function lastPaymentDate(supplierId) {
  const pay = getLedgerForSupplier(supplierId).find(
    (e) => e.entryType === SUPPLIER_LEDGER_ENTRY_TYPE.PAYMENT,
  )
  return pay?.occurredAt ?? null
}

/**
 * @param {import('../mappers/supply/supplierOperationsCore.js').PendingLineCore[]} pendingLines
 * @param {{ orderLineId: string | null, salesOrderId: string | null }[]} links
 * @param {{ supplierId: string, openBalance: number, lastMovementAt: string | null, isActive: boolean }} balance
 */
function computeMetrics(pendingLines, links, balance) {
  const linkage = buildSupplierLinkage(links)
  const ops = filterOpenProductsForSupplier(pendingLines, linkage, DEMO_TODAY, balance.supplierId)
  const daysSinceLastMovement = daysSinceIsoDate(balance.lastMovementAt, DEMO_TODAY)
  const daysSinceLastPayment = daysSinceIsoDate(lastPaymentDate(balance.supplierId), DEMO_TODAY)
  const health = computeSupplierHealth({
    isActive: balance.isActive,
    openBalance: balance.openBalance,
    openProductCount: ops.openProductCount,
    pendingOrderCount: ops.pendingOrderCount,
    missingQtyTotal: ops.missingQtyTotal,
    pendingQtyTotal: ops.pendingQtyTotal,
    hasOverdueDelivery: ops.hasOverdueDelivery,
    daysSinceLastMovement,
    daysSinceLastPayment,
  })
  return {
    ...ops,
    healthStatus: health.status,
    healthLabel: health.label,
    lastActivityLabel: formatLastActivityLabel(daysSinceLastMovement),
  }
}

/**
 * @param {{ q?: string, activeOnly?: boolean, city?: string, health?: string, sort?: string }} [query]
 */
export async function mockGetSupplyOperationsBoard(query = {}) {
  await fakeLatency(80)
  const q = query.q?.trim().toLowerCase()
  const activeOnly = query.activeOnly !== false
  const cityFilter = query.city?.trim().toLowerCase()
  const healthFilter = query.health?.trim().toLowerCase()

  const pendingLines = await loadMockPendingLines()
  const incomingBySupplier = loadIncomingLinksBySupplier()
  const kpisIncoming = await mockGetIncomingGoodsKpis()

  let globalOpenProducts = 0
  let globalMissingQty = 0
  let criticalCount = 0

  /** @type {import('../contracts/v1/supplierOperations.js').SupplierOpsListItemDto[]} */
  const suppliers = []

  for (const row of getAllSuppliersSnapshot()) {
    if (activeOnly && !row.isActive) continue
    const city = extractSupplierCity(row.address)
    if (cityFilter && !(city ?? '').toLowerCase().includes(cityFilter)) continue
    if (q) {
      const hay = [row.companyName, row.code, row.phone, row.taxNumber, row.address]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!hay.includes(q)) continue
    }

    const openBalance = parseQty(row.openBalance)
    const ledger = getLedgerForSupplier(row.id)
    const links = incomingBySupplier.get(row.id) ?? []
    const metrics = computeMetrics(pendingLines, links, {
      supplierId: row.id,
      openBalance,
      lastMovementAt: ledger[0]?.occurredAt ?? row.lastMovementAt,
      isActive: row.isActive,
    })

    if (healthFilter && metrics.healthStatus !== healthFilter) continue

    globalOpenProducts += metrics.openProductCount
    globalMissingQty += metrics.missingQtyTotal
    if (metrics.healthStatus === SUPPLIER_HEALTH_STATUS.CRITICAL) criticalCount += 1

    suppliers.push({
      id: row.id,
      code: row.code,
      companyName: row.companyName,
      contactName: row.contactName,
      phone: row.phone,
      openBalance: formatLedgerMoney(openBalance),
      currency: 'TRY',
      lastMovementAt: ledger[0]?.occurredAt ?? row.lastMovementAt,
      isActive: row.isActive,
      city,
      healthStatus: metrics.healthStatus,
      healthLabel: metrics.healthLabel,
      openProductCount: metrics.openProductCount,
      pendingOrderCount: metrics.pendingOrderCount,
      lastActivityLabel: metrics.lastActivityLabel,
    })
  }

  const sort = query.sort ?? 'balance_desc'
  suppliers.sort((a, b) => {
    if (sort === 'name') return a.companyName.localeCompare(b.companyName, 'tr')
    const ba = parseQty(a.openBalance)
    const bb = parseQty(b.openBalance)
    return sort === 'balance_asc' ? ba - bb : bb - ba
  })

  return /** @type {import('../contracts/v1/supplierOperations.js').SupplyOperationsBoardDto} */ ({
    kpis: {
      criticalSupplierCount: criticalCount,
      openProductCount: globalOpenProducts,
      missingProductQty: globalMissingQty.toFixed(2),
      todayIncomingCount: kpisIncoming.todayCount,
      totalOpenDebt: kpisIncoming.totalSupplierDebt,
      currency: 'TRY',
    },
    suppliers,
  })
}

/**
 * @param {string} supplierId
 */
export async function mockGetSupplierOperations(supplierId) {
  await fakeLatency(70)
  seedSupplierRiskDemo()
  const row = getAllSuppliersSnapshot().find((s) => s.id === supplierId)
  if (!row) throw new Error('Tedarikçi bulunamadı')

  const pendingLines = await loadMockPendingLines()
  const links = loadIncomingLinksBySupplier().get(supplierId) ?? []
  const linkage = buildSupplierLinkage(links)
  const ops = filterOpenProductsForSupplier(pendingLines, linkage, DEMO_TODAY, supplierId)
  const openBalance = parseQty(row.openBalance)
  const ledger = getLedgerForSupplier(supplierId)
  const metrics = computeMetrics(pendingLines, links, {
    supplierId,
    openBalance,
    lastMovementAt: ledger[0]?.occurredAt ?? row.lastMovementAt,
    isActive: row.isActive,
  })

  const { totalPayments, totalPurchases } = sumLedgerTotals(ledger)

  const unitByLine = new Map()
  for (const rec of listIncomingGoodsFromStore({ supplierId })) {
    if (!rec.orderLineId || unitByLine.has(rec.orderLineId)) continue
    unitByLine.set(rec.orderLineId, parseQty(rec.unitPurchasePrice))
  }
  let openProductCost = 0
  for (const p of ops.openProducts) {
    const unit = unitByLine.get(p.orderLineId) ?? parseQty(p.estimatedUnitCost ?? '0')
    openProductCost += unit * parseQty(p.qtyMissing)
  }

  const incomingHistory = listIncomingGoodsFromStore({ supplierId }).slice(0, 30).map((rec) => ({
    id: rec.id,
    productTitle: rec.productTitle,
    qty: rec.qty,
    unitPurchasePrice: rec.unitPurchasePrice,
    lineTotal: rec.lineTotal,
    receivedAt: rec.receivedAt,
    orderNumber: rec.orderNumber,
    customerName: rec.customerName,
  }))

  return /** @type {import('../contracts/v1/supplierOperations.js').SupplierOperationsDetailDto} */ ({
    supplierId,
    commercial: {
      totalPurchases: formatLedgerMoney(totalPurchases),
      totalPayments: formatLedgerMoney(totalPayments),
      openBalance: formatLedgerMoney(openBalance),
      openProductCostEstimate: formatLedgerMoney(openProductCost),
      currency: 'TRY',
    },
    openProducts: ops.openProducts,
    pendingOrders: ops.pendingOrders,
    incomingHistory,
    healthStatus: metrics.healthStatus,
    healthLabel: metrics.healthLabel,
    openProductCount: metrics.openProductCount,
    pendingOrderCount: metrics.pendingOrderCount,
    lastActivityLabel: metrics.lastActivityLabel,
  })
}

function monthStartIso(todayIso) {
  return `${todayIso.slice(0, 7)}-01`
}

function computeOverdueDebt(openBalance, hasOverdueDelivery, daysSinceLastPayment) {
  if (openBalance <= 0.009) return 0
  if (hasOverdueDelivery) return openBalance
  if (daysSinceLastPayment != null && daysSinceLastPayment > 45) return openBalance
  return 0
}

function statusLabelForRow(isActive, healthLabel, openBalance) {
  if (!isActive) return 'Pasif'
  if (openBalance <= 0.009) return 'Kapalı'
  return healthLabel
}

function estimatePendingOrderDebt(supplierId, openProducts) {
  const unitByLine = new Map()
  for (const rec of listIncomingGoodsFromStore({ supplierId })) {
    if (!rec.orderLineId || unitByLine.has(rec.orderLineId)) continue
    unitByLine.set(rec.orderLineId, parseQty(rec.unitPurchasePrice))
  }
  let sum = 0
  for (const p of openProducts) {
    const unit = unitByLine.get(p.orderLineId) ?? parseQty(p.estimatedUnitCost ?? '0')
    sum += unit * parseQty(p.qtyMissing)
  }
  return sum
}

function lastMovementLabel(supplierId) {
  const latest = getLedgerForSupplier(supplierId)[0]
  return latest ? supplierLedgerEntryTypeLabel(latest.entryType) : null
}

/**
 * @param {{ q?: string, activeOnly?: boolean, sort?: string }} [query]
 */
export async function mockGetSupplierLedgerCenter(query = {}) {
  await fakeLatency(80)
  seedSupplierRiskDemo()

  const q = query.q?.trim().toLowerCase()
  const activeOnly = query.activeOnly !== false
  const sort = query.sort ?? 'balance_desc'

  const monthStart = monthStartIso(DEMO_TODAY)
  /** @type {Map<string, number>} */
  const monthPaidBySupplier = new Map()
  /** @type {Map<string, { total: number, count: number }>} */
  const mailOrderBySupplier = new Map()
  let monthPaymentsTotal = 0

  for (const row of getAllSuppliersSnapshot()) {
    for (const entry of getLedgerForSupplier(row.id)) {
      if (!isSupplierLedgerBalanceStatus(entry.status)) continue
      if (entry.occurredAt < monthStart || entry.occurredAt > DEMO_TODAY) continue
      const debit = parseQty(entry.debitAmount)
      const credit = parseQty(entry.creditAmount)
      if (entry.entryType === SUPPLIER_LEDGER_ENTRY_TYPE.PAYMENT && debit > 0) {
        monthPaymentsTotal += debit
        monthPaidBySupplier.set(row.id, (monthPaidBySupplier.get(row.id) ?? 0) + debit)
      }
      if (entry.entryType === SUPPLIER_LEDGER_ENTRY_TYPE.MAIL_ORDER && credit > 0) {
        const bucket = mailOrderBySupplier.get(row.id) ?? { total: 0, count: 0 }
        bucket.total += credit
        bucket.count += 1
        mailOrderBySupplier.set(row.id, bucket)
      }
    }
  }

  const pendingLines = await loadMockPendingLines()
  const incomingBySupplier = loadIncomingLinksBySupplier()

  /** @type {Map<string, string | null>} */
  const upcomingDueBySupplier = new Map()
  let upcoming7 = 0
  let upcoming15 = 0
  let upcoming30 = 0
  const addDays = (iso, days) => {
    const d = new Date(`${iso}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() + days)
    return d.toISOString().slice(0, 10)
  }
  const horizon7 = addDays(DEMO_TODAY, 7)
  const horizon15 = addDays(DEMO_TODAY, 15)
  const horizon30 = addDays(DEMO_TODAY, 30)

  for (const row of getAllSuppliersSnapshot()) {
    for (const entry of getLedgerForSupplier(row.id)) {
      if (!isSupplierLedgerBalanceStatus(entry.status)) continue
      const dueAt = entry.dueAt
      if (!dueAt || dueAt < DEMO_TODAY) continue
      const credit = parseQty(entry.creditAmount)
      if (credit <= 0.009) continue
      const prev = upcomingDueBySupplier.get(row.id)
      if (!prev || dueAt < prev) upcomingDueBySupplier.set(row.id, dueAt)
      if (dueAt <= horizon7) upcoming7 += credit
      if (dueAt <= horizon15) upcoming15 += credit
      if (dueAt <= horizon30) upcoming30 += credit
    }
  }

  /** @type {import('../contracts/v1/supplierLedgerCenter.js').SupplierLedgerCenterRowDto[]} */
  const suppliers = []
  let totalDebt = 0
  let totalOverdue = 0
  let totalPendingOrderDebt = 0
  let totalPendingProductCount = 0

  for (const row of getAllSuppliersSnapshot()) {
    if (activeOnly && !row.isActive) continue
    if (q) {
      const hay = [row.companyName, row.code, row.phone, row.taxNumber, row.address]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (!hay.includes(q)) continue
    }

    const ledger = getLedgerForSupplier(row.id)
    const openBalance = getOpenBalanceForSupplier(row.id) || parseQty(row.openBalance)
    const links = incomingBySupplier.get(row.id) ?? []
    const daysSinceLastPayment = daysSinceIsoDate(lastPaymentDate(row.id), DEMO_TODAY)
    const metrics = computeMetrics(pendingLines, links, {
      supplierId: row.id,
      openBalance,
      lastMovementAt: ledger[0]?.occurredAt ?? row.lastMovementAt,
      isActive: row.isActive,
    })
    const pendingOrderDebt = estimatePendingOrderDebt(row.id, metrics.openProducts)
    const overdueDebt = computeOverdueDebt(
      openBalance,
      metrics.hasOverdueDelivery,
      daysSinceLastPayment,
    )
    totalDebt += openBalance
    totalOverdue += overdueDebt
    totalPendingOrderDebt += pendingOrderDebt
    totalPendingProductCount += metrics.openProductCount

    suppliers.push({
      id: row.id,
      companyName: row.companyName,
      totalDebt: formatLedgerMoney(openBalance),
      overdueDebt: formatLedgerMoney(overdueDebt),
      monthPayment: formatLedgerMoney(monthPaidBySupplier.get(row.id) ?? 0),
      pendingOrderDebt: formatLedgerMoney(pendingOrderDebt),
      pendingProductCount: metrics.openProductCount,
      totalRisk: formatLedgerMoney(openBalance + pendingOrderDebt),
      lastMovementAt: ledger[0]?.occurredAt ?? row.lastMovementAt,
      lastMovementLabel: lastMovementLabel(row.id),
      lastPaymentAt: lastPaymentDate(row.id),
      upcomingDueAt: upcomingDueBySupplier.get(row.id) ?? null,
      statusLabel: statusLabelForRow(row.isActive, metrics.healthLabel, openBalance),
      healthStatus: metrics.healthStatus,
      isActive: row.isActive,
    })
  }

  suppliers.sort((a, b) => {
    if (sort === 'name') return a.companyName.localeCompare(b.companyName, 'tr')
    if (sort === 'overdue_desc') return parseQty(b.overdueDebt) - parseQty(a.overdueDebt)
    if (sort === 'risk_desc') return parseQty(b.totalRisk) - parseQty(a.totalRisk)
    const ba = parseQty(a.totalDebt)
    const bb = parseQty(b.totalDebt)
    return sort === 'balance_asc' ? ba - bb : bb - ba
  })

  const nameById = new Map(suppliers.map((s) => [s.id, s.companyName]))

  return /** @type {import('../contracts/v1/supplierLedgerCenter.js').SupplierLedgerCenterDto} */ ({
    kpis: {
      totalSuppliers: suppliers.filter((s) => s.isActive).length,
      totalDebt: formatLedgerMoney(totalDebt),
      overdueDebt: formatLedgerMoney(totalOverdue),
      monthPayments: formatLedgerMoney(monthPaymentsTotal),
      pendingOrderDebt: formatLedgerMoney(totalPendingOrderDebt),
      pendingProductCount: totalPendingProductCount,
      totalSupplierRisk: formatLedgerMoney(totalDebt + totalPendingOrderDebt),
      upcomingPayments7: formatLedgerMoney(upcoming7),
      upcomingPayments15: formatLedgerMoney(upcoming15),
      upcomingPayments30: formatLedgerMoney(upcoming30),
      currency: 'TRY',
    },
    suppliers,
    reports: {
      topDebtSuppliers: [...suppliers]
        .filter((s) => parseQty(s.totalRisk) > 0.009)
        .sort((a, b) => parseQty(b.totalRisk) - parseQty(a.totalRisk))
        .slice(0, 10)
        .map((s) => ({
          supplierId: s.id,
          companyName: s.companyName,
          amount: s.totalRisk,
          currency: 'TRY',
        })),
      monthPaidSuppliers: [...monthPaidBySupplier.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([supplierId, amount]) => ({
          supplierId,
          companyName: nameById.get(supplierId) ?? supplierId,
          amount: formatLedgerMoney(amount),
          currency: 'TRY',
        })),
      overdueDebts: suppliers
        .filter((s) => parseQty(s.overdueDebt) > 0.009)
        .sort((a, b) => parseQty(b.overdueDebt) - parseQty(a.overdueDebt))
        .map((s) => ({
          supplierId: s.id,
          companyName: s.companyName,
          amount: s.overdueDebt,
          currency: 'TRY',
        })),
      mailOrderDistribution: [...mailOrderBySupplier.entries()]
        .sort((a, b) => b[1].total - a[1].total)
        .map(([supplierId, bucket]) => ({
          supplierId,
          companyName: nameById.get(supplierId) ?? supplierId,
          mailOrderTotal: formatLedgerMoney(bucket.total),
          transactionCount: bucket.count,
          currency: 'TRY',
        })),
    },
  })
}
