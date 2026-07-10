/**
 * Otonom Şirket Başkanı motoru — CEO ve Yönetim Kurulu denetimi, 1/3/5 yıl planı.
 * Faz 12–18 çıktılarını okur. Deterministik; LLM yok.
 */

import type { PrismaClient } from '@prisma/client'
import { formatMoneyAmount } from '../lib/supplierLedger.js'
import {
  buildCompanyHealth,
  buildGrowthAnalysis,
  buildRiskForecast,
  type StrategicContext,
} from './strategicIntelligenceEngine.js'
import {
  assembleCeoIntelligence,
  gatherCeoIntelligenceContext,
  type CeoIntelligenceContext,
} from './ceoIntelligenceEngine.js'
import { computeHealthFromMetrics } from './companySimulationEngine.js'
import type { CeoIntelligenceResponseDto } from '../contracts/ceoIntelligenceDto.js'
import type { BoardDecision } from '../contracts/boardDirectorsDto.js'
import type { CeoDecision } from '../contracts/ceoIntelligenceDto.js'
import type {
  AlignmentDto,
  ChairmanDecision,
  ChairmanIntelligenceResponseDto,
  ChairmanOpportunityItemDto,
  ChairmanSummaryDto,
  ChairmanThreatItemDto,
} from '../contracts/chairmanDto.js'

const REASON_LIMIT = 10
const THREATS_LIMIT = 10
const OPPORTUNITIES_LIMIT = 10

const SOURCE_MODULES = [
  'ceoControlCenter',
  'operationsAgents',
  'executiveDirector',
  'strategicIntelligence',
  'companySimulation',
  'boardDirectors',
  'ceoIntelligence',
] as const

type StrategicTheme = 'collection' | 'growth' | 'profitability' | 'operations' | 'risk' | 'digital' | 'stabilize' | 'maintain'

const DECISION_HEADLINE: Record<ChairmanDecision, string> = {
  MAINTAIN_DIRECTION: 'Mevcut stratejik yön korunsun; çeyreklik performans izlensin.',
  FOCUS_GROWTH: 'Önümüzdeki yıl kontrollü büyüme stratejisi uygulansın.',
  FOCUS_PROFITABILITY: 'Kârlılık ve maliyet yapısı uzun vadeli öncelik olsun.',
  FOCUS_COLLECTION: 'Şirket önceliği tahsilat ve nakit disiplini olsun.',
  FOCUS_DIGITALIZATION: 'Dijital operasyon ve veri altyapısı yatırımı hızlandırılsın.',
  FOCUS_EXPANSION: 'Bölgesel genişleme için hazırlık başlasın.',
  PREPARE_NEW_BRANCH: 'Yeni şube fizibilitesi ve yatırım planı hazırlansın.',
  STABILIZE_FIRST: 'Büyümeden önce stabilizasyon; risk ve tahsilat önceliklendirilsin.',
}

const CHAIRMAN_THEME: Record<ChairmanDecision, StrategicTheme> = {
  MAINTAIN_DIRECTION: 'maintain',
  FOCUS_GROWTH: 'growth',
  FOCUS_PROFITABILITY: 'profitability',
  FOCUS_COLLECTION: 'collection',
  FOCUS_DIGITALIZATION: 'digital',
  FOCUS_EXPANSION: 'growth',
  PREPARE_NEW_BRANCH: 'growth',
  STABILIZE_FIRST: 'stabilize',
}

const CEO_THEME: Record<CeoDecision, StrategicTheme> = {
  FOCUS_COLLECTION: 'collection',
  FOCUS_GROWTH: 'growth',
  FOCUS_PROFITABILITY: 'profitability',
  FOCUS_OPERATIONS: 'operations',
  FOCUS_RISK_REDUCTION: 'risk',
  OPEN_NEW_STORE: 'growth',
  DELAY_NEW_STORE: 'stabilize',
  HIRE_SALES_TEAM: 'growth',
  INCREASE_CAPACITY: 'operations',
  OPTIMIZE_SUPPLIERS: 'profitability',
}

const BOARD_THEME: Record<BoardDecision, StrategicTheme> = {
  OPEN_NEW_STORE: 'growth',
  DELAY_NEW_STORE: 'stabilize',
  FOCUS_COLLECTION: 'collection',
  FOCUS_OPERATIONS: 'operations',
  FOCUS_PROFITABILITY: 'profitability',
  FOCUS_RISK_REDUCTION: 'risk',
}

export type ChairmanContext = CeoIntelligenceContext & {
  ceoReport: CeoIntelligenceResponseDto
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
  return {
    profitMarginPct: totals.profitMarginPct,
    collected: num(totals.collected),
    openBalance: num(totals.openBalance),
    riskyReceivable: num(totals.riskyReceivable),
    dataQualityScore: ctx.dq.totals.averageQualityScore,
    delayedShipments: ctx.delayedShipments,
  }
}

function growthTrendScore(ctx: StrategicContext): number {
  const growth = buildGrowthAnalysis(ctx)
  const top = growth.topGrowthSource
  if (!top) return 50
  if (top.trend === 'UP') return clamp(50 + top.changePct * 2, 50, 95)
  if (top.trend === 'DOWN') return clamp(50 + top.changePct * 2, 10, 50)
  return 50
}

function riskTrendScore(ctx: StrategicContext): number {
  const m = extractMetrics(ctx)
  const { risk } = computeHealthFromMetrics({
    revenue: num(ctx.srcRes.totals.revenue),
    grossProfit: num(ctx.srcRes.totals.grossProfit),
    profitMarginPct: m.profitMarginPct,
    collected: m.collected,
    openBalance: m.openBalance,
    riskyReceivable: m.riskyReceivable,
    delayedShipments: m.delayedShipments,
    dataQualityScore: m.dataQualityScore,
    managerScore: ctx.ceo.managerScore.score,
    externalSupplyShare: 0,
  })
  const forecast = buildRiskForecast(ctx)
  const critical = forecast.items.filter((i) => i.severity === 'CRITICAL').length
  return round1(clamp(risk - critical * 5, 0, 100))
}

/** Başkan skoru — CEO, kurul, sağlık, kârlılık, büyüme ve risk trendi ağırlıklı. */
export function computeChairmanScore(ctx: ChairmanContext): number {
  const health = buildCompanyHealth(ctx.strategic).score
  const ceoScore = ctx.ceoReport.ceoScore
  const boardScore = ctx.board.boardScore
  const m = extractMetrics(ctx.strategic)
  const profitabilityScore = (clamp(m.profitMarginPct, 0, 30) / 30) * 100
  const growthScore = growthTrendScore(ctx.strategic)
  const riskScore = riskTrendScore(ctx.strategic)

  return round1(
    ceoScore * 0.25 +
      boardScore * 0.2 +
      health * 0.2 +
      profitabilityScore * 0.15 +
      growthScore * 0.1 +
      riskScore * 0.1,
  )
}

export function resolveChairmanDecision(ctx: ChairmanContext): ChairmanDecision {
  const m = extractMetrics(ctx.strategic)
  const collRatio = m.collected + m.openBalance > 0 ? (m.collected / (m.collected + m.openBalance)) * 100 : 100
  const riskyShare = m.openBalance > 0 ? m.riskyReceivable / m.openBalance : 0
  const health = buildCompanyHealth(ctx.strategic).score
  const growth = buildGrowthAnalysis(ctx.strategic)
  const ceo = ctx.ceoReport
  const board = ctx.board
  const sim = ctx.simulation

  const tally = new Map<ChairmanDecision, number>()
  function add(decision: ChairmanDecision, weight: number): void {
    tally.set(decision, (tally.get(decision) ?? 0) + weight)
  }

  // CEO ve Kurul denetimi
  if (ceo.ceoDecision === 'FOCUS_COLLECTION' || board.boardDecision === 'DELAY_NEW_STORE') {
    add('STABILIZE_FIRST', 25)
    add('FOCUS_COLLECTION', 22)
  }
  if (collRatio < 70 || riskyShare > 0.25) {
    add('FOCUS_COLLECTION', 28)
    add('STABILIZE_FIRST', 18)
  }

  if (m.dataQualityScore < 80) {
    add('FOCUS_DIGITALIZATION', 20)
  }

  if (board.boardDecision === 'FOCUS_PROFITABILITY' || ceo.ceoDecision === 'FOCUS_PROFITABILITY') {
    add('FOCUS_PROFITABILITY', 22)
  }

  if (board.boardDecision === 'OPEN_NEW_STORE' && sim.bestCase.after.companyHealthScore > sim.baseline.companyHealthScore + 5) {
    add('PREPARE_NEW_BRANCH', 24)
    add('FOCUS_EXPANSION', 16)
  }

  if (growth.topGrowthSource?.trend === 'UP' && growth.topGrowthSource.changePct >= 10 && health >= 65 && collRatio >= 75) {
    add('FOCUS_GROWTH', 22)
    add('FOCUS_EXPANSION', 14)
  }

  if (health >= 70 && collRatio >= 80 && riskyShare < 0.15 && m.delayedShipments <= 2) {
    add('MAINTAIN_DIRECTION', 18)
    add('FOCUS_GROWTH', 12)
  }

  if (ceo.ceoDecision === 'OPEN_NEW_STORE' && health >= 60) {
    add('PREPARE_NEW_BRANCH', 20)
  }

  if (m.profitMarginPct >= 22 && riskyShare < 0.2) {
    add('FOCUS_PROFITABILITY', 12)
  }

  if (tally.size === 0) {
    add('MAINTAIN_DIRECTION', 30)
  }

  let winner: ChairmanDecision = 'MAINTAIN_DIRECTION'
  let maxScore = -1
  for (const [decision, score] of tally) {
    if (score > maxScore) {
      maxScore = score
      winner = decision
    }
  }
  return winner
}

function themeAlignment(a: StrategicTheme, b: StrategicTheme): number {
  if (a === b) return 100
  const related: Record<StrategicTheme, StrategicTheme[]> = {
    collection: ['stabilize', 'risk'],
    stabilize: ['collection', 'risk', 'operations'],
    growth: ['maintain'],
    profitability: ['maintain'],
    operations: ['stabilize', 'risk'],
    risk: ['collection', 'stabilize'],
    digital: ['operations', 'profitability'],
    maintain: ['growth', 'profitability'],
  }
  if (related[a]?.includes(b) || related[b]?.includes(a)) return 65
  return 30
}

export function buildBoardAlignment(ctx: ChairmanContext): AlignmentDto {
  const ceoTheme = CEO_THEME[ctx.ceoReport.ceoDecision]
  const boardTheme = BOARD_THEME[ctx.board.boardDecision]
  const score = themeAlignment(ceoTheme, boardTheme)
  const status = score >= 85 ? 'ALIGNED' : score >= 55 ? 'PARTIAL' : 'MISALIGNED'

  return {
    score,
    status,
    summary:
      status === 'ALIGNED'
        ? 'CEO ve Yönetim Kurulu aynı stratejik yönde.'
        : status === 'PARTIAL'
          ? 'CEO ve Kurul kısmen uyumlu; öncelik hizalaması gerekli.'
          : 'CEO ve Kurul farklı önceliklerde; Başkan müdahalesi önerilir.',
    details: [
      `CEO kararı: ${ctx.ceoReport.ceoDecision} (${ceoTheme})`,
      `Kurul kararı: ${ctx.board.boardDecision} (${boardTheme})`,
      `Kurul skoru: ${ctx.board.boardScore}, CEO skoru: ${ctx.ceoReport.ceoScore}`,
      `Kurul gerekçesi: ${ctx.board.boardReason}`,
    ],
  }
}

export function buildCeoAlignment(ctx: ChairmanContext, chairmanDecision: ChairmanDecision): AlignmentDto {
  const chairmanTheme = CHAIRMAN_THEME[chairmanDecision]
  const ceoTheme = CEO_THEME[ctx.ceoReport.ceoDecision]
  const score = themeAlignment(chairmanTheme, ceoTheme)
  const status = score >= 85 ? 'ALIGNED' : score >= 55 ? 'PARTIAL' : 'MISALIGNED'

  return {
    score,
    status,
    summary:
      status === 'ALIGNED'
        ? 'Başkan ve CEO stratejik uyum içinde.'
        : status === 'PARTIAL'
          ? 'CEO orta vadeli odakta; Başkan uzun vadeli düzeltme öneriyor.'
          : 'CEO yönü Başkan vizyonu ile çelişiyor; denetim gerekli.',
    details: [
      `Başkan kararı: ${chairmanDecision} (${chairmanTheme})`,
      `CEO kararı: ${ctx.ceoReport.ceoDecision} (${ceoTheme})`,
      `CEO 90 gün planı: ${ctx.ceoReport.next90Days[0] ?? '—'}`,
      `Başkan başlığı: ${DECISION_HEADLINE[chairmanDecision]}`,
    ],
  }
}

export function buildChairmanReason(ctx: ChairmanContext, decision: ChairmanDecision): string[] {
  const m = extractMetrics(ctx.strategic)
  const collRatio = m.collected + m.openBalance > 0 ? (m.collected / (m.collected + m.openBalance)) * 100 : 100
  const health = buildCompanyHealth(ctx.strategic)
  const growth = buildGrowthAnalysis(ctx.strategic)
  const reasons: string[] = []

  reasons.push(`Şirket sağlık skoru ${health.score} (${health.band}) — uzun vadeli yön değerlendirmesi.`)
  reasons.push(`CEO skoru ${ctx.ceoReport.ceoScore}, karar: ${ctx.ceoReport.ceoDecision}.`)
  reasons.push(`Yönetim Kurulu skoru ${ctx.board.boardScore}, karar: ${ctx.board.boardDecision}.`)
  reasons.push(
    `Tahsilat oranı %${round1(collRatio)}; riskli alacak ${formatMoneyAmount(m.riskyReceivable)} ₺.`,
  )
  reasons.push(`Kârlılık marjı %${m.profitMarginPct}; veri kalitesi ${round1(m.dataQualityScore)}.`)
  if (growth.topGrowthSource) {
    reasons.push(
      `Büyüme trendi: ${growth.topGrowthSource.label} ${growth.topGrowthSource.trend} (%${growth.topGrowthSource.changePct}).`,
    )
  }
  reasons.push(
    `Simülasyon aralığı: ${ctx.simulation.worstCase.after.companyHealthScore} – ${ctx.simulation.bestCase.after.companyHealthScore}.`,
  )
  reasons.push(`Operasyon ajanları ve direktör ${ctx.executiveReport.summary.p1Count} P1 konu raporluyor.`)
  reasons.push(`Başkan kararı: ${DECISION_HEADLINE[decision]}`)
  reasons.push(`${SOURCE_MODULES.length} üst modül sentezlendi; CEO ve Kurul denetlendi.`)

  return reasons.slice(0, REASON_LIMIT)
}

export function buildOneYearPlan(ctx: ChairmanContext, decision: ChairmanDecision): string[] {
  const m = extractMetrics(ctx.strategic)
  const collRatio = m.collected + m.openBalance > 0 ? (m.collected / (m.collected + m.openBalance)) * 100 : 100
  const targetColl = round1(Math.min(95, collRatio + 15))
  const riskyTarget = round1(Math.max(5, (m.openBalance > 0 ? (m.riskyReceivable / m.openBalance) * 100 : 0) * 0.8))
  const dqTarget = round1(Math.min(98, Math.max(95, m.dataQualityScore + 10)))

  const base = [
    `Tahsilat oranını %${round1(collRatio)} → %${targetColl} artır.`,
    `Riskli alacak payını %${riskyTarget} altına indir.`,
    `Veri kalitesi skorunu ${dqTarget} üzerine çıkar.`,
  ]

  switch (decision) {
    case 'FOCUS_COLLECTION':
    case 'STABILIZE_FIRST':
      return [...base, 'Nakit rezerv hedefi ve haftalık tahsilat kurulu takibi.', 'Yeni yatırım kararlarını 12 ay dondur.']
    case 'FOCUS_DIGITALIZATION':
      return [...base, 'ERP ve veri pipeline otomasyonunu tamamla.', 'ZERO_COST kayıtlarını sıfırla.']
    case 'PREPARE_NEW_BRANCH':
    case 'FOCUS_EXPANSION':
      return [...base, 'İkinci lokasyon fizibilite çalışmasını tamamla.', 'Sevk kapasitesi ölçeklendirme planı.']
    case 'FOCUS_PROFITABILITY':
      return [...base, `Brüt marjı %${m.profitMarginPct} → +3 puan artır.`, 'Tedarikçi portföy optimizasyonu.']
    case 'FOCUS_GROWTH':
      return [...base, 'Ciro büyümesi %12 yıllık hedef.', 'Satış ekibi kapasite planı.']
    default:
      return [...base, 'Çeyreklik strateji gözden geçirme.', 'CEO ve Kurul KPI hizalaması.']
  }
}

export function buildThreeYearPlan(decision: ChairmanDecision): string[] {
  switch (decision) {
    case 'PREPARE_NEW_BRANCH':
    case 'FOCUS_EXPANSION':
      return [
        'İkinci mağaza açılışı (36. ay hedefi).',
        'Bölgesel büyüme — komşu il pazar araştırması.',
        'Dijital satış kanalı entegrasyonu.',
        'Tedarik zinciri çoklu lokasyon planı.',
      ]
    case 'FOCUS_DIGITALIZATION':
      return [
        'Tam dijital operasyon omurgası (sevk, tahsilat, stok).',
        'Müşteri self-servis portalı.',
        'Gerçek zamanlı yönetim dashboard.',
        'Veri kalitesi 98+ sürdürülebilirlik.',
      ]
    case 'FOCUS_COLLECTION':
    case 'STABILIZE_FIRST':
      return [
        'Tahsilat oranı sektör üstü seviyede stabilize.',
        'Risk yönetim süreci ISO benzeri disiplin.',
        'Nakit pozisyon güçlendirme.',
        'Kontrollü büyüme için zemin hazırlığı.',
      ]
    case 'FOCUS_PROFITABILITY':
      return [
        'Marj liderliği — kategori bazlı kârlılık.',
        'Tedarikçi stratejik ortaklıklar.',
        'Maliyet yapısı otomasyonu.',
        'Fiyatlandırma optimizasyon motoru.',
      ]
    default:
      return [
        'İkinci mağaza fizibilitesi.',
        'Bölgesel büyüme değerlendirmesi.',
        'Dijital satış kanalı pilotu.',
        'Operasyon kapasitesi 2x ölçekleme.',
      ]
  }
}

export function buildFiveYearVision(decision: ChairmanDecision): string[] {
  switch (decision) {
    case 'FOCUS_EXPANSION':
    case 'PREPARE_NEW_BRANCH':
      return [
        'Çok şubeli yapı — 3+ aktif mağaza.',
        'Bölgesel marka liderliği.',
        'Tam dijital operasyon.',
        'AI destekli yönetim (deterministik motorlar).',
      ]
    case 'FOCUS_DIGITALIZATION':
      return [
        'Tam dijital operasyon — kağıtsız süreç.',
        'Otonom yönetim katmanları (CEO, Kurul, Başkan).',
        'Gerçek zamanlı şirket ikizi.',
        'Sektör referans ERP dönüşümü.',
      ]
    case 'STABILIZE_FIRST':
    case 'FOCUS_COLLECTION':
      return [
        'Finansal disiplinle sürdürülebilir büyüme.',
        'Risk-minimize edilmiş portföy.',
        'Kademeli dijitalleşme.',
        'Güçlü nakit pozisyonu ile seçici genişleme.',
      ]
    default:
      return [
        'Çok şubeli yapı.',
        'Tam dijital operasyon.',
        'AI destekli yönetim.',
        'Sektörde operasyonel mükemmellik standardı.',
      ]
  }
}

export function buildTopThreats(ctx: ChairmanContext): ChairmanThreatItemDto[] {
  const out: ChairmanThreatItemDto[] = []

  for (const p of ctx.ceoReport.topProblems) {
    if (isDepoKati(p.title)) continue
    out.push({
      id: `thr:${p.id}`,
      title: p.title,
      severity: p.severity,
      horizon: p.severity === 'CRITICAL' ? '1Y' : '3Y',
      description: p.description,
    })
  }

  for (const r of ctx.board.topRisks) {
    if (out.length >= THREATS_LIMIT) break
    if (isDepoKati(r.title) || out.some((t) => t.title === r.title)) continue
    out.push({
      id: `thr:board:${r.id}`,
      title: r.title,
      severity: r.severity,
      horizon: '1Y',
      description: r.description,
    })
  }

  const m = extractMetrics(ctx.strategic)
  if (m.dataQualityScore < 75 && out.length < THREATS_LIMIT) {
    out.push({
      id: 'thr:dq-5y',
      title: 'Uzun vadeli veri güvenilirliği riski',
      severity: 'WARNING',
      horizon: '5Y',
      description: 'Düşük veri kalitesi stratejik kararları zayıflatır.',
    })
  }

  const severityRank = { CRITICAL: 3, WARNING: 2, INFO: 1 }
  out.sort((a, b) => severityRank[b.severity] - severityRank[a.severity])
  return out.slice(0, THREATS_LIMIT)
}

export function buildTopOpportunities(ctx: ChairmanContext): ChairmanOpportunityItemDto[] {
  const out: ChairmanOpportunityItemDto[] = []

  for (const o of ctx.ceoReport.topOpportunities) {
    if (isDepoKati(o.title)) continue
    out.push({
      id: `opp:${o.id}`,
      title: o.title,
      impact: o.impact,
      horizon: '1Y',
      description: o.description,
    })
  }

  for (const o of ctx.board.topOpportunities) {
    if (out.length >= OPPORTUNITIES_LIMIT) break
    if (isDepoKati(o.title) || out.some((x) => x.title === o.title)) continue
    out.push({
      id: `opp:board:${o.id}`,
      title: o.title,
      impact: o.impact,
      horizon: '3Y',
      description: o.description,
    })
  }

  const growth = buildGrowthAnalysis(ctx.strategic)
  if (growth.topGrowthSource?.trend === 'UP' && out.length < OPPORTUNITIES_LIMIT) {
    const g = growth.topGrowthSource
    if (!isDepoKati(g.label)) {
      out.push({
        id: `opp:chairman:growth:${g.key}`,
        title: `${g.label} — 5 yıl büyüme potansiyeli`,
        impact: `%${g.changePct} momentum`,
        horizon: '5Y',
        description: 'Bölgesel genişleme için temel kaynak.',
      })
    }
  }

  return out.slice(0, OPPORTUNITIES_LIMIT)
}

export async function gatherChairmanContext(prisma: PrismaClient): Promise<ChairmanContext> {
  const ceoCtx = await gatherCeoIntelligenceContext(prisma)
  const ceoReport = assembleCeoIntelligence(ceoCtx)
  return { ...ceoCtx, ceoReport }
}

export function assembleChairmanIntelligence(ctx: ChairmanContext): ChairmanIntelligenceResponseDto {
  const chairmanScore = computeChairmanScore(ctx)
  const chairmanDecision = resolveChairmanDecision(ctx)
  const chairmanReason = buildChairmanReason(ctx, chairmanDecision)
  const health = buildCompanyHealth(ctx.strategic)
  const generatedAt = new Date().toISOString()

  const summary: ChairmanSummaryDto = {
    chairmanScore,
    chairmanScoreBand: scoreBand(chairmanScore),
    chairmanDecision,
    ceoScore: ctx.ceoReport.ceoScore,
    boardScore: ctx.board.boardScore,
    companyHealthScore: health.score,
    sourcesRead: SOURCE_MODULES.length,
    generatedAt,
  }

  return {
    summary,
    chairmanScore,
    chairmanDecision,
    chairmanReason,
    oneYearPlan: buildOneYearPlan(ctx, chairmanDecision),
    threeYearPlan: buildThreeYearPlan(chairmanDecision),
    fiveYearVision: buildFiveYearVision(chairmanDecision),
    topThreats: buildTopThreats(ctx),
    topOpportunities: buildTopOpportunities(ctx),
    boardAlignment: buildBoardAlignment(ctx),
    ceoAlignment: buildCeoAlignment(ctx, chairmanDecision),
    today: ctx.strategic.today,
    generatedAt,
    meta: { depoKatiExcluded: true, sources: [...SOURCE_MODULES] },
  }
}

export function getChairmanDecisionHeadline(decision: ChairmanDecision): string {
  return DECISION_HEADLINE[decision]
}
