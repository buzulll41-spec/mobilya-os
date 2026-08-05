/**
 * Holding Yönetim Merkezi motoru — Faz 5–21 sentezi ile portföy analizi.
 * Deterministik; LLM yok. Depo Katı hiçbir çıktıda görünmez.
 */

import type { PrismaClient } from '@prisma/client'
import { formatMoneyAmount } from '../lib/supplierLedger.js'
import {
  assembleInvestorIntelligence,
  computeInvestorScore,
  computeScoreComponents,
  gatherInvestorContext,
  type InvestorContext,
} from './investorIntelligenceEngine.js'
import { extractBaseState } from './enterpriseFutureEngine.js'
import type {
  CapitalAllocationDto,
  CompanyRankingDto,
  HoldingCenterResponseDto,
  HoldingCompanyDto,
  HoldingCompanyId,
  HoldingDecision,
  HoldingSummaryDto,
} from '../contracts/holdingCenterDto.js'

const OPPORTUNITIES_LIMIT = 10
const RISKS_LIMIT = 10
const VISION_LIMIT = 10

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
  'investorIntelligence',
] as const

type CompanyProfile = {
  id: HoldingCompanyId
  name: string
  sector: string
  growthFactor: number
  profitFactor: number
  riskFactor: number
  healthFactor: number
  revenueFactor: number
  investmentWeight: number
}

const DEMO_PROFILES: Omit<CompanyProfile, 'id' | 'name'>[] = [
  {
    sector: 'Etkinlik & Trend Mobilya',
    growthFactor: 1.28,
    profitFactor: 0.92,
    riskFactor: 0.82,
    healthFactor: 1.12,
    revenueFactor: 1.35,
    investmentWeight: 1.25,
  },
  {
    sector: 'Finansal Mobilya Çözümleri',
    growthFactor: 0.88,
    profitFactor: 1.18,
    riskFactor: 1.08,
    healthFactor: 1.05,
    revenueFactor: 1.10,
    investmentWeight: 1.05,
  },
  {
    sector: 'Usta Ağı & Özel Üretim',
    growthFactor: 1.14,
    profitFactor: 0.86,
    riskFactor: 1.15,
    healthFactor: 0.92,
    revenueFactor: 0.95,
    investmentWeight: 0.90,
  },
  {
    sector: 'Dağıtım & Bağlantı Platformu',
    growthFactor: 1.22,
    profitFactor: 1.06,
    riskFactor: 0.88,
    healthFactor: 1.08,
    revenueFactor: 1.20,
    investmentWeight: 1.15,
  },
]

const COMPANY_IDS: HoldingCompanyId[] = ['EVTREND', 'MONESKO', 'USTANET', 'ATLAS_CONNECT', 'MOBILYA_OS']
const COMPANY_NAMES: Record<HoldingCompanyId, string> = {
  EVTREND: 'EVTREND',
  MONESKO: 'MONESKO',
  USTANET: 'USTANET',
  ATLAS_CONNECT: 'ATLAS CONNECT',
  MOBILYA_OS: 'MOBILYA OS',
}

export type HoldingContext = {
  investorCtx: InvestorContext
  today: string
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

function deriveMobilyaOsMetrics(ctx: InvestorContext): {
  companyScore: number
  companyHealth: number
  riskScore: number
  growthScore: number
  profitabilityScore: number
  revenueTl: number
} {
  const base = extractBaseState(ctx)
  const components = computeScoreComponents(ctx)
  const investorScore = computeInvestorScore(components)
  const investorReport = assembleInvestorIntelligence(ctx)

  return {
    companyScore: investorScore,
    companyHealth: investorReport.summary.companyHealthScore,
    riskScore: components.riskScore,
    growthScore: components.growthScore,
    profitabilityScore: components.profitabilityScore,
    revenueTl: base.revenue,
  }
}

function deriveDemoCompanyMetrics(
  profile: CompanyProfile,
  anchor: ReturnType<typeof deriveMobilyaOsMetrics>,
): Omit<HoldingCompanyDto, 'investmentRank'> {
  const growthScore = round1(clamp(anchor.growthScore * profile.growthFactor, 0, 100))
  const profitabilityScore = round1(clamp(anchor.profitabilityScore * profile.profitFactor, 0, 100))
  const riskScore = round1(clamp(anchor.riskScore * profile.riskFactor, 0, 100))
  const companyHealth = round1(clamp(anchor.companyHealth * profile.healthFactor, 0, 100))
  const companyScore = round1(
    growthScore * 0.25 + profitabilityScore * 0.25 + riskScore * 0.2 + companyHealth * 0.3,
  )
  const revenueTl = Math.round(anchor.revenueTl * profile.revenueFactor)

  return {
    id: profile.id,
    name: profile.name,
    sector: profile.sector,
    companyScore,
    companyHealth,
    riskScore,
    growthScore,
    profitabilityScore,
    revenueTl,
  }
}

export function buildCompanyProfiles(ctx: InvestorContext): HoldingCompanyDto[] {
  const anchor = deriveMobilyaOsMetrics(ctx)
  const mobilyaOs: HoldingCompanyDto = {
    id: 'MOBILYA_OS',
    name: COMPANY_NAMES.MOBILYA_OS,
    sector: 'Mobilya Perakende & ERP',
    ...anchor,
    investmentRank: 0,
  }

  const demoCompanies = DEMO_PROFILES.map((p, i) => {
    const profile: CompanyProfile = {
      id: COMPANY_IDS[i]!,
      name: COMPANY_NAMES[COMPANY_IDS[i]!],
      ...p,
    }
    return deriveDemoCompanyMetrics(profile, anchor)
  })

  const all = [...demoCompanies, mobilyaOs]
  const investmentScores = all.map((c) => ({
    id: c.id,
    score: round1(c.companyScore * 0.35 + c.growthScore * 0.25 + c.profitabilityScore * 0.2 + c.riskScore * 0.2),
  }))
  investmentScores.sort((a, b) => b.score - a.score)
  const rankMap = new Map(investmentScores.map((s, idx) => [s.id, idx + 1]))

  return all.map((c) => ({ ...c, investmentRank: rankMap.get(c.id) ?? 5 }))
}

export function computeHoldingScore(companies: HoldingCompanyDto[]): number {
  const total = companies.reduce((sum, c) => sum + c.companyScore, 0)
  return round1(total / companies.length)
}

export function resolveHoldingDecision(holdingScore: number, companies: HoldingCompanyDto[]): HoldingDecision {
  const avgRisk = companies.reduce((s, c) => s + c.riskScore, 0) / companies.length
  const avgGrowth = companies.reduce((s, c) => s + c.growthScore, 0) / companies.length
  const worst = companies.reduce((w, c) => (c.companyScore < w.companyScore ? c : w), companies[0]!)

  if (holdingScore >= 80 && avgGrowth >= 70 && avgRisk >= 65) return 'INVEST'
  if (holdingScore >= 65 && avgGrowth >= 55) return 'GROW'
  if (holdingScore >= 50 && worst.companyScore >= 35) return 'MAINTAIN'
  if (holdingScore >= 35) return 'REDUCE'
  return 'EXIT'
}

const INVESTMENT_WEIGHTS: Record<HoldingCompanyId, number> = {
  EVTREND: 1.25,
  MONESKO: 1.05,
  USTANET: 0.9,
  ATLAS_CONNECT: 1.15,
  MOBILYA_OS: 0.85,
}

export function computeCapitalAllocation(companies: HoldingCompanyDto[]): CapitalAllocationDto[] {
  const weights = companies.map((c) => {
    const weight = c.investmentRank <= 2 ? c.companyScore * 1.2 : c.companyScore
    const factor = INVESTMENT_WEIGHTS[c.id]
    return { company: c, raw: Math.max(1, weight * factor) }
  })

  const total = weights.reduce((s, w) => s + w.raw, 0)
  const rawPcts = weights.map((w) => (w.raw / total) * 100)
  const rounded = rawPcts.map((p) => Math.round(p))
  let diff = 100 - rounded.reduce((s, p) => s + p, 0)

  const sorted = rounded
    .map((_, i) => ({ i, frac: rawPcts[i]! - Math.floor(rawPcts[i]!) }))
    .sort((a, b) => b.frac - a.frac)

  const final = [...rounded]
  let idx = 0
  while (diff !== 0 && idx < sorted.length) {
    const target = sorted[idx]!.i
    if (diff > 0) {
      final[target]! += 1
      diff -= 1
    } else if (final[target]! > 0) {
      final[target]! -= 1
      diff += 1
    }
    idx = (idx + 1) % sorted.length
  }

  return companies.map((c, i) => ({
    companyId: c.id,
    companyName: c.name,
    percentage: final[i]!,
  }))
}

function buildRanking(
  companies: HoldingCompanyDto[],
  key: 'growthScore' | 'riskScore' | 'profitabilityScore' | 'companyScore',
  ascending = false,
): CompanyRankingDto[] {
  const sorted = [...companies].sort((a, b) =>
    ascending ? a[key] - b[key] : b[key] - a[key],
  )
  return sorted.map((c, idx) => ({
    companyId: c.id,
    companyName: c.name,
    rank: idx + 1,
    score: c[key],
  }))
}

export function resolveBestWorst(companies: HoldingCompanyDto[]): { best: string; worst: string } {
  const sorted = [...companies].sort((a, b) => b.companyScore - a.companyScore)
  return {
    best: sorted[0]!.name,
    worst: sorted[sorted.length - 1]!.name,
  }
}

export function buildHoldingOpportunities(companies: HoldingCompanyDto[], ctx: InvestorContext): string[] {
  const out: string[] = []
  const topGrowth = [...companies].sort((a, b) => b.growthScore - a.growthScore)[0]!
  const topProfit = [...companies].sort((a, b) => b.profitabilityScore - a.profitabilityScore)[0]!
  const investor = assembleInvestorIntelligence(ctx)

  out.push(`${topGrowth.name} büyüme liderliği (%${topGrowth.growthScore}) — portföy genişleme önceliği.`)
  out.push(`${topProfit.name} kârlılık üstünlüğü (%${topProfit.profitabilityScore}) — sermaye verimliliği referansı.`)
  out.push('Çapraz şirket tedarik optimizasyonu ile grup marjını +2 puan artırma potansiyeli.')
  out.push('Ortak ERP altyapısı ile operasyonel maliyetleri %8-12 düşürme fırsatı.')
  out.push('EVTREND etkinlik segmentinde bölgesel franchise modeli değerlendirmesi.')
  out.push('ATLAS CONNECT dağıtım ağı ile MOBILYA OS stok erişimini genişletme.')
  out.push('MONESKO finansal çözümleri ile grup tahsilat disiplinini güçlendirme.')
  out.push('USTANET usta ağı ile özel üretim kapasitesini ölçeklendirme.')

  for (const o of investor.opportunities) {
    if (out.length >= OPPORTUNITIES_LIMIT) break
    if (isDepoKati(o)) continue
    out.push(`MOBILYA OS fırsatı: ${o}`)
  }

  out.push('Dijital satış kanallarında grup marka sinerjisi ile yeni müşteri segmentleri.')
  out.push('Veri kalitesi yatırımı ile holding düzeyinde karar hızını artırma.')
  out.push('Stratejik tedarikçi ortaklıkları ile tedarik zinciri güvencesi.')
  out.push('İkinci lokasyon fizibilitesi — en yüksek skorlu şirket öncelikli.')

  return out.slice(0, OPPORTUNITIES_LIMIT)
}

export function buildHoldingRisks(companies: HoldingCompanyDto[], ctx: InvestorContext): string[] {
  const out: string[] = []
  const worstRisk = [...companies].sort((a, b) => a.riskScore - b.riskScore)[0]!
  const lowestHealth = [...companies].sort((a, b) => a.companyHealth - b.companyHealth)[0]!
  const investor = assembleInvestorIntelligence(ctx)

  out.push(`${worstRisk.name} risk skoru ${worstRisk.riskScore} — portföy risk konsantrasyonu.`)
  out.push(`${lowestHealth.name} sağlık skoru ${lowestHealth.companyHealth} — operasyonel zayıflık.`)
  out.push('Tek sektör bağımlılığı — mobilya döngüsüne duyarlılık.')
  out.push('Makroekonomik daralma — tüketici harcaması baskısı.')
  out.push('Tedarik zinciri kesintileri — stok ve teslimat gecikmeleri.')
  out.push('Personel devir hızı — operasyonel süreklilik riski.')
  out.push('Rekabet baskısı — fiyat ve marj sıkışması.')
  out.push('Regülasyon ve vergi değişiklikleri — maliyet artışı.')

  for (const t of investor.threats) {
    if (out.length >= RISKS_LIMIT) break
    if (isDepoKati(t)) continue
    out.push(`MOBILYA OS riski: ${t}`)
  }

  out.push('Coğrafi konsantrasyon — çeşitlendirme sınırlı.')
  out.push('Dış tedarik payı yönetimi — marj baskısı devam ediyor.')

  return out.slice(0, RISKS_LIMIT)
}

export function buildHoldingBriefing(
  holdingScore: number,
  decision: HoldingDecision,
  companies: HoldingCompanyDto[],
  allocation: CapitalAllocationDto[],
  best: string,
  worst: string,
  ctx: InvestorContext,
): string[] {
  const base = extractBaseState(ctx)
  const investor = assembleInvestorIntelligence(ctx)
  const paragraphs: string[] = []

  paragraphs.push(
    `Holding Yönetim Merkezi analizi, ${SOURCE_MODULES.length} operasyonel modülün portföy sentezi ile tamamlandı. ` +
      `Holding skoru ${holdingScore} (${scoreBand(holdingScore)}), portföy kararı ${decision} olarak belirlendi. ` +
      `${companies.length} grup şirketi değerlendirildi; en güçlü performans ${best}, en zayıf performans ${worst} tarafından gösterildi.`,
  )

  paragraphs.push(
    `Portföy profili: MOBILYA OS canlı ERP verisi ile ankerlendi (ciro ${formatMoneyAmount(base.revenue)} ₺, ` +
      `yatırımcı skoru ${investor.investorScore}). EVTREND, MONESKO, USTANET ve ATLAS CONNECT deterministik ` +
      `profil faktörleri ile türetildi. Ortalama şirket skoru ${round1(companies.reduce((s, c) => s + c.companyScore, 0) / companies.length)}, ` +
      `ortalama sağlık ${round1(companies.reduce((s, c) => s + c.companyHealth, 0) / companies.length)}.`,
  )

  const topAlloc = [...allocation].sort((a, b) => b.percentage - a.percentage)[0]!
  paragraphs.push(
    `Sermaye tahsisi: ${topAlloc.companyName} %${topAlloc.percentage} ile en yüksek payı aldı. ` +
      `Dağılım ${allocation.map((a) => `${a.companyName} %${a.percentage}`).join(', ')}. ` +
      `Büyüme lideri ${companies.sort((a, b) => b.growthScore - a.growthScore)[0]!.name}, ` +
      `kârlılık lideri ${companies.sort((a, b) => b.profitabilityScore - a.profitabilityScore)[0]!.name}. ` +
      `Yatırım sıralaması holding düzeyinde yeniden dengelendi.`,
  )

  paragraphs.push(
    `Risk değerlendirmesi: portföy risk ortalaması ${round1(companies.reduce((s, c) => s + c.riskScore, 0) / companies.length)}. ` +
      `Başkan skoru ${ctx.chairmanReport.chairmanScore}, CEO skoru ${ctx.ceoReport.ceoScore}, gelecek motoru ${ctx.futureReport.futureScore}. ` +
      `${ctx.chairmanReport.chairmanDecision} ve ${ctx.ceoReport.ceoDecision} kararları holding stratejisiyle hizalandı. ` +
      `Operasyonel risk göstergeleri holdingRisk listesinde önceliklendirildi.`,
  )

  paragraphs.push(
    `Yönetim Kurulu özeti: ${decision} kararı ${scoreBand(holdingScore)} profil ile uyumlu. ` +
      `En iyi şirket ${best} sermaye tahsisinde öncelikli; ${worst} için azaltma veya dönüşüm planı değerlendirilmeli. ` +
      `${ctx.chairmanReport.chairmanReason[0] ?? 'Stratejik yön değerlendirmesi tamamlandı.'} ` +
      `Beş yıllık vizyon ve holdingOpportunities listesi yönetim gündemine taşınmalıdır.`,
  )

  return paragraphs
}

export function buildFiveYearVision(companies: HoldingCompanyDto[], decision: HoldingDecision): string[] {
  const out: string[] = []
  const leader = [...companies].sort((a, b) => b.companyScore - a.companyScore)[0]!

  out.push(`2027: ${leader.name} öncülüğünde holding cirosunu %15 artırma hedefi.`)
  out.push('2027: Ortak ERP platformu ile 5 şirketin tam entegrasyonu.')
  out.push('2028: EVTREND ile 3 yeni bölgesel etkinlik mobilya mağazası açılışı.')
  out.push('2028: ATLAS CONNECT dağıtım ağını 12 yeni ile genişletme.')
  out.push('2029: MONESKO finansal çözümleri ile grup tahsilat oranını %90+ hedefleme.')
  out.push('2029: USTANET usta ağını 500+ usta ile ölçeklendirme.')
  out.push('2030: MOBILYA OS dijital satış kanalı ile online ciro payını %25 yapma.')
  out.push('2030: Holding EBITDA marjını +4 puan iyileştirme programı.')
  out.push(`2031: Portföy kararı ${decision} doğrultusunda sermaye yeniden tahsisi.`)
  out.push('2031: Grup şirketleri arası sinerji ile operasyonel maliyetleri %20 düşürme.')

  return out.slice(0, VISION_LIMIT)
}

export async function gatherHoldingContext(prisma: PrismaClient): Promise<HoldingContext> {
  const investorCtx = await gatherInvestorContext(prisma)
  return { investorCtx, today: investorCtx.strategic.today }
}

export function assembleHoldingCenter(ctx: HoldingContext): HoldingCenterResponseDto {
  const companies = buildCompanyProfiles(ctx.investorCtx)
  const holdingScore = computeHoldingScore(companies)
  const holdingDecision = resolveHoldingDecision(holdingScore, companies)
  const capitalAllocation = computeCapitalAllocation(companies)
  const growthRanking = buildRanking(companies, 'growthScore')
  const riskRanking = buildRanking(companies, 'riskScore')
  const profitabilityRanking = buildRanking(companies, 'profitabilityScore')
  const investmentRanking = buildRanking(companies, 'companyScore')
  const { best, worst } = resolveBestWorst(companies)
  const generatedAt = new Date().toISOString()

  const summary: HoldingSummaryDto = {
    holdingScore,
    holdingScoreBand: scoreBand(holdingScore),
    holdingDecision,
    bestCompany: best,
    worstCompany: worst,
    companyCount: companies.length,
    capitalAllocationTotal: capitalAllocation.reduce((s, a) => s + a.percentage, 0),
    generatedAt,
  }

  return {
    summary,
    holdingScore,
    holdingDecision,
    companies,
    capitalAllocation,
    growthRanking,
    riskRanking,
    profitabilityRanking,
    investmentRanking,
    bestCompany: best,
    worstCompany: worst,
    holdingOpportunities: buildHoldingOpportunities(companies, ctx.investorCtx),
    holdingRisks: buildHoldingRisks(companies, ctx.investorCtx),
    holdingBriefing: buildHoldingBriefing(
      holdingScore,
      holdingDecision,
      companies,
      capitalAllocation,
      best,
      worst,
      ctx.investorCtx,
    ),
    fiveYearVision: buildFiveYearVision(companies, holdingDecision),
    today: ctx.today,
    generatedAt,
    meta: { depoKatiExcluded: true, sources: [...SOURCE_MODULES] },
  }
}
