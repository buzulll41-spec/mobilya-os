import type { PrismaClient } from '@prisma/client'
import { moneyToNumber } from '../lib/money.js'
import { formatMoneyAmount } from '../lib/supplierLedger.js'
import { assertServiceErrorMapped } from '../errors/mapServiceError.js'
import {
  aggregateProfitability,
  loadProfitabilityOrders,
} from './getProfitabilityAnalytics.js'
import { getDataQualityReport } from './getDataQualityReport.js'
import { listSalesOrderListItems } from './listOrdersProjection.js'
import { buildForecast } from './getForecastEngine.js'
import { getActionStatusOverrides, type ActionStatusOverride } from './updateActionStatus.js'
import type { SalesOrderListItemDto } from '../projection/salesOrderListItemProjection.js'
import type { DataQualityResponseDto } from '../contracts/dataQualityDto.js'
import type { ForecastEngineResponseDto } from '../contracts/forecastEngineDto.js'
import type { ProfitabilityAnalyticsResponseDto } from '../contracts/profitabilityAnalyticsDto.js'
import type {
  ActionCategory,
  ActionCenterResponseDto,
  ActionDto,
  ActionEvidence,
  ActionPriority,
  ActionRelatedEntityType,
  ActionStatus,
} from '../contracts/actionCenterDto.js'
import { ruleNumber, rulePercent } from './businessRulesEngine.js'

const PRIORITY_RANK: Record<ActionPriority, number> = { P1: 1, P2: 2, P3: 3, P4: 4, P5: 5 }

const RISK_LABEL_TR: Record<string, string> = {
  CRITICAL: 'Kritik',
  HIGH: 'Yüksek',
  MEDIUM: 'Orta',
  LOW: 'Düşük',
  NONE: 'Yok',
}

export type ActionCenterQuery = {
  priority?: string
  category?: string
  status?: string
  q?: string
  salesPerson?: string
  limitedView?: boolean
}

function num(s: string): number {
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : 0
}
function round1(n: number): number {
  return Math.round(n * 10) / 10
}
function trimOrUndef(v?: string): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}
function liNum(m: { amount: string; currency: string } | null | undefined): number {
  return m ? moneyToNumber(m) : 0
}
function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(`${fromIso}T00:00:00Z`)
  const b = Date.parse(`${toIso}T00:00:00Z`)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0
  return Math.round((a - b) / 86_400_000)
}

/** Saf kural motorunun ürettiği görev taslağı (DTO + dahili filtre alanları). */
type ActionDraft = {
  id: string
  priority: ActionPriority
  category: ActionCategory
  title: string
  reason: string
  recommendedAction: string
  assignedRole: string
  relatedEntityType: ActionRelatedEntityType
  relatedEntityId: string | null
  evidence: ActionEvidence
  riskLabel?: string | null
  relatedCustomer?: string | null
  relatedOrder?: string | null
  relatedShipment?: string | null
  /** Dahili — limitedView / salesPerson filtresi için. */
  salesPerson?: string | null
  /** Dahili — aggregate (sipariş/satırla ilişkisiz) görev mi? */
  aggregate?: boolean
}

export type BuildActionsArgs = {
  today: string
  listItems: SalesOrderListItemDto[]
  dq: DataQualityResponseDto
  forecast: ForecastEngineResponseDto
  supplierRes: ProfitabilityAnalyticsResponseDto
  overrides: Map<string, ActionStatusOverride>
  query: ActionCenterQuery
}

/**
 * Saf görev motoru — DB'den bağımsız, test edilebilir. Önceden hesaplanmış rapor
 * parçalarını alır, öncelikli aksiyon listesi üretir. In-memory durum override'ları
 * uygulanır (override yoksa OPEN).
 */
export function buildActions(args: BuildActionsArgs): ActionCenterResponseDto {
  const { today, listItems, dq, forecast, supplierRes, overrides, query } = args
  const createdAt = `${today}T08:00:00.000Z`
  const generatedAt = new Date().toISOString()
  const limited = Boolean(query.limitedView)
  const fSalesPerson = trimOrUndef(query.salesPerson)

  const drafts: ActionDraft[] = []

  // ─────────────────────────── TAHSİLAT ───────────────────────────
  for (const it of listItems) {
    const delivered = it.displayStatus === 'Teslim Edildi'
    const total = liNum(it.totalAmount)
    const remaining = liNum(it.remainingAmount)
    const openPct = total > 0 ? round1((remaining / total) * 100) : 0
    const risk = String(it.currentRiskSeverity ?? 'NONE')
    const highRisk = risk === 'HIGH' || risk === 'CRITICAL'

    // Açık bakiye > %50 ve risk yüksek → müşteri ile tahsilat görüşmesi
    const openBalanceThreshold = rulePercent('COLLECTION_HIGH_RISK_RATIO', 25)
    if (!delivered && remaining > 0 && openPct > openBalanceThreshold && highRisk) {
      drafts.push({
        id: `collection-call:${it.id}`,
        priority: 'P1',
        category: 'COLLECTION',
        title: 'Müşteri ile tahsilat görüşmesi yap',
        reason: `${it.customerDisplayName} siparişinde açık bakiye toplamın %${openPct}'i (${formatMoneyAmount(remaining)} ₺) ve risk seviyesi ${RISK_LABEL_TR[risk] ?? risk}.`,
        recommendedAction: 'Müşteriyle iletişime geçip ödeme planı/peşinat görüşmesi yapın.',
        assignedRole: 'COLLECTION',
        relatedEntityType: 'order',
        relatedEntityId: it.id,
        evidence: { orderId: it.id, openBalance: formatMoneyAmount(remaining), total: formatMoneyAmount(total), openPercent: openPct, risk },
        riskLabel: RISK_LABEL_TR[risk] ?? risk,
        relatedCustomer: it.customerDisplayName,
        relatedOrder: it.orderNumber,
        salesPerson: it.salesPerson ?? null,
      })
    }

    // 30 gün üzeri gecikme → tahsilat yöneticisine aktar
    const dueDate = it.latestCommittedShipBy ?? it.earliestCommittedShipBy ?? null
    if (it.hasOverdueBalance && remaining > 0 && dueDate) {
      const overdueDays = daysBetween(today, dueDate)
      const overdueThreshold = ruleNumber('COLLECTION_OVERDUE_DAYS', 30)
      if (overdueDays > overdueThreshold) {
        drafts.push({
          id: `collection-escalate:${it.id}`,
          priority: 'P1',
          category: 'COLLECTION',
          title: 'Tahsilat yöneticisine aktar',
          reason: `${it.customerDisplayName} siparişinde tahsilat ${overdueDays} gündür gecikmiş; açık bakiye ${formatMoneyAmount(remaining)} ₺.`,
          recommendedAction: 'Gecikmiş alacağı tahsilat yöneticisine eskale edin; yasal/teminat sürecini değerlendirin.',
          assignedRole: 'COLLECTION',
          relatedEntityType: 'order',
          relatedEntityId: it.id,
          evidence: { orderId: it.id, overdueDays, openBalance: formatMoneyAmount(remaining), dueDate },
          relatedCustomer: it.customerDisplayName,
          relatedOrder: it.orderNumber,
          salesPerson: it.salesPerson ?? null,
        })
      }
    }

    // ─────────────────────────── SEVK ───────────────────────────
    // Planlanan sevk geçmiş ve teslim edilmemiş → sevk operasyonunu ara
    if (!delivered && it.plannedShipmentDate && it.plannedShipmentDate < today) {
      const lateDays = daysBetween(today, it.plannedShipmentDate)
      drafts.push({
        id: `shipment-overdue:${it.id}`,
        priority: 'P1',
        category: 'SHIPMENT',
        title: 'Sevk operasyonunu ara',
        reason: `${it.customerDisplayName} siparişinde planlanan sevk tarihi ${lateDays} gün geçti, sipariş hâlâ teslim edilmedi.`,
        recommendedAction: 'Sevk ekibiyle görüşüp teslimatı önceliklendirin; gecikme nedenini netleştirin.',
        assignedRole: 'SHIPMENT',
        relatedEntityType: 'order',
        relatedEntityId: it.id,
        evidence: { orderId: it.id, plannedShipmentDate: it.plannedShipmentDate, lateDays, status: it.displayStatus },
        relatedCustomer: it.customerDisplayName,
        relatedOrder: it.orderNumber,
        salesPerson: it.salesPerson ?? null,
      })
    }

    // Eksik ürün → tedariği başlat
    const openMissing = it.openMissingItemsCount ?? 0
    if (!delivered && openMissing > 0) {
      drafts.push({
        id: `shipment-missing:${it.id}`,
        priority: 'P1',
        category: 'SHIPMENT',
        title: 'Eksik ürün tedariğini başlat',
        reason: `${it.customerDisplayName} siparişinde ${openMissing} açık eksik ürün kaydı var; sevk tamamlanamıyor.`,
        recommendedAction: 'Eksik ürünler için tedarik/üretim talebini başlatın ve tedarikçiyle teyitleşin.',
        assignedRole: 'OPERATION',
        relatedEntityType: 'order',
        relatedEntityId: it.id,
        evidence: { orderId: it.id, openMissingItemsCount: openMissing, status: it.displayStatus },
        relatedCustomer: it.customerDisplayName,
        relatedOrder: it.orderNumber,
        salesPerson: it.salesPerson ?? null,
      })
    }

    // Sevke hazır ama bekliyor → sevk planına ekle
    if (!delivered && it.displayStatus === 'Hazır') {
      drafts.push({
        id: `shipment-ready:${it.id}`,
        priority: 'P2',
        category: 'SHIPMENT',
        title: 'Sevk planına ekle',
        reason: `${it.customerDisplayName} siparişi "Hazır" durumda ancak henüz bir sevk planına eklenmemiş.`,
        recommendedAction: 'Siparişi uygun araç/güne ait sevk planına ekleyip müşteriyle randevulaşın.',
        assignedRole: 'SHIPMENT',
        relatedEntityType: 'order',
        relatedEntityId: it.id,
        evidence: { orderId: it.id, status: it.displayStatus, plannedShipmentDate: it.plannedShipmentDate ?? null },
        relatedCustomer: it.customerDisplayName,
        relatedOrder: it.orderNumber,
        salesPerson: it.salesPerson ?? null,
      })
    }
  }

  // ─────────────────────────── VERİ KALİTESİ ───────────────────────────
  const dqRowLimit = ruleNumber('DATA_QUALITY_ROW_LIMIT', 50)
  // dq.rows zaten en kötü skor üstte sıralı; ilk N satırı değerlendir.
  for (const row of dq.rows.slice(0, dqRowLimit)) {
    const codes = new Set(row.issues.map((i) => i.code))
    if (codes.has('ZERO_COST')) {
      drafts.push({
        id: `dq-zero-cost:${row.orderLineId}`,
        priority: 'P1',
        category: 'DATA_QUALITY',
        title: 'Alış maliyetini düzelt',
        reason: `${row.productTitle} (${row.customerName}) kaleminde alış maliyeti (soldUnitCost) sıfır/eksik; kâr hesabı bozuluyor.`,
        recommendedAction: 'İlgili ürün kartından doğru alış maliyetini girin; kalem snapshot’ını düzeltin.',
        assignedRole: 'OPERATION',
        relatedEntityType: 'orderLine',
        relatedEntityId: row.orderLineId,
        evidence: { orderLineId: row.orderLineId, orderId: row.orderId, qualityScore: row.qualityScore },
        relatedCustomer: row.customerName,
        relatedOrder: row.orderId,
        salesPerson: row.salesPerson ?? null,
      })
    }
    if (codes.has('UNKNOWN_SOURCE')) {
      drafts.push({
        id: `dq-unknown:${row.orderLineId}`,
        priority: 'P2',
        category: 'DATA_QUALITY',
        title: 'Satış kaynağını tamamla',
        reason: `${row.productTitle} (${row.customerName}) kaleminde satış kaynağı Bilinmeyen; kaynak analitiği yanlış oluşuyor.`,
        recommendedAction: 'Kalemin satış kaynağını (mağaza katı / dış tedarik / stok) tanımlayın.',
        assignedRole: 'OPERATION',
        relatedEntityType: 'orderLine',
        relatedEntityId: row.orderLineId,
        evidence: { orderLineId: row.orderLineId, orderId: row.orderId, qualityScore: row.qualityScore },
        relatedCustomer: row.customerName,
        relatedOrder: row.orderId,
        salesPerson: row.salesPerson ?? null,
      })
    }
    if (codes.has('MISSING_DISPLAY_FLOOR')) {
      drafts.push({
        id: `dq-floor:${row.orderLineId}`,
        priority: 'P3',
        category: 'DATA_QUALITY',
        title: 'Sergi katını güncelle',
        reason: `${row.productTitle} (${row.customerName}) mağaza içi sergi kaynağı ancak sergi katı (display floor) eksik.`,
        recommendedAction: 'Kalemin sergilendiği katı (Bodrum/Giriş/1. Kat) seçip kaydedin.',
        assignedRole: 'OPERATION',
        relatedEntityType: 'orderLine',
        relatedEntityId: row.orderLineId,
        evidence: { orderLineId: row.orderLineId, orderId: row.orderId, qualityScore: row.qualityScore },
        relatedCustomer: row.customerName,
        relatedOrder: row.orderId,
        salesPerson: row.salesPerson ?? null,
      })
    }
  }

  // ─────────────────────────── SATIŞ (aggregate) ───────────────────────────
  const target = forecast.summary.targetAchievementPct
  const salesTargetLow = rulePercent('SALES_TARGET_WARNING', 90)
  if (target > 0 && target < salesTargetLow) {
    drafts.push({
      id: 'sales-target-review',
      priority: 'P2',
      category: 'SALES',
      title: 'Satış yöneticisi değerlendirsin',
      reason: `Bu gidişle ay sonu ciro, geçen ayın %${round1(target)}'i seviyesinde (hedefin altında) bekleniyor.`,
      recommendedAction: 'Satış ekibiyle ay sonu kapanış planı yapın; bekleyen teklifleri hızlandırın.',
      assignedRole: 'SALES',
      relatedEntityType: null,
      relatedEntityId: null,
      evidence: { targetAchievementPct: round1(target), threshold: salesTargetLow },
      aggregate: true,
    })
  }
  const decliningSource = forecast.sourceTrends.find((s) => s.trend === 'DOWN' && num(s.revenue30) > 0)
  if (decliningSource) {
    drafts.push({
      id: `sales-campaign:${decliningSource.key}`,
      priority: 'P3',
      category: 'SALES',
      title: 'Kampanya öner',
      reason: `${decliningSource.label} kaynağının 30 günlük satış hızı %${decliningSource.pct30} değişimle düşüyor.`,
      recommendedAction: 'Bu kaynak için kampanya / sergi-teşhir düzenlemesi planlayın.',
      assignedRole: 'SALES',
      relatedEntityType: 'source',
      relatedEntityId: decliningSource.key,
      evidence: { source: decliningSource.label, pct30: decliningSource.pct30, revenue30: num(decliningSource.revenue30) },
      aggregate: true,
    })
  }

  // ─────────────────────────── TEDARİKÇİ (aggregate) ───────────────────────────
  const supplierRows = supplierRes.rows
  const supplierOpenTotal = supplierRows.reduce((s, r) => s + num(r.openBalance), 0)
  const supplierOpenShareThreshold = rulePercent('SUPPLIER_OPEN_SHARE_THRESHOLD', 30)
  if (supplierOpenTotal > 0) {
    const concentrated = supplierRows
      .map((r) => ({ row: r, sharePct: round1((num(r.openBalance) / supplierOpenTotal) * 100) }))
      .filter((x) => x.sharePct >= supplierOpenShareThreshold)
      .sort((a, b) => b.sharePct - a.sharePct)[0]
    if (concentrated) {
      drafts.push({
        id: `supplier-recon:${concentrated.row.key}`,
        priority: 'P2',
        category: 'SUPPLIER',
        title: 'Tedarikçi mutabakatı yap',
        reason: `${concentrated.row.label} tedarikçisi toplam açık bakiyenin %${concentrated.sharePct}'ini taşıyor.`,
        recommendedAction: 'Bu tedarikçiyle cari hesap mutabakatı yapıp ödeme/tedarik planını netleştirin.',
        assignedRole: 'SUPPLIER',
        relatedEntityType: 'supplier',
        relatedEntityId: concentrated.row.key,
        evidence: { supplier: concentrated.row.label, openBalance: num(concentrated.row.openBalance), sharePercent: concentrated.sharePct },
        aggregate: true,
      })
    }
  }
  const topProfitSupplier = [...supplierRows].sort((a, b) => num(b.grossProfit) - num(a.grossProfit))[0]
  if (topProfitSupplier && num(topProfitSupplier.grossProfit) > 0) {
    drafts.push({
      id: `supplier-strengthen:${topProfitSupplier.key}`,
      priority: 'P4',
      category: 'SUPPLIER',
      title: 'İlişkiyi güçlendir',
      reason: `${topProfitSupplier.label} bu ay ${formatMoneyAmount(num(topProfitSupplier.grossProfit))} ₺ brüt kâr ile en kârlı tedarikçi.`,
      recommendedAction: 'İlişkiyi ve stok devamlılığını koruyun; vade/iskonto avantajlarını değerlendirin.',
      assignedRole: 'SUPPLIER',
      relatedEntityType: 'supplier',
      relatedEntityId: topProfitSupplier.key,
      evidence: { supplier: topProfitSupplier.label, grossProfit: num(topProfitSupplier.grossProfit) },
      aggregate: true,
    })
  }

  // ─────────────── limitedView / salesPerson kapsamı ───────────────
  const matchesPerson = (d: ActionDraft) => !fSalesPerson || (d.salesPerson ?? '') === fSalesPerson
  let scoped = drafts
  if (limited) {
    // SALES yalnızca kendi sipariş/satır görevlerini görür; aggregate gizli.
    scoped = scoped.filter((d) => !d.aggregate && matchesPerson(d))
  } else if (fSalesPerson) {
    scoped = scoped.filter((d) => d.aggregate || (d.salesPerson ?? '') === fSalesPerson)
  }

  // Durum override'larını uygula ve DTO'ya çevir.
  const toDto = (d: ActionDraft): ActionDto => {
    const override = overrides.get(d.id)
    const status: ActionStatus = override?.status ?? 'OPEN'
    const lastActionAt = override?.lastActionAt ?? createdAt
    return {
      id: d.id,
      priority: d.priority,
      category: d.category,
      title: d.title,
      reason: d.reason,
      recommendedAction: d.recommendedAction,
      assignedRole: d.assignedRole,
      relatedEntityType: d.relatedEntityType,
      relatedEntityId: d.relatedEntityId,
      status,
      evidence: d.evidence,
      createdAt,
      lastActionAt,
      updatedAt: lastActionAt,
      riskLabel: d.riskLabel ?? null,
      relatedCustomer: d.relatedCustomer ?? null,
      relatedOrder: d.relatedOrder ?? null,
      relatedShipment: d.relatedShipment ?? null,
    }
  }

  const scopedDtos = scoped.map(toDto)

  // ─────────────── Özet (kapsamlı set üzerinden, görünüm filtrelerinden bağımsız) ───────────────
  const activeDtos = scopedDtos.filter((a) => a.status !== 'COMPLETED' && a.status !== 'DISMISSED')
  const completedCount = scopedDtos.filter((a) => a.status === 'COMPLETED').length
  const dismissedCount = scopedDtos.filter((a) => a.status === 'DISMISSED').length
  const totalOpen = activeDtos.length
  const p1Count = activeDtos.filter((a) => a.priority === 'P1').length
  const p2Count = activeDtos.filter((a) => a.priority === 'P2').length
  const completionDenom = scopedDtos.length - dismissedCount
  const completionRate = completionDenom > 0 ? round1((completedCount / completionDenom) * 100) : 0

  // ─────────────── Görünüm filtreleri (priority / category / status / q) ───────────────
  const fPriority = trimOrUndef(query.priority)?.toUpperCase()
  const fCategory = trimOrUndef(query.category)?.toUpperCase()
  const fStatus = trimOrUndef(query.status)?.toUpperCase()
  const fq = trimOrUndef(query.q)?.toLocaleLowerCase('tr')

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

  // Önceliğe göre (P1 üstte), eşitlikte stabil id sırası.
  filtered = [...filtered].sort((a, b) => {
    const r = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
    if (r !== 0) return r
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })

  return {
    summary: {
      totalOpen,
      p1Count,
      p2Count,
      completedCount,
      dismissedCount,
      completionRate,
    },
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
    today,
    generatedAt,
  }
}

function addDays(iso: string, delta: number): string {
  const t = Date.parse(`${iso}T00:00:00Z`)
  return new Date(t + delta * 86_400_000).toISOString().slice(0, 10)
}
function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate()
}
function monthBounds(ym: string): { from: string; to: string } {
  const year = Number.parseInt(ym.slice(0, 4), 10)
  const month = Number.parseInt(ym.slice(5, 7), 10)
  const total = daysInMonth(year, month)
  return { from: `${ym}-01`, to: `${ym}-${String(total).padStart(2, '0')}` }
}

export async function getActionCenter(
  prisma: PrismaClient,
  query: ActionCenterQuery = {},
): Promise<ActionCenterResponseDto> {
  try {
    const today = process.env.DEMO_TODAY ?? '2026-05-14'
    const ym = today.slice(0, 7)
    const { from, to } = monthBounds(ym)
    const salesPerson = trimOrUndef(query.salesPerson)

    const [profitOrders, dqCurrent, dqPrevious, shipments, listItems] = await Promise.all([
      loadProfitabilityOrders(prisma),
      getDataQualityReport(prisma, { from, to, salesPerson }),
      getDataQualityReport(prisma, { from: addDays(from, -30), to: addDays(from, -1), salesPerson }),
      prisma.shipment.findMany({
        where: { plannedShipDate: { gte: new Date(`${addDays(today, -89)}T00:00:00.000Z`) } },
        select: { plannedShipDate: true },
      }),
      listSalesOrderListItems(prisma),
    ])

    const d30 = addDays(today, -29)
    const d60 = addDays(today, -59)
    const d90 = addDays(today, -89)
    let last30 = 0
    let last60 = 0
    let last90 = 0
    for (const s of shipments) {
      if (!s.plannedShipDate) continue
      const iso = s.plannedShipDate.toISOString().slice(0, 10)
      if (iso > today) continue
      if (iso >= d90) last90 += 1
      if (iso >= d60) last60 += 1
      if (iso >= d30) last30 += 1
    }

    const supplierRes = aggregateProfitability(profitOrders, { from, to, salesPerson, groupBy: 'supplier' })

    const forecast = buildForecast({
      today,
      profitOrders,
      shipmentWindows: { last30, last60, last90 },
      dataQuality: {
        currentScore: dqCurrent.totals.averageQualityScore,
        previousScore: dqPrevious.totals.averageQualityScore,
      },
      query: { salesPerson, limitedView: query.limitedView },
    })

    return buildActions({
      today,
      listItems,
      dq: dqCurrent,
      forecast,
      supplierRes,
      overrides: getActionStatusOverrides(),
      query,
    })
  } catch (err) {
    assertServiceErrorMapped(err)
    throw err
  }
}
