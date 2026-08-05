/**
 * Dijital Şirket İkizi motoru — gerçek veriyi değiştirmeden senaryo simülasyonu.
 * Deterministik; LLM yok. Depo Katı hiçbir çıktıda görünmez.
 */

import type { PrismaClient } from '@prisma/client'
import { formatMoneyAmount } from '../lib/supplierLedger.js'
import {
  gatherStrategicContext,
  buildCompanyHealth,
  type StrategicContext,
} from './strategicIntelligenceEngine.js'
import type {
  CompanySimulationResponseDto,
  CompanySimulationSummaryDto,
  ScenarioResultDto,
  SimulationInputDto,
  SimulationScenarioId,
  SimulationSnapshotDto,
} from '../contracts/companySimulationDto.js'

const STAFF_REVENUE_PER_HEAD = 450_000
const STAFF_MARGIN_PCT = 25
const VEHICLE_DELAY_REDUCTION = 3
const STORE_MARGIN_PCT = 30
const STORE_OPS_LOAD_PCT = 5

export type SimulationBaseline = {
  ctx: StrategicContext
  metrics: VirtualMetrics
}

export type VirtualMetrics = {
  revenue: number
  grossProfit: number
  profitMarginPct: number
  collected: number
  openBalance: number
  riskyReceivable: number
  delayedShipments: number
  dataQualityScore: number
  managerScore: number
  externalSupplyShare: number
}

let lastRunAt: string | null = null

export function getSimulationLastRunAt(): string | null {
  return lastRunAt
}

export function resetSimulationRunStore(): void {
  lastRunAt = null
}

export function recordSimulationRun(ranAt: string): void {
  lastRunAt = ranAt
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

function healthBand(score: number): string {
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

/** Sanal metriklerden health + risk skoru hesaplar (Faz 15 formülü ile uyumlu). */
export function computeHealthFromMetrics(m: VirtualMetrics): { health: number; risk: number } {
  const collRatio = m.collected + m.openBalance > 0 ? (m.collected / (m.collected + m.openBalance)) * 100 : 100
  const riskyShare = m.openBalance > 0 ? m.riskyReceivable / m.openBalance : 0
  const profitabilityScore = (clamp(m.profitMarginPct, 0, 30) / 30) * 100
  const collectionScore = collRatio
  const riskScore = 100 - Math.min(100, riskyShare * 4 * 100)
  const dataQualityScore = clamp(m.dataQualityScore, 0, 100)
  const shipmentScore = 100 - Math.min(100, m.delayedShipments * 8)
  const operationScore = clamp(m.managerScore, 0, 100)

  const health = round1(
    profitabilityScore * 0.2 +
      collectionScore * 0.2 +
      riskScore * 0.15 +
      dataQualityScore * 0.15 +
      shipmentScore * 0.15 +
      operationScore * 0.15,
  )
  return { health, risk: round1(riskScore) }
}

export function metricsToSnapshot(m: VirtualMetrics): SimulationSnapshotDto {
  const { health, risk } = computeHealthFromMetrics(m)
  return {
    companyHealthScore: health,
    companyHealthBand: healthBand(health),
    riskScore: risk,
    revenue: formatMoneyAmount(m.revenue),
    profit: formatMoneyAmount(m.grossProfit),
    openBalance: formatMoneyAmount(m.openBalance),
    riskyReceivable: formatMoneyAmount(m.riskyReceivable),
    delayedShipments: m.delayedShipments,
    dataQualityScore: round1(m.dataQualityScore),
  }
}

function cloneMetrics(m: VirtualMetrics): VirtualMetrics {
  return { ...m }
}

function simulateCollectionDrop(m: VirtualMetrics, pct: number): VirtualMetrics {
  const out = cloneMetrics(m)
  const factor = 1 + pct / 100
  out.collected = Math.max(0, out.collected * factor)
  const delta = m.collected - out.collected
  out.openBalance = Math.max(0, out.openBalance + delta)
  out.riskyReceivable = Math.min(out.openBalance, out.riskyReceivable + delta * 0.4)
  out.managerScore = clamp(out.managerScore - Math.abs(pct) * 0.15, 0, 100)
  return out
}

function simulateNewStore(m: VirtualMetrics, revenue: number): VirtualMetrics {
  const out = cloneMetrics(m)
  const profit = revenue * (STORE_MARGIN_PCT / 100)
  out.revenue += revenue
  out.grossProfit += profit
  out.profitMarginPct = out.revenue > 0 ? round1((out.grossProfit / out.revenue) * 100) : out.profitMarginPct
  out.collected += revenue * 0.15
  out.delayedShipments += Math.ceil(STORE_OPS_LOAD_PCT / 2)
  out.managerScore = clamp(out.managerScore + 2, 0, 100)
  return out
}

function simulateNewStaff(m: VirtualMetrics, count: number): VirtualMetrics {
  const out = cloneMetrics(m)
  const addRev = count * STAFF_REVENUE_PER_HEAD
  const addProfit = addRev * (STAFF_MARGIN_PCT / 100)
  out.revenue += addRev
  out.grossProfit += addProfit
  out.profitMarginPct = out.revenue > 0 ? round1((out.grossProfit / out.revenue) * 100) : out.profitMarginPct
  out.collected += addRev * 0.2
  const efficiency = count > 2 ? -count : count * 1.5
  out.managerScore = clamp(out.managerScore + efficiency, 0, 100)
  return out
}

function simulateNewVehicle(m: VirtualMetrics, count: number): VirtualMetrics {
  const out = cloneMetrics(m)
  out.delayedShipments = Math.max(0, out.delayedShipments - count * VEHICLE_DELAY_REDUCTION)
  out.managerScore = clamp(out.managerScore + count * 3, 0, 100)
  return out
}

function simulateExternalSupply(m: VirtualMetrics, pct: number): VirtualMetrics {
  const out = cloneMetrics(m)
  const addRev = out.revenue * (pct / 100) * out.externalSupplyShare
  const marginDrag = pct * 0.08
  out.revenue += addRev
  out.grossProfit += addRev * ((out.profitMarginPct - marginDrag) / 100)
  out.profitMarginPct = out.revenue > 0 ? round1((out.grossProfit / out.revenue) * 100) : out.profitMarginPct
  out.riskyReceivable += addRev * 0.12
  out.openBalance += addRev * 0.1
  out.delayedShipments += Math.ceil(pct / 25)
  out.managerScore = clamp(out.managerScore - pct * 0.1, 0, 100)
  return out
}

function simulateBestCase(m: VirtualMetrics): VirtualMetrics {
  let out = cloneMetrics(m)
  out = simulateCollectionDrop(out, 15)
  out.riskyReceivable = Math.max(0, out.riskyReceivable * 0.7)
  out.dataQualityScore = clamp(out.dataQualityScore + 12, 0, 100)
  out.delayedShipments = Math.max(0, out.delayedShipments - 4)
  out.managerScore = clamp(out.managerScore + 8, 0, 100)
  return out
}

function simulateWorstCase(m: VirtualMetrics): VirtualMetrics {
  let out = cloneMetrics(m)
  out = simulateCollectionDrop(out, -25)
  out.riskyReceivable = Math.min(out.openBalance, out.riskyReceivable * 1.35)
  out.dataQualityScore = clamp(out.dataQualityScore - 15, 0, 100)
  out.delayedShipments += 6
  out.managerScore = clamp(out.managerScore - 12, 0, 100)
  out.grossProfit *= 0.92
  out.profitMarginPct = out.revenue > 0 ? round1((out.grossProfit / out.revenue) * 100) : out.profitMarginPct
  return out
}

function buildScenario(
  id: SimulationScenarioId,
  name: string,
  before: SimulationSnapshotDto,
  afterMetrics: VirtualMetrics,
  basis: string,
  recommendation: string,
): ScenarioResultDto {
  return {
    scenarioId: id,
    scenarioName: name,
    before,
    after: metricsToSnapshot(afterMetrics),
    basis,
    recommendation,
  }
}

export function runScenarios(
  baseline: SimulationBaseline,
  input: SimulationInputDto,
): ScenarioResultDto[] {
  const beforeSnap = metricsToSnapshot(baseline.metrics)
  const m = baseline.metrics
  const scenarios: ScenarioResultDto[] = []

  const collPct = input.collectionChangePercent ?? -20
  scenarios.push(
    buildScenario(
      'COLLECTION_DROP',
      'Tahsilat Düşerse',
      beforeSnap,
      simulateCollectionDrop(cloneMetrics(m), collPct),
      `Tahsilat ${collPct}% değişim; açık bakiye ve riskli alacak ters yönde ayarlandı.`,
      collPct < 0
        ? 'Tahsilat düşüşü açık bakiyeyi artırır; tahsilat planını güçlendirin.'
        : 'Tahsilat iyileşmesi nakit ve risk skorunu destekler.',
    ),
  )

  const storeRev = input.newStoreRevenue ?? 1_500_000
  scenarios.push(
    buildScenario(
      'NEW_STORE',
      'Yeni Mağaza',
      beforeSnap,
      simulateNewStore(cloneMetrics(m), storeRev),
      `+${formatMoneyAmount(storeRev)} ₺ ciro, %${STORE_MARGIN_PCT} marj, operasyon yükü +${Math.ceil(STORE_OPS_LOAD_PCT / 2)} geciken sevk.`,
      storeRev > num(beforeSnap.openBalance) * 2
        ? 'Yeni mağaza açmadan önce tahsilat performansını düzeltin.'
        : 'Yeni mağaza ciroyu artırır; sevk kapasitesini planlayın.',
    ),
  )

  const staff = input.additionalSalesStaff ?? 2
  scenarios.push(
    buildScenario(
      'NEW_SALES_STAFF',
      'Yeni Satış Personeli',
      beforeSnap,
      simulateNewStaff(cloneMetrics(m), staff),
      `${staff} personel × ${formatMoneyAmount(STAFF_REVENUE_PER_HEAD)} ₺ hedef ciro.`,
      staff > 3 ? 'Personel artışı verimliliği düşürebilir; kademeli işe alım önerilir.' : 'Ek personel ciro ve kârı destekler.',
    ),
  )

  const vehicles = input.additionalVehicles ?? 1
  scenarios.push(
    buildScenario(
      'NEW_VEHICLE',
      'Yeni Sevk Aracı',
      beforeSnap,
      simulateNewVehicle(cloneMetrics(m), vehicles),
      `${vehicles} araç × ${VEHICLE_DELAY_REDUCTION} geciken sevk azaltma.`,
      'Sevk kapasitesi artışı operasyon disiplinini iyileştirir.',
    ),
  )

  const extPct = input.externalSupplyIncreasePercent ?? 50
  scenarios.push(
    buildScenario(
      'EXTERNAL_SUPPLY_INCREASE',
      'Dış Tedarik Artışı',
      beforeSnap,
      simulateExternalSupply(cloneMetrics(m), extPct),
      `Dış tedarik payı %${extPct} artış; marj baskısı ve operasyon yükü simüle edildi.`,
      extPct > 30 ? 'Yüksek dış tedarik artışı risk ve marjı baskılar.' : 'Kontrollü dış tedarik büyümesi yönetilebilir.',
    ),
  )

  return scenarios
}

export async function gatherSimulationBaseline(prisma: PrismaClient): Promise<SimulationBaseline> {
  const ctx = await gatherStrategicContext(prisma)
  return { ctx, metrics: extractMetrics(ctx) }
}

export function buildManagementAdvice(
  baseline: SimulationSnapshotDto,
  best: ScenarioResultDto,
  worst: ScenarioResultDto,
  scenarios: ScenarioResultDto[],
): string {
  const coll = scenarios.find((s) => s.scenarioId === 'COLLECTION_DROP')
  const store = scenarios.find((s) => s.scenarioId === 'NEW_STORE')
  if (coll && coll.after.companyHealthScore < baseline.companyHealthScore - 5) {
    return 'Yeni mağaza açmadan önce tahsilat performansını düzeltin.'
  }
  if (store && store.after.companyHealthScore > baseline.companyHealthScore + 3) {
    return 'Tahsilat stabilse yeni mağaza yatırımı değerlendirilebilir; sevk kapasitesini önceden planlayın.'
  }
  if (worst.after.companyHealthScore < baseline.companyHealthScore - 10) {
    return 'En kötü senaryoda sağlık skoru ciddi düşer; risk ve tahsilat önceliklendirilmeli.'
  }
  if (best.after.companyHealthScore > baseline.companyHealthScore + 5) {
    return 'İyimser senaryoda sağlık skoru güçlenir; tahsilat ve veri kalitesi yatırımları ROI üretir.'
  }
  return 'Mevcut baseline korunuyor; kademeli büyüme ve tahsilat disiplini önerilir.'
}

export function assembleCompanySimulation(
  baseline: SimulationBaseline,
  input: SimulationInputDto = {},
  ranAt?: string,
): CompanySimulationResponseDto {
  const beforeSnap = metricsToSnapshot(baseline.metrics)
  const scenarios = runScenarios(baseline, input)

  const bestCase = buildScenario(
    'BEST_CASE',
    'Best Case',
    beforeSnap,
    simulateBestCase(cloneMetrics(baseline.metrics)),
    'Riskli alacak azalır, veri kalitesi +12, geciken sevk -4, tahsilat +15%.',
    'Tüm iyileştirmeler birlikte sağlık skorunu yükseltir.',
  )

  const worstCase = buildScenario(
    'WORST_CASE',
    'Worst Case',
    beforeSnap,
    simulateWorstCase(cloneMetrics(baseline.metrics)),
    'Tahsilat -25%, risk +35%, veri kalitesi -15, geciken sevk +6.',
    'Kötü senaryoda önleyici tahsilat ve sevk müdahalesi şart.',
  )

  const managementAdvice = buildManagementAdvice(beforeSnap, bestCase, worstCase, scenarios)
  const actualHealth = buildCompanyHealth(baseline.ctx)

  const summary: CompanySimulationSummaryDto = {
    baselineHealthScore: actualHealth.score,
    scenarioCount: scenarios.length + 2,
    bestCaseHealthAfter: bestCase.after.companyHealthScore,
    worstCaseHealthAfter: worstCase.after.companyHealthScore,
    lastRunAt: ranAt ?? lastRunAt,
  }

  return {
    summary,
    baseline: beforeSnap,
    scenarios,
    bestCase,
    worstCase,
    managementAdvice,
    input,
    today: baseline.ctx.today,
    generatedAt: new Date().toISOString(),
    meta: { depoKatiExcluded: true, virtualOnly: true },
  }
}
