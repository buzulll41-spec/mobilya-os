/**
 * Otonom Holding Başkanı motoru — Faz 12–22 sentezi ile grup stratejik karar.
 * Deterministik; LLM yok. Depo Katı hiçbir çıktıda görünmez.
 */

import type { PrismaClient } from '@prisma/client'
import { formatMoneyAmount } from '../lib/supplierLedger.js'
import type {
  AlignmentAnalysisDto,
  CapitalAllocationItemDto,
  CapitalStrategy,
  CompanyChairmanDecision,
  CompanyDecisionDto,
  GroupChairmanResponseDto,
  GroupChairmanSummaryDto,
  GroupDecision,
  StrategicActionDto,
} from '../contracts/groupChairmanDto.js'
import type { HoldingCenterResponseDto, HoldingCompanyDto, HoldingDecision } from '../contracts/holdingCenterDto.js'
import {
  assembleHoldingCenter,
  computeCapitalAllocation,
  gatherHoldingContext,
  type HoldingContext,
} from './holdingCenterEngine.js'
import { assembleInvestorIntelligence } from './investorIntelligenceEngine.js'
import { extractBaseState } from './enterpriseFutureEngine.js'

const PLAN_LIMIT = 10
const SWOT_LIMIT = 10
const ACTIONS_LIMIT = 10

const SOURCE_MODULES = [
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
] as const

export type GroupChairmanContext = HoldingContext & {
  holdingReport: HoldingCenterResponseDto
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

type DecisionVector = 'GROWTH' | 'DEFENSIVE' | 'MAINTAIN' | 'MIXED'

const GROWTH_DECISIONS = new Set([
  'FOCUS_GROWTH',
  'FOCUS_EXPANSION',
  'PREPARE_NEW_BRANCH',
  'OPEN_NEW_STORE',
  'INCREASE_CAPACITY',
  'HIRE_SALES_TEAM',
  'STRONG_BUY',
  'BUY',
  'INVEST',
  'GROW',
  'AGGRESSIVE_GROWTH',
  'CONTROLLED_GROWTH',
])

const DEFENSIVE_DECISIONS = new Set([
  'FOCUS_COLLECTION',
  'FOCUS_RISK_REDUCTION',
  'STABILIZE_FIRST',
  'REDUCE',
  'EXIT',
  'AVOID',
  'CRITICAL',
  'DEFENSIVE',
  'CRISIS',
  'CUT_COSTS',
])

const MAINTAIN_DECISIONS = new Set([
  'MAINTAIN_DIRECTION',
  'FOCUS_OPERATIONS',
  'FOCUS_DIGITALIZATION',
  'FOCUS_PROFITABILITY',
  'OPTIMIZE_SUPPLIERS',
  'WATCH',
  'MAINTAIN',
  'DELAY_NEW_STORE',
  'BALANCE',
  'RESTRUCTURE',
])

function decisionVector(decision: string): DecisionVector {
  if (GROWTH_DECISIONS.has(decision)) return 'GROWTH'
  if (DEFENSIVE_DECISIONS.has(decision)) return 'DEFENSIVE'
  if (MAINTAIN_DECISIONS.has(decision)) return 'MAINTAIN'
  return 'MIXED'
}

function groupDecisionVector(gd: GroupDecision): DecisionVector {
  if (gd === 'AGGRESSIVE_GROWTH' || gd === 'CONTROLLED_GROWTH') return 'GROWTH'
  if (gd === 'DEFENSIVE' || gd === 'CRISIS') return 'DEFENSIVE'
  if (gd === 'MAINTAIN') return 'MAINTAIN'
  return 'MIXED'
}

export function computeAlignmentPct(sourceDecision: string, groupDecision: GroupDecision): number {
  const sv = decisionVector(sourceDecision)
  const gv = groupDecisionVector(groupDecision)
  if (sv === gv) return 95
  if (sv === 'MIXED' || gv === 'MIXED') return 72
  if (
    (sv === 'GROWTH' && gv === 'MAINTAIN') ||
    (sv === 'MAINTAIN' && gv === 'GROWTH')
  ) {
    return 65
  }
  if (
    (sv === 'GROWTH' && gv === 'DEFENSIVE') ||
    (sv === 'DEFENSIVE' && gv === 'GROWTH')
  ) {
    return 35
  }
  return 55
}

export function computeGroupHealth(companies: HoldingCompanyDto[]): number {
  const avg = companies.reduce((s, c) => s + c.companyHealth, 0) / companies.length
  return round1(clamp(avg, 0, 100))
}

export function computeGroupChairmanScore(
  holdingScore: number,
  groupHealth: number,
  chairmanScore: number,
  ceoScore: number,
  investorScore: number,
  futureScore: number,
): number {
  const raw =
    holdingScore * 0.3 +
    chairmanScore * 0.2 +
    ceoScore * 0.15 +
    investorScore * 0.15 +
    futureScore * 0.1 +
    groupHealth * 0.1
  return round1(clamp(raw, 0, 100))
}

export function resolveGroupDecision(
  holdingScore: number,
  holdingDecision: HoldingDecision,
  avgGrowth: number,
  avgRisk: number,
  investmentDecision: string,
): GroupDecision {
  if (investmentDecision === 'CRITICAL' || holdingDecision === 'EXIT') return 'CRISIS'
  if (holdingScore >= 80 && holdingDecision === 'INVEST' && avgGrowth >= 70 && avgRisk >= 60) {
    return 'AGGRESSIVE_GROWTH'
  }
  if (holdingScore >= 65 && (holdingDecision === 'INVEST' || holdingDecision === 'GROW')) {
    return 'CONTROLLED_GROWTH'
  }
  if (holdingScore >= 50 && holdingDecision !== 'REDUCE') {
    return 'MAINTAIN'
  }
  if (holdingScore >= 38 || holdingDecision === 'REDUCE') return 'RESTRUCTURE'
  if (holdingScore >= 28) return 'DEFENSIVE'
  return 'CRISIS'
}

export function resolveCapitalStrategy(
  groupDecision: GroupDecision,
  holdingDecision: HoldingDecision,
): CapitalStrategy {
  if (groupDecision === 'AGGRESSIVE_GROWTH' || groupDecision === 'CONTROLLED_GROWTH') return 'INVEST'
  if (groupDecision === 'MAINTAIN' || holdingDecision === 'MAINTAIN') return 'BALANCE'
  if (groupDecision === 'RESTRUCTURE' || groupDecision === 'DEFENSIVE') return 'PROTECT'
  return 'CUT_COSTS'
}

export function resolveCompanyDecision(company: HoldingCompanyDto): CompanyChairmanDecision {
  if (company.investmentRank === 1 && company.companyScore >= 68) return 'INVEST'
  if (company.investmentRank <= 2 && company.companyScore >= 58) return 'GROW'
  if (company.companyScore >= 48) return 'MAINTAIN'
  if (company.companyScore >= 35) return 'REDUCE'
  return 'EXIT'
}

function companyDecisionReason(company: HoldingCompanyDto, decision: CompanyChairmanDecision): string {
  const reasons: Record<CompanyChairmanDecision, string> = {
    INVEST:
      `Yatırım sırası ${company.investmentRank}, skor ${company.companyScore} — portföy lideri, sermaye önceliği.`,
    GROW:
      `Büyüme skoru ${company.growthScore}, kârlılık ${company.profitabilityScore} — kontrollü ölçekleme uygun.`,
    MAINTAIN:
      `Sağlık ${company.companyHealth}, risk ${company.riskScore} — mevcut konum korunmalı.`,
    REDUCE:
      `Skor ${company.companyScore}, sağlık ${company.companyHealth} — sermaye ve operasyon azaltma.`,
    EXIT:
      `En düşük portföy performansı (skor ${company.companyScore}) — çıkış veya birleşme değerlendirmesi.`,
  }
  return reasons[decision]
}

export function buildCompanyDecisions(companies: HoldingCompanyDto[]): CompanyDecisionDto[] {
  return companies.map((c) => {
    const decision = resolveCompanyDecision(c)
    return {
      companyId: c.id,
      companyName: c.name,
      decision,
      reason: companyDecisionReason(c, decision),
    }
  })
}

export function buildAlignmentAnalysis(
  groupDecision: GroupDecision,
  ctx: GroupChairmanContext,
): AlignmentAnalysisDto {
  const investor = assembleInvestorIntelligence(ctx.investorCtx)
  const ceoAlignment = computeAlignmentPct(ctx.investorCtx.ceoReport.ceoDecision, groupDecision)
  const chairmanAlignment = computeAlignmentPct(
    ctx.investorCtx.chairmanReport.chairmanDecision,
    groupDecision,
  )
  const investorAlignment = computeAlignmentPct(investor.investmentDecision, groupDecision)
  const holdingAlignment = computeAlignmentPct(ctx.holdingReport.holdingDecision, groupDecision)
  const overallAlignment = round1(
    ceoAlignment * 0.25 +
      chairmanAlignment * 0.25 +
      investorAlignment * 0.25 +
      holdingAlignment * 0.25,
  )

  const summary =
    overallAlignment >= 85
      ? 'Grup kararı yönetim katmanlarıyla güçlü uyum gösteriyor.'
      : overallAlignment >= 65
        ? 'Grup kararı çoğunlukla uyumlu; sınırlı sapmalar izlenmeli.'
        : overallAlignment >= 45
          ? 'Karar katmanları arasında orta düzey uyumsuzluk — koordinasyon gerekli.'
          : 'Kritik uyumsuzluk — yönetim hizalaması acil gündem maddesi.'

  return {
    ceoAlignment,
    chairmanAlignment,
    investorAlignment,
    holdingAlignment,
    overallAlignment,
    summary,
  }
}

function buildOneYearPlan(
  groupDecision: GroupDecision,
  decisions: CompanyDecisionDto[],
  holding: HoldingCenterResponseDto,
): string[] {
  const investCo = decisions.find((d) => d.decision === 'INVEST')?.companyName ?? holding.bestCompany
  const reduceCo = decisions.find((d) => d.decision === 'REDUCE' || d.decision === 'EXIT')?.companyName

  const out = [
    `Q1: ${groupDecision} stratejisi doğrultusunda holding yönetim kurulu onayı.`,
    `Q1: ${investCo} için sermaye tahsisi ve büyüme KPI'ları tanımlama.`,
    'Q2: Grup ERP entegrasyonu — 5 şirket veri standardizasyonu.',
    'Q2: Tahsilat disiplini programı — açık bakiye hedefi %15 azaltma.',
    'Q3: Tedarik zinciri ortak müzakere — grup marjı +1.5 puan hedefi.',
    `Q3: ${holding.worstCompany} için operasyonel iyileştirme planı.`,
    'Q4: Yatırımcı raporlama döngüsü — çeyreklik holding brifingi.',
    'Q4: Risk konsantrasyonu analizi — portföy çeşitlendirme değerlendirmesi.',
    reduceCo
      ? `Q4: ${reduceCo} için azaltma veya dönüşüm kararı uygulama.`
      : 'Q4: Portföy dengeleme — düşük skorlu şirketler için gözden geçirme.',
    'Yıl sonu: Holding skoru ve sermaye tahsisi yeniden değerlendirme.',
  ]
  return out.slice(0, PLAN_LIMIT)
}

function buildThreeYearPlan(groupDecision: GroupDecision, holding: HoldingCenterResponseDto): string[] {
  const out = [
    `Y1: ${groupDecision} — holding kararının uygulanması ve KPI takibi.`,
    'Y1: MOBILYA OS ERP altyapısını grup standardı olarak konumlandırma.',
    `Y2: ${holding.bestCompany} öncülüğünde bölgesel büyüme — 2 yeni lokasyon fizibilitesi.`,
    'Y2: ATLAS CONNECT dağıtım ağı ile grup stok erişimini genişletme.',
    'Y2: MONESKO finansal çözümleri ile grup tahsilat oranı %85+ hedefi.',
    'Y3: EVTREND franchise modeli pilot — 1 bölgesel ortaklık.',
    'Y3: USTANET usta ağı kapasitesini %40 artırma programı.',
    'Y3: Holding EBITDA marjını +3 puan iyileştirme.',
    `Y3: ${holding.worstCompany} için portföy kararı (sürdür / dönüştür / çık).`,
    'Y3: Dijital satış kanalları — grup online ciro payı %20 hedefi.',
  ]
  return out.slice(0, PLAN_LIMIT)
}

function buildFiveYearPlan(groupDecision: GroupDecision, holding: HoldingCenterResponseDto): string[] {
  const out = [
    '2027: Holding yönetişim modeli — bağımsız grup CEO yapısı.',
    `2027: ${groupDecision} vizyonu ile sermaye yeniden tahsisi.`,
    `2028: ${holding.bestCompany} ile 3 yeni pazar girişi.`,
    '2028: Grup marka sinerjisi — ortak pazarlama platformu.',
    '2029: 5 şirket tam ERP entegrasyonu ve veri ambarı.',
    '2029: Holding cirosunu 2x ölçekleme hedefi.',
    '2030: Uluslararası tedarik ortaklıkları — maliyet optimizasyonu.',
    '2030: ESG ve sürdürülebilirlik raporlama standardı.',
    `2031: Portföy optimizasyonu — ${holding.worstCompany} kararı netleştirme.`,
    '2031: Holding değerlemesi ve olası halka arz / stratejik ortaklık değerlendirmesi.',
  ]
  return out.slice(0, PLAN_LIMIT)
}

function buildGroupThreats(holding: HoldingCenterResponseDto, ctx: GroupChairmanContext): string[] {
  const out: string[] = []
  const investor = assembleInvestorIntelligence(ctx.investorCtx)

  for (const r of holding.holdingRisks) {
    if (out.length >= SWOT_LIMIT) break
    if (isDepoKati(r)) continue
    out.push(r)
  }

  out.push('Yönetim katmanları arası karar uyumsuzluğu — strateji gecikmesi riski.')
  out.push('Makroekonomik daralma — tüketici harcaması ve mobilya talebi baskısı.')
  out.push('Portföy konsantrasyonu — tek sektör bağımlılığı.')
  out.push('Sermaye kısıtı — eş zamanlı büyüme yatırımları finansman baskısı.')

  for (const t of investor.threats) {
    if (out.length >= SWOT_LIMIT) break
    if (isDepoKati(t)) continue
    out.push(`Yatırımcı perspektifi: ${t}`)
  }

  return out.slice(0, SWOT_LIMIT)
}

function buildGroupOpportunities(holding: HoldingCenterResponseDto, ctx: GroupChairmanContext): string[] {
  const out: string[] = []
  const investor = assembleInvestorIntelligence(ctx.investorCtx)

  for (const o of holding.holdingOpportunities) {
    if (out.length >= SWOT_LIMIT) break
    if (isDepoKati(o)) continue
    out.push(o)
  }

  out.push('Grup satın alma gücü ile tedarik maliyetlerinde %10-15 tasarruf.')
  out.push('Çapraz satış sinerjisi — 5 şirket müşteri tabanı paylaşımı.')
  out.push('Ortak teknoloji yatırımı — ERP ve analitik altyapı ölçek ekonomisi.')

  for (const o of investor.opportunities) {
    if (out.length >= SWOT_LIMIT) break
    if (isDepoKati(o)) continue
    out.push(`Yatırımcı perspektifi: ${o}`)
  }

  return out.slice(0, SWOT_LIMIT)
}

function buildStrategicActions(
  groupDecision: GroupDecision,
  capitalStrategy: CapitalStrategy,
  decisions: CompanyDecisionDto[],
  holding: HoldingCenterResponseDto,
): StrategicActionDto[] {
  const investCo = decisions.find((d) => d.decision === 'INVEST')
  const actions: StrategicActionDto[] = [
    {
      priority: 1,
      action: `${groupDecision} grup kararını yönetim kuruluna sun ve onaylat.`,
      horizon: '1Y',
    },
    {
      priority: 2,
      action: `${capitalStrategy} sermaye stratejisini uygula — tahsis: ${holding.capitalAllocation.map((a) => `${a.companyName} %${a.percentage}`).join(', ')}.`,
      horizon: '1Y',
    },
  ]

  if (investCo) {
    actions.push({
      priority: 3,
      action: `${investCo.companyName} için yatırım komitesi kur ve KPI seti tanımla.`,
      horizon: '1Y',
    })
  }

  actions.push(
    { priority: 4, action: 'Grup tahsilat disiplini programı — haftalık açık bakiye takibi.', horizon: '1Y' },
    { priority: 5, action: 'MOBILYA OS ERP standardını 5 şirkete yayma yol haritası.', horizon: '3Y' },
    { priority: 6, action: `${holding.bestCompany} büyüme liderliği — yeni lokasyon fizibilitesi.`, horizon: '3Y' },
    { priority: 7, action: `${holding.worstCompany} portföy kararı — sürdür, dönüştür veya çık.`, horizon: '1Y' },
    { priority: 8, action: 'Tedarik zinciri ortak müzakere — grup marjı iyileştirme.', horizon: '1Y' },
    { priority: 9, action: 'Risk konsantrasyonu raporu — portföy çeşitlendirme planı.', horizon: '3Y' },
    { priority: 10, action: '5 yıllık holding vizyonu — yıllık stratejik gözden geçirme takvimi.', horizon: '5Y' },
  )

  return actions.slice(0, ACTIONS_LIMIT)
}

function buildChairmanBriefing(
  groupChairmanScore: number,
  groupDecision: GroupDecision,
  groupHealth: number,
  capitalStrategy: CapitalStrategy,
  holding: HoldingCenterResponseDto,
  alignment: AlignmentAnalysisDto,
  ctx: GroupChairmanContext,
): string[] {
  const investor = assembleInvestorIntelligence(ctx.investorCtx)
  const decisions = buildCompanyDecisions(holding.companies)
  const investCount = decisions.filter((d) => d.decision === 'INVEST' || d.decision === 'GROW').length
  const exitCount = decisions.filter((d) => d.decision === 'REDUCE' || d.decision === 'EXIT').length

  return [
    `Otonom Holding Başkanı değerlendirmesi tamamlandı. Grup başkanı skoru ${groupChairmanScore} (${scoreBand(groupChairmanScore)}), ` +
      `grup sağlığı ${groupHealth}, nihai karar ${groupDecision}. ${SOURCE_MODULES.length} modül sentezi ile ` +
      `${holding.companies.length} şirket portföyü için stratejik yön belirlendi.`,

    `Portföy profili: Holding skoru ${holding.holdingScore}, holding kararı ${holding.holdingDecision}. ` +
      `En güçlü şirket ${holding.bestCompany}, en zayıf ${holding.worstCompany}. ` +
      `Yatırımcı skoru ${investor.investorScore} (${investor.investmentDecision}), ` +
      `Başkan skoru ${ctx.investorCtx.chairmanReport.chairmanScore}, CEO skoru ${ctx.investorCtx.ceoReport.ceoScore}.`,

    `Sermaye stratejisi ${capitalStrategy}. Tahsis: ${holding.capitalAllocation.map((a) => `${a.companyName} %${a.percentage}`).join(', ')}. ` +
      `${investCount} şirket büyüme/yatırım, ${exitCount} şirket azaltma/çıkış kategorisinde. ` +
      `Grup cirosu MOBILYA OS ankeri ${formatMoneyAmount(extractBaseState(ctx.investorCtx).revenue)} ₺ ile kalibre edildi.`,

    `Uyum analizi: CEO %${alignment.ceoAlignment}, Başkan %${alignment.chairmanAlignment}, ` +
      `Yatırımcı %${alignment.investorAlignment}, Holding %${alignment.holdingAlignment} — genel uyum %${alignment.overallAlignment}. ` +
      `${alignment.summary} Gelecek motoru skoru ${ctx.investorCtx.futureReport.futureScore}.`,

    `Yönetim Kurulu özeti: ${groupDecision} kararı ${scoreBand(groupChairmanScore)} profil ile uyumlu. ` +
      `${ctx.investorCtx.chairmanReport.chairmanReason[0] ?? 'Stratejik denetim tamamlandı.'} ` +
      `Bir, üç ve beş yıllık planlar ile stratejik aksiyon listesi holding gündemine alınmalıdır.`,
  ]
}

export async function gatherGroupChairmanContext(prisma: PrismaClient): Promise<GroupChairmanContext> {
  const holdingCtx = await gatherHoldingContext(prisma)
  const holdingReport = assembleHoldingCenter(holdingCtx)
  return { ...holdingCtx, holdingReport }
}

export function assembleGroupChairman(ctx: GroupChairmanContext): GroupChairmanResponseDto {
  const holding = ctx.holdingReport
  const investor = assembleInvestorIntelligence(ctx.investorCtx)
  const companies = holding.companies
  const groupHealth = computeGroupHealth(companies)
  const avgGrowth = companies.reduce((s, c) => s + c.growthScore, 0) / companies.length
  const avgRisk = companies.reduce((s, c) => s + c.riskScore, 0) / companies.length

  const groupDecision = resolveGroupDecision(
    holding.holdingScore,
    holding.holdingDecision,
    avgGrowth,
    avgRisk,
    investor.investmentDecision,
  )
  const capitalStrategy = resolveCapitalStrategy(groupDecision, holding.holdingDecision)
  const groupChairmanScore = computeGroupChairmanScore(
    holding.holdingScore,
    groupHealth,
    ctx.investorCtx.chairmanReport.chairmanScore,
    ctx.investorCtx.ceoReport.ceoScore,
    investor.investorScore,
    ctx.investorCtx.futureReport.futureScore,
  )

  const companyDecisions = buildCompanyDecisions(companies)
  const alignmentAnalysis = buildAlignmentAnalysis(groupDecision, ctx)
  const recommendedCapitalAllocation: CapitalAllocationItemDto[] = computeCapitalAllocation(companies).map(
    (a) => ({
      companyId: a.companyId,
      companyName: a.companyName,
      percentage: a.percentage,
    }),
  )
  const generatedAt = new Date().toISOString()

  const summary: GroupChairmanSummaryDto = {
    groupChairmanScore,
    groupChairmanScoreBand: scoreBand(groupChairmanScore),
    groupDecision,
    groupHealth,
    capitalStrategy,
    companyCount: companies.length,
    capitalAllocationTotal: recommendedCapitalAllocation.reduce((s, a) => s + a.percentage, 0),
    generatedAt,
  }

  return {
    summary,
    groupChairmanScore,
    groupDecision,
    groupHealth,
    capitalStrategy,
    companyDecisions,
    oneYearPlan: buildOneYearPlan(groupDecision, companyDecisions, holding),
    threeYearPlan: buildThreeYearPlan(groupDecision, holding),
    fiveYearPlan: buildFiveYearPlan(groupDecision, holding),
    groupThreats: buildGroupThreats(holding, ctx),
    groupOpportunities: buildGroupOpportunities(holding, ctx),
    strategicActions: buildStrategicActions(groupDecision, capitalStrategy, companyDecisions, holding),
    recommendedCapitalAllocation,
    chairmanBriefing: buildChairmanBriefing(
      groupChairmanScore,
      groupDecision,
      groupHealth,
      capitalStrategy,
      holding,
      alignmentAnalysis,
      ctx,
    ),
    alignmentAnalysis,
    today: ctx.today,
    generatedAt,
    meta: { depoKatiExcluded: true, sources: [...SOURCE_MODULES] },
  }
}
