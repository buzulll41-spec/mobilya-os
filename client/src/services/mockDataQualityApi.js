import {
  SALES_SOURCE_TYPE,
  SALES_SOURCE_TYPE_LABELS,
  DISPLAY_FLOOR,
  DISPLAY_FLOOR_LABELS,
  EXTERNAL_SUPPLY_TYPE,
  EXTERNAL_SUPPLY_TYPE_LABELS,
} from '../constants/productSource.js'

/**
 * Mock Veri Kalitesi Merkezi.
 * Backend `getDataQualityReport` ile birebir aynı skor kurallarını yansıtır.
 * physicalLocation burada hiç değerlendirilmez (satış kaynağı değildir).
 */

const PENALTY = {
  UNKNOWN_SOURCE: 40,
  MISSING_DISPLAY_FLOOR: 20,
  MISSING_EXTERNAL_SUPPLY_TYPE: 20,
  ZERO_COST: 30,
  SOURCE_CONFLICT: 30,
}

const ISSUE_META = {
  UNKNOWN_SOURCE: { label: 'Bilinmeyen Kaynak', severity: 'warning' },
  MISSING_DISPLAY_FLOOR: { label: 'Eksik Sergi Katı', severity: 'warning' },
  MISSING_EXTERNAL_SUPPLY_TYPE: { label: 'Eksik Dış Tedarik Tipi', severity: 'warning' },
  ZERO_COST: { label: 'Alış Maliyeti Yok', severity: 'critical' },
  SOURCE_CONFLICT: { label: 'Satış Kaynağı Çelişkisi', severity: 'critical' },
}

const ISSUE_CODES = Object.keys(ISSUE_META)
const money = (n) => (Math.round(n * 100) / 100).toFixed(2)
const round1 = (n) => Math.round(n * 10) / 10

function issue(code) {
  return { code, label: ISSUE_META[code].label, severity: ISSUE_META[code].severity, penalty: PENALTY[code] }
}

function scoreRecord(r) {
  const issues = []
  const source = (r.soldSalesSourceType ?? '').trim()
  const floor = (r.soldDisplayFloor ?? '').trim()
  const ext = (r.soldExternalSupplyType ?? '').trim()
  const cost = r.soldUnitCost ?? 0

  if (!(cost > 0)) issues.push(issue('ZERO_COST'))

  if (source === '' || source === SALES_SOURCE_TYPE.UNKNOWN) {
    issues.push(issue('UNKNOWN_SOURCE'))
  } else if (source in SALES_SOURCE_TYPE_LABELS) {
    if (source === SALES_SOURCE_TYPE.IN_STORE_DISPLAY && !(floor in DISPLAY_FLOOR_LABELS)) {
      issues.push(issue('MISSING_DISPLAY_FLOOR'))
    } else if (source === SALES_SOURCE_TYPE.EXTERNAL_SUPPLY && !(ext in EXTERNAL_SUPPLY_TYPE_LABELS)) {
      issues.push(issue('MISSING_EXTERNAL_SUPPLY_TYPE'))
    }
  } else {
    issues.push(issue('SOURCE_CONFLICT'))
  }

  const penaltySum = issues.reduce((s, i) => s + i.penalty, 0)
  const qualityScore = Math.max(0, Math.min(100, 100 - penaltySum))
  return { issues, qualityScore, status: issues.length === 0 ? 'OK' : 'PROBLEM' }
}

function sourceLabel(source) {
  if (!source) return 'Bilinmeyen'
  if (source in SALES_SOURCE_TYPE_LABELS) return SALES_SOURCE_TYPE_LABELS[source]
  return source
}

const S = SALES_SOURCE_TYPE
const F = DISPLAY_FLOOR
const E = EXTERNAL_SUPPLY_TYPE

/** Demo kayıtlar — tüm problem kategorilerini ve temiz kayıtları kapsar. */
const DEMO_RECORDS = [
  { orderLineId: 'OL-0142-1', orderId: 'SO-2026-0142', orderDate: '2026-05-03', customerName: 'Aylin Demir', productTitle: 'Koltuk Takımı 3+3+1', salesPerson: 'Elçin Korkmaz', soldSalesSourceType: S.IN_STORE_DISPLAY, soldDisplayFloor: F.GROUND_FLOOR, soldExternalSupplyType: null, soldUnitCost: 14500 },
  { orderLineId: 'OL-0142-2', orderId: 'SO-2026-0142', orderDate: '2026-05-03', customerName: 'Aylin Demir', productTitle: 'Orta Sehpa', salesPerson: 'Elçin Korkmaz', soldSalesSourceType: S.STOCK_ITEM, soldDisplayFloor: null, soldExternalSupplyType: null, soldUnitCost: 8200 },
  { orderLineId: 'OL-0143-1', orderId: 'SO-2026-0143', orderDate: '2026-05-07', customerName: 'Kerem Yıldız', productTitle: 'Yatak Odası Takımı', salesPerson: 'Murat Şahin', soldSalesSourceType: S.IN_STORE_DISPLAY, soldDisplayFloor: null, soldExternalSupplyType: null, soldUnitCost: 11000 }, // eksik kat
  { orderLineId: 'OL-0144-1', orderId: 'SO-2026-0144', orderDate: '2026-05-11', customerName: 'Selin Aydın', productTitle: 'Yemek Masası', salesPerson: 'Elçin Korkmaz', soldSalesSourceType: S.EXTERNAL_SUPPLY, soldDisplayFloor: null, soldExternalSupplyType: E.CATALOG, soldUnitCost: 9800 },
  { orderLineId: 'OL-0144-2', orderId: 'SO-2026-0144', orderDate: '2026-05-11', customerName: 'Selin Aydın', productTitle: 'Avize', salesPerson: 'Elçin Korkmaz', soldSalesSourceType: S.EXTERNAL_SUPPLY, soldDisplayFloor: null, soldExternalSupplyType: null, soldUnitCost: 0 }, // eksik tip + 0 maliyet
  { orderLineId: 'OL-0145-1', orderId: 'SO-2026-0145', orderDate: '2026-05-14', customerName: 'Ahmet Koç', productTitle: 'Köşe Koltuk', salesPerson: 'Selin Aydın', soldSalesSourceType: S.IN_STORE_DISPLAY, soldDisplayFloor: F.BASEMENT, soldExternalSupplyType: null, soldUnitCost: 17000 },
  { orderLineId: 'OL-0146-1', orderId: 'SO-2026-0146', orderDate: '2026-05-18', customerName: 'Zeynep Arslan', productTitle: 'Tv Ünitesi', salesPerson: 'Murat Şahin', soldSalesSourceType: 'WAREHOUSE', soldDisplayFloor: null, soldExternalSupplyType: null, soldUnitCost: 7600 }, // eski/çelişkili kaynak
  { orderLineId: 'OL-0147-1', orderId: 'SO-2026-0147', orderDate: '2026-05-22', customerName: 'Burak Çelik', productTitle: 'Dekoratif Vazo', salesPerson: 'Selin Aydın', soldSalesSourceType: S.IN_STORE_DISPLAY, soldDisplayFloor: F.GROUND_FLOOR, soldExternalSupplyType: null, soldUnitCost: 9100 },
  { orderLineId: 'OL-0148-1', orderId: 'SO-2026-0148', orderDate: '2026-05-26', customerName: 'Hülya Şen', productTitle: 'Özel Üretim Gardırop', salesPerson: 'Elçin Korkmaz', soldSalesSourceType: S.EXTERNAL_SUPPLY, soldDisplayFloor: null, soldExternalSupplyType: E.SUPPLIER_SPECIAL_ORDER, soldUnitCost: 10200 },
  { orderLineId: 'OL-0149-1', orderId: 'SO-2026-0149', orderDate: '2026-04-29', customerName: 'Eski Kayıt', productTitle: 'Klasik Sehpa', salesPerson: 'Murat Şahin', soldSalesSourceType: null, soldDisplayFloor: null, soldExternalSupplyType: null, soldUnitCost: null }, // UNKNOWN + 0 maliyet
]

function evaluate(records, q = {}) {
  const fFrom = q.from || undefined
  const fTo = q.to || undefined
  const fSalesPerson = q.salesPerson || undefined
  const fStatusRaw = (q.status || '').toLowerCase()
  const fStatus = fStatusRaw === 'problem' || fStatusRaw === 'clean' ? fStatusRaw : undefined
  const fIssue = q.issueCode || undefined
  const fq = q.q ? q.q.toLocaleLowerCase('tr') : undefined

  const rows = []
  const issueCounts = new Map()
  const orderIds = new Set()
  let scoreSum = 0
  let cleanRecords = 0
  let problemRecords = 0
  let unknownCount = 0
  let missingCostCount = 0

  for (const r of records) {
    if (fFrom && r.orderDate < fFrom) continue
    if (fTo && r.orderDate > fTo) continue
    if (fSalesPerson && (r.salesPerson ?? '') !== fSalesPerson) continue
    if (fq) {
      const hay = `${r.orderId} ${r.customerName} ${r.productTitle} ${r.salesPerson ?? ''}`.toLocaleLowerCase('tr')
      if (!hay.includes(fq)) continue
    }

    const scored = scoreRecord(r)
    if (fStatus === 'problem' && scored.status !== 'PROBLEM') continue
    if (fStatus === 'clean' && scored.status !== 'OK') continue
    if (fIssue && !scored.issues.some((i) => i.code === fIssue)) continue

    const source = (r.soldSalesSourceType ?? '').trim()
    const floor = (r.soldDisplayFloor ?? '').trim()
    const ext = (r.soldExternalSupplyType ?? '').trim()

    rows.push({
      orderLineId: r.orderLineId,
      orderId: r.orderId,
      orderDate: r.orderDate,
      customerName: r.customerName,
      productTitle: r.productTitle,
      salesPerson: r.salesPerson ?? null,
      soldSalesSourceType: r.soldSalesSourceType ?? null,
      soldSalesSourceTypeLabel: sourceLabel(source),
      soldDisplayFloor: r.soldDisplayFloor ?? null,
      soldDisplayFloorLabel: floor in DISPLAY_FLOOR_LABELS ? DISPLAY_FLOOR_LABELS[floor] : null,
      soldExternalSupplyType: r.soldExternalSupplyType ?? null,
      soldExternalSupplyTypeLabel: ext in EXTERNAL_SUPPLY_TYPE_LABELS ? EXTERNAL_SUPPLY_TYPE_LABELS[ext] : null,
      soldUnitCost: money(r.soldUnitCost ?? 0),
      qualityScore: scored.qualityScore,
      status: scored.status,
      issues: scored.issues,
    })

    orderIds.add(r.orderId)
    scoreSum += scored.qualityScore
    if (scored.status === 'OK') cleanRecords += 1
    else problemRecords += 1
    for (const i of scored.issues) {
      issueCounts.set(i.code, (issueCounts.get(i.code) ?? 0) + 1)
      if (i.code === 'UNKNOWN_SOURCE') unknownCount += 1
      if (i.code === 'ZERO_COST') missingCostCount += 1
    }
  }

  const totalRecords = rows.length
  const issueCategories = ISSUE_CODES.map((code) => ({
    code,
    label: ISSUE_META[code].label,
    severity: ISSUE_META[code].severity,
    count: issueCounts.get(code) ?? 0,
  }))

  rows.sort((a, b) => {
    if (a.qualityScore !== b.qualityScore) return a.qualityScore - b.qualityScore
    return a.orderDate < b.orderDate ? 1 : a.orderDate > b.orderDate ? -1 : 0
  })

  return {
    rows,
    totals: {
      totalOrders: orderIds.size,
      totalRecords,
      cleanRecords,
      problemRecords,
      unknownCount,
      missingCostCount,
      averageQualityScore: totalRecords > 0 ? round1(scoreSum / totalRecords) : 100,
    },
    issueCategories,
    filters: {
      from: fFrom ?? null,
      to: fTo ?? null,
      salesPerson: fSalesPerson ?? null,
      status: fStatus ?? null,
      issueCode: fIssue ?? null,
      q: fq ?? null,
    },
    currency: 'TRY',
    generatedAt: new Date().toISOString(),
  }
}

export function mockDataQualityFacets() {
  const persons = new Set()
  for (const r of DEMO_RECORDS) if (r.salesPerson) persons.add(r.salesPerson)
  return { salesPersons: [...persons].sort() }
}

export async function mockGetDataQuality(query = {}) {
  return evaluate(DEMO_RECORDS, query)
}
