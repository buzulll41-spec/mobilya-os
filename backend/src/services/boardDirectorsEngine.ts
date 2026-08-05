/**

 * Otonom Yönetim Kurulu motoru — 6 direktör aynı veriye oy verir, ağırlıklı oylama kurul kararı üretir.

 * Deterministik; LLM yok. Depo Katı hiçbir çıktıda görünmez.

 */



import type { PrismaClient } from '@prisma/client'

import { formatMoneyAmount } from '../lib/supplierLedger.js'

import {

  gatherStrategicContext,

  buildCompanyHealth,

  buildGrowthAnalysis,

  buildRiskForecast,

  buildSupplierAnalysis,

  buildSalesPersonAnalysis,

  type StrategicContext,

} from './strategicIntelligenceEngine.js'

import {

  gatherDirectorContext,

  assembleExecutiveDirectorResponse,

  type DirectorContext,

} from './executiveDirectorEngine.js'

import { computeHealthFromMetrics, type VirtualMetrics } from './companySimulationEngine.js'

import type {

  BoardDecision,

  BoardDirectorsResponseDto,

  BoardDirectorsSummaryDto,

  BoardOpportunityItemDto,

  BoardRiskItemDto,

  DirectorCode,

  DirectorVote,

  DirectorVoteDto,

} from '../contracts/boardDirectorsDto.js'



const RISKS_LIMIT = 10

const OPPORTUNITIES_LIMIT = 10

const ACTIONS_LIMIT = 5



const DIRECTOR_WEIGHTS: Record<DirectorCode, number> = {

  FINANCE_DIRECTOR: 25,

  OPERATIONS_DIRECTOR: 20,

  SALES_DIRECTOR: 20,

  SUPPLIER_DIRECTOR: 10,

  RISK_DIRECTOR: 15,

  EXECUTIVE_DIRECTOR: 10,

}



const DIRECTOR_LABELS: Record<DirectorCode, string> = {

  FINANCE_DIRECTOR: 'Finans Direktörü',

  OPERATIONS_DIRECTOR: 'Operasyon Direktörü',

  SALES_DIRECTOR: 'Satış Direktörü',

  SUPPLIER_DIRECTOR: 'Tedarikçi Direktörü',

  RISK_DIRECTOR: 'Risk Direktörü',

  EXECUTIVE_DIRECTOR: 'Genel Müdür',

}



const VOTE_LABELS: Record<DirectorVote, string> = {

  DELAY_NEW_STORE: 'Yeni Mağazayı Ertele',

  OPEN_NEW_STORE: 'Yeni Mağaza Aç',

  FOCUS_COLLECTION: 'Tahsilata Odaklan',

  IMPROVE_OPERATIONS_FIRST: 'Önce Operasyonu İyileştir',

  EXPAND_GROWTH: 'Büyümeyi Hızlandır',

  SUPPLIER_OPTIMIZATION: 'Tedarikçi Optimizasyonu',

  REDUCE_RISK_FIRST: 'Önce Riski Azalt',

}



const BOARD_DECISION_LABELS: Record<BoardDecision, string> = {

  OPEN_NEW_STORE: 'Yeni Mağaza Aç',

  DELAY_NEW_STORE: 'Yeni Mağazayı Ertele',

  FOCUS_COLLECTION: 'Tahsilata Odaklan',

  FOCUS_OPERATIONS: 'Operasyona Odaklan',

  FOCUS_PROFITABILITY: 'Kârlılığa Odaklan',

  FOCUS_RISK_REDUCTION: 'Risk Azaltmaya Odaklan',

}



const VOTE_TO_BOARD: Record<DirectorVote, BoardDecision> = {

  DELAY_NEW_STORE: 'DELAY_NEW_STORE',

  OPEN_NEW_STORE: 'OPEN_NEW_STORE',

  FOCUS_COLLECTION: 'FOCUS_COLLECTION',

  IMPROVE_OPERATIONS_FIRST: 'FOCUS_OPERATIONS',

  EXPAND_GROWTH: 'OPEN_NEW_STORE',

  SUPPLIER_OPTIMIZATION: 'FOCUS_PROFITABILITY',

  REDUCE_RISK_FIRST: 'FOCUS_RISK_REDUCTION',

}



export type BoardContext = {

  strategic: StrategicContext

  executive: DirectorContext

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



function extractMetrics(ctx: StrategicContext): VirtualMetrics {

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



export function computeBoardScore(ctx: StrategicContext): number {

  const m = extractMetrics(ctx)

  const { health, risk } = computeHealthFromMetrics(m)

  const collRatio = m.collected + m.openBalance > 0 ? (m.collected / (m.collected + m.openBalance)) * 100 : 100

  const profitabilityScore = (clamp(m.profitMarginPct, 0, 30) / 30) * 100

  const operationScore = clamp(m.managerScore, 0, 100)

  return round1(

    health * 0.3 + risk * 0.2 + collRatio * 0.2 + profitabilityScore * 0.15 + operationScore * 0.15,

  )

}



export function voteFinanceDirector(ctx: StrategicContext): DirectorVoteDto {

  const totals = ctx.srcRes.totals

  const collected = num(totals.collected)

  const open = num(totals.openBalance)

  const risky = num(totals.riskyReceivable)

  const collRatio = collected + open > 0 ? (collected / (collected + open)) * 100 : 100

  const riskyShare = open > 0 ? risky / open : 0



  let vote: DirectorVote = 'FOCUS_COLLECTION'

  let confidence = 65

  let reason = `Tahsilat oranı %${round1(collRatio)}; açık bakiye ${formatMoneyAmount(open)} ₺.`



  if (riskyShare > 0.3 || collRatio < 60) {

    vote = 'DELAY_NEW_STORE'

    confidence = round1(clamp(70 + riskyShare * 40, 60, 95))

    reason = `Riskli alacak payı %${round1(riskyShare * 100)} ve tahsilat oranı %${round1(collRatio)} — yeni yatırım ertelenmeli.`

  } else if (collRatio < 75 || risky > 0) {

    vote = 'FOCUS_COLLECTION'

    confidence = round1(clamp(65 + (75 - collRatio) * 0.5, 55, 90))

    reason = `Açık bakiye ${formatMoneyAmount(open)} ₺, riskli alacak ${formatMoneyAmount(risky)} ₺ — nakit toplama öncelikli.`

  } else if (collRatio >= 85 && riskyShare < 0.15) {

    vote = 'OPEN_NEW_STORE'

    confidence = round1(clamp(60 + collRatio * 0.3, 55, 88))

    reason = `Tahsilat oranı %${round1(collRatio)} ve düşük risk — yeni mağaza yatırımı için nakit yeterli.`

  }



  return {

    code: 'FINANCE_DIRECTOR',

    label: DIRECTOR_LABELS.FINANCE_DIRECTOR,

    vote,

    voteLabel: VOTE_LABELS[vote],

    confidence,

    weight: DIRECTOR_WEIGHTS.FINANCE_DIRECTOR,

    reason,

  }

}



export function voteOperationsDirector(ctx: StrategicContext): DirectorVoteDto {

  const delayed = ctx.delayedShipments

  const p1 = ctx.ceo.operationsHealth.p1Cases

  const missingOpen = ctx.listItems.reduce((s, it) => s + (it.openMissingItemsCount ?? 0), 0)

  const dq = ctx.dq.totals.averageQualityScore



  let vote: DirectorVote = 'IMPROVE_OPERATIONS_FIRST'

  let confidence = 60

  let reason = `${delayed} geciken sevk, ${p1} P1 vaka — operasyon disiplini öncelikli.`



  if (delayed >= 5 || p1 >= 3 || missingOpen >= 5) {

    confidence = round1(clamp(70 + delayed * 3 + p1 * 5, 65, 95))

    reason = `${delayed} geciken sevk, ${missingOpen} açık eksik kalem, ${p1} kritik vaka — büyüme durdurulmalı.`

  } else if (delayed <= 1 && p1 === 0 && dq >= 80) {

    vote = 'EXPAND_GROWTH'

    confidence = 72

    reason = 'Operasyon disiplini iyi; sevk ve eksik kalem yükü düşük — kapasite artırımı mümkün.'

  } else {

    confidence = round1(clamp(55 + delayed * 5 + missingOpen * 2, 50, 85))

  }



  return {

    code: 'OPERATIONS_DIRECTOR',

    label: DIRECTOR_LABELS.OPERATIONS_DIRECTOR,

    vote,

    voteLabel: VOTE_LABELS[vote],

    confidence,

    weight: DIRECTOR_WEIGHTS.OPERATIONS_DIRECTOR,

    reason,

  }

}



export function voteSalesDirector(ctx: StrategicContext): DirectorVoteDto {

  const growth = buildGrowthAnalysis(ctx)

  const sales = buildSalesPersonAnalysis(ctx)

  const revenue = num(ctx.srcRes.totals.revenue)

  const topGrowth = growth.topGrowthSource

  const underperformers = sales.needsImprovement.length



  let vote: DirectorVote = 'EXPAND_GROWTH'

  let confidence = 62

  let reason = `Aylık ciro ${formatMoneyAmount(revenue)} ₺; satış hedefleri değerlendiriliyor.`



  if (topGrowth && topGrowth.trend === 'UP' && topGrowth.changePct >= 5) {

    vote = 'EXPAND_GROWTH'

    confidence = round1(clamp(60 + topGrowth.changePct * 0.8, 55, 92))

    reason = `${topGrowth.label} %${topGrowth.changePct} büyüdü — yatırım ve kapasite artırımı önerilir.`

  } else if (growth.topDecliningSource && growth.topDecliningSource.changePct <= -10) {

    vote = 'FOCUS_COLLECTION'

    confidence = 68

    reason = `${growth.topDecliningSource.label} %${Math.abs(growth.topDecliningSource.changePct)} geriledi — önce mevcut portföyü güçlendirin.`

  } else if (underperformers >= 3) {

    vote = 'IMPROVE_OPERATIONS_FIRST'

    confidence = 64

    reason = `${underperformers} personel hedef altında — büyümeden önce ekip performansı düzeltilmeli.`

  }



  return {

    code: 'SALES_DIRECTOR',

    label: DIRECTOR_LABELS.SALES_DIRECTOR,

    vote,

    voteLabel: VOTE_LABELS[vote],

    confidence,

    weight: DIRECTOR_WEIGHTS.SALES_DIRECTOR,

    reason,

  }

}



export function voteSupplierDirector(ctx: StrategicContext): DirectorVoteDto {

  const supplier = buildSupplierAnalysis(ctx)

  const riskyCount = supplier.riskySuppliers.length

  const best = supplier.bestSuppliers[0]



  let vote: DirectorVote = 'SUPPLIER_OPTIMIZATION'

  let confidence = 58

  let reason = 'Tedarikçi portföyü ve marj dengesi değerlendiriliyor.'



  if (riskyCount >= 2) {

    confidence = round1(clamp(65 + riskyCount * 5, 60, 90))

    const top = supplier.riskySuppliers[0]

    reason = `${riskyCount} riskli tedarikçi; ${top?.label ?? '—'} açık bakiye ${top?.openBalance ?? '—'} ₺ — optimizasyon şart.`

  } else if (best && best.score >= 70) {

    vote = 'EXPAND_GROWTH'

    confidence = 66

    reason = `${best.label} skor ${best.score} — güçlü tedarikçi ile büyüme desteklenebilir.`

  } else {

    const margin = ctx.srcRes.totals.profitMarginPct

    reason = `Ortalama marj %${margin}; tedarikçi maliyet yapısı gözden geçirilmeli.`

    confidence = round1(clamp(50 + (30 - margin) * 2, 50, 80))

  }



  return {

    code: 'SUPPLIER_DIRECTOR',

    label: DIRECTOR_LABELS.SUPPLIER_DIRECTOR,

    vote,

    voteLabel: VOTE_LABELS[vote],

    confidence,

    weight: DIRECTOR_WEIGHTS.SUPPLIER_DIRECTOR,

    reason,

  }

}



export function voteRiskDirector(ctx: StrategicContext): DirectorVoteDto {

  const riskForecast = buildRiskForecast(ctx)

  const dq = ctx.dq.totals.averageQualityScore

  const risky = num(ctx.srcRes.totals.riskyReceivable)

  const criticalCount = riskForecast.items.filter((i) => i.severity === 'CRITICAL').length

  const highRiskOrders = ctx.listItems.filter((it) => it.currentRiskSeverity === 'HIGH').length



  let vote: DirectorVote = 'REDUCE_RISK_FIRST'

  let confidence = 70

  let reason = `${criticalCount} kritik risk, ${highRiskOrders} yüksek riskli sipariş tespit edildi.`



  if (criticalCount >= 2 || dq < 70 || highRiskOrders >= 3) {

    confidence = round1(clamp(75 + criticalCount * 5, 70, 95))

    reason = `Veri kalitesi ${dq}, ${criticalCount} kritik risk, riskli alacak ${formatMoneyAmount(risky)} ₺ — risk azaltma öncelikli.`

  } else if (criticalCount === 0 && dq >= 85 && highRiskOrders === 0) {

    vote = 'OPEN_NEW_STORE'

    confidence = 62

    reason = 'Kritik risk yok, veri kalitesi yeterli — kontrollü büyüme onaylanabilir.'

  } else if (risky > 0 && num(ctx.srcRes.totals.openBalance) > 0) {

    vote = 'FOCUS_COLLECTION'

    confidence = 66

    reason = `Riskli alacak ${formatMoneyAmount(risky)} ₺ — tahsilat riski büyümeden önce yönetilmeli.`

  }



  return {

    code: 'RISK_DIRECTOR',

    label: DIRECTOR_LABELS.RISK_DIRECTOR,

    vote,

    voteLabel: VOTE_LABELS[vote],

    confidence,

    weight: DIRECTOR_WEIGHTS.RISK_DIRECTOR,

    reason,

  }

}



export function voteExecutiveDirector(executive: DirectorContext): DirectorVoteDto {

  const response = assembleExecutiveDirectorResponse(executive)

  const p1 = response.summary.p1Count

  const managerScore = response.summary.managerScore

  const topPriority = response.priorityQueue[0]



  let vote: DirectorVote = 'IMPROVE_OPERATIONS_FIRST'

  let confidence = 60

  let reason = `Yönetici skoru ${managerScore}; günlük operasyon planı ${response.dailyPlan.length} bölüm.`



  if (p1 >= 2) {

    const cat = topPriority?.category

    if (cat === 'COLLECTION') {

      vote = 'FOCUS_COLLECTION'

      confidence = round1(clamp(70 + p1 * 3, 65, 92))

      reason = `${p1} P1 konu; ilk öncelik tahsilat — ${topPriority?.title ?? 'kritik müşteri takibi'}.`

    } else {

      vote = 'REDUCE_RISK_FIRST'

      confidence = round1(clamp(68 + p1 * 4, 65, 93))

      reason = `${p1} kritik operasyon konusu — risk ve operasyon önceliklendirilmeli.`

    }

  } else if (managerScore >= 75 && p1 === 0) {

    vote = 'EXPAND_GROWTH'

    confidence = 70

    reason = `Yönetici skoru ${managerScore}, kritik konu yok — büyüme gündemine alınabilir.`

  } else if (topPriority?.category === 'PROFITABILITY') {

    vote = 'SUPPLIER_OPTIMIZATION'

    confidence = 65

    reason = `Kârlılık önceliği: ${topPriority.title}.`

  }



  return {

    code: 'EXECUTIVE_DIRECTOR',

    label: DIRECTOR_LABELS.EXECUTIVE_DIRECTOR,

    vote,

    voteLabel: VOTE_LABELS[vote],

    confidence,

    weight: DIRECTOR_WEIGHTS.EXECUTIVE_DIRECTOR,

    reason,

  }

}



export function buildDirectorVotes(ctx: BoardContext): DirectorVoteDto[] {

  return [

    voteFinanceDirector(ctx.strategic),

    voteOperationsDirector(ctx.strategic),

    voteSalesDirector(ctx.strategic),

    voteSupplierDirector(ctx.strategic),

    voteRiskDirector(ctx.strategic),

    voteExecutiveDirector(ctx.executive),

  ]

}



export function resolveBoardDecision(directors: DirectorVoteDto[]): {

  decision: BoardDecision

  reason: string

} {

  const tally = new Map<BoardDecision, number>()

  for (const d of directors) {

    const boardVote = VOTE_TO_BOARD[d.vote]

    const weighted = d.weight * (d.confidence / 100)

    tally.set(boardVote, (tally.get(boardVote) ?? 0) + weighted)

  }



  let winner: BoardDecision = 'FOCUS_OPERATIONS'

  let maxScore = -1

  for (const [decision, score] of tally) {

    if (score > maxScore) {

      maxScore = score

      winner = decision

    }

  }



  const supporters = directors.filter((d) => VOTE_TO_BOARD[d.vote] === winner)

  const names = supporters.map((d) => d.label).join(', ')

  const reason = `${BOARD_DECISION_LABELS[winner]} — ${supporters.length} direktör destekliyor (${names}); ağırlıklı skor ${round1(maxScore)}.`



  return { decision: winner, reason }

}



export function buildTopRisks(ctx: StrategicContext, executive: DirectorContext): BoardRiskItemDto[] {

  const out: BoardRiskItemDto[] = []

  const riskForecast = buildRiskForecast(ctx)



  for (const item of riskForecast.items) {

    if (isDepoKati(item.riskTitle)) continue

    out.push({

      id: item.id,

      title: item.riskTitle,

      severity: item.severity,

      description: item.description,

    })

  }



  const execResponse = assembleExecutiveDirectorResponse(executive)

  for (const risk of execResponse.riskMap) {

    if (out.length >= RISKS_LIMIT) break

    if (isDepoKati(risk.riskTitle) || out.some((r) => r.title === risk.riskTitle)) continue

    out.push({

      id: risk.id,

      title: risk.riskTitle,

      severity: risk.severity,

      description: risk.impact,

    })

  }



  const severityRank = { CRITICAL: 3, WARNING: 2, INFO: 1 }

  out.sort((a, b) => severityRank[b.severity] - severityRank[a.severity])

  return out.slice(0, RISKS_LIMIT)

}



export function buildTopOpportunities(ctx: StrategicContext): BoardOpportunityItemDto[] {

  const out: BoardOpportunityItemDto[] = []

  const growth = buildGrowthAnalysis(ctx)

  const product = ctx.brandRes



  if (growth.topGrowthSource && growth.topGrowthSource.trend === 'UP') {

    const g = growth.topGrowthSource

    if (!isDepoKati(g.label)) {

      out.push({

        id: `opp:source:${g.key}`,

        title: `${g.label} büyümesi`,

        impact: `%${g.changePct} artış`,

        description: `Ciro ${g.currentRevenue} ₺ — geçen aya göre güçlü performans.`,

      })

    }

  }



  if (growth.topGrowthCategory && growth.topGrowthCategory.trend === 'UP') {

    const g = growth.topGrowthCategory

    if (!isDepoKati(g.label)) {

      out.push({

        id: `opp:cat:${g.key}`,

        title: `${g.label} kategorisi`,

        impact: `%${g.changePct} büyüme`,

        description: `Kategori cirosu ${g.currentRevenue} ₺.`,

      })

    }

  }



  const topBrand = product.rows.find((r) => !isDepoKati(r.label) && r.profitMarginPct >= 20)

  if (topBrand) {

    out.push({

      id: `opp:brand:${topBrand.key}`,

      title: `${topBrand.label} marka marjı`,

      impact: `%${topBrand.profitMarginPct} marj`,

      description: `Ciro ${topBrand.revenue} ₺, brüt kâr ${topBrand.grossProfit} ₺.`,

    })

  }



  const sales = buildSalesPersonAnalysis(ctx)

  for (const person of sales.topSalesPeople.slice(0, 3)) {

    if (isDepoKati(person.label)) continue

    out.push({

      id: `opp:sales:${person.key}`,

      title: `${person.label} performansı`,

      impact: `Skor ${person.score}`,

      description: `Ciro ${person.revenue} ₺, hedef gerçekleşme %${person.achievementPct}.`,

    })

  }



  const health = buildCompanyHealth(ctx)

  if (health.score >= 70) {

    out.push({

      id: 'opp:health',

      title: 'Şirket sağlığı güçlü',

      impact: `Skor ${health.score}`,

      description: `${health.band} bant — kontrollü yatırım için uygun zemin.`,

    })

  }



  return out.slice(0, OPPORTUNITIES_LIMIT)

}



export function buildWhatBoardWouldDoToday(

  decision: BoardDecision,

  ctx: StrategicContext,

  executive: DirectorContext,

): string[] {

  const actions: string[] = []

  const execResponse = assembleExecutiveDirectorResponse(executive)



  switch (decision) {

    case 'FOCUS_COLLECTION':

      actions.push('Riskli müşteri tahsilat planını güncelle ve P1 aramaları başlat.')

      actions.push(`${formatMoneyAmount(num(ctx.srcRes.totals.riskyReceivable))} ₺ riskli alacak için segmentasyon uygula.`)

      break

    case 'FOCUS_OPERATIONS':

      actions.push(`${ctx.delayedShipments} geciken sevk için termin koordinasyonu yap.`)

      actions.push('Eksik kalem ve SSH vakalarını günlük operasyon toplantısına al.')

      break

    case 'FOCUS_PROFITABILITY':

      actions.push('Düşük marjlı tedarikçi sözleşmelerini gözden geçir.')

      actions.push('ZERO_COST kayıtlarını düzelt — kârlılık raporu güvenilirliğini artır.')

      break

    case 'FOCUS_RISK_REDUCTION':

      actions.push('Kritik operasyon vakalarını kapat ve veri kalitesi iyileştirme sprinti başlat.')

      actions.push('Yüksek riskli siparişlerde ödeme planı ve sevk onayını sıkılaştır.')

      break

    case 'OPEN_NEW_STORE':

      actions.push('Yeni mağaza fizibilite raporunu onayla ve sevk kapasitesi planını hazırla.')

      actions.push('Büyüme kaynağına yatırım bütçesi ayır.')

      break

    case 'DELAY_NEW_STORE':

      actions.push('Yeni mağaza yatırımını 90 gün ertele; tahsilat KPI takibini güçlendir.')

      actions.push('Nakit akışı projeksiyonunu haftalık güncelle.')

      break

  }



  for (const rec of execResponse.recommendedActions.slice(0, 3)) {

    if (isDepoKati(rec.title)) continue

    if (actions.length >= ACTIONS_LIMIT) break

    if (!actions.some((a) => a.includes(rec.title))) {

      actions.push(`${rec.title} — ${rec.reason}`)

    }

  }



  if (actions.length < ACTIONS_LIMIT) {

    actions.push('Kurul kararını ilgili departmanlara yazılı ilet ve 7 gün sonra durum raporu iste.')

  }



  return actions.slice(0, ACTIONS_LIMIT)

}



export async function gatherBoardContext(prisma: PrismaClient): Promise<BoardContext> {

  const strategic = await gatherStrategicContext(prisma)

  const executive = await gatherDirectorContext(prisma)

  return { strategic, executive }

}



export function assembleBoardDirectors(ctx: BoardContext): BoardDirectorsResponseDto {

  const directors = buildDirectorVotes(ctx)

  const { decision, reason } = resolveBoardDecision(directors)

  const boardScore = computeBoardScore(ctx.strategic)

  const companyHealth = buildCompanyHealth(ctx.strategic)

  const generatedAt = new Date().toISOString()



  const summary: BoardDirectorsSummaryDto = {

    directorCount: directors.length,

    boardScore,

    boardScoreBand: scoreBand(boardScore),

    boardDecision: decision,

    companyHealthScore: companyHealth.score,

    analysisMonth: ctx.strategic.today.slice(0, 7),

    generatedAt,

  }



  return {

    summary,

    boardScore,

    directors,

    boardDecision: decision,

    boardReason: reason,

    topRisks: buildTopRisks(ctx.strategic, ctx.executive),

    topOpportunities: buildTopOpportunities(ctx.strategic),

    whatBoardWouldDoToday: buildWhatBoardWouldDoToday(decision, ctx.strategic, ctx.executive),

    today: ctx.strategic.today,

    generatedAt,

    meta: { depoKatiExcluded: true },

  }

}


