/**
 * Otonom İşletme Beyni motoru — Faz 5–23 + iş kuralları sentezi.
 * Deterministik; LLM yok. Depo Katı hiçbir çıktıda görünmez.
 */

import type { PrismaClient } from '@prisma/client'
import { formatMoneyAmount } from '../lib/supplierLedger.js'
import type {
  BusinessBrainResponseDto,
  PrimaryDecision,
} from '../contracts/businessBrainDto.js'
import type { GroupChairmanResponseDto } from '../contracts/groupChairmanDto.js'
import {
  assembleGroupChairman,
  gatherGroupChairmanContext,
  type GroupChairmanContext,
} from './groupChairmanEngine.js'
import {
  assembleInvestorIntelligence,
  computeScoreComponents,
} from './investorIntelligenceEngine.js'
import { extractBaseState } from './enterpriseFutureEngine.js'
import { getBusinessRules } from './getBusinessRules.js'

const LIST_LIMIT = 10

const SOURCE_MODULES = [
  'profitability',
  'forecast',
  'advisor',
  'actionCenter',
  'operationCases',
  'automation',
  'businessRules',
  'ceoControlCenter',
  'operationsAgents',
  'executiveDirector',
  'strategicIntelligence',
  'companySimulation',
  'boardDirectors',
  'ceoIntelligence',
  'chairman',
  'futureEngine',
  'investorIntelligence',
  'holdingCenter',
  'groupChairman',
] as const

export type BusinessBrainContext = GroupChairmanContext & {
  groupReport: GroupChairmanResponseDto
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

function filterDepo(items: string[]): string[] {
  return items.filter((i) => !isDepoKati(i))
}

export function computeOperationsScore(ctx: BusinessBrainContext): number {
  const exec = ctx.investorCtx.executiveReport
  const agents = ctx.investorCtx.strategic.ceo
  const delayed = ctx.investorCtx.strategic.delayedShipments
  const dq = ctx.investorCtx.strategic.dq.totals.averageQualityScore
  const execScore = exec.summary?.managerScore ?? 55
  const agentScore = agents.managerScore?.score ?? 55
  const shipmentPenalty = clamp(100 - delayed * 4, 0, 100)
  const raw = execScore * 0.35 + agentScore * 0.3 + shipmentPenalty * 0.2 + dq * 0.15
  return round1(clamp(raw, 0, 100))
}

export function computeFinanceScore(ctx: BusinessBrainContext): number {
  const components = computeScoreComponents(ctx.investorCtx)
  const base = extractBaseState(ctx.investorCtx)
  const collectionRate = base.collectionRate
  const raw =
    components.profitabilityScore * 0.35 +
    components.collectionScore * 0.35 +
    components.cashFlowScore * 0.3
  const penalty = collectionRate < 60 ? 10 : 0
  return round1(clamp(raw - penalty, 0, 100))
}

export function computeGrowthScore(ctx: BusinessBrainContext): number {
  const components = computeScoreComponents(ctx.investorCtx)
  const future = ctx.investorCtx.futureReport.futureScore
  const chairman = ctx.investorCtx.chairmanReport.chairmanScore
  const raw = components.growthScore * 0.4 + future * 0.35 + chairman * 0.25
  return round1(clamp(raw, 0, 100))
}

export function computeRiskScore(ctx: BusinessBrainContext): number {
  const components = computeScoreComponents(ctx.investorCtx)
  const health = ctx.groupReport.groupHealth
  const raw = components.riskScore * 0.5 + health * 0.3 + (100 - ctx.investorCtx.strategic.delayedShipments * 3) * 0.2
  return round1(clamp(raw, 0, 100))
}

export function computeFutureScore(ctx: BusinessBrainContext): number {
  return round1(clamp(ctx.investorCtx.futureReport.futureScore, 0, 100))
}

export function computeInvestmentScore(ctx: BusinessBrainContext): number {
  const investor = assembleInvestorIntelligence(ctx.investorCtx)
  const holding = ctx.groupReport
  const raw = investor.investorScore * 0.6 + holding.groupChairmanScore * 0.4
  return round1(clamp(raw, 0, 100))
}

export function computeBrainScore(scores: {
  operationsScore: number
  financeScore: number
  growthScore: number
  riskScore: number
  futureScore: number
  investmentScore: number
}): number {
  const raw =
    scores.operationsScore * 0.2 +
    scores.financeScore * 0.2 +
    scores.growthScore * 0.15 +
    scores.riskScore * 0.15 +
    scores.futureScore * 0.15 +
    scores.investmentScore * 0.15
  return round1(clamp(raw, 0, 100))
}

export function resolvePrimaryDecision(ctx: BusinessBrainContext, brainScore: number): PrimaryDecision {
  const investor = assembleInvestorIntelligence(ctx.investorCtx)
  const base = extractBaseState(ctx.investorCtx)
  const ceo = ctx.investorCtx.ceoReport.ceoDecision
  const chairman = ctx.investorCtx.chairmanReport.chairmanDecision
  const group = ctx.groupReport.groupDecision
  const bestScenario = ctx.investorCtx.futureReport.summary.bestScenarioId

  if (investor.investmentDecision === 'STRONG_BUY' && brainScore >= 70) return 'INVESTMENT_WINDOW'
  if (ceo === 'FOCUS_COLLECTION' || chairman === 'FOCUS_COLLECTION' || base.openBalance > base.collected * 0.4) {
    return 'COLLECTION_FIRST'
  }
  if (ceo === 'OPEN_NEW_STORE' || chairman === 'PREPARE_NEW_BRANCH' || bestScenario === 'EXPANSION') {
    return 'STORE_EXPANSION'
  }
  if (ceo === 'OPTIMIZE_SUPPLIERS' || base.profitMarginPct < 12) return 'SUPPLIER_RESTRUCTURE'
  if (investor.investmentDecision === 'CRITICAL' || group === 'CRISIS' || group === 'DEFENSIVE') {
    return 'DEFENSIVE_MODE'
  }
  if (group === 'AGGRESSIVE_GROWTH' || bestScenario === 'AGGRESSIVE_GROWTH') return 'AGGRESSIVE_GROWTH'
  if (group === 'CONTROLLED_GROWTH' || ceo === 'FOCUS_GROWTH') return 'CONTROLLED_GROWTH'
  if (ceo === 'FOCUS_PROFITABILITY' || investor.companyRating === 'WEAK') return 'PROFITABILITY_RECOVERY'
  if (brainScore < 45 || investor.investmentDecision === 'AVOID') return 'COST_REDUCTION'
  if (investor.investmentDecision === 'WATCH' || brainScore < 60) return 'WAIT_AND_MONITOR'
  return 'CONTROLLED_GROWTH'
}

export function buildTodayActions(ctx: BusinessBrainContext, decision: PrimaryDecision): string[] {
  const base = extractBaseState(ctx.investorCtx)
  const delayed = ctx.investorCtx.strategic.delayedShipments
  const dq = ctx.investorCtx.strategic.dq.totals.averageQualityScore

  const actions = [
    base.riskyReceivable > 0
      ? `Riskli tahsilatları ara — ${formatMoneyAmount(base.riskyReceivable)} ₺ riskli alacak.`
      : 'Riskli tahsilatları ara — günlük tahsilat listesini gözden geçir.',
    delayed > 0
      ? `Bekleyen sevkleri tamamla — ${delayed} gecikmiş sevkiyat.`
      : 'Bekleyen sevkleri tamamla — sevk kuyruğunu kontrol et.',
    'Eksik parçaları kapat — açık eksik parça vakalarını güncelle.',
    base.profitMarginPct < 18
      ? `Düşük marjlı ürünleri gözden geçir — marj %${round1(base.profitMarginPct)}.`
      : 'Düşük marjlı ürünleri gözden geçir — kârlılık analitiğini aç.',
    'Tedarikçi borçlarını dengele — ödeme takvimini kontrol et.',
    dq < 80
      ? `Veri kalitesi sorunlarını temizle — skor ${round1(dq)}.`
      : 'Veri kalitesi sorunlarını temizle — eksik alanları tamamla.',
    'Açık vakaları kapat — operasyon vakaları panosunu gözden geçir.',
    'Otomasyon kuyruğunu çalıştır — bekleyen otomasyon işlerini tetikle.',
    'Kritik müşterileri ara — yüksek bakiyeli müşteri listesini kontrol et.',
    decision === 'COLLECTION_FIRST'
      ? 'Tahsilat öncelikli gün — ödeme hatırlatmalarını başlat.'
      : 'Kâr düşüşünü incele — kârlılık analitiğinde sapmaları ara.',
  ]

  return actions.slice(0, LIST_LIMIT)
}

function buildPlan30(decision: PrimaryDecision, ctx: BusinessBrainContext): string[] {
  const investor = assembleInvestorIntelligence(ctx.investorCtx)
  return [
    `${decision} kararını 30 günlük operasyon planına dönüştür.`,
    'Haftalık tahsilat hedefi belirle ve takip et.',
    'Sevk gecikmelerini %20 azaltma programı başlat.',
    'Eksik parça kapanış oranını %90 hedefle.',
    'Tedarikçi ödeme takvimini optimize et.',
    `Veri kalitesi skorunu ${round1(ctx.investorCtx.strategic.dq.totals.averageQualityScore + 5)} hedefle.`,
    'Operasyon vakaları SLA — 48 saat içinde ilk yanıt.',
    'Otomasyon işleri — haftalık 5 rutin iş tanımla.',
    `Yatırımcı skoru ${investor.investorScore} — aylık iyileştirme KPI seti.`,
    'CEO ve Başkan kararları ile haftalık hizalama toplantısı.',
  ].slice(0, LIST_LIMIT)
}

function buildPlan90(decision: PrimaryDecision, ctx: BusinessBrainContext): string[] {
  const future = ctx.investorCtx.futureReport
  return [
    `90 gün: ${decision} stratejisinin orta vadeli uygulaması.`,
    `Gelecek motoru en iyi senaryo: ${future.summary.bestScenarioId} — KPI seti oluştur.`,
    'Tahsilat oranını +5 puan artırma programı.',
    'Sevk operasyonu kapasite planı — personel ve araç.',
    'Tedarikçi portföyü gözden geçirme — riskli tedarikçileri azalt.',
    'Kârlılık analitiği — kategori bazlı marj iyileştirme.',
    'Dijital satış kanalı pilot değerlendirmesi.',
    'İş kuralları merkezi — 10 yeni otomasyon kuralı.',
    'Yönetim kurulu aylık raporlama döngüsü.',
    'Holding portföy senkronizasyonu — grup şirket KPI paylaşımı.',
  ].slice(0, LIST_LIMIT)
}

function buildPlan365(decision: PrimaryDecision, ctx: BusinessBrainContext): string[] {
  const chairman = ctx.investorCtx.chairmanReport
  const group = ctx.groupReport
  return [
    `365 gün: ${decision} — yıllık stratejik yön.`,
    `Başkan kararı ${chairman.chairmanDecision} ile yıllık plan hizalaması.`,
    `Holding kararı ${group.groupDecision} — portföy stratejisi.`,
    'Yeni mağaza fizibilitesi — 12 aylık nakit akışı modeli.',
    'ERP ve analitik altyapı yatırımı — veri ambarı.',
    'Tedarik zinciri diversifikasyonu — alternatif tedarikçi havuzu.',
    'Personel kapasitesi planı — satış ve operasyon büyümesi.',
    'Marka ve dijital kanal yatırımı — online ciro hedefi.',
    'ESG ve sürdürülebilirlik raporlama altyapısı.',
    'Yıllık holding vizyonu gözden geçirme — stratejik reset.',
  ].slice(0, LIST_LIMIT)
}

function buildTopRisks(ctx: BusinessBrainContext): string[] {
  const investor = assembleInvestorIntelligence(ctx.investorCtx)
  const group = ctx.groupReport
  const out: string[] = []

  for (const t of investor.threats) {
    if (out.length >= LIST_LIMIT) break
    if (isDepoKati(t)) continue
    out.push(t)
  }
  for (const t of group.groupThreats) {
    if (out.length >= LIST_LIMIT) break
    if (isDepoKati(t)) continue
    out.push(t)
  }

  const fillers = [
    'Operasyonel kapasite aşımı — sevk ve personel yükü.',
    'Nakit akışı daralması — açık bakiye baskısı.',
    'Tedarik zinciri kesintisi — stok ve teslimat riski.',
    'Rekabet baskısı — fiyat ve marj sıkışması.',
    'Yönetim katmanları uyumsuzluğu — karar gecikmesi.',
  ]
  for (const f of fillers) {
    if (out.length >= LIST_LIMIT) break
    out.push(f)
  }

  return filterDepo(out).slice(0, LIST_LIMIT)
}

function buildTopOpportunities(ctx: BusinessBrainContext): string[] {
  const investor = assembleInvestorIntelligence(ctx.investorCtx)
  const group = ctx.groupReport
  const out: string[] = []

  for (const o of investor.opportunities) {
    if (out.length >= LIST_LIMIT) break
    if (isDepoKati(o)) continue
    out.push(o)
  }
  for (const o of group.groupOpportunities) {
    if (out.length >= LIST_LIMIT) break
    if (isDepoKati(o)) continue
    out.push(o)
  }

  const fillers = [
    'Tahsilat disiplini ile nakit akışı iyileştirme.',
    'Operasyon otomasyonu ile maliyet düşürme.',
    'Veri kalitesi yatırımı ile karar hızı artışı.',
    'Çapraz satış ile sepet ortalaması büyütme.',
    'Tedarik optimizasyonu ile marj genişletme.',
  ]
  for (const f of fillers) {
    if (out.length >= LIST_LIMIT) break
    out.push(f)
  }

  return filterDepo(out).slice(0, LIST_LIMIT)
}

function buildManagementBriefing(
  ctx: BusinessBrainContext,
  brainScore: number,
  decision: PrimaryDecision,
  scores: {
    operationsScore: number
    financeScore: number
    growthScore: number
    riskScore: number
    futureScore: number
    investmentScore: number
  },
): string[] {
  const investor = assembleInvestorIntelligence(ctx.investorCtx)
  const base = extractBaseState(ctx.investorCtx)
  const rules = getBusinessRules({})
  const activeRules = rules.rules.filter((r) => r.isEnabled).length

  return [
    `İşletme Beyni skoru ${brainScore} — ${SOURCE_MODULES.length} modül sentezi tamamlandı. Nihai karar: ${decision}.`,
    `Operasyon ${scores.operationsScore}, finans ${scores.financeScore}, büyüme ${scores.growthScore}, risk ${scores.riskScore}, gelecek ${scores.futureScore}, yatırım ${scores.investmentScore}.`,
    `CEO ${ctx.investorCtx.ceoReport.ceoDecision}, Başkan ${ctx.investorCtx.chairmanReport.chairmanDecision}, Holding ${ctx.groupReport.groupDecision}. Yatırımcı: ${investor.investmentDecision}.`,
    `Ciro ${formatMoneyAmount(base.revenue)} ₺, marj %${round1(base.profitMarginPct)}, tahsilat oranı %${round1(base.collectionRate)}. ${activeRules} aktif iş kuralı devrede.`,
    `Gelecek motoru ${ctx.investorCtx.futureReport.futureScore}, en iyi senaryo ${ctx.investorCtx.futureReport.summary.bestScenarioId}.`,
    `Grup sağlığı ${ctx.groupReport.groupHealth}, holding başkanı skoru ${ctx.groupReport.groupChairmanScore}.`,
    `Bugün 10 aksiyon tanımlandı; 30/90/365 günlük planlar karar ile hizalandı.`,
    `En büyük riskler ve fırsatlar listelendi — yönetim gündemine alınmalı.`,
    `Operasyon Direktörü, CEO, Kurul, Holding Başkanı ve Gelecek Motoru tek karar mekanizmasında birleştirildi.`,
    `MOBILYA OS merkezi karar beyni aktif — "Bugün ne yapmalıyız?" sorusuna yanıt üretildi.`,
  ].slice(0, LIST_LIMIT)
}

export async function gatherBusinessBrainContext(prisma: PrismaClient): Promise<BusinessBrainContext> {
  const groupCtx = await gatherGroupChairmanContext(prisma)
  const groupReport = assembleGroupChairman(groupCtx)
  return { ...groupCtx, groupReport }
}

export function assembleBusinessBrain(ctx: BusinessBrainContext): BusinessBrainResponseDto {
  const operationsScore = computeOperationsScore(ctx)
  const financeScore = computeFinanceScore(ctx)
  const growthScore = computeGrowthScore(ctx)
  const riskScore = computeRiskScore(ctx)
  const futureScore = computeFutureScore(ctx)
  const investmentScore = computeInvestmentScore(ctx)
  const brainScore = computeBrainScore({
    operationsScore,
    financeScore,
    growthScore,
    riskScore,
    futureScore,
    investmentScore,
  })
  const primaryDecision = resolvePrimaryDecision(ctx, brainScore)
  const generatedAt = new Date().toISOString()

  return {
    brainScore,
    operationsScore,
    financeScore,
    growthScore,
    riskScore,
    futureScore,
    investmentScore,
    primaryDecision,
    todayActions: buildTodayActions(ctx, primaryDecision),
    plan30Days: buildPlan30(primaryDecision, ctx),
    plan90Days: buildPlan90(primaryDecision, ctx),
    plan365Days: buildPlan365(primaryDecision, ctx),
    topRisks: buildTopRisks(ctx),
    topOpportunities: buildTopOpportunities(ctx),
    managementBriefing: buildManagementBriefing(ctx, brainScore, primaryDecision, {
      operationsScore,
      financeScore,
      growthScore,
      riskScore,
      futureScore,
      investmentScore,
    }),
    today: ctx.today,
    generatedAt,
    meta: { depoKatiExcluded: true, sources: [...SOURCE_MODULES] },
  }
}
