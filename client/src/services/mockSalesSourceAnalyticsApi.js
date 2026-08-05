import {
  SALES_SOURCE_TYPE,
  DISPLAY_FLOOR,
  DISPLAY_FLOOR_LABELS,
  EXTERNAL_SUPPLY_TYPE,
  EXTERNAL_SUPPLY_TYPE_LABELS,
} from '../constants/productSource.js'

/**
 * Mock Satış Kaynağı Analitiği.
 *
 * Backend `getSalesSourceAnalytics` ile aynı kuralları yansıtan basit bir JS
 * aggregator + demo sipariş seti. Kalem oranına göre tahsilat/açık bakiye
 * dağıtımı, kâr ve kâr % hesabı birebir aynı kurallarla yapılır.
 * Depo Katı (physicalLocation) demoda hiç bir satış kaleminde yer almaz —
 * bucket yalnızca satış kaynağı snapshot'ından türetilir.
 */

const UNKNOWN_BUCKET = { key: 'UNKNOWN', label: 'Bilinmeyen', group: 'UNKNOWN', sortIndex: 9 }

const BUCKETS = [
  { key: `${SALES_SOURCE_TYPE.IN_STORE_DISPLAY}:${DISPLAY_FLOOR.BASEMENT}`, label: DISPLAY_FLOOR_LABELS.BASEMENT, group: 'IN_STORE', sortIndex: 0 },
  { key: `${SALES_SOURCE_TYPE.IN_STORE_DISPLAY}:${DISPLAY_FLOOR.GROUND_FLOOR}`, label: DISPLAY_FLOOR_LABELS.GROUND_FLOOR, group: 'IN_STORE', sortIndex: 1 },
  { key: `${SALES_SOURCE_TYPE.IN_STORE_DISPLAY}:${DISPLAY_FLOOR.FIRST_FLOOR}`, label: DISPLAY_FLOOR_LABELS.FIRST_FLOOR, group: 'IN_STORE', sortIndex: 2 },
  { key: `${SALES_SOURCE_TYPE.EXTERNAL_SUPPLY}:${EXTERNAL_SUPPLY_TYPE.CATALOG}`, label: `Dış Tedarik / ${EXTERNAL_SUPPLY_TYPE_LABELS.CATALOG}`, group: 'EXTERNAL', sortIndex: 3 },
  { key: `${SALES_SOURCE_TYPE.EXTERNAL_SUPPLY}:${EXTERNAL_SUPPLY_TYPE.WEBSITE}`, label: `Dış Tedarik / ${EXTERNAL_SUPPLY_TYPE_LABELS.WEBSITE}`, group: 'EXTERNAL', sortIndex: 4 },
  { key: `${SALES_SOURCE_TYPE.EXTERNAL_SUPPLY}:${EXTERNAL_SUPPLY_TYPE.SUPPLIER_SPECIAL_ORDER}`, label: `Dış Tedarik / ${EXTERNAL_SUPPLY_TYPE_LABELS.SUPPLIER_SPECIAL_ORDER}`, group: 'EXTERNAL', sortIndex: 5 },
  { key: `${SALES_SOURCE_TYPE.EXTERNAL_SUPPLY}:${EXTERNAL_SUPPLY_TYPE.OTHER_STORE}`, label: `Dış Tedarik / ${EXTERNAL_SUPPLY_TYPE_LABELS.OTHER_STORE}`, group: 'EXTERNAL', sortIndex: 6 },
  { key: `${SALES_SOURCE_TYPE.EXTERNAL_SUPPLY}:${EXTERNAL_SUPPLY_TYPE.OTHER}`, label: `Dış Tedarik / ${EXTERNAL_SUPPLY_TYPE_LABELS.OTHER}`, group: 'EXTERNAL', sortIndex: 7 },
  { key: SALES_SOURCE_TYPE.STOCK_ITEM, label: 'Stok Ürünü', group: 'STOCK', sortIndex: 8 },
  UNKNOWN_BUCKET,
]
const BUCKET_BY_KEY = new Map(BUCKETS.map((b) => [b.key, b]))

function resolveBucket(line) {
  const s = line.soldSalesSourceType
  if (s === SALES_SOURCE_TYPE.IN_STORE_DISPLAY) {
    const k = `${SALES_SOURCE_TYPE.IN_STORE_DISPLAY}:${line.soldDisplayFloor}`
    return BUCKET_BY_KEY.get(k) ?? UNKNOWN_BUCKET
  }
  if (s === SALES_SOURCE_TYPE.EXTERNAL_SUPPLY) {
    const k = `${SALES_SOURCE_TYPE.EXTERNAL_SUPPLY}:${line.soldExternalSupplyType}`
    return BUCKET_BY_KEY.get(k) ?? UNKNOWN_BUCKET
  }
  if (s === SALES_SOURCE_TYPE.STOCK_ITEM) return BUCKET_BY_KEY.get(SALES_SOURCE_TYPE.STOCK_ITEM)
  return UNKNOWN_BUCKET
}

const money = (n) => (Math.round(n * 100) / 100).toFixed(2)
const round1 = (n) => Math.round(n * 10) / 10

function L(lineTotal, qty, unitCost, source, floor, ext, category, supplierId) {
  return {
    lineTotal,
    qtyOrdered: qty,
    soldUnitCost: unitCost,
    soldSalesSourceType: source,
    soldDisplayFloor: floor ?? null,
    soldExternalSupplyType: ext ?? null,
    category: category ?? null,
    supplierId: supplierId ?? null,
  }
}

const S = SALES_SOURCE_TYPE
const F = DISPLAY_FLOOR
const E = EXTERNAL_SUPPLY_TYPE

/** Demo siparişler — tüm kırılımları kapsar. */
const DEMO_ORDERS = [
  {
    id: 'SO-2026-0142', orderDate: '2026-05-03', salesPerson: 'Elçin Korkmaz', paidAmount: 28000, remainingAmount: 7000,
    lines: [
      L(22000, 1, 14500, S.IN_STORE_DISPLAY, F.GROUND_FLOOR, null, 'Koltuk Takımı', 'sup-marka-a'),
      L(13000, 2, 8200, S.STOCK_ITEM, null, null, 'Sehpa', 'sup-marka-b'),
    ],
  },
  {
    id: 'SO-2026-0143', orderDate: '2026-05-07', salesPerson: 'Murat Şahin', paidAmount: 18500, remainingAmount: 0,
    lines: [
      L(18500, 1, 11000, S.IN_STORE_DISPLAY, F.FIRST_FLOOR, null, 'Yatak Odası', 'sup-marka-a'),
    ],
  },
  {
    id: 'SO-2026-0144', orderDate: '2026-05-11', salesPerson: 'Elçin Korkmaz', paidAmount: 9000, remainingAmount: 16000,
    lines: [
      L(15000, 1, 9800, S.EXTERNAL_SUPPLY, null, E.CATALOG, 'Yemek Odası', 'sup-marka-c'),
      L(10000, 1, 6400, S.EXTERNAL_SUPPLY, null, E.WEBSITE, 'Aksesuar', 'sup-marka-c'),
    ],
  },
  {
    id: 'SO-2026-0145', orderDate: '2026-05-14', salesPerson: 'Selin Aydın', paidAmount: 42000, remainingAmount: 0,
    lines: [
      L(26000, 1, 17000, S.IN_STORE_DISPLAY, F.BASEMENT, null, 'Koltuk Takımı', 'sup-marka-a'),
      L(16000, 1, 10200, S.EXTERNAL_SUPPLY, null, E.SUPPLIER_SPECIAL_ORDER, 'Özel Üretim', 'sup-marka-d'),
    ],
  },
  {
    id: 'SO-2026-0146', orderDate: '2026-05-18', salesPerson: 'Murat Şahin', paidAmount: 6000, remainingAmount: 6000,
    lines: [
      L(12000, 1, 7600, S.EXTERNAL_SUPPLY, null, E.OTHER_STORE, 'Sehpa', 'sup-marka-b'),
    ],
  },
  {
    id: 'SO-2026-0147', orderDate: '2026-05-22', salesPerson: 'Selin Aydın', paidAmount: 14000, remainingAmount: 0,
    lines: [
      L(14000, 2, 9100, S.IN_STORE_DISPLAY, F.GROUND_FLOOR, null, 'Aksesuar', 'sup-marka-b'),
    ],
  },
  {
    id: 'SO-2026-0148', orderDate: '2026-05-26', salesPerson: 'Elçin Korkmaz', paidAmount: 0, remainingAmount: 9500,
    lines: [
      L(9500, 1, 6200, S.EXTERNAL_SUPPLY, null, E.OTHER, 'Diğer', 'sup-marka-d'),
    ],
  },
  {
    id: 'SO-2026-0149', orderDate: '2026-04-29', salesPerson: 'Murat Şahin', paidAmount: 8000, remainingAmount: 0,
    // eski / sınıflandırılmamış kayıt → Bilinmeyen
    lines: [
      L(8000, 1, null, null, null, null, 'Sehpa', 'sup-marka-b'),
    ],
  },
]

const round = (n) => Math.round(n * 10) / 10

/** Backend kuralı ile birebir aggregation. */
function aggregate(orders, q = {}) {
  const f = {
    from: q.from || undefined,
    to: q.to || undefined,
    salesPerson: q.salesPerson || undefined,
    salesSourceType: q.salesSourceType || undefined,
    displayFloor: q.displayFloor || undefined,
    externalSupplyType: q.externalSupplyType || undefined,
    category: q.category || undefined,
    supplierId: q.supplierId || undefined,
  }
  const acc = new Map()
  for (const o of orders) {
    if (f.from && o.orderDate < f.from) continue
    if (f.to && o.orderDate > f.to) continue
    if (f.salesPerson && (o.salesPerson ?? '') !== f.salesPerson) continue
    const sum = o.lines.reduce((s, l) => s + (l.lineTotal || 0), 0)
    const n = o.lines.length
    for (const line of o.lines) {
      if (f.salesSourceType && (line.soldSalesSourceType ?? '') !== f.salesSourceType) continue
      if (f.displayFloor && (line.soldDisplayFloor ?? '') !== f.displayFloor) continue
      if (f.externalSupplyType && (line.soldExternalSupplyType ?? '') !== f.externalSupplyType) continue
      if (f.category && (line.category ?? '') !== f.category) continue
      if (f.supplierId && (line.supplierId ?? '') !== f.supplierId) continue
      const revenue = line.lineTotal || 0
      const qty = line.qtyOrdered || 0
      const cost = (line.soldUnitCost ?? 0) * qty
      const share = sum > 0 ? revenue / sum : n > 0 ? 1 / n : 0
      const b = resolveBucket(line)
      let a = acc.get(b.key)
      if (!a) {
        a = { bucket: b, salesCount: 0, unitsSold: 0, revenue: 0, purchaseCost: 0, collected: 0, openBalance: 0, orderIds: new Set() }
        acc.set(b.key, a)
      }
      a.salesCount += 1
      a.unitsSold += qty
      a.revenue += revenue
      a.purchaseCost += cost
      a.collected += o.paidAmount * share
      a.openBalance += o.remainingAmount * share
      a.orderIds.add(o.id)
    }
  }
  const totalRevenue = [...acc.values()].reduce((s, a) => s + a.revenue, 0)
  const rows = [...acc.values()]
    .sort((a, b) => a.bucket.sortIndex - b.bucket.sortIndex)
    .map((a) => {
      const profit = a.revenue - a.purchaseCost
      return {
        key: a.bucket.key,
        label: a.bucket.label,
        group: a.bucket.group,
        salesCount: a.salesCount,
        orderCount: a.orderIds.size,
        unitsSold: round(a.unitsSold),
        revenue: money(a.revenue),
        purchaseCost: money(a.purchaseCost),
        profit: money(profit),
        profitMarginPct: a.revenue > 0 ? round1((profit / a.revenue) * 100) : 0,
        collected: money(a.collected),
        openBalance: money(a.openBalance),
        revenueSharePct: totalRevenue > 0 ? round1((a.revenue / totalRevenue) * 100) : 0,
      }
    })
  const totalCost = [...acc.values()].reduce((s, a) => s + a.purchaseCost, 0)
  const allOrders = new Set()
  for (const a of acc.values()) for (const id of a.orderIds) allOrders.add(id)
  return {
    rows,
    totals: {
      salesCount: rows.reduce((s, r) => s + r.salesCount, 0),
      orderCount: allOrders.size,
      unitsSold: round([...acc.values()].reduce((s, a) => s + a.unitsSold, 0)),
      revenue: money(totalRevenue),
      purchaseCost: money(totalCost),
      profit: money(totalRevenue - totalCost),
      profitMarginPct: totalRevenue > 0 ? round1(((totalRevenue - totalCost) / totalRevenue) * 100) : 0,
      collected: money([...acc.values()].reduce((s, a) => s + a.collected, 0)),
      openBalance: money([...acc.values()].reduce((s, a) => s + a.openBalance, 0)),
    },
    filters: {
      from: f.from ?? null, to: f.to ?? null, salesPerson: f.salesPerson ?? null,
      salesSourceType: f.salesSourceType ?? null, displayFloor: f.displayFloor ?? null,
      externalSupplyType: f.externalSupplyType ?? null, category: f.category ?? null, supplierId: f.supplierId ?? null,
    },
    currency: 'TRY',
    generatedAt: new Date().toISOString(),
  }
}

/** Demo filtre seçenekleri (personel/kategori/tedarikçi). */
export function mockSalesSourceAnalyticsFacets() {
  const persons = new Set()
  const categories = new Set()
  const suppliers = new Set()
  for (const o of DEMO_ORDERS) {
    if (o.salesPerson) persons.add(o.salesPerson)
    for (const l of o.lines) {
      if (l.category) categories.add(l.category)
      if (l.supplierId) suppliers.add(l.supplierId)
    }
  }
  return {
    salesPersons: [...persons].sort(),
    categories: [...categories].sort(),
    suppliers: [...suppliers].sort().map((id) => ({ id, name: id })),
  }
}

export async function mockGetSalesSourceAnalytics(query = {}) {
  return aggregate(DEMO_ORDERS, query)
}
