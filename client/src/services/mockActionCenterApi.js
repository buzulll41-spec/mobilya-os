import { getOrders } from './mockApi.js'
import { mockGetProfitabilityAnalytics } from './mockProfitabilityAnalyticsApi.js'
import { mockGetDataQuality } from './mockDataQualityApi.js'
import { mockGetForecastEngine } from './mockForecastEngineApi.js'

/**
 * Mock Otomatik Aksiyon Merkezi — backend `buildActions` kural motorunun birebir
 * aynası. Faz 7 mock motorlarını ve cockpit mock'undaki DEMO sipariş/sevk
 * verilerini (getOrders) yeniden kullanır; görevleri deterministik üretir.
 * Depo Katı satış kaynağı olarak hiçbir görevde görünmez.
 */

const TODAY = '2026-05-14'
const MONTH = { from: '2026-05-01', to: '2026-05-31' }

const OPEN_BALANCE_CALL_PCT = 50
const OVERDUE_ESCALATE_DAYS = 30
const SUPPLIER_OPEN_SHARE = 30
const SALES_TARGET_LOW = 90
const DQ_ROW_LIMIT = 50
const PRIORITY_RANK = { P1: 1, P2: 2, P3: 3, P4: 4, P5: 5 }
const RISK_LABEL_TR = { CRITICAL: 'Kritik', HIGH: 'Yüksek', MEDIUM: 'Orta', LOW: 'Düşük', NONE: 'Yok' }
const FORWARD_ORDER = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED']
const STATUSES = new Set(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'DISMISSED'])

const num = (s) => {
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : 0
}
const round1 = (n) => Math.round(n * 10) / 10
const money = (n) => (Math.round(n * 100) / 100).toFixed(2)
const liNum = (m) => (m && typeof m === 'object' ? num(m.amount) : num(m))
function daysBetween(fromIso, toIso) {
  const a = Date.parse(`${fromIso}T00:00:00Z`)
  const b = Date.parse(`${toIso}T00:00:00Z`)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0
  return Math.round((a - b) / 86_400_000)
}

/** Modül seviyesinde in-memory durum store'u (PATCH mock'u da bunu günceller). */
const statusStore = new Map()

export function resetMockActionStatusStore() {
  statusStore.clear()
}

function canTransition(from, to) {
  if (to === 'DISMISSED') return true
  if (from === 'DISMISSED') return to === 'OPEN'
  const f = FORWARD_ORDER.indexOf(from)
  const t = FORWARD_ORDER.indexOf(to)
  if (f < 0 || t < 0) return false
  return t >= f
}

/**
 * @param {string} id
 * @param {string} status
 * @returns {Promise<{ status: string, lastActionAt: string }>}
 */
export async function mockUpdateActionStatus(id, status) {
  const next = typeof status === 'string' ? status.trim().toUpperCase() : ''
  if (!STATUSES.has(next)) {
    const err = new Error('Geçersiz görev durumu')
    err.status = 400
    throw err
  }
  const from = statusStore.get(id)?.status ?? 'OPEN'
  if (!canTransition(from, next)) {
    const err = new Error(`Geçersiz durum geçişi: ${from} → ${next}`)
    err.status = 400
    throw err
  }
  const record = { status: next, lastActionAt: new Date().toISOString() }
  statusStore.set(id, record)
  return record
}

export async function mockGetActionCenter(query = {}) {
  const limited = query.limitedView === 'true' || query.limitedView === true || query.limitedView === '1'
  const fSalesPerson = (query.salesPerson || '').trim() || undefined
  const createdAt = `${TODAY}T08:00:00.000Z`
  const generatedAt = new Date().toISOString()

  const [orders, supplierRes, dq, forecast] = await Promise.all([
    getOrders(),
    mockGetProfitabilityAnalytics({ salesPerson: fSalesPerson, ...MONTH, groupBy: 'supplier' }),
    mockGetDataQuality({}),
    mockGetForecastEngine({ salesPerson: fSalesPerson }),
  ])

  /** @type {any[]} */
  const drafts = []

  // ── TAHSİLAT + SEVK (sipariş listesinden) ──
  for (const it of orders) {
    const delivered = it.displayStatus === 'Teslim Edildi'
    const total = liNum(it.totalAmount)
    const remaining = liNum(it.remainingAmount)
    const openPct = total > 0 ? round1((remaining / total) * 100) : 0
    const risk = String(it.currentRiskSeverity ?? 'NONE')
    const highRisk = risk === 'HIGH' || risk === 'CRITICAL'

    if (!delivered && remaining > 0 && openPct > OPEN_BALANCE_CALL_PCT && highRisk) {
      drafts.push({
        id: `collection-call:${it.id}`,
        priority: 'P1', category: 'COLLECTION',
        title: 'Müşteri ile tahsilat görüşmesi yap',
        reason: `${it.customerDisplayName} siparişinde açık bakiye toplamın %${openPct}'i (${money(remaining)} ₺) ve risk seviyesi ${RISK_LABEL_TR[risk] ?? risk}.`,
        recommendedAction: 'Müşteriyle iletişime geçip ödeme planı/peşinat görüşmesi yapın.',
        assignedRole: 'COLLECTION', relatedEntityType: 'order', relatedEntityId: it.id,
        evidence: { orderId: it.id, openBalance: money(remaining), total: money(total), openPercent: openPct, risk },
        riskLabel: RISK_LABEL_TR[risk] ?? risk, relatedCustomer: it.customerDisplayName, relatedOrder: it.orderNumber,
        salesPerson: it.salesPerson ?? null,
      })
    }

    const dueDate = it.latestCommittedShipBy ?? it.earliestCommittedShipBy ?? null
    if (it.hasOverdueBalance && remaining > 0 && dueDate) {
      const overdueDays = daysBetween(TODAY, dueDate)
      if (overdueDays > OVERDUE_ESCALATE_DAYS) {
        drafts.push({
          id: `collection-escalate:${it.id}`,
          priority: 'P1', category: 'COLLECTION',
          title: 'Tahsilat yöneticisine aktar',
          reason: `${it.customerDisplayName} siparişinde tahsilat ${overdueDays} gündür gecikmiş; açık bakiye ${money(remaining)} ₺.`,
          recommendedAction: 'Gecikmiş alacağı tahsilat yöneticisine eskale edin; yasal/teminat sürecini değerlendirin.',
          assignedRole: 'COLLECTION', relatedEntityType: 'order', relatedEntityId: it.id,
          evidence: { orderId: it.id, overdueDays, openBalance: money(remaining), dueDate },
          relatedCustomer: it.customerDisplayName, relatedOrder: it.orderNumber, salesPerson: it.salesPerson ?? null,
        })
      }
    }

    if (!delivered && it.plannedShipmentDate && it.plannedShipmentDate < TODAY) {
      const lateDays = daysBetween(TODAY, it.plannedShipmentDate)
      drafts.push({
        id: `shipment-overdue:${it.id}`,
        priority: 'P1', category: 'SHIPMENT',
        title: 'Sevk operasyonunu ara',
        reason: `${it.customerDisplayName} siparişinde planlanan sevk tarihi ${lateDays} gün geçti, sipariş hâlâ teslim edilmedi.`,
        recommendedAction: 'Sevk ekibiyle görüşüp teslimatı önceliklendirin; gecikme nedenini netleştirin.',
        assignedRole: 'SHIPMENT', relatedEntityType: 'order', relatedEntityId: it.id,
        evidence: { orderId: it.id, plannedShipmentDate: it.plannedShipmentDate, lateDays, status: it.displayStatus },
        relatedCustomer: it.customerDisplayName, relatedOrder: it.orderNumber, salesPerson: it.salesPerson ?? null,
      })
    }

    const openMissing = it.openMissingItemsCount ?? 0
    if (!delivered && openMissing > 0) {
      drafts.push({
        id: `shipment-missing:${it.id}`,
        priority: 'P1', category: 'SHIPMENT',
        title: 'Eksik ürün tedariğini başlat',
        reason: `${it.customerDisplayName} siparişinde ${openMissing} açık eksik ürün kaydı var; sevk tamamlanamıyor.`,
        recommendedAction: 'Eksik ürünler için tedarik/üretim talebini başlatın ve tedarikçiyle teyitleşin.',
        assignedRole: 'OPERATION', relatedEntityType: 'order', relatedEntityId: it.id,
        evidence: { orderId: it.id, openMissingItemsCount: openMissing, status: it.displayStatus },
        relatedCustomer: it.customerDisplayName, relatedOrder: it.orderNumber, salesPerson: it.salesPerson ?? null,
      })
    }

    if (!delivered && it.displayStatus === 'Hazır') {
      drafts.push({
        id: `shipment-ready:${it.id}`,
        priority: 'P2', category: 'SHIPMENT',
        title: 'Sevk planına ekle',
        reason: `${it.customerDisplayName} siparişi "Hazır" durumda ancak henüz bir sevk planına eklenmemiş.`,
        recommendedAction: 'Siparişi uygun araç/güne ait sevk planına ekleyip müşteriyle randevulaşın.',
        assignedRole: 'SHIPMENT', relatedEntityType: 'order', relatedEntityId: it.id,
        evidence: { orderId: it.id, status: it.displayStatus, plannedShipmentDate: it.plannedShipmentDate ?? null },
        relatedCustomer: it.customerDisplayName, relatedOrder: it.orderNumber, salesPerson: it.salesPerson ?? null,
      })
    }
  }

  // ── VERİ KALİTESİ ──
  for (const row of dq.rows.slice(0, DQ_ROW_LIMIT)) {
    const codes = new Set(row.issues.map((i) => i.code))
    if (codes.has('ZERO_COST')) {
      drafts.push({
        id: `dq-zero-cost:${row.orderLineId}`,
        priority: 'P1', category: 'DATA_QUALITY',
        title: 'Alış maliyetini düzelt',
        reason: `${row.productTitle} (${row.customerName}) kaleminde alış maliyeti (soldUnitCost) sıfır/eksik; kâr hesabı bozuluyor.`,
        recommendedAction: 'İlgili ürün kartından doğru alış maliyetini girin; kalem snapshot’ını düzeltin.',
        assignedRole: 'OPERATION', relatedEntityType: 'orderLine', relatedEntityId: row.orderLineId,
        evidence: { orderLineId: row.orderLineId, orderId: row.orderId, qualityScore: row.qualityScore },
        relatedCustomer: row.customerName, relatedOrder: row.orderId, salesPerson: row.salesPerson ?? null,
      })
    }
    if (codes.has('UNKNOWN_SOURCE')) {
      drafts.push({
        id: `dq-unknown:${row.orderLineId}`,
        priority: 'P2', category: 'DATA_QUALITY',
        title: 'Satış kaynağını tamamla',
        reason: `${row.productTitle} (${row.customerName}) kaleminde satış kaynağı Bilinmeyen; kaynak analitiği yanlış oluşuyor.`,
        recommendedAction: 'Kalemin satış kaynağını (mağaza katı / dış tedarik / stok) tanımlayın.',
        assignedRole: 'OPERATION', relatedEntityType: 'orderLine', relatedEntityId: row.orderLineId,
        evidence: { orderLineId: row.orderLineId, orderId: row.orderId, qualityScore: row.qualityScore },
        relatedCustomer: row.customerName, relatedOrder: row.orderId, salesPerson: row.salesPerson ?? null,
      })
    }
    if (codes.has('MISSING_DISPLAY_FLOOR')) {
      drafts.push({
        id: `dq-floor:${row.orderLineId}`,
        priority: 'P3', category: 'DATA_QUALITY',
        title: 'Sergi katını güncelle',
        reason: `${row.productTitle} (${row.customerName}) mağaza içi sergi kaynağı ancak sergi katı (display floor) eksik.`,
        recommendedAction: 'Kalemin sergilendiği katı (Bodrum/Giriş/1. Kat) seçip kaydedin.',
        assignedRole: 'OPERATION', relatedEntityType: 'orderLine', relatedEntityId: row.orderLineId,
        evidence: { orderLineId: row.orderLineId, orderId: row.orderId, qualityScore: row.qualityScore },
        relatedCustomer: row.customerName, relatedOrder: row.orderId, salesPerson: row.salesPerson ?? null,
      })
    }
  }

  // ── SATIŞ (aggregate) ──
  const target = forecast.summary.targetAchievementPct
  if (target > 0 && target < SALES_TARGET_LOW) {
    drafts.push({
      id: 'sales-target-review',
      priority: 'P2', category: 'SALES',
      title: 'Satış yöneticisi değerlendirsin',
      reason: `Bu gidişle ay sonu ciro, geçen ayın %${round1(target)}'i seviyesinde (hedefin altında) bekleniyor.`,
      recommendedAction: 'Satış ekibiyle ay sonu kapanış planı yapın; bekleyen teklifleri hızlandırın.',
      assignedRole: 'SALES', relatedEntityType: null, relatedEntityId: null,
      evidence: { targetAchievementPct: round1(target), threshold: SALES_TARGET_LOW }, aggregate: true,
    })
  }
  const decliningSource = forecast.sourceTrends.find((s) => s.trend === 'DOWN' && num(s.revenue30) > 0)
  if (decliningSource) {
    drafts.push({
      id: `sales-campaign:${decliningSource.key}`,
      priority: 'P3', category: 'SALES',
      title: 'Kampanya öner',
      reason: `${decliningSource.label} kaynağının 30 günlük satış hızı %${decliningSource.pct30} değişimle düşüyor.`,
      recommendedAction: 'Bu kaynak için kampanya / sergi-teşhir düzenlemesi planlayın.',
      assignedRole: 'SALES', relatedEntityType: 'source', relatedEntityId: decliningSource.key,
      evidence: { source: decliningSource.label, pct30: decliningSource.pct30, revenue30: num(decliningSource.revenue30) }, aggregate: true,
    })
  }

  // ── TEDARİKÇİ (aggregate) ──
  const supplierRows = supplierRes.rows
  const supplierOpenTotal = supplierRows.reduce((s, r) => s + num(r.openBalance), 0)
  if (supplierOpenTotal > 0) {
    const concentrated = supplierRows
      .map((r) => ({ row: r, sharePct: round1((num(r.openBalance) / supplierOpenTotal) * 100) }))
      .filter((x) => x.sharePct >= SUPPLIER_OPEN_SHARE)
      .sort((a, b) => b.sharePct - a.sharePct)[0]
    if (concentrated) {
      drafts.push({
        id: `supplier-recon:${concentrated.row.key}`,
        priority: 'P2', category: 'SUPPLIER',
        title: 'Tedarikçi mutabakatı yap',
        reason: `${concentrated.row.label} tedarikçisi toplam açık bakiyenin %${concentrated.sharePct}'ini taşıyor.`,
        recommendedAction: 'Bu tedarikçiyle cari hesap mutabakatı yapıp ödeme/tedarik planını netleştirin.',
        assignedRole: 'SUPPLIER', relatedEntityType: 'supplier', relatedEntityId: concentrated.row.key,
        evidence: { supplier: concentrated.row.label, openBalance: num(concentrated.row.openBalance), sharePercent: concentrated.sharePct }, aggregate: true,
      })
    }
  }
  const topProfitSupplier = [...supplierRows].sort((a, b) => num(b.grossProfit) - num(a.grossProfit))[0]
  if (topProfitSupplier && num(topProfitSupplier.grossProfit) > 0) {
    drafts.push({
      id: `supplier-strengthen:${topProfitSupplier.key}`,
      priority: 'P4', category: 'SUPPLIER',
      title: 'İlişkiyi güçlendir',
      reason: `${topProfitSupplier.label} bu ay ${money(num(topProfitSupplier.grossProfit))} ₺ brüt kâr ile en kârlı tedarikçi.`,
      recommendedAction: 'İlişkiyi ve stok devamlılığını koruyun; vade/iskonto avantajlarını değerlendirin.',
      assignedRole: 'SUPPLIER', relatedEntityType: 'supplier', relatedEntityId: topProfitSupplier.key,
      evidence: { supplier: topProfitSupplier.label, grossProfit: num(topProfitSupplier.grossProfit) }, aggregate: true,
    })
  }

  // ── limitedView / salesPerson kapsamı ──
  const matchesPerson = (d) => !fSalesPerson || (d.salesPerson ?? '') === fSalesPerson
  let scoped = drafts
  if (limited) {
    scoped = scoped.filter((d) => !d.aggregate && matchesPerson(d))
  } else if (fSalesPerson) {
    scoped = scoped.filter((d) => d.aggregate || (d.salesPerson ?? '') === fSalesPerson)
  }

  const toDto = (d) => {
    const override = statusStore.get(d.id)
    const status = override?.status ?? 'OPEN'
    const lastActionAt = override?.lastActionAt ?? createdAt
    return {
      id: d.id, priority: d.priority, category: d.category, title: d.title, reason: d.reason,
      recommendedAction: d.recommendedAction, assignedRole: d.assignedRole,
      relatedEntityType: d.relatedEntityType, relatedEntityId: d.relatedEntityId, status,
      evidence: d.evidence, createdAt, lastActionAt, updatedAt: lastActionAt,
      riskLabel: d.riskLabel ?? null, relatedCustomer: d.relatedCustomer ?? null,
      relatedOrder: d.relatedOrder ?? null, relatedShipment: d.relatedShipment ?? null,
    }
  }
  const scopedDtos = scoped.map(toDto)

  const activeDtos = scopedDtos.filter((a) => a.status !== 'COMPLETED' && a.status !== 'DISMISSED')
  const completedCount = scopedDtos.filter((a) => a.status === 'COMPLETED').length
  const dismissedCount = scopedDtos.filter((a) => a.status === 'DISMISSED').length
  const totalOpen = activeDtos.length
  const p1Count = activeDtos.filter((a) => a.priority === 'P1').length
  const p2Count = activeDtos.filter((a) => a.priority === 'P2').length
  const completionDenom = scopedDtos.length - dismissedCount
  const completionRate = completionDenom > 0 ? round1((completedCount / completionDenom) * 100) : 0

  const fPriority = (query.priority || '').trim().toUpperCase() || undefined
  const fCategory = (query.category || '').trim().toUpperCase() || undefined
  const fStatus = (query.status || '').trim().toUpperCase() || undefined
  const fq = (query.q || '').trim().toLocaleLowerCase('tr') || undefined

  let filtered = scopedDtos
  if (fPriority) filtered = filtered.filter((a) => a.priority === fPriority)
  if (fCategory) filtered = filtered.filter((a) => a.category === fCategory)
  if (fStatus) filtered = filtered.filter((a) => a.status === fStatus)
  if (fq) {
    filtered = filtered.filter((a) =>
      `${a.title} ${a.reason} ${a.recommendedAction} ${a.relatedCustomer ?? ''} ${a.relatedOrder ?? ''}`
        .toLocaleLowerCase('tr')
        .includes(fq),
    )
  }

  filtered = [...filtered].sort((a, b) => {
    const r = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
    if (r !== 0) return r
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })

  return {
    summary: { totalOpen, p1Count, p2Count, completedCount, dismissedCount, completionRate },
    actions: filtered,
    filters: {
      priority: fPriority ?? null,
      category: fCategory ?? null,
      status: fStatus ?? null,
      q: fq ?? null,
      salesPerson: fSalesPerson ?? null,
      limitedView: limited,
    },
    currency: 'TRY',
    today: TODAY,
    generatedAt,
  }
}
