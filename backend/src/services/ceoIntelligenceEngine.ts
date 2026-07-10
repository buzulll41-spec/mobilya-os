/**
 * Otonom CEO motoru — Faz 5–17 çıktılarını sentezleyerek nihai CEO kararı üretir.
 * Deterministik; LLM yok. Depo Katı hiçbir çıktıda görünmez.
 */

import type { PrismaClient } from '@prisma/client'
import { formatMoneyAmount } from '../lib/supplierLedger.js'
import {
  gatherStrategicContext,
  buildCompanyHealth,
  buildGrowthAnalysis,
  assembleStrategicIntelligence,
  type StrategicContext,
} from './strategicIntelligenceEngine.js'
import {
  gatherDirectorContext,
  assembleExecutiveDirectorResponse,
  type DirectorContext,
} from './executiveDirectorEngine.js'
import {
  assembleBoardDirectors,
  type BoardContext,
} from './boardDirectorsEngine.js'
import {
  assembleCompanySimulation,
  computeHealthFromMetrics,
  gatherSimulationBaseline,
} from './companySimulationEngine.js'
import type { BoardDirectorsResponseDto } from '../contracts/boardDirectorsDto.js'
import type { CompanySimulationResponseDto } from '../contracts/companySimulationDto.js'
import type { StrategicIntelligenceResponseDto } from '../contracts/strategicIntelligenceDto.js'
import type {
  CeoDecision,
  CeoIntelligenceResponseDto,
  CeoIntelligenceSummaryDto,
  CeoOpportunityItemDto,
  CeoProblemItemDto,
} from '../contracts/ceoIntelligenceDto.js'

const PROBLEMS_LIMIT = 10
const OPPORTUNITIES_LIMIT = 10
const REASON_LIMIT = 10
const TODAY_ACTIONS_LIMIT = 5

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
] as const

const DECISION_LABELS: Record<CeoDecision, string> = {
  FOCUS_COLLECTION: 'Tahsilata Odaklan',
  FOCUS_GROWTH: 'Büyümeye Odaklan',
  FOCUS_PROFITABILITY: 'Kârlılığa Odaklan',
  FOCUS_OPERATIONS: 'Operasyona Odaklan',
  FOCUS_RISK_REDUCTION: 'Risk Azaltmaya Odaklan',
  OPEN_NEW_STORE: 'Yeni Mağaza Aç',
  DELAY_NEW_STORE: 'Yeni Mağazayı Ertele',
  HIRE_SALES_TEAM: 'Satış Ekibini Büyüt',
  INCREASE_CAPACITY: 'Kapasiteyi Artır',
  OPTIMIZE_SUPPLIERS: 'Tedarikçileri Optimize Et',
}

const DECISION_HEADLINE: Record<CeoDecision, string> = {
  FOCUS_COLLECTION: 'Önümüzdeki 90 gün boyunca tahsilata odaklan.',
  FOCUS_GROWTH: 'Önümüzdeki 90 gün boyunca kontrollü büyümeyi hızlandır.',
  FOCUS_PROFITABILITY: 'Önümüzdeki 90 gün boyunca kârlılık ve marj optimizasyonuna odaklan.',
  FOCUS_OPERATIONS: 'Önümüzdeki 90 gün boyunca operasyon disiplinini güçlendir.',
  FOCUS_RISK_REDUCTION: 'Önümüzdeki 90 gün boyunca risk azaltma programını uygula.',
  OPEN_NEW_STORE: 'Yeni mağaza yatırımını onayla; sevk kapasitesini planla.',
  DELAY_NEW_STORE: 'Yeni mağaza açılışını 90 gün ertele; nakit akışını koru.',
  HIRE_SALES_TEAM: 'Satış ekibini kademeli büyüt; hedef ve eğitim planı hazırla.',
  INCREASE_CAPACITY: 'Sevk ve operasyon kapasitesini artır; gecikmeleri azalt.',
  OPTIMIZE_SUPPLIERS: 'Tedarikçi portföyünü optimize et; maliyet ve teslim performansını iyileştir.',
}

export type CeoIntelligenceContext = {
  strategic: StrategicContext
  strategicReport: StrategicIntelligenceResponseDto
  executive: DirectorContext
  executiveReport: ReturnType<typeof assembleExecutiveDirectorResponse>
  board: BoardDirectorsResponseDto
  simulation: CompanySimulationResponseDto
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

function extractMetrics(ctx: StrategicContext) {
  const totals = ctx.srcRes.totals
  const extRow = ctx.srcRes.rows.find((r) => r.label.includes('Dış') || r.key.includes('EXTERNAL'))
  const extRev = extRow ? num(extRow.revenue) : 0
  const totalRev = num(totals.revenue)
  return {
    revenue: totalRev,
    grossProfit: num(totals.grossProfit),
    profitMarginPct: totals.profitMarginPct,
    collected: num(totals.collected),
    openBalance: num(totals.openBalance),
    riskyReceivable: num(totals.riskyReceivable),
    delayedShipments: ctx.delayedShipments,
    dataQualityScore: ctx.dq.totals.averageQualityScore,
    managerScore: ctx.ceo.managerScore.score,
    externalSupplyShare: totalRev > 0 ? extRev / totalRev : 0,
  }
}

/** CEO skoru — şirket sağlığı, kurul skoru, risk, kârlılık, tahsilat, operasyon ağırlıklı. */
export function computeCeoScore(ctx: CeoIntelligenceContext): number {
  const m = extractMetrics(ctx.strategic)
  const health = buildCompanyHealth(ctx.strategic).score
  const boardScore = ctx.board.boardScore
  const { risk } = computeHealthFromMetrics(m)
  const collRatio = m.collected + m.openBalance > 0 ? (m.collected / (m.collected + m.openBalance)) * 100 : 100
  const profitabilityScore = (clamp(m.profitMarginPct, 0, 30) / 30) * 100
  const operationScore = clamp(m.managerScore, 0, 100)

  return round1(
    health * 0.25 +
      boardScore * 0.2 +
      risk * 0.15 +
      profitabilityScore * 0.15 +
      collRatio * 0.15 +
      operationScore * 0.1,
  )
}

export function resolveCeoDecision(ctx: CeoIntelligenceContext): CeoDecision {
  const m = extractMetrics(ctx.strategic)
  const collRatio = m.collected + m.openBalance > 0 ? (m.collected / (m.collected + m.openBalance)) * 100 : 100
  const riskyShare = m.openBalance > 0 ? m.riskyReceivable / m.openBalance : 0
  const health = buildCompanyHealth(ctx.strategic).score
  const board = ctx.board
  const sim = ctx.simulation
  const exec = ctx.executiveReport
  const growth = buildGrowthAnalysis(ctx.strategic)

  const tally = new Map<CeoDecision, number>()

  function add(decision: CeoDecision, weight: number): void {
    tally.set(decision, (tally.get(decision) ?? 0) + weight)
  }

  // Kurul kararı sinyali
  switch (board.boardDecision) {
    case 'DELAY_NEW_STORE':
      add('DELAY_NEW_STORE', 28)
      add('FOCUS_COLLECTION', 22)
      break
    case 'FOCUS_COLLECTION':
      add('FOCUS_COLLECTION', 35)
      break
    case 'FOCUS_OPERATIONS':
      add('FOCUS_OPERATIONS', 30)
      add('INCREASE_CAPACITY', 12)
      break
    case 'FOCUS_PROFITABILITY':
      add('FOCUS_PROFITABILITY', 28)
      add('OPTIMIZE_SUPPLIERS', 18)
      break
    case 'FOCUS_RISK_REDUCTION':
      add('FOCUS_RISK_REDUCTION', 32)
      break
    case 'OPEN_NEW_STORE':
      add('OPEN_NEW_STORE', 25)
      add('FOCUS_GROWTH', 15)
      break
  }

  // Finansal baskı
  if (collRatio < 65 || riskyShare > 0.3) {
    add('FOCUS_COLLECTION', 25)
    add('DELAY_NEW_STORE', 15)
  } else if (collRatio < 75) {
    add('FOCUS_COLLECTION', 12)
  }

  // Risk
  if (riskyShare > 0.25 || m.dataQualityScore < 70) {
    add('FOCUS_RISK_REDUCTION', 20)
  }

  // Operasyon
  if (m.delayedShipments >= 5 || exec.summary.p1Count >= 2) {
    add('FOCUS_OPERATIONS', 22)
    add('INCREASE_CAPACITY', 14)
  }

  // Simülasyon
  const simDelta = sim.bestCase.after.companyHealthScore - sim.baseline.companyHealthScore
  const simWorstDelta = sim.baseline.companyHealthScore - sim.worstCase.after.companyHealthScore
  if (simDelta >= 5 && health >= 60 && collRatio >= 75) {
    add('OPEN_NEW_STORE', 18)
    add('FOCUS_GROWTH', 10)
  }
  if (simWorstDelta >= 10) {
    add('FOCUS_RISK_REDUCTION', 12)
    add('FOCUS_COLLECTION', 10)
  }

  // Büyüme fırsatı
  if (growth.topGrowthSource?.trend === 'UP' && growth.topGrowthSource.changePct >= 8 && health >= 65) {
    add('FOCUS_GROWTH', 18)
    add('HIRE_SALES_TEAM', 12)
  }

  // Tedarikçi
  if (m.profitMarginPct < 18 || m.externalSupplyShare > 0.4) {
    add('OPTIMIZE_SUPPLIERS', 16)
    add('FOCUS_PROFITABILITY', 10)
  }

  // Kârlılık güçlü + risk düşük → büyüme
  if (m.profitMarginPct >= 22 && riskyShare < 0.15 && collRatio >= 80 && m.delayedShipments <= 2) {
    add('OPEN_NEW_STORE', 20)
    add('FOCUS_GROWTH', 14)
  }

  let winner: CeoDecision = 'FOCUS_OPERATIONS'
  let maxScore = -1
  for (const [decision, score] of tally) {
    if (score > maxScore) {
      maxScore = score
      winner = decision
    }
  }
  return winner
}

export function buildCeoReason(ctx: CeoIntelligenceContext, decision: CeoDecision): string[] {
  const m = extractMetrics(ctx.strategic)
  const collRatio = m.collected + m.openBalance > 0 ? (m.collected / (m.collected + m.openBalance)) * 100 : 100
  const health = buildCompanyHealth(ctx.strategic)
  const reasons: string[] = []

  reasons.push(`Şirket sağlık skoru ${health.score} (${health.band}).`)
  reasons.push(`Yönetim Kurulu kararı: ${ctx.board.boardDecision} (kurul skoru ${ctx.board.boardScore}).`)
  reasons.push(
    `Tahsilat oranı %${round1(collRatio)}; açık bakiye ${formatMoneyAmount(m.openBalance)} ₺, riskli alacak ${formatMoneyAmount(m.riskyReceivable)} ₺.`,
  )
  reasons.push(`Kârlılık marjı %${m.profitMarginPct}; ${m.delayedShipments} geciken sevk.`)
  reasons.push(
    `Simülasyon: best case ${ctx.simulation.bestCase.after.companyHealthScore}, worst case ${ctx.simulation.worstCase.after.companyHealthScore} (baseline ${ctx.simulation.baseline.companyHealthScore}).`,
  )
  reasons.push(
    `Genel Müdür: yönetici skoru ${ctx.executiveReport.summary.managerScore}, ${ctx.executiveReport.summary.p1Count} P1 konu.`,
  )
  reasons.push(`Tahmin motoru ve aksiyon merkezi ${ctx.strategic.actionResult.actions.length} açık aksiyon üretiyor.`)
  reasons.push(`Stratejik merkez ${ctx.strategicReport.recommendations.length} öneri sunuyor.`)
  reasons.push(`Nihai CEO kararı: ${DECISION_LABELS[decision]} — ${DECISION_HEADLINE[decision]}`)
  reasons.push(`Veri kaynakları: ${SOURCE_MODULES.length} faz modülü sentezlendi.`)

  return reasons.slice(0, REASON_LIMIT)
}

export function buildTopProblems(ctx: CeoIntelligenceContext): CeoProblemItemDto[] {
  const out: CeoProblemItemDto[] = []

  for (const r of ctx.board.topRisks) {
    if (isDepoKati(r.title)) continue
    out.push({ id: r.id, title: r.title, severity: r.severity, description: r.description })
  }

  for (const risk of ctx.executiveReport.riskMap) {
    if (out.length >= PROBLEMS_LIMIT) break
    if (isDepoKati(risk.riskTitle) || out.some((p) => p.title === risk.riskTitle)) continue
    out.push({
      id: risk.id,
      title: risk.riskTitle,
      severity: risk.severity,
      description: risk.impact,
    })
  }

  const m = extractMetrics(ctx.strategic)
  if (m.delayedShipments > 0 && out.length < PROBLEMS_LIMIT) {
    out.push({
      id: 'prob:delayed-shipments',
      title: 'Geciken sevkiyatlar',
      severity: m.delayedShipments >= 5 ? 'CRITICAL' : 'WARNING',
      description: `${m.delayedShipments} sipariş planlanan sevk tarihini geçti.`,
    })
  }

  if (m.dataQualityScore < 75 && out.length < PROBLEMS_LIMIT) {
    out.push({
      id: 'prob:data-quality',
      title: 'Veri kalitesi düşük',
      severity: m.dataQualityScore < 60 ? 'CRITICAL' : 'WARNING',
      description: `Ortalama veri kalitesi skoru ${round1(m.dataQualityScore)}.`,
    })
  }

  const severityRank = { CRITICAL: 3, WARNING: 2, INFO: 1 }
  out.sort((a, b) => severityRank[b.severity] - severityRank[a.severity])
  return out.slice(0, PROBLEMS_LIMIT)
}

export function buildTopOpportunities(ctx: CeoIntelligenceContext): CeoOpportunityItemDto[] {
  const out: CeoOpportunityItemDto[] = []

  for (const o of ctx.board.topOpportunities) {
    if (isDepoKati(o.title)) continue
    out.push({ id: o.id, title: o.title, impact: o.impact, description: o.description })
  }

  for (const rec of ctx.strategicReport.recommendations) {
    if (out.length >= OPPORTUNITIES_LIMIT) break
    if (isDepoKati(rec.title) || out.some((o) => o.title === rec.title)) continue
    out.push({
      id: rec.id,
      title: rec.title,
      impact: rec.priority,
      description: rec.reason,
    })
  }

  const growth = buildGrowthAnalysis(ctx.strategic)
  if (growth.topGrowthSource?.trend === 'UP' && out.length < OPPORTUNITIES_LIMIT) {
    const g = growth.topGrowthSource
    if (!isDepoKati(g.label)) {
      out.push({
        id: `opp:ceo:source:${g.key}`,
        title: `${g.label} büyümesi`,
        impact: `%${g.changePct} artış`,
        description: `Stratejik büyüme fırsatı — ciro ${g.currentRevenue} ₺.`,
      })
    }
  }

  return out.slice(0, OPPORTUNITIES_LIMIT)
}

export function buildTodayActions(ctx: CeoIntelligenceContext, decision: CeoDecision): string[] {
  const actions: string[] = []
  const m = extractMetrics(ctx.strategic)

  switch (decision) {
    case 'FOCUS_COLLECTION':
      actions.push('Riskli müşteri tahsilat planını CEO onayı ile güncelle.')
      actions.push(`${formatMoneyAmount(m.riskyReceivable)} ₺ riskli alacak için P1 takip listesi oluştur.`)
      break
    case 'FOCUS_OPERATIONS':
    case 'INCREASE_CAPACITY':
      actions.push(`${m.delayedShipments} geciken sevk için termin koordinasyonu başlat.`)
      actions.push('Operasyon vakaları ve otomasyon kuyruğunu günlük CEO brifingine al.')
      break
    case 'FOCUS_RISK_REDUCTION':
      actions.push('Kritik risk vakalarını kapat; veri kalitesi sprinti başlat.')
      break
    case 'OPEN_NEW_STORE':
    case 'FOCUS_GROWTH':
      actions.push('Yeni mağaza fizibilite ve sevk kapasitesi planını onayla.')
      break
    case 'DELAY_NEW_STORE':
      actions.push('Yeni mağaza yatırımını 90 gün dondur; nakit projeksiyonunu haftalık güncelle.')
      break
    case 'HIRE_SALES_TEAM':
      actions.push('Satış ekibi büyüme planı ve KPI hedeflerini onayla.')
      break
    case 'OPTIMIZE_SUPPLIERS':
    case 'FOCUS_PROFITABILITY':
      actions.push('Düşük marjlı tedarikçi sözleşmelerini gözden geçir.')
      break
  }

  for (const action of ctx.board.whatBoardWouldDoToday) {
    if (actions.length >= TODAY_ACTIONS_LIMIT) break
    if (!actions.includes(action)) actions.push(action)
  }

  for (const rec of ctx.executiveReport.recommendedActions) {
    if (actions.length >= TODAY_ACTIONS_LIMIT) break
    if (isDepoKati(rec.title)) continue
    const line = `${rec.title} — ${rec.reason}`
    if (!actions.some((a) => a.includes(rec.title))) actions.push(line)
  }

  if (actions.length < TODAY_ACTIONS_LIMIT) {
    actions.push('CEO kararını yönetim kuruluna ve departmanlara yazılı ilet.')
  }

  return actions.slice(0, TODAY_ACTIONS_LIMIT)
}

export function buildNext30Days(decision: CeoDecision, ctx: CeoIntelligenceContext): string[] {
  const plans: string[] = []
  const m = extractMetrics(ctx.strategic)

  switch (decision) {
    case 'FOCUS_COLLECTION':
      plans.push('Haftalık tahsilat KPI takibi ve riskli segmentasyon.')
      plans.push('Açık bakiye > 50K müşterilerde ödeme planı revizyonu.')
      plans.push('Tahsilat performansını kurul gündemine haftalık taşı.')
      break
    case 'FOCUS_OPERATIONS':
    case 'INCREASE_CAPACITY':
      plans.push('Geciken sevk kök neden analizi ve haftalık kapanış hedefi.')
      plans.push('Eksik kalem ve SSH vakalarında SLA takibi.')
      plans.push('Sevk kapasitesi ve araç planlaması revizyonu.')
      break
    case 'OPEN_NEW_STORE':
    case 'FOCUS_GROWTH':
      plans.push('Mağaza fizibilite ve lokasyon değerlendirmesi.')
      plans.push('Büyüme kaynağına pazarlama bütçesi ayırma.')
      plans.push('Satış ekibi kapasite planı.')
      break
    case 'FOCUS_RISK_REDUCTION':
      plans.push('Kritik vaka kapatma sprinti (30 gün).')
      plans.push('Veri kalitesi iyileştirme — ZERO_COST temizliği.')
      plans.push('Riskli sipariş onay sürecini sıkılaştır.')
      break
    case 'OPTIMIZE_SUPPLIERS':
    case 'FOCUS_PROFITABILITY':
      plans.push('Tedarikçi marj analizi ve yeniden müzakere listesi.')
      plans.push('Dış tedarik payı ve maliyet yapısı gözden geçirme.')
      plans.push(`Marj hedefi: mevcut %${m.profitMarginPct} → +2 puan.`)
      break
    default:
      plans.push('Operasyon ve tahsilat dengesini haftalık izle.')
      plans.push('Kurul kararı ile CEO kararını hizala.')
      plans.push('30 günlük KPI dashboard güncellemesi.')
  }

  return plans
}

export function buildNext90Days(decision: CeoDecision, ctx: CeoIntelligenceContext): string[] {
  const plans: string[] = []
  const health = buildCompanyHealth(ctx.strategic)

  switch (decision) {
    case 'FOCUS_COLLECTION':
      plans.push('90 gün sonunda tahsilat oranı +10 puan hedefi.')
      plans.push('Riskli alacak oranını %25 altına indir.')
      plans.push('Nakit akışı pozitif trend doğrulaması.')
      break
    case 'OPEN_NEW_STORE':
    case 'FOCUS_GROWTH':
      plans.push('Yeni mağaza veya büyüme yatırımı go/no-go kararı (60. gün).')
      plans.push('Ciro büyümesi %15 hedefi.')
      plans.push('Sevk ve operasyon kapasitesi ölçeklendirme planı.')
      break
    case 'DELAY_NEW_STORE':
      plans.push('90 gün sonra yatırım kararını yeniden değerlendir.')
      plans.push('Tahsilat ve risk KPI iyileşme eşiği belirle.')
      plans.push('Nakit rezerv hedefi oluştur.')
      break
    case 'FOCUS_OPERATIONS':
    case 'INCREASE_CAPACITY':
      plans.push('Geciken sevk oranını %50 azalt.')
      plans.push('Operasyon skorunu +15 puan artır.')
      plans.push('Kapasite artırımı ROI analizi.')
      break
    case 'FOCUS_RISK_REDUCTION':
      plans.push('Kritik risk sayısını sıfıra indir.')
      plans.push('Veri kalitesi skorunu 85+ yap.')
      plans.push('Risk yönetim sürecini kalıcı hale getir.')
      break
    case 'HIRE_SALES_TEAM':
      plans.push('2–3 yeni satış personeli işe alım ve eğitim.')
      plans.push('Kişi başı ciro hedefi belirleme.')
      plans.push('90 gün sonunda ekip verimlilik değerlendirmesi.')
      break
    case 'OPTIMIZE_SUPPLIERS':
    case 'FOCUS_PROFITABILITY':
      plans.push('Tedarikçi portföy optimizasyonu tamamlama.')
      plans.push('Brüt marj +3 puan hedefi.')
      plans.push('Maliyet yapısı sürdürülebilirlik raporu.')
      break
    default:
      plans.push(`Şirket sağlık skorunu ${health.score} → ${round1(health.score + 8)} hedefle.`)
      plans.push('Kurul ve CEO kararlarını çeyrek sonu değerlendirmesine bağla.')
      plans.push('Stratejik büyüme fırsatlarını yeniden puanla.')
  }

  return plans
}

export async function gatherCeoIntelligenceContext(prisma: PrismaClient): Promise<CeoIntelligenceContext> {
  const strategic = await gatherStrategicContext(prisma)
  const strategicReport = assembleStrategicIntelligence(strategic)
  const executive = await gatherDirectorContext(prisma)
  const executiveReport = assembleExecutiveDirectorResponse(executive)
  const boardCtx: BoardContext = { strategic, executive }
  const board = assembleBoardDirectors(boardCtx)
  const simBaseline = await gatherSimulationBaseline(prisma)
  const simulation = assembleCompanySimulation(simBaseline, {})

  return { strategic, strategicReport, executive, executiveReport, board, simulation }
}

export function assembleCeoIntelligence(ctx: CeoIntelligenceContext): CeoIntelligenceResponseDto {
  const ceoScore = computeCeoScore(ctx)
  const ceoDecision = resolveCeoDecision(ctx)
  const ceoReason = buildCeoReason(ctx, ceoDecision)
  const health = buildCompanyHealth(ctx.strategic)
  const generatedAt = new Date().toISOString()

  const summary: CeoIntelligenceSummaryDto = {
    ceoScore,
    ceoScoreBand: scoreBand(ceoScore),
    ceoDecision,
    companyHealthScore: health.score,
    boardScore: ctx.board.boardScore,
    boardDecision: ctx.board.boardDecision,
    sourcesRead: SOURCE_MODULES.length,
    generatedAt,
  }

  return {
    summary,
    ceoScore,
    ceoDecision,
    ceoReason,
    topProblems: buildTopProblems(ctx),
    topOpportunities: buildTopOpportunities(ctx),
    todayActions: buildTodayActions(ctx, ceoDecision),
    next30Days: buildNext30Days(ceoDecision, ctx),
    next90Days: buildNext90Days(ceoDecision, ctx),
    today: ctx.strategic.today,
    generatedAt,
    meta: { depoKatiExcluded: true, sources: [...SOURCE_MODULES] },
  }
}

export function getCeoDecisionHeadline(decision: CeoDecision): string {
  return DECISION_HEADLINE[decision]
}
