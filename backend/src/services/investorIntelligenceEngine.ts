/**
 * Yatırımcı Merkezi motoru — Faz 5–20 sentezi ile yatırım analizi.
 * Deterministik; LLM yok. Depo Katı hiçbir çıktıda görünmez.
 */

import type { PrismaClient } from '@prisma/client'
import { formatMoneyAmount } from '../lib/supplierLedger.js'
import {
  buildCompanyHealth,
  buildGrowthAnalysis,
  buildRiskForecast,
  type StrategicContext,
} from './strategicIntelligenceEngine.js'
import { computeHealthFromMetrics } from './companySimulationEngine.js'
import {
  assembleEnterpriseFuture,
  extractBaseState,
  gatherEnterpriseFutureContext,
  type EnterpriseFutureContext,
} from './enterpriseFutureEngine.js'
import type { FutureEngineResponseDto } from '../contracts/futureEngineDto.js'
import type {
  CompanyRating,
  FinancingNeed,
  GrowthPotential,
  InvestmentDecision,
  InvestmentRisk,
  InvestorIntelligenceResponseDto,
  InvestorRecommendationDto,
  InvestorScoreComponentsDto,
  InvestorSummaryDto,
  NewStoreReadiness,
  NewStoreReadinessDto,
  ValuationTrend,
} from '../contracts/investorIntelligenceDto.js'

const SWOT_LIMIT = 10
const RECOMMENDATIONS_LIMIT = 10

const SOURCE_MODULES = [
  'profitability',
  'forecast',
  'advisor',
  'actionCenter',
  'operationCases',
  'automation',
  'ceoControlCenter',
  'operationsAgents',
  'executiveDirector',
  'strategicIntelligence',
  'companySimulation',
  'boardDirectors',
  'ceoIntelligence',
  'chairman',
  'futureEngine',
] as const

export type InvestorContext = EnterpriseFutureContext & {
  futureReport: FutureEngineResponseDto
}

function num(s: string): number {
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : 0
}
function round1(n: number): number {
  return Math.round(n * 10) / 10
}
function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function isDepoKati(label: string): boolean {
  return label === 'Depo Katı' || label === 'WAREHOUSE' || label === 'WAREHOUSE_FLOOR'
}

function scoreBand(score: number): string {
  if (score >= 85) return 'Mükemmel'
  if (score >= 70) return 'İyi'
  if (score >= 55) return 'Orta'
  if (score >= 40) return 'Zayıf'
  return 'Kritik'
}

function growthTrendScore(ctx: StrategicContext): number {
  const growth = buildGrowthAnalysis(ctx)
  const top = growth.topGrowthSource
  if (!top || isDepoKati(top.label)) return 50
  if (top.trend === 'UP') return clamp(50 + top.changePct * 2, 50, 95)
  if (top.trend === 'DOWN') return clamp(50 + top.changePct * 2, 10, 50)
  return 50
}

function computeRiskScore(ctx: StrategicContext): number {
  const totals = ctx.srcRes.totals
  const collected = num(totals.collected)
  const openBalance = num(totals.openBalance)
  const riskyReceivable = num(totals.riskyReceivable)
  const { risk } = computeHealthFromMetrics({
    revenue: num(totals.revenue),
    grossProfit: num(totals.grossProfit),
    profitMarginPct: totals.profitMarginPct,
    collected,
    openBalance,
    riskyReceivable,
    delayedShipments: ctx.delayedShipments,
    dataQualityScore: ctx.dq.totals.averageQualityScore,
    managerScore: ctx.ceo.managerScore.score,
    externalSupplyShare: 0,
  })
  const forecast = buildRiskForecast(ctx)
  const critical = forecast.items.filter((i) => i.severity === 'CRITICAL').length
  return round1(clamp(risk - critical * 5, 0, 100))
}

export function computeScoreComponents(ctx: InvestorContext): InvestorScoreComponentsDto {
  const base = extractBaseState(ctx)
  const profitabilityScore = round1(clamp((base.profitMarginPct / 30) * 100, 0, 100))
  const growthScore = round1(growthTrendScore(ctx.strategic))
  const collectionScore = round1(clamp(base.collectionRate, 0, 100))
  const riskScore = computeRiskScore(ctx.strategic)
  const cashFlowRatio = base.revenue > 0 ? (base.collected - base.riskyReceivable * 0.1) / base.revenue : 0.5
  const cashFlowScore = round1(clamp(cashFlowRatio * 100, 0, 100))
  const stabilityScore = round1(
    clamp(
      (base.health * 0.35 +
        ctx.chairmanReport.chairmanScore * 0.25 +
        ctx.ceoReport.ceoScore * 0.2 +
        ctx.futureReport.futureScore * 0.2),
      0,
      100,
    ),
  )

  return { profitabilityScore, growthScore, collectionScore, riskScore, cashFlowScore, stabilityScore }
}

export function computeInvestorScore(components: InvestorScoreComponentsDto): number {
  return round1(
    components.profitabilityScore * 0.2 +
      components.growthScore * 0.15 +
      components.collectionScore * 0.2 +
      components.riskScore * 0.15 +
      components.cashFlowScore * 0.15 +
      components.stabilityScore * 0.15,
  )
}

export function resolveCompanyRating(score: number): CompanyRating {
  if (score >= 85) return 'EXCELLENT'
  if (score >= 70) return 'GOOD'
  if (score >= 55) return 'AVERAGE'
  if (score >= 40) return 'WEAK'
  return 'CRITICAL'
}

export function resolveInvestmentDecision(
  investorScore: number,
  components: InvestorScoreComponentsDto,
): InvestmentDecision {
  if (investorScore < 35) return 'CRITICAL'
  if (investorScore >= 80 && components.collectionScore >= 75 && components.riskScore >= 65) {
    return 'STRONG_BUY'
  }
  if (investorScore >= 65 && components.riskScore >= 50) return 'BUY'
  if (investorScore >= 50) return 'WATCH'
  if (investorScore >= 35) return 'AVOID'
  return 'CRITICAL'
}

export function resolveNewStoreReadiness(ctx: InvestorContext): NewStoreReadinessDto {
  const base = extractBaseState(ctx)
  const best = ctx.futureReport.bestScenario
  const reasons: string[] = []
  let readyPoints = 0

  if (base.health >= 70) {
    readyPoints += 2
    reasons.push(`Şirket sağlık skoru ${base.health} — genişleme eşiği aşıldı.`)
  } else {
    reasons.push(`Sağlık skoru ${base.health} — genişleme için minimum 70 gerekli.`)
  }

  if (base.collectionRate >= 80) {
    readyPoints += 2
    reasons.push(`Tahsilat oranı %${round1(base.collectionRate)} — nakit disiplini yeterli.`)
  } else {
    reasons.push(`Tahsilat oranı %${round1(base.collectionRate)} — genişleme öncesi iyileştirme gerekli.`)
  }

  if (best.verdict === 'RECOMMENDED') {
    readyPoints += 2
    reasons.push(`En iyi senaryo (${best.scenarioName}) önerilir durumda.`)
  } else {
    reasons.push(`En iyi senaryo ${best.verdictLabel} — genişleme zamanlaması dikkatli değerlendirilmeli.`)
  }

  const expansionDecisions = ['PREPARE_NEW_BRANCH', 'FOCUS_EXPANSION', 'OPEN_NEW_STORE']
  if (
    expansionDecisions.includes(ctx.chairmanReport.chairmanDecision) ||
    expansionDecisions.includes(ctx.ceoReport.ceoDecision)
  ) {
    readyPoints += 1
    reasons.push('Yönetim genişleme yönünde karar almış.')
  }

  if (base.delayedShipments <= 2) {
    readyPoints += 1
    reasons.push('Operasyon yükü genişlemeye uygun.')
  } else {
    reasons.push(`${base.delayedShipments} gecikmiş sevk — kapasite artırımı öncelikli.`)
  }

  let status: NewStoreReadiness
  if (readyPoints >= 6) status = 'READY'
  else if (readyPoints >= 3) status = 'PARTIAL'
  else status = 'NOT_READY'

  return { status, reasons: reasons.slice(0, 8) }
}

export function resolveGrowthPotential(ctx: InvestorContext): GrowthPotential {
  const growth = buildGrowthAnalysis(ctx.strategic)
  const top = growth.topGrowthSource
  const futureScore = ctx.futureReport.futureScore

  if (top && !isDepoKati(top.label) && top.trend === 'UP' && top.changePct >= 15 && futureScore >= 65) {
    return 'HIGH'
  }
  if (top && top.trend === 'UP' && top.changePct >= 5) return 'MEDIUM'
  if (futureScore >= 55) return 'MEDIUM'
  return 'LOW'
}

export function resolveFinancingNeed(ctx: InvestorContext): FinancingNeed {
  const base = extractBaseState(ctx)
  const openRatio = base.revenue > 0 ? base.openBalance / base.revenue : 0
  const riskyShare = base.openBalance > 0 ? base.riskyReceivable / base.openBalance : 0

  if (openRatio > 0.4 || riskyShare > 0.3 || base.collectionRate < 60) return 'HIGH'
  if (openRatio > 0.25 || riskyShare > 0.2 || base.collectionRate < 75) return 'MEDIUM'
  return 'LOW'
}

export function resolveInvestmentRisk(components: InvestorScoreComponentsDto): InvestmentRisk {
  const composite = (100 - components.riskScore) * 0.5 + (100 - components.collectionScore) * 0.3 + (100 - components.cashFlowScore) * 0.2
  if (composite >= 65) return 'CRITICAL'
  if (composite >= 45) return 'HIGH'
  if (composite >= 25) return 'MEDIUM'
  return 'LOW'
}

export function resolveValuationTrend(ctx: InvestorContext): ValuationTrend {
  const growth = buildGrowthAnalysis(ctx.strategic)
  const top = growth.topGrowthSource
  const base = extractBaseState(ctx)

  if (top && !isDepoKati(top.label) && top.trend === 'UP' && top.changePct >= 20 && base.profitMarginPct >= 18) {
    return 'FAST_GROWING'
  }
  if (top && top.trend === 'UP' && top.changePct >= 8) return 'GROWING'
  if (top && top.trend === 'DOWN' && top.changePct <= -10) return 'DECLINING'
  if (base.profitMarginPct >= 15 && ctx.futureReport.futureScore >= 60) return 'GROWING'
  return 'STABLE'
}

export function buildStrengths(ctx: InvestorContext): string[] {
  const out: string[] = []
  const base = extractBaseState(ctx)
  const components = computeScoreComponents(ctx)

  if (components.profitabilityScore >= 65) {
    out.push(`Brüt kâr marjı %${base.profitMarginPct} — sektör ortalamasının üzerinde kârlılık.`)
  }
  if (components.collectionScore >= 75) {
    out.push(`Tahsilat oranı %${round1(base.collectionRate)} — güçlü nakit dönüşümü.`)
  }
  if (components.riskScore >= 70) {
    out.push(`Risk skoru ${components.riskScore} — düşük operasyonel ve finansal risk profili.`)
  }
  if (ctx.ceoReport.ceoScore >= 70) {
    out.push(`CEO yönetim skoru ${ctx.ceoReport.ceoScore} — operasyonel liderlik güçlü.`)
  }
  if (ctx.board.boardScore >= 70) {
    out.push(`Yönetim Kurulu skoru ${ctx.board.boardScore} — kurumsal yönetişim sağlam.`)
  }
  if (ctx.chairmanReport.chairmanScore >= 65) {
    out.push(`Başkan stratejik skoru ${ctx.chairmanReport.chairmanScore} — uzun vadeli vizyon net.`)
  }
  if (ctx.futureReport.futureScore >= 60) {
    out.push(`Gelecek motoru skoru ${ctx.futureReport.futureScore} — pozitif 365 günlük projeksiyon.`)
  }

  const growth = buildGrowthAnalysis(ctx.strategic)
  if (growth.topGrowthSource && !isDepoKati(growth.topGrowthSource.label) && growth.topGrowthSource.trend === 'UP') {
    out.push(
      `${growth.topGrowthSource.label} kaynağında %${growth.topGrowthSource.changePct} büyüme momentumu.`,
    )
  }

  for (const o of ctx.ceoReport.topOpportunities) {
    if (out.length >= SWOT_LIMIT) break
    if (isDepoKati(o.title)) continue
    out.push(`Fırsat: ${o.title} — ${o.impact}`)
  }

  for (const o of ctx.chairmanReport.topOpportunities) {
    if (out.length >= SWOT_LIMIT) break
    if (isDepoKati(o.title) || out.some((s) => s.includes(o.title))) continue
    out.push(`Stratejik fırsat: ${o.title}`)
  }

  if (base.dataQualityScore >= 85) {
    out.push(`Veri kalitesi skoru ${round1(base.dataQualityScore)} — güvenilir raporlama altyapısı.`)
  }
  if (ctx.futureReport.bestScenario.verdict === 'RECOMMENDED') {
    out.push(`En iyi senaryo (${ctx.futureReport.bestScenario.scenarioName}) yatırımcı perspektifinden olumlu.`)
  }

  while (out.length < SWOT_LIMIT) {
    out.push(`Operasyonel olgunluk: ${SOURCE_MODULES.length} modül entegrasyonu ile uçtan uca görünürlük.`)
    if (out.length >= SWOT_LIMIT) break
    out.push('Deterministik yönetim motorları ile ölçülebilir KPI takibi.')
    if (out.length >= SWOT_LIMIT) break
    out.push('Çok katmanlı yönetişim (CEO, Kurul, Başkan) ile kurumsal disiplin.')
  }

  return out.slice(0, SWOT_LIMIT)
}

export function buildWeaknesses(ctx: InvestorContext): string[] {
  const out: string[] = []
  const base = extractBaseState(ctx)
  const components = computeScoreComponents(ctx)

  if (components.profitabilityScore < 55) {
    out.push(`Kârlılık marjı %${base.profitMarginPct} — maliyet yapısı baskı altında.`)
  }
  if (components.collectionScore < 70) {
    out.push(`Tahsilat oranı %${round1(base.collectionRate)} — nakit dönüşümü zayıf.`)
  }
  if (components.riskScore < 55) {
    out.push(`Risk skoru ${components.riskScore} — finansal ve operasyonel risk yüksek.`)
  }
  if (base.riskyReceivable > 0 && base.openBalance > 0) {
    const share = round1((base.riskyReceivable / base.openBalance) * 100)
    out.push(`Riskli alacak payı %${share} (${formatMoneyAmount(base.riskyReceivable)} ₺).`)
  }
  if (base.delayedShipments > 3) {
    out.push(`${base.delayedShipments} gecikmiş sevk — operasyon kapasitesi yetersiz.`)
  }
  if (base.dataQualityScore < 80) {
    out.push(`Veri kalitesi ${round1(base.dataQualityScore)} — karar destek güvenilirliği sınırlı.`)
  }

  for (const p of ctx.ceoReport.topProblems) {
    if (out.length >= SWOT_LIMIT) break
    if (isDepoKati(p.title)) continue
    out.push(`Operasyonel zayıflık: ${p.title} (${p.severity})`)
  }

  for (const r of ctx.board.topRisks) {
    if (out.length >= SWOT_LIMIT) break
    if (isDepoKati(r.title) || out.some((w) => w.includes(r.title))) continue
    out.push(`Kurul riski: ${r.title}`)
  }

  if (ctx.futureReport.worstScenario.scenarioId === 'CRISIS') {
    const crisisHealth = ctx.futureReport.worstScenario.horizons.find((h) => h.days === 365)?.metrics.companyHealth ?? 0
    out.push(`Kriz senaryosunda 365. gün sağlık ${crisisHealth} — downside riski belirgin.`)
  }

  while (out.length < SWOT_LIMIT) {
    out.push('Tek lokasyon bağımlılığı — coğrafi çeşitlendirme sınırlı.')
    if (out.length >= SWOT_LIMIT) break
    out.push('Dış tedarik payı yönetimi — marj baskısı riski devam ediyor.')
    if (out.length >= SWOT_LIMIT) break
    out.push('Personel kapasitesi büyüme hızına göre sınırlı kalabilir.')
  }

  return out.slice(0, SWOT_LIMIT)
}

export function buildOpportunities(ctx: InvestorContext): string[] {
  const out: string[] = []
  const growth = buildGrowthAnalysis(ctx.strategic)
  const base = extractBaseState(ctx)

  if (growth.topGrowthSource && !isDepoKati(growth.topGrowthSource.label)) {
    out.push(`${growth.topGrowthSource.label} segmentinde bölgesel genişleme potansiyeli.`)
  }

  if (ctx.futureReport.bestScenario.verdict === 'RECOMMENDED') {
    out.push(`${ctx.futureReport.bestScenario.scenarioName} senaryosu ile değer yaratma fırsatı.`)
  }

  if (base.collectionRate < 85) {
    out.push(`Tahsilat iyileştirmesi ile %${round1(85 - base.collectionRate)} ek nakit serbest bırakılabilir.`)
  }

  if (base.profitMarginPct < 25) {
    out.push('Tedarikçi optimizasyonu ve kategori bazlı fiyatlandırma ile marj genişletme.')
  }

  for (const o of ctx.chairmanReport.topOpportunities) {
    if (out.length >= SWOT_LIMIT) break
    if (isDepoKati(o.title)) continue
    out.push(`${o.title}: ${o.description}`)
  }

  for (const o of ctx.ceoReport.topOpportunities) {
    if (out.length >= SWOT_LIMIT) break
    if (isDepoKati(o.title) || out.some((x) => x.includes(o.title))) continue
    out.push(`${o.title} — ${o.impact}`)
  }

  out.push('Dijital satış kanalı entegrasyonu ile yeni müşteri segmentlerine erişim.')
  out.push('İkinci mağaza açılışı ile pazar payı artırma potansiyeli.')
  out.push('Operasyon otomasyonu ile maliyet yapısını düşürme fırsatı.')
  out.push('Veri kalitesi yatırımı ile yönetim kararlarının hızlandırılması.')
  out.push('Stratejik tedarikçi ortaklıkları ile tedarik zinciri güvencesi.')

  return out.slice(0, SWOT_LIMIT)
}

export function buildThreats(ctx: InvestorContext): string[] {
  const out: string[] = []
  const base = extractBaseState(ctx)
  const forecast = buildRiskForecast(ctx.strategic)

  for (const item of forecast.items) {
    if (out.length >= SWOT_LIMIT) break
    if (isDepoKati(item.riskTitle)) continue
    out.push(`${item.riskTitle} (${item.severity}): ${item.description}`)
  }

  for (const t of ctx.chairmanReport.topThreats) {
    if (out.length >= SWOT_LIMIT) break
    if (isDepoKati(t.title) || out.some((x) => x.includes(t.title))) continue
    out.push(`${t.title} — ${t.horizon} ufku (${t.severity})`)
  }

  if (base.riskyReceivable > base.collected * 0.3) {
    out.push('Yüksek riskli alacak yoğunluğu — tahsilat şoku riski.')
  }

  if (ctx.futureReport.worstScenario.scenarioId === 'CRISIS') {
    out.push('Makroekonomik veya sektörel daralma kriz senaryosunu tetikleyebilir.')
  }

  out.push('Rekabet baskısı — fiyat ve marj sıkışması riski.')
  out.push('Tedarik zinciri kesintileri — stok ve teslimat gecikmeleri.')
  out.push('Personel devir hızı — operasyonel süreklilik riski.')
  out.push('Regülasyon ve vergi değişiklikleri — maliyet artışı baskısı.')
  out.push('Tek lokasyon riski — coğrafi konsantrasyon.')

  return out.slice(0, SWOT_LIMIT)
}

export function buildInvestorBriefing(
  ctx: InvestorContext,
  investorScore: number,
  components: InvestorScoreComponentsDto,
  decision: InvestmentDecision,
  rating: CompanyRating,
): string[] {
  const base = extractBaseState(ctx)
  const growth = buildGrowthAnalysis(ctx.strategic)
  const paragraphs: string[] = []

  paragraphs.push(
    `Yatırımcı Merkezi analizi, ${SOURCE_MODULES.length} operasyonel modülün sentezi ile tamamlandı. ` +
      `Yatırımcı skoru ${investorScore} (${scoreBand(investorScore)}), şirket derecelendirmesi ${rating} ` +
      `ve yatırım kararı ${decision} olarak belirlendi. CEO skoru ${ctx.ceoReport.ceoScore}, ` +
      `Başkan skoru ${ctx.chairmanReport.chairmanScore} ve gelecek motoru skoru ${ctx.futureReport.futureScore} referans alındı.`,
  )

  paragraphs.push(
    `Finansal profil: ciro ${formatMoneyAmount(base.revenue)} ₺, brüt marj %${base.profitMarginPct}, ` +
      `tahsilat oranı %${round1(base.collectionRate)}. Kârlılık bileşeni ${components.profitabilityScore}, ` +
      `tahsilat bileşeni ${components.collectionScore}, nakit akış bileşeni ${components.cashFlowScore}. ` +
      `Açık bakiye ${formatMoneyAmount(base.openBalance)} ₺; riskli alacak ${formatMoneyAmount(base.riskyReceivable)} ₺.`,
  )

  if (growth.topGrowthSource && !isDepoKati(growth.topGrowthSource.label)) {
    paragraphs.push(
      `Büyüme dinamikleri: ${growth.topGrowthSource.label} kaynağı ${growth.topGrowthSource.trend} trendinde ` +
        `(%${growth.topGrowthSource.changePct} değişim). Büyüme bileşeni ${components.growthScore}. ` +
        `365 günlük en iyi senaryo ${ctx.futureReport.bestScenario.scenarioName} (${ctx.futureReport.bestScenario.verdictLabel}), ` +
        `en kötü senaryo ${ctx.futureReport.worstScenario.scenarioName}. Değerleme trendi yatırımcı perspektifinden değerlendirildi.`,
    )
  } else {
    paragraphs.push(
      `Büyüme dinamikleri sınırlı veya belirsiz; büyüme bileşeni ${components.growthScore}. ` +
        `365 günlük en iyi senaryo ${ctx.futureReport.bestScenario.scenarioName}, en kötü ${ctx.futureReport.worstScenario.scenarioName}. ` +
        `Kontrollü büyüme veya tahsilat disiplini yatırımcı getirisini koruyabilir.`,
    )
  }

  paragraphs.push(
    `Risk profili: risk bileşeni ${components.riskScore}, stabilite bileşeni ${components.stabilityScore}. ` +
      `Başkan kararı ${ctx.chairmanReport.chairmanDecision}, CEO kararı ${ctx.ceoReport.ceoDecision}. ` +
      `${base.delayedShipments} gecikmiş sevk ve veri kalitesi ${round1(base.dataQualityScore)} operasyonel risk göstergeleri olarak izlenmelidir.`,
  )

  paragraphs.push(
    `Yatırımcı özeti: ${decision} kararı ${rating} derecelendirmesi ile uyumlu. ` +
      `Yeni mağaza hazırlığı ${resolveNewStoreReadiness(ctx).status}, finansman ihtiyacı ${resolveFinancingNeed(ctx)} seviyesinde. ` +
      `${ctx.chairmanReport.chairmanReason[0] ?? 'Stratejik yön değerlendirmesi tamamlandı.'} ` +
      `Önerilen aksiyonlar topRecommendations listesinde önceliklendirilmiştir.`,
  )

  return paragraphs
}

export function buildTopRecommendations(
  ctx: InvestorContext,
  decision: InvestmentDecision,
): InvestorRecommendationDto[] {
  const out: InvestorRecommendationDto[] = []
  const base = extractBaseState(ctx)
  let priority = 1

  function add(category: string, title: string, description: string): void {
    if (out.length >= RECOMMENDATIONS_LIMIT) return
    out.push({ id: `rec:${priority}`, priority: priority++, title, category, description })
  }

  if (base.collectionRate < 80) {
    add('Finans', 'Tahsilat hızlandırma programı', `Tahsilat oranını %${round1(base.collectionRate)} → %85 hedefle.`)
  }
  if (base.riskyReceivable > 0) {
    add('Risk', 'Riskli alacak temizliği', `${formatMoneyAmount(base.riskyReceivable)} ₺ riskli alacağı yapılandır veya tahsil et.`)
  }
  if (base.profitMarginPct < 20) {
    add('Kârlılık', 'Marj iyileştirme', `Brüt marjı %${base.profitMarginPct} → +3 puan artırma planı.`)
  }
  if (base.delayedShipments > 2) {
    add('Operasyon', 'Sevk gecikmesi azaltma', `${base.delayedShipments} gecikmiş sevki 7 gün içinde çöz.`)
  }
  if (base.dataQualityScore < 85) {
    add('Veri', 'Veri kalitesi yükseltme', `Skoru ${round1(base.dataQualityScore)} → 90+ hedefle.`)
  }

  if (decision === 'STRONG_BUY' || decision === 'BUY') {
    add('Büyüme', 'Kontrollü yatırım planı', 'Pozitif profil — seçili büyüme yatırımları değerlendirilebilir.')
  } else if (decision === 'AVOID' || decision === 'CRITICAL') {
    add('Stabilizasyon', 'Risk azaltma önceliği', 'Yeni yatırımları dondur; tahsilat ve maliyet disiplini uygula.')
  } else {
    add('İzleme', 'Çeyreklik performans takibi', 'Mevcut metrikleri 90 günde bir yatırımcı brifingine taşı.')
  }

  const readiness = resolveNewStoreReadiness(ctx)
  if (readiness.status === 'READY') {
    add('Genişleme', 'Yeni mağaza fizibilitesi', 'Hazırlık tamam — yatırım komitesi fizibilite onayına sunulsun.')
  } else if (readiness.status === 'PARTIAL') {
    add('Genişleme', 'Genişleme ön koşulları', 'Kısmi hazırlık — eksik alanları 6 ay içinde tamamla.')
  } else {
    add('Genişleme', 'Genişlemeyi ertele', 'Yeni mağaza yatırımı mevcut profilde önerilmez.')
  }

  add('Yönetişim', 'CEO-Kurul hizalaması', `CEO ${ctx.ceoReport.ceoDecision}, Kurul ${ctx.board.boardDecision} — uyum izle.`)
  add('Senaryo', `En iyi senaryo: ${ctx.futureReport.bestScenario.scenarioName}`, ctx.futureReport.bestScenario.basis)
  add('Senaryo', 'Kriz planı hazırlığı', `${ctx.futureReport.worstScenario.scenarioName} referans bandı olarak izlenmeli.`)

  while (out.length < RECOMMENDATIONS_LIMIT) {
    add('Raporlama', 'Aylık yatırımcı brifingi', 'Deterministik motor çıktıları ile standart raporlama.')
    if (out.length >= RECOMMENDATIONS_LIMIT) break
    add('Portföy', 'Kategori bazlı kârlılık analizi', 'Düşük marjlı kategorilerde fiyat/maliyet revizyonu.')
  }

  return out.slice(0, RECOMMENDATIONS_LIMIT)
}

export async function gatherInvestorContext(prisma: PrismaClient): Promise<InvestorContext> {
  const futureCtx = await gatherEnterpriseFutureContext(prisma)
  const futureReport = assembleEnterpriseFuture(futureCtx)
  return { ...futureCtx, futureReport }
}

export function assembleInvestorIntelligence(ctx: InvestorContext): InvestorIntelligenceResponseDto {
  const scoreComponents = computeScoreComponents(ctx)
  const investorScore = computeInvestorScore(scoreComponents)
  const companyRating = resolveCompanyRating(investorScore)
  const investmentDecision = resolveInvestmentDecision(investorScore, scoreComponents)
  const newStoreReadiness = resolveNewStoreReadiness(ctx)
  const growthPotential = resolveGrowthPotential(ctx)
  const financingNeed = resolveFinancingNeed(ctx)
  const investmentRisk = resolveInvestmentRisk(scoreComponents)
  const valuationTrend = resolveValuationTrend(ctx)
  const health = buildCompanyHealth(ctx.strategic)
  const generatedAt = new Date().toISOString()

  const summary: InvestorSummaryDto = {
    investorScore,
    investorScoreBand: scoreBand(investorScore),
    companyRating,
    investmentDecision,
    newStoreReadiness: newStoreReadiness.status,
    growthPotential,
    financingNeed,
    investmentRisk,
    valuationTrend,
    futureScore: ctx.futureReport.futureScore,
    chairmanScore: ctx.chairmanReport.chairmanScore,
    ceoScore: ctx.ceoReport.ceoScore,
    companyHealthScore: health.score,
    sourcesRead: SOURCE_MODULES.length,
    generatedAt,
  }

  return {
    summary,
    investorScore,
    scoreComponents,
    companyRating,
    investmentDecision,
    newStoreReadiness,
    growthPotential,
    financingNeed,
    investmentRisk,
    valuationTrend,
    strengths: buildStrengths(ctx),
    weaknesses: buildWeaknesses(ctx),
    opportunities: buildOpportunities(ctx),
    threats: buildThreats(ctx),
    investorBriefing: buildInvestorBriefing(ctx, investorScore, scoreComponents, investmentDecision, companyRating),
    topRecommendations: buildTopRecommendations(ctx, investmentDecision),
    today: ctx.strategic.today,
    generatedAt,
    meta: { depoKatiExcluded: true, sources: [...SOURCE_MODULES] },
  }
}
