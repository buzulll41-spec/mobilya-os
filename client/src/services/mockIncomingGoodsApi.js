import { DEMO_TODAY } from '../data/constants.js'
import { INCOMING_GOODS_PURPOSE, incomingGoodsPurposeLabel } from '../contracts/v1/incomingGoodsPurpose.js'
import { SUPPLIER_LEDGER_ENTRY_TYPE } from '../contracts/v1/supplierLedgerEntryTypes.js'
import { formatLedgerMoney } from '../mappers/supply/supplierLedgerBalance.js'
import {
  computeLineReadiness,
  computeOrderReadinessSummary,
  fmtQty,
  parseQty,
} from '../mappers/receiving/productReadiness.js'
import { getMissingItemsForOrder } from './mockMissingItemStore.js'
import { isMissingItemResolvedStatus } from '../contracts/v1/missingItemStatuses.js'
import {
  addQtyReceivedForOrderLine,
  getAllOrderLinesFlat,
  getOrderLinesForSalesOrder,
} from './mockOrderLineStore.js'
import { appendLedgerDraft, getOpenBalanceForSupplier } from './mockSupplierLedgerStore.js'
import { findSupplierById, getAllSuppliersSnapshot } from './mockSupplierStore.js'
import {
  appendIncomingGoodsRecord,
  listIncomingGoodsFromStore,
} from './mockIncomingGoodsStore.js'
import { getOrders, ensureMockOrderLinesBootstrapped, syncMockOrderDisplayStatusById } from './mockApi.js'
import { AUDIT_MODULE, recordAuditEvent } from '../lib/audit/recordAuditEvent.js'
import { DOMAIN_EVENT_TYPE } from '../contracts/v1/domainEventTypes.js'
import { findProductById } from './mockProductStore.js'
import {
  isOrderLinePendingForIncomingEntry,
  matchesIncomingPendingSearch,
} from '../lib/incomingPendingLineRules.js'
import {
  catalogHintsFromProduct,
  mergeReceivingDtoHints,
} from '../mappers/receiving/enrichOrderLineReceivingHints.js'

/** @typedef {import('../contracts/v1/incomingGoods.js').CreateIncomingGoodsRequest} CreateIncomingGoodsRequest */
/** @typedef {import('../contracts/v1/incomingGoods.js').IncomingGoodsRecordDto} IncomingGoodsRecordDto */
/** @typedef {import('../contracts/v1/incomingGoods.js').IncomingGoodsKpisDto} IncomingGoodsKpisDto */
/** @typedef {import('../contracts/v1/incomingGoods.js').PendingOrderLineForIncomingDto} PendingOrderLineForIncomingDto */
/** @typedef {import('../contracts/v1/incomingGoods.js').OrderLineReceivingDto} OrderLineReceivingDto */

const CLOSED_STATUSES = new Set(['Teslim Edildi', 'İptal'])

function fakeLatency(ms = 80) {
  return new Promise((r) => setTimeout(r, ms))
}

function roundMoney(n) {
  return Math.round(n * 100) / 100
}

/**
 * @param {CreateIncomingGoodsRequest} body
 */
export async function mockCreateIncomingGoods(body) {
  await fakeLatency()
  let supplierId = body.supplierId
  let productTitle = body.productTitle.trim()
  let productGroup = body.productGroup
  let unitPurchasePrice = body.unitPurchasePrice
  let productId = body.productId

  if (body.productId) {
    const { findProductById } = await import('./mockProductStore.js')
    const product = findProductById(body.productId)
    if (!product) throw new Error('Ürün kartı bulunamadı')
    if (!productTitle) productTitle = product.productName
    if (!productGroup) productGroup = product.category
    if (!supplierId && product.defaultSupplierId) supplierId = product.defaultSupplierId
    if (!Number.isFinite(unitPurchasePrice) || unitPurchasePrice <= 0) {
      unitPurchasePrice = Number.parseFloat(product.purchasePrice)
    }
    productId = product.id
  }

  if (!productTitle) throw new Error('Ürün adı zorunlu')

  let salesOrderId = null
  let orderNumber = null
  let customerName = null

  if (body.purpose === INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER) {
    if (!body.orderLineId) throw new Error('Müşteri siparişi için sipariş kalemi seçilmeli')
    const lineRow = getAllOrderLinesFlat().find((l) => l.id === body.orderLineId)
    if (lineRow?.soldUnitCost && Number.parseFloat(lineRow.soldUnitCost) > 0) {
      unitPurchasePrice = Number.parseFloat(lineRow.soldUnitCost)
    }
    if (lineRow?.supplierId) {
      if (body.supplierId !== lineRow.supplierId) {
        throw new Error('Siparişe bağlı gelen ürün kaydında tedarikçi değiştirilemez')
      }
      supplierId = lineRow.supplierId
    }
    const linked = addQtyReceivedForOrderLine(body.orderLineId, body.qty)
    salesOrderId = linked.orderId
    syncMockOrderDisplayStatusById(salesOrderId)
    const orders = await getOrders()
    const order = orders.find((o) => o.id === salesOrderId)
    orderNumber = salesOrderId
    customerName = order?.customer ?? '—'
  } else if (body.orderLineId) {
    throw new Error('Stok/teşhir kaydında sipariş bağlantısı olamaz')
  }

  const supplier = findSupplierById(supplierId)
  if (!supplier) throw new Error('Tedarikçi bulunamadı')
  if (!supplier.isActive) throw new Error('Pasif tedarikçiye kayıt açılamaz')

  const lineTotal = roundMoney(body.qty * unitPurchasePrice)

  const id = `igr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const purposeLabel = incomingGoodsPurposeLabel(body.purpose)
  const record = /** @type {IncomingGoodsRecordDto} */ ({
    id,
    supplierId,
    supplierName: supplier.companyName,
    receivedAt: body.receivedAt,
    productId: productId ?? null,
    productTitle,
    productGroup: productGroup ?? null,
    qty: fmtQty(body.qty),
    unitPurchasePrice: formatLedgerMoney(unitPurchasePrice),
    lineTotal: formatLedgerMoney(lineTotal),
    currency: 'TRY',
    purpose: body.purpose,
    purposeLabel,
    orderLineId: body.orderLineId ?? null,
    salesOrderId,
    orderNumber,
    customerName,
    invoiceNo: body.invoiceNo ?? null,
    documentNo: body.documentNo ?? null,
    note: body.note ?? null,
    createdAt: new Date().toISOString(),
  })
  appendIncomingGoodsRecord(record)

  const openBefore = getOpenBalanceForSupplier(supplierId)
  const balanceAfter = openBefore + lineTotal
  const ledgerDescription = [
    customerName,
    salesOrderId,
    productTitle,
    `Ürün alışı · ${body.qty} adet × ${formatLedgerMoney(unitPurchasePrice)} ₺ = ${formatLedgerMoney(lineTotal)} ₺`,
  ]
    .filter(Boolean)
    .join(' · ')
  appendLedgerDraft(supplierId, {
    entryType: SUPPLIER_LEDGER_ENTRY_TYPE.GOODS_RECEIPT,
    occurredAt: body.receivedAt,
    description: ledgerDescription,
    creditAmount: formatLedgerMoney(lineTotal),
    debitAmount: '0.00',
    balanceAfter: formatLedgerMoney(balanceAfter),
    documentNo: salesOrderId ?? body.documentNo ?? body.invoiceNo ?? null,
    salesOrderId,
    customerNameSnapshot: customerName,
    productTitleSnapshot: productTitle,
  })

  if (salesOrderId) {
    recordAuditEvent({
      id: `DOM-incoming-${id}`,
      type: DOMAIN_EVENT_TYPE.INCOMING_GOODS_RECORDED,
      aggregateId: salesOrderId,
      correlationId: `corr-${salesOrderId}-incoming-${id}`,
      module: AUDIT_MODULE.INCOMING_GOODS,
      recordId: id,
      oldValue: 'Bekliyor',
      newValue: fmtQty(body.qty),
      description: `${productTitle} · ${purposeLabel}`,
      extraPayload: {
        incomingGoodsId: id,
        orderLineId: body.orderLineId ?? null,
        productTitle,
        qty: fmtQty(body.qty),
        purposeLabel,
        supplierId,
      },
    })
  }

  return record
}

/**
 * @param {{ receivedAt?: string, purpose?: string, supplierId?: string }} [query]
 */
export async function mockListIncomingGoods(query = {}) {
  await fakeLatency(60)
  return listIncomingGoodsFromStore(query)
}

export async function mockGetIncomingGoodsKpis() {
  await fakeLatency(50)
  const todayRows = listIncomingGoodsFromStore({ receivedAt: DEMO_TODAY })
  let customerOrderCount = 0
  let stockCount = 0
  let displayCount = 0
  for (const row of todayRows) {
    if (row.purpose === INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER) customerOrderCount += 1
    else if (row.purpose === INCOMING_GOODS_PURPOSE.STOCK) stockCount += 1
    else if (row.purpose === INCOMING_GOODS_PURPOSE.DISPLAY) displayCount += 1
  }
  let totalDebt = 0
  for (const s of getAllSuppliersSnapshot()) {
    if (!s.isActive) continue
    totalDebt += getOpenBalanceForSupplier(s.id)
  }
  return /** @type {IncomingGoodsKpisDto} */ ({
    todayCount: todayRows.length,
    customerOrderCount,
    stockCount,
    displayCount,
    totalSupplierDebt: formatLedgerMoney(totalDebt),
    currency: 'TRY',
  })
}

/**
 * @param {string} [q]
 */
export async function mockListPendingOrderLines(q) {
  await fakeLatency(70)
  ensureMockOrderLinesBootstrapped()
  const orders = await getOrders()
  const orderById = new Map(orders.map((o) => [o.id, o]))
  /** @type {import('../contracts/v1/incomingGoods.js').PendingOrderLineForIncomingDto[]} */
  const out = []

  for (const line of getAllOrderLinesFlat()) {
    const order = orderById.get(line.salesOrderId)
    const displayStatus = order?.displayStatus ?? order?.status ?? ''
    if (!order || CLOSED_STATUSES.has(displayStatus)) continue
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
    const catalog = line.productId ? findProductById(line.productId) : null
    const supplierName = line.supplierNameSnapshot ?? catalog?.defaultSupplierName ?? null
    const supplierId = line.supplierId ?? catalog?.defaultSupplierId ?? null
    const customerName = order.customerDisplayName ?? order.customer ?? ''
    const productTitle =
      line.title ?? line.productTitleSnapshot ?? order.lineSummaryTitle ?? order.product ?? 'Ürün'
    if (
      !matchesIncomingPendingSearch(
        {
          customerName,
          orderNumber: line.salesOrderId,
          salesOrderId: line.salesOrderId,
          productTitle,
          supplierName,
        },
        q,
      )
    ) {
      continue
    }
    out.push({
      orderLineId: line.id,
      salesOrderId: line.salesOrderId,
      orderNumber: line.salesOrderId,
      customerName,
      productTitle,
      qtyOrdered: fmtQty(ordered),
      qtyReceived: fmtQty(received),
      qtyPending: fmtQty(ordered - received),
      dueDate: order.latestCommittedShipBy ?? order.earliestCommittedShipBy ?? order.dueDate ?? null,
      productId: line.productId ?? null,
      supplierName,
      supplierId,
      ...(catalog?.defaultSupplierId ? { defaultSupplierId: catalog.defaultSupplierId } : {}),
    })
  }

  return out.slice(0, 100)
}

/**
 * @param {string} orderId
 */
export async function mockListOrderLineReceiving(orderId) {
  await fakeLatency(50)
  const lineSeeds = getOrderLinesForSalesOrder(orderId)
  const missingItems = getMissingItemsForOrder(orderId)
  const openMissing = new Set(
    missingItems
      .filter((m) => !isMissingItemResolvedStatus(m.status) && m.lineId)
      .map((m) => m.lineId),
  )

  const lines = lineSeeds.map((line) => {
    const ordered = parseQty(line.qtyOrdered)
    const received = parseQty(line.qtyReceived ?? '0')
    const readiness = computeLineReadiness(ordered, received, openMissing.has(line.id))
    const progress = received > 0.0001 ? `Gelen: ${fmtQty(received)}/${fmtQty(ordered)}` : null
    const badgeLabel = progress ? `${progress} · ${readiness.label}` : readiness.label
    const catalog = line.productId ? findProductById(line.productId) : null
    const hints = catalogHintsFromProduct(
      catalog
        ? {
            productId: catalog.id,
            defaultSupplierId: catalog.defaultSupplierId,
            purchasePrice: catalog.purchasePrice,
          }
        : line.productId
          ? { productId: line.productId }
          : undefined,
    )
    return /** @type {OrderLineReceivingDto} */ (
      mergeReceivingDtoHints(
        {
          orderLineId: line.id,
          title: line.title ?? 'Ürün',
          qtyOrdered: fmtQty(ordered),
          qtyReceived: fmtQty(received),
          qtyPending: fmtQty(Math.max(0, ordered - received)),
          readinessStatus: readiness.status,
          readinessLabel: readiness.label,
          readinessTone: readiness.tone,
          badge: readiness.status,
          badgeLabel,
        },
        hints,
      )
    )
  })

  const summary = computeOrderReadinessSummary(lines.map((l) => ({ status: l.readinessStatus })))
  return {
    lines,
    summary: {
      ...summary,
      orderBadgeLabel: summary.orderReadyToShip ? 'Sevke hazır' : null,
    },
  }
}
