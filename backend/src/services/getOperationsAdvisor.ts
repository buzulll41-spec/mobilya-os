import type { PrismaClient } from '@prisma/client'
import { formatMoneyAmount } from '../lib/supplierLedger.js'
import { assertServiceErrorMapped } from '../errors/mapServiceError.js'
import { aggregateProfitability, loadProfitabilityOrders } from './getProfitabilityAnalytics.js'
import { getDataQualityReport } from './getDataQualityReport.js'
import { listSalesOrderListItems } from './listOrdersProjection.js'
import { buildForecast } from './getForecastEngine.js'
import type { DataQualityResponseDto } from '../contracts/dataQualityDto.js'
import type { ForecastEngineResponseDto } from '../contracts/forecastEngineDto.js'
import type { ProfitabilityAnalyticsResponseDto } from '../contracts/profitabilityAnalyticsDto.js'
import type {
  AdvisoryCategory,
  AdvisoryDto,
  AdvisorySeverity,
  OperationsAdvisorResponseDto,
} from '../contracts/operationsAdvisorDto.js'
import { ruleNumber, rulePercent } from './businessRulesEngine.js'

const ADVISORIES_LIMIT = 20

const SEVERITY_RANK: Record<AdvisorySeverity, number> = { CRITICAL: 3, WARNING: 2, INFO: 1 }

/** SALES sınırlı görünümde yalnızca kendi alanına ilişkin kategoriler. */
const LIMITED_CATEGORIES: AdvisoryCategory[] = ['SALES', 'SHIPMENT', 'DATA_QUALITY']

export type OperationsAdvisorQuery = {
  category?: string
  severity?: string
  date?: string
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

export type BuildAdvisoriesArgs = {
  today: string
  monthSrc: ProfitabilityAnalyticsResponseDto
  prevMonthSrc: ProfitabilityAnalyticsResponseDto
  supplierRes: ProfitabilityAnalyticsResponseDto
  dq: DataQualityResponseDto
  forecast: ForecastEngineResponseDto
  delayedShipments: number
  overdueCount: number
  query: OperationsAdvisorQuery
}

/**
 * Saf kural motoru — DB'den bağımsız, test edilebilir.
 * Önceden hesaplanmış rapor çıktılarını alır, tavsiye listesi üretir.
 */
export function buildAdvisories(args: BuildAdvisoriesArgs): OperationsAdvisorResponseDto {
  const { today, monthSrc, prevMonthSrc, supplierRes, dq, forecast, delayedShipments, overdueCount, query } = args
  const createdAt = new Date().toISOString()
  const limited = Boolean(query.limitedView)
  const out: AdvisoryDto[] = []

  const push = (a: Omit<AdvisoryDto, 'createdAt'>) => out.push({ ...a, createdAt })

  // ─────────────────────────── KÂRLILIK ───────────────────────────
  const prevByKey = new Map(prevMonthSrc.rows.map((r) => [r.key, num(r.grossProfit)]))
  for (const r of monthSrc.rows) {
    const cur = num(r.grossProfit)
    const prev = prevByKey.get(r.key) ?? 0
    if (prev > 0) {
      const changePct = round1(((cur - prev) / prev) * 100)
      const profitDropThreshold = rulePercent('PROFITABILITY_DROP_WARNING', 15)
      if (changePct <= -profitDropThreshold) {
        push({
          id: `profit-drop:${r.key}`,
          severity: 'WARNING',
          category: 'PROFITABILITY',
          title: `${r.label} kârlılığı düşüyor`,
          reason: `${r.label} kaynağının brüt kârı geçen aya göre %${Math.abs(changePct)} azaldı (${formatMoneyAmount(prev)} ₺ → ${formatMoneyAmount(cur)} ₺).`,
          impact: 'Bu kaynağın toplam kâra katkısı geriliyor; sürerse ay sonu kâr hedefi tutmayabilir.',
          recommendation: 'Bu kaynaktaki fiyatlama, maliyet ve satış adedini gözden geçirin; kampanya veya stok kararı alın.',
          evidence: {
            source: r.label,
            grossProfitLastMonth: prev,
            grossProfitCurrentMonth: cur,
            changePercent: changePct,
          },
        })
      }
    }
  }

  // En düşük kâr marjlı kaynak (incelenmeli)
  const lowestMargin = [...monthSrc.rows]
    .filter((r) => num(r.revenue) > 0)
    .sort((a, b) => a.profitMarginPct - b.profitMarginPct)[0]
  if (lowestMargin) {
    push({
      id: `low-margin:${lowestMargin.key}`,
      severity: 'INFO',
      category: 'PROFITABILITY',
      title: `${lowestMargin.label} en düşük kâr marjına sahip`,
      reason: `${lowestMargin.label} kaynağının kâr marjı %${round1(lowestMargin.profitMarginPct)} ile en düşük seviyede.`,
      impact: 'Düşük marj, ciro yüksek olsa bile kâra katkının sınırlı kalmasına yol açar.',
      recommendation: 'Bu kaynağın alış maliyetlerini ve iskonto politikasını inceleyin.',
      evidence: {
        source: lowestMargin.label,
        profitMarginPct: round1(lowestMargin.profitMarginPct),
        revenue: num(lowestMargin.revenue),
        grossProfit: num(lowestMargin.grossProfit),
      },
    })
  }

  // Bekleyen kâr birikimi (tahsilata bağlı)
  const totalGross = num(monthSrc.totals.grossProfit)
  const pendingProfit = num(monthSrc.totals.pendingProfit)
  if (totalGross > 0 && pendingProfit > 0) {
    const sharePct = round1((pendingProfit / totalGross) * 100)
    const pendingProfitThreshold = rulePercent('PROFITABILITY_WAITING_PROFIT', 40)
    if (sharePct >= pendingProfitThreshold) {
      push({
        id: 'pending-profit',
        severity: 'WARNING',
        category: 'PROFITABILITY',
        title: 'Tahsilata bağlı kâr birikiyor',
        reason: `Bu ayki brüt kârın %${sharePct}'i (${formatMoneyAmount(pendingProfit)} ₺) henüz tahsil edilmedi.`,
        impact: 'Kâr kâğıt üzerinde görünüyor ama nakde dönmedi; tahsilat gecikirse kâr riske girer.',
        recommendation: 'Açık bakiyesi yüksek siparişlerde tahsilat planı uygulayın.',
        evidence: { pendingProfit, totalGrossProfit: totalGross, sharePercent: sharePct },
      })
    }
  }

  // ─────────────────────────── TAHSİLAT ───────────────────────────
  const totalOpen = num(monthSrc.totals.openBalance)
  const totalRisky = num(monthSrc.totals.riskyReceivable)
  if (totalOpen > 0) {
    const riskyShare = round1((totalRisky / totalOpen) * 100)
    const riskyShareThreshold = rulePercent('COLLECTION_HIGH_RISK_RATIO', 25)
    if (riskyShare >= riskyShareThreshold) {
      push({
        id: 'risky-receivable',
        severity: 'CRITICAL',
        category: 'COLLECTION',
        title: 'Riskli alacak oranı kritik',
        reason: `Riskli alacak (${formatMoneyAmount(totalRisky)} ₺) toplam açık bakiyenin %${riskyShare}'ini oluşturuyor.`,
        impact: 'Tahsilat tahsil edilemezse doğrudan kâr ve nakit akışı zarar görür.',
        recommendation: 'Yüksek riskli siparişlerde teminat/peşinat isteyin, tahsilatı hızlandırın.',
        evidence: { riskyReceivable: totalRisky, openBalance: totalOpen, sharePercent: riskyShare },
      })
    }
  }

  // Açık bakiye trendi yükseliyor (forecast risk trendinden)
  if (forecast.riskForecast.trend === 'UP') {
    push({
      id: 'open-balance-trend',
      severity: 'WARNING',
      category: 'COLLECTION',
      title: 'Açık bakiye büyüme trendinde',
      reason: 'Son 7 günün açık bakiye hızı, 30 günlük ortalamanın üzerinde.',
      impact: 'Tahsil edilmemiş tutar büyüyor; nakit akışı baskı altına girebilir.',
      recommendation: 'Yeni satışlarda peşinat oranını ve vade politikasını gözden geçirin.',
      evidence: { trend: forecast.riskForecast.trend, projectedOpenBalance: num(forecast.openBalanceForecast.projected) },
    })
  }

  // Gecikmiş tahsilat sayısı
  const overdueWarnCount = ruleNumber('COLLECTION_OVERDUE_WARN_COUNT', 3)
  if (overdueCount >= overdueWarnCount) {
    push({
      id: 'overdue-count',
      severity: 'WARNING',
      category: 'COLLECTION',
      title: 'Gecikmiş tahsilat sayısı yüksek',
      reason: `${overdueCount} siparişte tahsilat vadesi geçmiş durumda.`,
      impact: 'Gecikmeler büyüdükçe tahsil edilememe riski artar.',
      recommendation: 'Gecikmiş siparişler için müşteri araması ve ödeme planı başlatın.',
      evidence: { overdueCount },
    })
  }

  // ─────────────────────────── SEVK ───────────────────────────
  const shipmentCritical = ruleNumber('SHIPMENT_DELAY_CRITICAL', 10)
  const shipmentWarning = ruleNumber('SHIPMENT_DELAY_WARNING', 5)
  if (delayedShipments > shipmentCritical) {
    push({
      id: 'shipment-delay',
      severity: 'CRITICAL',
      category: 'SHIPMENT',
      title: 'Sevk gecikmeleri kritik seviyede',
      reason: `${delayedShipments} sipariş planlanan sevk tarihini geçti ve hâlâ teslim edilmedi.`,
      impact: 'Müşteri memnuniyeti ve teslim taahhütleri ciddi risk altında.',
      recommendation: 'Sevk planını acilen önceliklendirin, montaj ekibi ve eksik ürünleri kontrol edin.',
      evidence: { delayedShipments },
    })
  } else if (delayedShipments > shipmentWarning) {
    push({
      id: 'shipment-delay',
      severity: 'WARNING',
      category: 'SHIPMENT',
      title: 'Sevk gecikmeleri artıyor',
      reason: `${delayedShipments} sipariş planlanan sevk tarihini geçti.`,
      impact: 'Gecikmeler birikirse teslim taahhütleri aksayabilir.',
      recommendation: 'Geciken sevkleri gözden geçirip planlamayı güncelleyin.',
      evidence: { delayedShipments },
    })
  }
  if (forecast.shipmentForecast.intensity === 'HIGH') {
    push({
      id: 'shipment-intensity',
      severity: 'INFO',
      category: 'SHIPMENT',
      title: 'Sevk yoğunluğu yükseliyor',
      reason: `Önümüzdeki hafta ~${forecast.shipmentForecast.expectedNextWeek} sevk bekleniyor (yoğunluk: yüksek).`,
      impact: 'Ekip kapasitesi planlanmazsa sevkler sıkışabilir.',
      recommendation: 'Montaj/lojistik kapasitesini önceden planlayın.',
      evidence: {
        expectedNextWeek: forecast.shipmentForecast.expectedNextWeek,
        intensity: forecast.shipmentForecast.intensity,
      },
    })
  }

  // ─────────────────────────── VERİ KALİTESİ ───────────────────────────
  const score = dq.totals.averageQualityScore
  const dqCritical = ruleNumber('DATA_QUALITY_CRITICAL', 80)
  const dqWarning = ruleNumber('DATA_QUALITY_WARNING', 90)
  if (score < dqCritical) {
    push({
      id: 'quality-score',
      severity: 'CRITICAL',
      category: 'DATA_QUALITY',
      title: 'Veri kalite skoru kritik',
      reason: `Ortalama veri kalite skoru ${score} (${dqCritical} eşiğinin altında).`,
      impact: 'Eksik/hatalı snapshot alanları kâr ve kaynak raporlarını bozar.',
      recommendation: 'Veri Kalitesi Merkezi’ndeki problemli kayıtları düzeltin.',
      evidence: { averageQualityScore: score, threshold: 80 },
    })
  } else if (score < 90) {
    push({
      id: 'quality-score',
      severity: 'WARNING',
      category: 'DATA_QUALITY',
      title: 'Veri kalite skoru düşüyor',
      reason: `Ortalama veri kalite skoru ${score} (${dqWarning} eşiğinin altında).`,
      impact: 'Veri kalitesi gerilerse raporların güvenilirliği azalır.',
      recommendation: 'Eksik kaynak/maliyet alanlarını tamamlayın.',
      evidence: { averageQualityScore: score, threshold: dqWarning },
    })
  }
  if (dq.totals.unknownCount > 0) {
    push({
      id: 'unknown-source',
      severity: 'WARNING',
      category: 'DATA_QUALITY',
      title: 'Bilinmeyen kaynaklı kayıtlar var',
      reason: `${dq.totals.unknownCount} satış kaleminde satış kaynağı Bilinmeyen olarak işaretli.`,
      impact: 'Bu kalemler satış kaynağı analitiğine doğru yansımaz.',
      recommendation: 'İlgili ürün kartlarının satış kaynağını tanımlayın.',
      evidence: { unknownCount: dq.totals.unknownCount },
    })
  }
  if (dq.totals.missingCostCount > 0) {
    push({
      id: 'zero-cost',
      severity: 'CRITICAL',
      category: 'DATA_QUALITY',
      title: 'Alış maliyeti eksik kayıtlar var',
      reason: `${dq.totals.missingCostCount} satış kaleminde alış maliyeti (soldUnitCost) sıfır veya eksik.`,
      impact: 'Maliyet eksik kalemler kâr hesabını şişirir; raporlar yanıltıcı olur.',
      recommendation: 'Eksik maliyetli kalemleri ürün kartından düzeltin.',
      evidence: { missingCostCount: dq.totals.missingCostCount },
    })
  }

  // ─────────────────────────── SATIŞ ───────────────────────────
  const target = forecast.summary.targetAchievementPct
  const salesTargetWarning = rulePercent('SALES_TARGET_WARNING', 90)
  const salesTargetSuccess = rulePercent('SALES_TARGET_SUCCESS', 110)
  if (target > 0 && target < salesTargetWarning) {
    push({
      id: 'sales-target-low',
      severity: 'WARNING',
      category: 'SALES',
      title: 'Ay sonu satış hedefin altında',
      reason: `Bu gidişle ay sonu ciro, geçen ayın %${round1(target)}'i seviyesinde bekleniyor.`,
      impact: 'Hedefin altında kalınırsa aylık kâr beklentisi tutmaz.',
      recommendation: 'Satış ekibiyle ay sonu kapanış planı yapın, bekleyen teklifleri hızlandırın.',
      evidence: { targetAchievementPct: round1(target), threshold: 90 },
    })
  } else if (target > 110) {
    push({
      id: 'sales-target-high',
      severity: 'INFO',
      category: 'SALES',
      title: 'Ay sonu satış hedefin üzerinde',
      reason: `Bu gidişle ay sonu ciro, geçen ayın %${round1(target)}'i seviyesinde bekleniyor.`,
      impact: 'Güçlü satış temposu; stok ve sevk kapasitesi buna hazır olmalı.',
      recommendation: 'Stok ve sevk planını artan taleple uyumlayın.',
      evidence: { targetAchievementPct: round1(target), threshold: salesTargetSuccess },
    })
  }
  const decliningSource = forecast.sourceTrends.find((s) => s.trend === 'DOWN' && num(s.revenue30) > 0)
  if (decliningSource) {
    push({
      id: `sales-trend-down:${decliningSource.key}`,
      severity: 'WARNING',
      category: 'SALES',
      title: `${decliningSource.label} satış trendi düşüyor`,
      reason: `${decliningSource.label} kaynağının 30 günlük satış hızı %${decliningSource.pct30} değişimle geriliyor.`,
      impact: 'Bu kaynaktan gelen ciro azalıyor; toplam satışı aşağı çekebilir.',
      recommendation: 'Bu kaynağa yönelik kampanya veya sergi/teşhir düzenlemesi değerlendirin.',
      evidence: { source: decliningSource.label, pct30: decliningSource.pct30, revenue30: num(decliningSource.revenue30) },
    })
  }

  // ─────────────────────────── TEDARİKÇİ ───────────────────────────
  const supplierRows = supplierRes.rows
  const supplierOpenTotal = supplierRows.reduce((s, r) => s + num(r.openBalance), 0)
  const supplierOpenShareThreshold = rulePercent('SUPPLIER_OPEN_SHARE_THRESHOLD', 30)
  if (supplierOpenTotal > 0) {
    const concentrated = supplierRows
      .map((r) => ({ row: r, sharePct: round1((num(r.openBalance) / supplierOpenTotal) * 100) }))
      .filter((x) => x.sharePct >= supplierOpenShareThreshold)
      .sort((a, b) => b.sharePct - a.sharePct)[0]
    if (concentrated) {
      push({
        id: `supplier-concentration:${concentrated.row.key}`,
        severity: 'WARNING',
        category: 'SUPPLIER',
        title: `${concentrated.row.label} açık bakiyede yoğunlaşma`,
        reason: `${concentrated.row.label} tedarikçisi toplam açık bakiyenin %${concentrated.sharePct}'ini taşıyor.`,
        impact: 'Tek tedarikçiye bağımlılık tahsilat/tedarik riskini yoğunlaştırır.',
        recommendation: 'Bu tedarikçiye bağlı siparişlerin tahsilat ve tedarik durumunu yakından izleyin.',
        evidence: {
          supplier: concentrated.row.label,
          openBalance: num(concentrated.row.openBalance),
          totalSupplierOpen: round1(supplierOpenTotal),
          sharePercent: concentrated.sharePct,
        },
      })
    }
  }
  const topProfitSupplier = [...supplierRows].sort((a, b) => num(b.grossProfit) - num(a.grossProfit))[0]
  if (topProfitSupplier && num(topProfitSupplier.grossProfit) > 0) {
    push({
      id: `supplier-top-profit:${topProfitSupplier.key}`,
      severity: 'INFO',
      category: 'SUPPLIER',
      title: `${topProfitSupplier.label} en yüksek kârı üretiyor`,
      reason: `${topProfitSupplier.label} bu ay ${formatMoneyAmount(num(topProfitSupplier.grossProfit))} ₺ brüt kâr ile başı çekiyor.`,
      impact: 'Bu tedarikçi kâr açısından stratejik öneme sahip.',
      recommendation: 'İlişkiyi ve stok devamlılığını koruyun; vade/iskonto avantajlarını değerlendirin.',
      evidence: { supplier: topProfitSupplier.label, grossProfit: num(topProfitSupplier.grossProfit) },
    })
  }

  // ─────────────────────────── Filtre + sıralama + limit ───────────────────────────
  const fCategory = trimOrUndef(query.category)?.toUpperCase()
  const fSeverity = trimOrUndef(query.severity)?.toUpperCase()
  const fq = trimOrUndef(query.q)?.toLocaleLowerCase('tr')

  let filtered = out
  if (limited) filtered = filtered.filter((a) => LIMITED_CATEGORIES.includes(a.category))
  if (fCategory) filtered = filtered.filter((a) => a.category === fCategory)
  if (fSeverity) filtered = filtered.filter((a) => a.severity === fSeverity)
  if (fq) {
    filtered = filtered.filter((a) =>
      `${a.title} ${a.reason} ${a.recommendation}`.toLocaleLowerCase('tr').includes(fq),
    )
  }

  filtered.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])
  const advisories = filtered.slice(0, ADVISORIES_LIMIT)

  const criticalCount = advisories.filter((a) => a.severity === 'CRITICAL').length
  const warningCount = advisories.filter((a) => a.severity === 'WARNING').length
  const infoCount = advisories.filter((a) => a.severity === 'INFO').length
  const top = advisories[0] ?? null

  return {
    summary: {
      totalAdvisories: advisories.length,
      criticalCount,
      warningCount,
      infoCount,
      topIssue: top ? { category: top.category, title: top.title, severity: top.severity } : null,
    },
    advisories,
    filters: {
      category: fCategory ?? null,
      severity: fSeverity ?? null,
      date: trimOrUndef(query.date) ?? null,
      q: fq ?? null,
      salesPerson: trimOrUndef(query.salesPerson) ?? null,
      limitedView: limited,
    },
    currency: 'TRY',
    today,
    generatedAt: createdAt,
  }
}

function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate()
}
function addDays(iso: string, delta: number): string {
  const t = Date.parse(`${iso}T00:00:00Z`)
  return new Date(t + delta * 86_400_000).toISOString().slice(0, 10)
}
function monthBounds(ym: string): { from: string; to: string } {
  const year = Number.parseInt(ym.slice(0, 4), 10)
  const month = Number.parseInt(ym.slice(5, 7), 10)
  const total = daysInMonth(year, month)
  return { from: `${ym}-01`, to: `${ym}-${String(total).padStart(2, '0')}` }
}
function prevMonthYm(ym: string): string {
  let year = Number.parseInt(ym.slice(0, 4), 10)
  let month = Number.parseInt(ym.slice(5, 7), 10) - 1
  if (month < 1) {
    month = 12
    year -= 1
  }
  return `${year}-${String(month).padStart(2, '0')}`
}

export async function getOperationsAdvisor(
  prisma: PrismaClient,
  query: OperationsAdvisorQuery = {},
): Promise<OperationsAdvisorResponseDto> {
  try {
    const today = process.env.DEMO_TODAY ?? '2026-05-14'
    const ym = today.slice(0, 7)
    const { from, to } = monthBounds(ym)
    const prev = monthBounds(prevMonthYm(ym))
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

    const monthSrc = aggregateProfitability(profitOrders, { from, to, salesPerson, groupBy: 'source' })
    const prevMonthSrc = aggregateProfitability(profitOrders, { from: prev.from, to: prev.to, salesPerson, groupBy: 'source' })
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

    let delayedShipments = 0
    let overdueCount = 0
    for (const it of listItems) {
      const delivered = it.displayStatus === 'Teslim Edildi'
      if (!delivered && it.plannedShipmentDate && it.plannedShipmentDate < today) delayedShipments += 1
      if (it.hasOverdueBalance) overdueCount += 1
    }

    return buildAdvisories({
      today,
      monthSrc,
      prevMonthSrc,
      supplierRes,
      dq: dqCurrent,
      forecast,
      delayedShipments,
      overdueCount,
      query,
    })
  } catch (err) {
    assertServiceErrorMapped(err)
    throw err
  }
}
