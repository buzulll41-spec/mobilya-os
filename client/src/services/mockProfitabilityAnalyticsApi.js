import {
  SALES_SOURCE_TYPE,
  DISPLAY_FLOOR,
  DISPLAY_FLOOR_LABELS,
  EXTERNAL_SUPPLY_TYPE,
  EXTERNAL_SUPPLY_TYPE_LABELS,
} from '../constants/productSource.js'

/**
 * Mock Kârlılık Analitiği — backend `getProfitabilityAnalytics` ile aynı kurallar.
 * Ürün kârlılığı yalnızca snapshot alanlarından hesaplanır. Depo Katı satış
 * kaynağı kırılımına asla girmez.
 */

const UNKNOWN_BUCKET = { key: 'UNKNOWN', label: 'Bilinmeyen' }
const BUCKETS = new Map([
  [`${SALES_SOURCE_TYPE.IN_STORE_DISPLAY}:${DISPLAY_FLOOR.BASEMENT}`, DISPLAY_FLOOR_LABELS.BASEMENT],
  [`${SALES_SOURCE_TYPE.IN_STORE_DISPLAY}:${DISPLAY_FLOOR.GROUND_FLOOR}`, DISPLAY_FLOOR_LABELS.GROUND_FLOOR],
  [`${SALES_SOURCE_TYPE.IN_STORE_DISPLAY}:${DISPLAY_FLOOR.FIRST_FLOOR}`, DISPLAY_FLOOR_LABELS.FIRST_FLOOR],
  [`${SALES_SOURCE_TYPE.EXTERNAL_SUPPLY}:${EXTERNAL_SUPPLY_TYPE.CATALOG}`, `Dış Tedarik / ${EXTERNAL_SUPPLY_TYPE_LABELS.CATALOG}`],
  [`${SALES_SOURCE_TYPE.EXTERNAL_SUPPLY}:${EXTERNAL_SUPPLY_TYPE.WEBSITE}`, `Dış Tedarik / ${EXTERNAL_SUPPLY_TYPE_LABELS.WEBSITE}`],
  [`${SALES_SOURCE_TYPE.EXTERNAL_SUPPLY}:${EXTERNAL_SUPPLY_TYPE.SUPPLIER_SPECIAL_ORDER}`, `Dış Tedarik / ${EXTERNAL_SUPPLY_TYPE_LABELS.SUPPLIER_SPECIAL_ORDER}`],
  [`${SALES_SOURCE_TYPE.EXTERNAL_SUPPLY}:${EXTERNAL_SUPPLY_TYPE.OTHER_STORE}`, `Dış Tedarik / ${EXTERNAL_SUPPLY_TYPE_LABELS.OTHER_STORE}`],
  [`${SALES_SOURCE_TYPE.EXTERNAL_SUPPLY}:${EXTERNAL_SUPPLY_TYPE.OTHER}`, `Dış Tedarik / ${EXTERNAL_SUPPLY_TYPE_LABELS.OTHER}`],
  [SALES_SOURCE_TYPE.STOCK_ITEM, 'Stok Ürünü'],
])

function resolveSourceBucket(line) {
  const s = line.soldSalesSourceType
  if (s === SALES_SOURCE_TYPE.IN_STORE_DISPLAY && line.soldDisplayFloor in DISPLAY_FLOOR_LABELS) {
    const k = `${s}:${line.soldDisplayFloor}`
    return { key: k, label: BUCKETS.get(k) ?? UNKNOWN_BUCKET.label }
  }
  if (s === SALES_SOURCE_TYPE.EXTERNAL_SUPPLY && line.soldExternalSupplyType in EXTERNAL_SUPPLY_TYPE_LABELS) {
    const k = `${s}:${line.soldExternalSupplyType}`
    return { key: k, label: BUCKETS.get(k) ?? UNKNOWN_BUCKET.label }
  }
  if (s === SALES_SOURCE_TYPE.STOCK_ITEM) return { key: s, label: BUCKETS.get(s) }
  return UNKNOWN_BUCKET
}

const money = (n) => (Math.round(n * 100) / 100).toFixed(2)
const round1 = (n) => Math.round(n * 10) / 10
const MONTH_TR = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
const monthLabel = (ym) => {
  const [y, m] = ym.split('-')
  const i = Number.parseInt(m, 10) - 1
  return i >= 0 && i < 12 ? `${MONTH_TR[i]} ${y}` : ym
}

const S = SALES_SOURCE_TYPE
const F = DISPLAY_FLOOR
const E = EXTERNAL_SUPPLY_TYPE

function L(o) {
  return {
    lineTotal: o.lineTotal,
    qtyOrdered: o.qty ?? 1,
    soldUnitCost: o.cost ?? null,
    soldSalesSourceType: o.source ?? null,
    soldDisplayFloor: o.floor ?? null,
    soldExternalSupplyType: o.ext ?? null,
    supplierId: o.supplierId ?? null,
    supplierName: o.supplierName ?? null,
    category: o.category ?? null,
    brand: o.supplierName ?? null,
    productId: o.productId ?? null,
    productTitle: o.productTitle ?? 'Ürün',
  }
}

/** Demo siparişler — tüm kırılımları kapsar. */
const DEMO_ORDERS = [
  { id: 'SO-0142', orderDate: '2026-05-03', salesPerson: 'Elçin Korkmaz', customerName: 'Aylin Demir', paidAmount: 35000, remainingAmount: 0, riskLevel: 'NONE',
    lines: [L({ lineTotal: 22000, qty: 1, cost: 14500, source: S.IN_STORE_DISPLAY, floor: F.GROUND_FLOOR, supplierId: 'sup-a', supplierName: 'Marka A', category: 'Koltuk Takımı', productId: 'P-100', productTitle: 'Berjer Koltuk' }),
            L({ lineTotal: 13000, qty: 2, cost: 8200, source: S.STOCK_ITEM, supplierId: 'sup-b', supplierName: 'Marka B', category: 'Sehpa', productId: 'P-200', productTitle: 'Orta Sehpa' })] },
  { id: 'SO-0143', orderDate: '2026-05-07', salesPerson: 'Murat Şahin', customerName: 'Kerem Yıldız', paidAmount: 9000, remainingAmount: 9500, riskLevel: 'MEDIUM',
    lines: [L({ lineTotal: 18500, qty: 1, cost: 11000, source: S.IN_STORE_DISPLAY, floor: F.FIRST_FLOOR, supplierId: 'sup-a', supplierName: 'Marka A', category: 'Yatak Odası', productId: 'P-300', productTitle: 'Yatak Odası Takımı' })] },
  { id: 'SO-0144', orderDate: '2026-05-11', salesPerson: 'Elçin Korkmaz', customerName: 'Selin Aydın', paidAmount: 0, remainingAmount: 25000, riskLevel: 'HIGH',
    lines: [L({ lineTotal: 15000, qty: 1, cost: 9800, source: S.EXTERNAL_SUPPLY, ext: E.CATALOG, supplierId: 'sup-c', supplierName: 'Marka C', category: 'Yemek Odası', productId: 'P-400', productTitle: 'Yemek Masası' }),
            L({ lineTotal: 10000, qty: 1, cost: 6400, source: S.EXTERNAL_SUPPLY, ext: E.WEBSITE, supplierId: 'sup-c', supplierName: 'Marka C', category: 'Aksesuar', productId: 'P-500', productTitle: 'Avize' })] },
  { id: 'SO-0145', orderDate: '2026-05-14', salesPerson: 'Selin Aydın', customerName: 'Ahmet Koç', paidAmount: 42000, remainingAmount: 0, riskLevel: 'NONE',
    lines: [L({ lineTotal: 26000, qty: 1, cost: 17000, source: S.IN_STORE_DISPLAY, floor: F.BASEMENT, supplierId: 'sup-a', supplierName: 'Marka A', category: 'Koltuk Takımı', productId: 'P-100', productTitle: 'Berjer Koltuk' }),
            L({ lineTotal: 16000, qty: 1, cost: 10200, source: S.EXTERNAL_SUPPLY, ext: E.SUPPLIER_SPECIAL_ORDER, supplierId: 'sup-d', supplierName: 'Marka D', category: 'Özel Üretim', productId: 'P-600', productTitle: 'Özel Gardırop' })] },
  { id: 'SO-0146', orderDate: '2026-04-18', salesPerson: 'Murat Şahin', customerName: 'Zeynep Arslan', paidAmount: 6000, remainingAmount: 6000, riskLevel: 'MEDIUM',
    lines: [L({ lineTotal: 12000, qty: 1, cost: 7600, source: S.EXTERNAL_SUPPLY, ext: E.OTHER_STORE, supplierId: 'sup-b', supplierName: 'Marka B', category: 'Sehpa', productId: 'P-200', productTitle: 'Orta Sehpa' })] },
  { id: 'SO-0147', orderDate: '2026-04-22', salesPerson: 'Selin Aydın', customerName: 'Burak Çelik', paidAmount: 14000, remainingAmount: 0, riskLevel: 'NONE',
    lines: [L({ lineTotal: 14000, qty: 2, cost: 9100, source: S.IN_STORE_DISPLAY, floor: F.GROUND_FLOOR, supplierId: 'sup-b', supplierName: 'Marka B', category: 'Aksesuar', productId: 'P-700', productTitle: 'Dekoratif Vazo' })] },
  { id: 'SO-0148', orderDate: '2026-03-26', salesPerson: 'Elçin Korkmaz', customerName: 'Hülya Şen', paidAmount: 0, remainingAmount: 9500, riskLevel: 'HIGH',
    lines: [L({ lineTotal: 9500, qty: 1, cost: 6200, source: S.EXTERNAL_SUPPLY, ext: E.OTHER, supplierId: 'sup-d', supplierName: 'Marka D', category: 'Diğer', productId: 'P-800', productTitle: 'Karma Ürün' })] },
  { id: 'SO-0149', orderDate: '2026-03-29', salesPerson: 'Murat Şahin', customerName: 'Eski Kayıt', paidAmount: 8000, remainingAmount: 0, riskLevel: 'NONE',
    lines: [L({ lineTotal: 8000, qty: 1, cost: null, source: null, supplierId: 'sup-b', supplierName: 'Marka B', category: 'Sehpa', productId: 'P-200', productTitle: 'Orta Sehpa' })] },
]

function groupKey(groupBy, line, order) {
  switch (groupBy) {
    case 'salesPerson': return { key: order.salesPerson || 'UNASSIGNED', label: order.salesPerson || 'Atanmamış' }
    case 'supplier': return { key: line.supplierId || 'NONE', label: line.supplierName || 'Tedarikçi yok' }
    case 'category': return { key: line.category || 'NONE', label: line.category || 'Kategori yok' }
    case 'brand': return { key: line.brand || 'NONE', label: line.brand || 'Marka yok' }
    case 'product': return { key: line.productId || `t:${line.productTitle}`, label: line.productTitle || 'Ürün' }
    case 'month': { const ym = order.orderDate.slice(0, 7); return { key: ym, label: monthLabel(ym) } }
    case 'year': { const y = order.orderDate.slice(0, 4); return { key: y, label: y } }
    default: return resolveSourceBucket(line)
  }
}

function buildDetail(acc) {
  const months = [...acc.months.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(-12)
    .map(([month, v]) => ({ month, revenue: money(v.revenue), grossProfit: money(v.grossProfit) }))
  const riskRank = { NONE: 0, MEDIUM: 1, HIGH: 2 }
  let biggestOrder = null
  let riskiestOrder = null
  for (const [orderId, o] of acc.orders) {
    if (!biggestOrder || o.revenue > Number.parseFloat(biggestOrder.revenue)) biggestOrder = { orderId, revenue: money(o.revenue) }
    if (!riskiestOrder || riskRank[o.riskLevel] > riskRank[riskiestOrder.riskLevel] ||
      (riskRank[o.riskLevel] === riskRank[riskiestOrder.riskLevel] && o.openBalance > Number.parseFloat(riskiestOrder.openBalance))) {
      riskiestOrder = { orderId, openBalance: money(o.openBalance), riskLevel: o.riskLevel }
    }
  }
  let topProductByUnits = null
  let topProductByProfit = null
  for (const p of acc.products.values()) {
    if (!topProductByUnits || p.units > topProductByUnits.units) topProductByUnits = { title: p.title, units: round1(p.units) }
    if (!topProductByProfit || p.grossProfit > Number.parseFloat(topProductByProfit.grossProfit)) topProductByProfit = { title: p.title, grossProfit: money(p.grossProfit) }
  }
  const gross = acc.revenue - acc.purchaseCost
  return {
    months,
    totalOrders: acc.orderIds.size,
    totalGrossProfit: money(gross),
    avgMarginPct: acc.revenue > 0 ? round1((gross / acc.revenue) * 100) : 0,
    biggestOrder, riskiestOrder, topProductByUnits, topProductByProfit,
  }
}

function miniRows(map) {
  return [...map.values()].sort((a, b) => b.grossProfit - a.grossProfit)
    .map((m) => ({ key: m.key, label: m.label, revenue: money(m.revenue), grossProfit: money(m.grossProfit) }))
}

function aggregate(orders, q = {}) {
  const groupBy = q.groupBy || 'source'
  const f = {
    from: q.from || undefined, to: q.to || undefined, salesPerson: q.salesPerson || undefined,
    salesSourceType: q.salesSourceType || undefined, category: q.category || undefined, brand: q.brand || undefined,
    supplierId: q.supplierId || undefined, productId: q.productId || undefined,
    customer: q.customer ? q.customer.toLocaleLowerCase('tr') : undefined,
    paymentStatus: q.paymentStatus || undefined, riskLevel: q.riskLevel ? q.riskLevel.toUpperCase() : undefined,
  }
  const rowsMap = new Map()
  const sourceMap = new Map()
  const personMap = new Map()

  for (const order of orders) {
    if (f.from && order.orderDate < f.from) continue
    if (f.to && order.orderDate > f.to) continue
    if (f.salesPerson && (order.salesPerson ?? '') !== f.salesPerson) continue
    if (f.customer && !order.customerName.toLocaleLowerCase('tr').includes(f.customer)) continue
    if (f.riskLevel && order.riskLevel !== f.riskLevel) continue
    const paymentStatus = order.remainingAmount <= 0.0001 ? 'paid' : order.paidAmount <= 0.0001 ? 'open' : 'partial'
    if (f.paymentStatus && paymentStatus !== f.paymentStatus) continue

    const orderRevenueSum = order.lines.reduce((s, l) => s + (l.lineTotal || 0), 0)
    const n = order.lines.length
    const collectionRate = orderRevenueSum > 0 ? Math.min(1, Math.max(0, order.paidAmount / orderRevenueSum)) : order.paidAmount > 0 ? 1 : 0
    const ym = order.orderDate.slice(0, 7)

    for (const line of order.lines) {
      if (f.salesSourceType && (line.soldSalesSourceType ?? '') !== f.salesSourceType) continue
      if (f.category && (line.category ?? '') !== f.category) continue
      if (f.brand && (line.brand ?? '') !== f.brand) continue
      if (f.supplierId && (line.supplierId ?? '') !== f.supplierId) continue
      if (f.productId && (line.productId ?? '') !== f.productId) continue

      const revenue = line.lineTotal || 0
      const qty = line.qtyOrdered || 0
      const cost = (line.soldUnitCost ?? 0) * qty
      const gross = revenue - cost
      const share = orderRevenueSum > 0 ? revenue / orderRevenueSum : n > 0 ? 1 / n : 0
      const collected = order.paidAmount * share
      const openBalance = order.remainingAmount * share
      const risky = order.riskLevel === 'HIGH' ? openBalance : 0
      const realized = gross * collectionRate
      const pending = gross - realized

      const { key, label } = groupKey(groupBy, line, order)
      let a = rowsMap.get(key)
      if (!a) {
        a = { key, label, salesCount: 0, unitsSold: 0, revenue: 0, purchaseCost: 0, collected: 0, openBalance: 0, riskyReceivable: 0, realizedProfit: 0, pendingProfit: 0, orderIds: new Set(), months: new Map(), orders: new Map(), products: new Map() }
        rowsMap.set(key, a)
      }
      a.salesCount += 1; a.unitsSold += qty; a.revenue += revenue; a.purchaseCost += cost
      a.collected += collected; a.openBalance += openBalance; a.riskyReceivable += risky
      a.realizedProfit += realized; a.pendingProfit += pending; a.orderIds.add(order.id)
      const mo = a.months.get(ym) ?? { revenue: 0, grossProfit: 0 }; mo.revenue += revenue; mo.grossProfit += gross; a.months.set(ym, mo)
      const oo = a.orders.get(order.id) ?? { revenue: 0, openBalance: 0, riskLevel: order.riskLevel }; oo.revenue += revenue; oo.openBalance += openBalance; a.orders.set(order.id, oo)
      const pk = line.productId || `t:${line.productTitle}`
      const pp = a.products.get(pk) ?? { title: line.productTitle || 'Ürün', units: 0, grossProfit: 0 }; pp.units += qty; pp.grossProfit += gross; a.products.set(pk, pp)

      const sb = resolveSourceBucket(line)
      const sa = sourceMap.get(sb.key) ?? { key: sb.key, label: sb.label, revenue: 0, grossProfit: 0 }; sa.revenue += revenue; sa.grossProfit += gross; sourceMap.set(sb.key, sa)
      const pKey = order.salesPerson || 'UNASSIGNED'
      const pa = personMap.get(pKey) ?? { key: pKey, label: order.salesPerson || 'Atanmamış', revenue: 0, grossProfit: 0 }; pa.revenue += revenue; pa.grossProfit += gross; personMap.set(pKey, pa)
    }
  }

  const all = [...rowsMap.values()]
  const totalRevenue = all.reduce((s, a) => s + a.revenue, 0)
  const totalCost = all.reduce((s, a) => s + a.purchaseCost, 0)
  const totalGross = totalRevenue - totalCost
  const rows = all.map((a) => {
    const gross = a.revenue - a.purchaseCost
    return {
      key: a.key, label: a.label, groupBy,
      salesCount: a.salesCount, orderCount: a.orderIds.size, unitsSold: round1(a.unitsSold),
      revenue: money(a.revenue), purchaseCost: money(a.purchaseCost), grossProfit: money(gross),
      profitMarginPct: a.revenue > 0 ? round1((gross / a.revenue) * 100) : 0,
      collected: money(a.collected), openBalance: money(a.openBalance), riskyReceivable: money(a.riskyReceivable),
      realizedProfit: money(a.realizedProfit), pendingProfit: money(a.pendingProfit),
      revenueSharePct: totalRevenue > 0 ? round1((a.revenue / totalRevenue) * 100) : 0,
      profitSharePct: totalGross !== 0 ? round1((gross / totalGross) * 100) : 0,
      detail: buildDetail(a),
    }
  }).sort((a, b) => Number.parseFloat(b.revenue) - Number.parseFloat(a.revenue))

  const allOrders = new Set()
  for (const a of all) for (const id of a.orderIds) allOrders.add(id)
  const sourceRows = miniRows(sourceMap)
  const personRows = miniRows(personMap)

  return {
    groupBy, rows,
    summary: {
      revenue: money(totalRevenue), grossProfit: money(totalGross),
      profitMarginPct: totalRevenue > 0 ? round1((totalGross / totalRevenue) * 100) : 0,
      realizedProfit: money(all.reduce((s, a) => s + a.realizedProfit, 0)),
      pendingProfit: money(all.reduce((s, a) => s + a.pendingProfit, 0)),
      riskyReceivable: money(all.reduce((s, a) => s + a.riskyReceivable, 0)),
      mostProfitableSource: sourceRows[0] ?? null,
      mostProfitableSalesPerson: personRows[0] ?? null,
    },
    totals: {
      salesCount: all.reduce((s, a) => s + a.salesCount, 0), orderCount: allOrders.size,
      unitsSold: round1(all.reduce((s, a) => s + a.unitsSold, 0)),
      revenue: money(totalRevenue), purchaseCost: money(totalCost), grossProfit: money(totalGross),
      profitMarginPct: totalRevenue > 0 ? round1((totalGross / totalRevenue) * 100) : 0,
      collected: money(all.reduce((s, a) => s + a.collected, 0)),
      openBalance: money(all.reduce((s, a) => s + a.openBalance, 0)),
      riskyReceivable: money(all.reduce((s, a) => s + a.riskyReceivable, 0)),
      realizedProfit: money(all.reduce((s, a) => s + a.realizedProfit, 0)),
      pendingProfit: money(all.reduce((s, a) => s + a.pendingProfit, 0)),
    },
    breakdowns: { source: sourceRows, salesPerson: personRows },
    filters: {
      from: f.from ?? null, to: f.to ?? null, salesPerson: f.salesPerson ?? null,
      salesSourceType: f.salesSourceType ?? null, category: f.category ?? null, brand: f.brand ?? null,
      supplierId: f.supplierId ?? null, productId: f.productId ?? null, customer: q.customer ?? null,
      paymentStatus: f.paymentStatus ?? null, riskLevel: f.riskLevel ?? null,
    },
    currency: 'TRY', generatedAt: new Date().toISOString(),
  }
}

export function mockProfitabilityFacets() {
  const persons = new Set(), categories = new Set(), suppliers = new Map(), brands = new Set()
  for (const o of DEMO_ORDERS) {
    if (o.salesPerson) persons.add(o.salesPerson)
    for (const l of o.lines) {
      if (l.category) categories.add(l.category)
      if (l.supplierId) suppliers.set(l.supplierId, l.supplierName || l.supplierId)
      if (l.brand) brands.add(l.brand)
    }
  }
  return {
    salesPersons: [...persons].sort(),
    categories: [...categories].sort(),
    suppliers: [...suppliers.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'tr')),
    brands: [...brands].sort(),
  }
}

export async function mockGetProfitabilityAnalytics(query = {}) {
  return aggregate(DEMO_ORDERS, query)
}
