/**
 * Otonom Operasyon Ajanları motoru — Faz 5–11 modüllerini tek geçişte toplar.
 * Deterministik kural tabanlı; gelecekte AI ajanları için OperationsAgentRunner arayüzü.
 * Depo Katı satış kaynağı olarak hiçbir çıktıda görünmez.
 */

import type { PrismaClient } from '@prisma/client'
import { formatMoneyAmount } from '../lib/supplierLedger.js'
import { moneyToNumber } from '../lib/money.js'
import { gatherCeoData, type CeoGatheredData } from './getCeoControlCenter.js'
import { ruleNumber, rulePercent } from './businessRulesEngine.js'
import type {
  AgentCode,
  AgentDailyBriefingDto,
  AgentOutputItemDto,
  AgentPriorityItemDto,
  AgentPriorityLevel,
  AgentRecommendationDto,
  AgentRunResultDto,
  OperationsAgentDetailDto,
  OperationsAgentDto,
  OperationsAgentsResponseDto,
  OperationsAgentsSummaryDto,
} from '../contracts/operationsAgentDto.js'
import type { ActionCategory } from '../contracts/actionCenterDto.js'

const TOP_CUSTOMERS_LIMIT = 10
const TOP_CRITICAL_LIMIT = 10
const TOP_RECOMMENDATIONS_LIMIT = 15
const AGENT_RUN_INTERVAL_HOURS = 6

const AGENT_META: Record<
  AgentCode,
  { id: string; agentName: string; description: string; defaultPriority: AgentPriorityLevel }
> = {
  COLLECTION_AGENT: {
    id: 'agent-collection',
    agentName: 'Tahsilat Ajanı',
    description: 'Riskli alacakları ve aranacak müşterileri izler',
    defaultPriority: 'P1',
  },
  SHIPMENT_AGENT: {
    id: 'agent-shipment',
    agentName: 'Sevk Ajanı',
    description: 'Geciken ve yaklaşan sevkleri, sevke hazır siparişleri izler',
    defaultPriority: 'P1',
  },
  DATA_QUALITY_AGENT: {
    id: 'agent-data-quality',
    agentName: 'Veri Kalitesi Ajanı',
    description: 'ZERO_COST, UNKNOWN_SOURCE ve eksik alanları tespit eder',
    defaultPriority: 'P1',
  },
  SALES_AGENT: {
    id: 'agent-sales',
    agentName: 'Satış Ajanı',
    description: 'Hedef altı personel, en iyi performans ve düşen kaynakları izler',
    defaultPriority: 'P3',
  },
  SUPPLIER_AGENT: {
    id: 'agent-supplier',
    agentName: 'Tedarikçi Ajanı',
    description: 'Geciken, kârlı ve riskli tedarikçileri izler',
    defaultPriority: 'P2',
  },
  EXECUTIVE_AGENT: {
    id: 'agent-executive',
    agentName: 'Yönetici Ajanı',
    description: 'Tüm ajanları birleştirir; günlük brifing ve kritik konular',
    defaultPriority: 'P1',
  },
}

const ALL_AGENT_CODES: AgentCode[] = [
  'COLLECTION_AGENT',
  'SHIPMENT_AGENT',
  'DATA_QUALITY_AGENT',
  'SALES_AGENT',
  'SUPPLIER_AGENT',
  'EXECUTIVE_AGENT',
]

/** Gelecekte AI ajanları için değiştirilebilir arayüz. */
export interface OperationsAgentRunner {
  code: AgentCode
  run(ctx: AgentContext): AgentRunResultDto
}

export type AgentContext = CeoGatheredData & {
  runTimestamps: Map<AgentCode, string>
}

type AgentRunStore = Map<AgentCode, string>

const runStore: AgentRunStore = new Map()

export function getAgentRunTimestamps(): AgentRunStore {
  return runStore
}

export function resetAgentRunStore(): void {
  runStore.clear()
}

export function recordAgentRun(code: AgentCode, ranAt: string): void {
  runStore.set(code, ranAt)
}

function num(s: string): number {
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : 0
}
function round1(n: number): number {
  return Math.round(n * 10) / 10
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
function addHours(iso: string, hours: number): string {
  return new Date(Date.parse(iso) + hours * 3_600_000).toISOString()
}
function isDepoKatiLabel(label: string | null | undefined): boolean {
  return label === 'Depo Katı' || label === 'WAREHOUSE' || label === 'WAREHOUSE_FLOOR'
}
function filterSourceLabel(label: string): string | null {
  return isDepoKatiLabel(label) ? null : label
}

const JOB_TYPE_BY_CATEGORY: Partial<Record<ActionCategory, string[]>> = {
  COLLECTION: ['CREATE_COLLECTION_CASE'],
  SHIPMENT: ['CREATE_SHIPMENT_CASE'],
  DATA_QUALITY: ['CREATE_DATA_QUALITY_CASE'],
  SALES: ['CREATE_SALES_REVIEW_CASE', 'CREATE_SOURCE_REVIEW_CASE'],
  SUPPLIER: ['CREATE_PROFIT_REVIEW_CASE'],
}

function countByCategory(
  data: CeoGatheredData,
  category: ActionCategory,
): { actions: number; cases: number; jobs: number } {
  const categoryActions = data.actionResult.actions.filter((a) => a.category === category)
  const actionIds = new Set(categoryActions.map((a) => a.id))
  const actions = categoryActions.length
  const cases = data.caseResult.cases.filter((c) => c.actionIds.some((id) => actionIds.has(id))).length
  const jobTypes = JOB_TYPE_BY_CATEGORY[category] ?? []
  const jobs = data.jobResult.jobs.filter((j) => jobTypes.includes(j.jobType)).length
  return { actions, cases, jobs }
}

function categoryCounts(data: CeoGatheredData): Record<string, { actions: number; cases: number; jobs: number }> {
  const cats: ActionCategory[] = ['COLLECTION', 'SHIPMENT', 'DATA_QUALITY', 'SALES', 'SUPPLIER']
  const out: Record<string, { actions: number; cases: number; jobs: number }> = {}
  for (const c of cats) out[c] = countByCategory(data, c)
  return out
}

/** Tek geçiş veri yükleme — gatherCeoData'yı yeniden kullanır. */
export async function gatherAgentContext(prisma: PrismaClient): Promise<AgentContext> {
  const data = await gatherCeoData(prisma)
  return { ...data, runTimestamps: runStore }
}

export function runCollectionAgent(ctx: AgentContext): AgentRunResultDto {
  const { listItems, srcRes } = ctx
  const outputs: AgentOutputItemDto[] = []
  const riskyTotal = num(srcRes.totals.riskyReceivable)

  if (riskyTotal > 0) {
    outputs.push({
      id: 'collection-risk-total',
      title: 'Riskli alacak toplamı',
      reason: `Toplam riskli alacak ${formatMoneyAmount(riskyTotal)} ₺; tahsilat görüşmeleri gerekli.`,
      recommendedAction: 'Riskli müşterileri öncelik sırasına göre arayın; ödeme planı teklif edin.',
      priority: 'P1',
      evidence: { riskyReceivable: riskyTotal },
    })
  }

  const candidates = listItems
    .filter((it) => {
      const remaining = liNum(it.remainingAmount)
      const risk = String(it.currentRiskSeverity ?? 'NONE')
      return remaining > 0 && (risk === 'HIGH' || risk === 'CRITICAL' || it.hasOverdueBalance)
    })
    .map((it) => ({
      it,
      remaining: liNum(it.remainingAmount),
      risk: String(it.currentRiskSeverity ?? 'NONE'),
    }))
    .sort((a, b) => b.remaining - a.remaining)
    .slice(0, TOP_CUSTOMERS_LIMIT)

  for (const { it, remaining, risk } of candidates) {
    outputs.push({
      id: `collection-call:${it.id}`,
      title: `Ara: ${it.customerDisplayName}`,
      reason: `${it.customerDisplayName} — açık bakiye ${formatMoneyAmount(remaining)} ₺, risk ${risk}.`,
      recommendedAction: 'Müşteriyle tahsilat görüşmesi yapın; ödeme taahhüdü alın.',
      priority: risk === 'CRITICAL' || it.hasOverdueBalance ? 'P1' : 'P2',
      evidence: {
        orderId: it.id,
        customer: it.customerDisplayName,
        openBalance: remaining,
        risk,
      },
    })
  }

  const ranAt = new Date().toISOString()
  return {
    agentCode: 'COLLECTION_AGENT',
    ranAt,
    nextRunAt: addHours(ranAt, AGENT_RUN_INTERVAL_HOURS),
    outputs,
  }
}

export function runShipmentAgent(ctx: AgentContext): AgentRunResultDto {
  const { today, listItems } = ctx
  const outputs: AgentOutputItemDto[] = []
  const deadlineWindow = 3

  for (const it of listItems) {
    const delivered = it.displayStatus === 'Teslim Edildi'
    if (delivered) continue

    if (it.plannedShipmentDate && it.plannedShipmentDate < today) {
      const lateDays = daysBetween(today, it.plannedShipmentDate)
      outputs.push({
        id: `shipment-delayed:${it.id}`,
        title: `Geciken sevk: ${it.orderNumber}`,
        reason: `${it.customerDisplayName} siparişinde planlanan sevk ${lateDays} gün geçti.`,
        recommendedAction: 'Sevk ekibiyle görüşüp teslimatı önceliklendirin.',
        priority: 'P1',
        evidence: { orderId: it.id, lateDays, plannedDate: it.plannedShipmentDate },
      })
    } else if (it.plannedShipmentDate) {
      const daysLeft = daysBetween(it.plannedShipmentDate, today)
      if (daysLeft >= 0 && daysLeft <= deadlineWindow) {
        outputs.push({
          id: `shipment-approaching:${it.id}`,
          title: `Yaklaşan termin: ${it.orderNumber}`,
          reason: `${it.customerDisplayName} siparişinde sevk tarihi ${daysLeft} gün içinde (${it.plannedShipmentDate}).`,
          recommendedAction: 'Sevk hazırlığını kontrol edin; müşteriyle randevu teyit edin.',
          priority: 'P2',
          evidence: { orderId: it.id, daysLeft, plannedDate: it.plannedShipmentDate },
        })
      }
    }

    if (it.displayStatus === 'Hazır') {
      outputs.push({
        id: `shipment-ready:${it.id}`,
        title: `Sevke hazır: ${it.orderNumber}`,
        reason: `${it.customerDisplayName} siparişi "Hazır" durumda, sevk planına eklenebilir.`,
        recommendedAction: 'Uygun araç/güne sevk planına ekleyin.',
        priority: 'P2',
        evidence: { orderId: it.id, status: it.displayStatus },
      })
    }
  }

  const ranAt = new Date().toISOString()
  return {
    agentCode: 'SHIPMENT_AGENT',
    ranAt,
    nextRunAt: addHours(ranAt, AGENT_RUN_INTERVAL_HOURS),
    outputs,
  }
}

export function runDataQualityAgent(ctx: AgentContext): AgentRunResultDto {
  const { dq } = ctx
  const outputs: AgentOutputItemDto[] = []
  const rowLimit = ruleNumber('DATA_QUALITY_ROW_LIMIT', 50)

  for (const row of dq.rows.slice(0, rowLimit)) {
    const codes = new Set(row.issues.map((i) => i.code))
    if (codes.has('ZERO_COST')) {
      outputs.push({
        id: `dq-zero-cost:${row.orderLineId}`,
        title: 'Alış maliyeti eksik',
        reason: `${row.productTitle} (${row.customerName}) kaleminde soldUnitCost sıfır/eksik.`,
        recommendedAction: 'Ürün kartından doğru alış maliyetini girin.',
        priority: 'P1',
        evidence: { orderLineId: row.orderLineId, qualityScore: row.qualityScore },
      })
    }
    if (codes.has('UNKNOWN_SOURCE')) {
      outputs.push({
        id: `dq-unknown:${row.orderLineId}`,
        title: 'Satış kaynağı bilinmiyor',
        reason: `${row.productTitle} (${row.customerName}) kaleminde satış kaynağı Bilinmeyen.`,
        recommendedAction: 'Kalemin satış kaynağını tanımlayın.',
        priority: 'P2',
        evidence: { orderLineId: row.orderLineId, qualityScore: row.qualityScore },
      })
    }
    if (codes.has('MISSING_DISPLAY_FLOOR')) {
      outputs.push({
        id: `dq-floor:${row.orderLineId}`,
        title: 'Sergi katı eksik',
        reason: `${row.productTitle} (${row.customerName}) mağaza içi kaynak ancak sergi katı eksik.`,
        recommendedAction: 'Sergilendiği katı seçip kaydedin.',
        priority: 'P3',
        evidence: { orderLineId: row.orderLineId, qualityScore: row.qualityScore },
      })
    }
  }

  if (dq.totals.averageQualityScore < rulePercent('DATA_QUALITY_WARNING', 85)) {
    outputs.push({
      id: 'dq-score-low',
      title: 'Veri kalitesi skoru düşük',
      reason: `Ortalama veri kalitesi skoru ${dq.totals.averageQualityScore}; eşik ${rulePercent('DATA_QUALITY_WARNING', 85)} altında.`,
      recommendedAction: 'En kötü skorlu kalemleri öncelikle düzeltin.',
      priority: 'P1',
      evidence: { averageScore: dq.totals.averageQualityScore },
    })
  }

  const ranAt = new Date().toISOString()
  return {
    agentCode: 'DATA_QUALITY_AGENT',
    ranAt,
    nextRunAt: addHours(ranAt, AGENT_RUN_INTERVAL_HOURS),
    outputs,
  }
}

export function runSalesAgent(ctx: AgentContext): AgentRunResultDto {
  const { forecast, personRes } = ctx
  const outputs: AgentOutputItemDto[] = []

  for (const s of forecast.staffForecast) {
    if (s.status === 'HEDEF_ALTINDA') {
      outputs.push({
        id: `sales-under-target:${s.key}`,
        title: `Hedef altı: ${s.label}`,
        reason: `${s.label} bu ay hedefin %${round1(s.achievementPct)}'inde; projeksiyon ${formatMoneyAmount(num(s.projectedSales))} ₺.`,
        recommendedAction: 'Satış yöneticisiyle birebir değerlendirme yapın.',
        priority: 'P3',
        evidence: { salesPerson: s.label, achievementPct: s.achievementPct },
      })
    }
  }

  const performers = [...personRes.rows].filter((r) => num(r.revenue) > 0)
  const top = performers.sort((a, b) => num(b.grossProfit) - num(a.grossProfit))[0]
  if (top) {
    outputs.push({
      id: `sales-top:${top.key}`,
      title: `En iyi performans: ${top.label}`,
      reason: `${top.label} bu ay ${formatMoneyAmount(num(top.grossProfit))} ₺ brüt kâr ile önde.`,
      recommendedAction: 'Başarıyı tebrik edin; iyi uygulamaları ekiple paylaşın.',
      priority: 'P3',
      evidence: { salesPerson: top.label, grossProfit: num(top.grossProfit) },
    })
  }

  for (const src of forecast.sourceTrends) {
    const label = filterSourceLabel(src.label)
    if (!label) continue
    if (src.trend === 'DOWN' && num(src.revenue30) > 0) {
      outputs.push({
        id: `sales-declining:${src.key}`,
        title: `Düşen kaynak: ${label}`,
        reason: `${label} kaynağının 30 günlük satış hızı %${src.pct30} değişimle düşüyor.`,
        recommendedAction: 'Kampanya veya sergi düzenlemesi planlayın.',
        priority: 'P3',
        evidence: { source: label, pct30: src.pct30 },
      })
    }
  }

  const target = forecast.summary.targetAchievementPct
  if (target > 0 && target < rulePercent('SALES_TARGET_WARNING', 90)) {
    outputs.push({
      id: 'sales-target-low',
      title: 'Ay sonu hedefi altında',
      reason: `Bu gidişle ay sonu ciro geçen ayın %${round1(target)}'i seviyesinde.`,
      recommendedAction: 'Ay sonu kapanış planı yapın; bekleyen teklifleri hızlandırın.',
      priority: 'P2',
      evidence: { targetAchievementPct: round1(target) },
    })
  }

  const ranAt = new Date().toISOString()
  return {
    agentCode: 'SALES_AGENT',
    ranAt,
    nextRunAt: addHours(ranAt, AGENT_RUN_INTERVAL_HOURS),
    outputs,
  }
}

export function runSupplierAgent(ctx: AgentContext): AgentRunResultDto {
  const { supplierRes, advisories } = ctx
  const outputs: AgentOutputItemDto[] = []
  const rows = supplierRes.rows

  const openTotal = rows.reduce((s, r) => s + num(r.openBalance), 0)
  const shareThreshold = rulePercent('SUPPLIER_OPEN_SHARE_THRESHOLD', 30)
  if (openTotal > 0) {
    const concentrated = rows
      .map((r) => ({ row: r, sharePct: round1((num(r.openBalance) / openTotal) * 100) }))
      .filter((x) => x.sharePct >= shareThreshold)
      .sort((a, b) => b.sharePct - a.sharePct)[0]
    if (concentrated) {
      outputs.push({
        id: `supplier-risk:${concentrated.row.key}`,
        title: `Riskli tedarikçi: ${concentrated.row.label}`,
        reason: `${concentrated.row.label} toplam açık bakiyenin %${concentrated.sharePct}'ini taşıyor.`,
        recommendedAction: 'Cari hesap mutabakatı yapıp ödeme planını netleştirin.',
        priority: 'P2',
        evidence: {
          supplier: concentrated.row.label,
          openBalance: num(concentrated.row.openBalance),
          sharePercent: concentrated.sharePct,
        },
      })
    }
  }

  const topProfit = [...rows].sort((a, b) => num(b.grossProfit) - num(a.grossProfit))[0]
  if (topProfit && num(topProfit.grossProfit) > 0) {
    outputs.push({
      id: `supplier-profit:${topProfit.key}`,
      title: `En kârlı tedarikçi: ${topProfit.label}`,
      reason: `${topProfit.label} bu ay ${formatMoneyAmount(num(topProfit.grossProfit))} ₺ brüt kâr.`,
      recommendedAction: 'İlişkiyi güçlendirin; stok devamlılığını koruyun.',
      priority: 'P3',
      evidence: { supplier: topProfit.label, grossProfit: num(topProfit.grossProfit) },
    })
  }

  for (const a of advisories.advisories) {
    if (a.category !== 'SUPPLIER') continue
    outputs.push({
      id: `supplier-advisory:${a.id}`,
      title: a.title,
      reason: a.reason,
      recommendedAction: a.recommendation,
      priority: a.severity === 'CRITICAL' ? 'P1' : a.severity === 'WARNING' ? 'P2' : 'P3',
      evidence: { advisoryId: a.id },
    })
  }

  const ranAt = new Date().toISOString()
  return {
    agentCode: 'SUPPLIER_AGENT',
    ranAt,
    nextRunAt: addHours(ranAt, AGENT_RUN_INTERVAL_HOURS),
    outputs,
  }
}

export function runExecutiveAgent(
  ctx: AgentContext,
  subResults: Partial<Record<AgentCode, AgentRunResultDto>>,
): AgentRunResultDto {
  const priorities = buildPriorities(ctx, subResults)
  const critical = priorities.filter((p) => p.priority === 'P1').slice(0, TOP_CRITICAL_LIMIT)
  const outputs: AgentOutputItemDto[] = critical.map((p) => ({
    id: p.id,
    title: p.title,
    reason: p.reason,
    recommendedAction: `İlgili ajan (${p.agentCode}) çıktısını inceleyin ve aksiyon alın.`,
    priority: p.priority,
    evidence: { agentCode: p.agentCode, category: p.category },
  }))

  if (outputs.length === 0) {
    outputs.push({
      id: 'executive-all-clear',
      title: 'Kritik konu yok',
      reason: 'Tüm ajanlar çalıştırıldı; P1 seviyesinde açık kritik konu tespit edilmedi.',
      recommendedAction: 'P2/P3 öncelikli konuları gözden geçirin.',
      priority: 'P3',
    })
  }

  const ranAt = new Date().toISOString()
  return {
    agentCode: 'EXECUTIVE_AGENT',
    ranAt,
    nextRunAt: addHours(ranAt, AGENT_RUN_INTERVAL_HOURS),
    outputs,
  }
}

const AGENT_RUNNERS: Record<Exclude<AgentCode, 'EXECUTIVE_AGENT'>, (ctx: AgentContext) => AgentRunResultDto> = {
  COLLECTION_AGENT: runCollectionAgent,
  SHIPMENT_AGENT: runShipmentAgent,
  DATA_QUALITY_AGENT: runDataQualityAgent,
  SALES_AGENT: runSalesAgent,
  SUPPLIER_AGENT: runSupplierAgent,
}

export function runSingleAgent(ctx: AgentContext, code: AgentCode): AgentRunResultDto {
  if (code === 'EXECUTIVE_AGENT') {
    const sub: Partial<Record<AgentCode, AgentRunResultDto>> = {}
    for (const c of ALL_AGENT_CODES) {
      if (c === 'EXECUTIVE_AGENT') continue
      sub[c] = AGENT_RUNNERS[c](ctx)
    }
    return runExecutiveAgent(ctx, sub)
  }
  return AGENT_RUNNERS[code](ctx)
}

export function runAllAgents(ctx: AgentContext): Record<AgentCode, AgentRunResultDto> {
  const results: Partial<Record<AgentCode, AgentRunResultDto>> = {}
  for (const code of ALL_AGENT_CODES) {
    if (code === 'EXECUTIVE_AGENT') continue
    results[code] = runSingleAgent(ctx, code)
    recordAgentRun(code, results[code]!.ranAt)
  }
  results.EXECUTIVE_AGENT = runExecutiveAgent(ctx, results)
  recordAgentRun('EXECUTIVE_AGENT', results.EXECUTIVE_AGENT.ranAt)
  return results as Record<AgentCode, AgentRunResultDto>
}

/** Deterministik günlük brifing şablonu. */
export function buildAgentDailyBriefing(
  ctx: AgentContext,
  priorities: AgentPriorityItemDto[],
  subResults: Partial<Record<AgentCode, AgentRunResultDto>>,
): AgentDailyBriefingDto {
  const { today, srcRes, forecast, dq, delayedShipments, overdueCount, cockpit } = ctx
  const totals = srcRes.totals
  const p1 = priorities.filter((p) => p.priority === 'P1')
  const headline = `${today} — ${p1.length} kritik konu, ${priorities.length} toplam öncelik`

  const paragraphs = [
    `Bu ay ciro ${formatMoneyAmount(num(totals.revenue))} ₺; riskli alacak ${formatMoneyAmount(num(totals.riskyReceivable))} ₺.`,
    `Operasyon: ${delayedShipments} geciken sevk, ${overdueCount} gecikmiş tahsilat, veri kalitesi skoru ${dq.totals.averageQualityScore}.`,
    `Ay sonu hedef gerçekleşme %${round1(forecast.summary.targetAchievementPct)}; bugünkü satış ${formatMoneyAmount(num(cockpit.summary.todaySales))} ₺.`,
  ]
  if (p1[0]) {
    paragraphs.push(`En acil konu: ${p1[0].title} — ${p1[0].reason}`)
  }

  const whatToDoToday: string[] = []
  if (p1.length > 0) whatToDoToday.push(`${p1.length} P1 konusunu önce ele alın`)
  const collectionOutputs = subResults.COLLECTION_AGENT?.outputs ?? []
  if (collectionOutputs.length > 0) {
    whatToDoToday.push(`${Math.min(collectionOutputs.length, TOP_CUSTOMERS_LIMIT)} müşteri için tahsilat görüşmesi planlayın`)
  }
  if (delayedShipments > 0) whatToDoToday.push(`${delayedShipments} geciken sevki takip edin`)
  if (dq.totals.averageQualityScore < 85) whatToDoToday.push('Veri kalitesi düşük kalemleri düzeltin')
  if (whatToDoToday.length === 0) whatToDoToday.push('Rutin operasyon kontrolü yapın; P2/P3 konuları gözden geçirin')

  return {
    headline,
    paragraphs,
    whatToDoToday,
    criticalIssues: p1.slice(0, TOP_CRITICAL_LIMIT),
  }
}

const PRIORITY_RANK: Record<AgentPriorityLevel, number> = { P1: 1, P2: 2, P3: 3 }

/** P1/P2/P3 öncelik motoru. */
export function buildPriorities(
  ctx: AgentContext,
  subResults: Partial<Record<AgentCode, AgentRunResultDto>>,
): AgentPriorityItemDto[] {
  const out: AgentPriorityItemDto[] = []

  const pushFromOutput = (agentCode: AgentCode, category: string, o: AgentOutputItemDto) => {
    out.push({
      id: `priority:${o.id}`,
      priority: o.priority,
      title: o.title,
      reason: o.reason,
      agentCode,
      category,
    })
  }

  for (const [code, result] of Object.entries(subResults) as [AgentCode, AgentRunResultDto][]) {
    if (code === 'EXECUTIVE_AGENT' || !result) continue
    const category = code.replace('_AGENT', '')
    for (const o of result.outputs) pushFromOutput(code, category, o)
  }

  // P1 kuralları: riskli alacak, geciken sevk, kritik veri
  if (num(ctx.srcRes.totals.riskyReceivable) > 0) {
    const exists = out.some((p) => p.id === 'priority:collection-risk-total')
    if (!exists) {
      out.push({
        id: 'priority:collection-risk-aggregate',
        priority: 'P1',
        title: 'Riskli alacak uyarısı',
        reason: `Toplam riskli alacak ${formatMoneyAmount(num(ctx.srcRes.totals.riskyReceivable))} ₺.`,
        agentCode: 'COLLECTION_AGENT',
        category: 'COLLECTION',
      })
    }
  }
  if (ctx.delayedShipments > 0) {
    out.push({
      id: 'priority:shipment-delayed-aggregate',
      priority: 'P1',
      title: 'Geciken sevkiyatlar',
      reason: `${ctx.delayedShipments} siparişte planlanan sevk tarihi geçmiş.`,
      agentCode: 'SHIPMENT_AGENT',
      category: 'SHIPMENT',
    })
  }
  if (ctx.dq.totals.averageQualityScore < rulePercent('DATA_QUALITY_WARNING', 85)) {
    out.push({
      id: 'priority:dq-critical',
      priority: 'P1',
      title: 'Kritik veri kalitesi',
      reason: `Ortalama skor ${ctx.dq.totals.averageQualityScore} — kâr hesabı güvenilirliği düşük.`,
      agentCode: 'DATA_QUALITY_AGENT',
      category: 'DATA_QUALITY',
    })
  }

  // P2: kârlılık düşüşü, tedarikçi riski
  for (const a of ctx.advisories.advisories) {
    if (a.category === 'PROFITABILITY' && a.severity !== 'INFO') {
      out.push({
        id: `priority:advisory:${a.id}`,
        priority: a.severity === 'CRITICAL' ? 'P1' : 'P2',
        title: a.title,
        reason: a.reason,
        agentCode: 'SUPPLIER_AGENT',
        category: 'PROFITABILITY',
      })
    }
    if (a.category === 'SUPPLIER' && a.severity === 'WARNING') {
      out.push({
        id: `priority:supplier:${a.id}`,
        priority: 'P2',
        title: a.title,
        reason: a.reason,
        agentCode: 'SUPPLIER_AGENT',
        category: 'SUPPLIER',
      })
    }
  }

  // P3: satış performansı (zaten output'lardan gelir)

  out.sort((a, b) => {
    const r = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
    if (r !== 0) return r
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })

  return out
}

function buildRecommendations(
  subResults: Partial<Record<AgentCode, AgentRunResultDto>>,
): AgentRecommendationDto[] {
  const out: AgentRecommendationDto[] = []
  for (const [code, result] of Object.entries(subResults) as [AgentCode, AgentRunResultDto][]) {
    if (!result || code === 'EXECUTIVE_AGENT') continue
    for (const o of result.outputs) {
      out.push({
        id: `rec:${o.id}`,
        agentCode: code,
        title: o.title,
        reason: o.reason,
        recommendedAction: o.recommendedAction,
        priority: o.priority,
      })
    }
  }
  out.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])
  return out.slice(0, TOP_RECOMMENDATIONS_LIMIT)
}

function buildAgentDto(
  code: AgentCode,
  ctx: AgentContext,
  result: AgentRunResultDto | undefined,
  counts: { actions: number; cases: number; jobs: number },
): OperationsAgentDto {
  const meta = AGENT_META[code]
  const lastRun = ctx.runTimestamps.get(code) ?? result?.ranAt ?? null
  const p1Count = (result?.outputs ?? []).filter((o) => o.priority === 'P1').length
  const priority: AgentPriorityLevel = p1Count > 0 ? 'P1' : meta.defaultPriority

  return {
    id: meta.id,
    agentCode: code,
    agentName: meta.agentName,
    description: meta.description,
    status: lastRun ? 'COMPLETED' : 'IDLE',
    priority,
    lastRunAt: lastRun,
    nextRunAt: result?.nextRunAt ?? (lastRun ? addHours(lastRun, AGENT_RUN_INTERVAL_HOURS) : addHours(new Date().toISOString(), AGENT_RUN_INTERVAL_HOURS)),
    generatedCases: counts.cases,
    generatedActions: counts.actions,
    generatedJobs: counts.jobs,
  }
}

function buildSummary(
  agents: OperationsAgentDto[],
  priorities: AgentPriorityItemDto[],
  data: CeoGatheredData,
): OperationsAgentsSummaryDto {
  return {
    totalAgents: agents.length,
    activeAgents: agents.filter((a) => a.status === 'COMPLETED' || a.status === 'RUNNING').length,
    p1Issues: priorities.filter((p) => p.priority === 'P1').length,
    p2Issues: priorities.filter((p) => p.priority === 'P2').length,
    p3Issues: priorities.filter((p) => p.priority === 'P3').length,
    generatedCases: data.caseResult.cases.length,
    generatedActions: data.actionResult.actions.length,
    generatedJobs: data.jobResult.jobs.length,
  }
}

/** Ana montaj — toplanan veriyi Operations Agents DTO'suna dönüştürür. */
function ensureAllAgentResults(
  ctx: AgentContext,
  subResults?: Partial<Record<AgentCode, AgentRunResultDto>>,
): Record<AgentCode, AgentRunResultDto> {
  const results: Partial<Record<AgentCode, AgentRunResultDto>> = { ...subResults }
  for (const code of ALL_AGENT_CODES) {
    if (code === 'EXECUTIVE_AGENT') continue
    if (!results[code]) results[code] = runSingleAgent(ctx, code)
  }
  if (!results.EXECUTIVE_AGENT) {
    results.EXECUTIVE_AGENT = runExecutiveAgent(ctx, results)
  }
  return results as Record<AgentCode, AgentRunResultDto>
}

export function assembleOperationsAgentsResponse(
  ctx: AgentContext,
  subResults?: Partial<Record<AgentCode, AgentRunResultDto>>,
): OperationsAgentsResponseDto {
  const results = ensureAllAgentResults(ctx, subResults)

  const counts = categoryCounts(ctx)
  const catMap: Record<AgentCode, string> = {
    COLLECTION_AGENT: 'COLLECTION',
    SHIPMENT_AGENT: 'SHIPMENT',
    DATA_QUALITY_AGENT: 'DATA_QUALITY',
    SALES_AGENT: 'SALES',
    SUPPLIER_AGENT: 'SUPPLIER',
    EXECUTIVE_AGENT: 'OPERATIONS',
  }

  const agents = ALL_AGENT_CODES.map((code) => {
    const cat = catMap[code]
    const c = code === 'EXECUTIVE_AGENT'
      ? {
          actions: ctx.actionResult.actions.length,
          cases: ctx.caseResult.cases.length,
          jobs: ctx.jobResult.jobs.length,
        }
      : counts[cat] ?? { actions: 0, cases: 0, jobs: 0 }
    return buildAgentDto(code, ctx, results[code], c)
  })

  const priorities = buildPriorities(ctx, results)
  const briefing = buildAgentDailyBriefing(ctx, priorities, results)
  const recommendations = buildRecommendations(results)
  const summary = buildSummary(agents, priorities, ctx)

  return {
    summary,
    agents,
    briefing,
    recommendations,
    priorities,
    generatedCases: summary.generatedCases,
    generatedActions: summary.generatedActions,
    generatedJobs: summary.generatedJobs,
    today: ctx.today,
    generatedAt: new Date().toISOString(),
  }
}

export function assembleAgentDetail(
  ctx: AgentContext,
  code: AgentCode,
): OperationsAgentDetailDto {
  const result = runSingleAgent(ctx, code)
  const counts = categoryCounts(ctx)
  const catMap: Record<AgentCode, string> = {
    COLLECTION_AGENT: 'COLLECTION',
    SHIPMENT_AGENT: 'SHIPMENT',
    DATA_QUALITY_AGENT: 'DATA_QUALITY',
    SALES_AGENT: 'SALES',
    SUPPLIER_AGENT: 'SUPPLIER',
    EXECUTIVE_AGENT: 'OPERATIONS',
  }
  const cat = catMap[code]
  const c =
    code === 'EXECUTIVE_AGENT'
      ? {
          actions: ctx.actionResult.actions.length,
          cases: ctx.caseResult.cases.length,
          jobs: ctx.jobResult.jobs.length,
        }
      : counts[cat] ?? { actions: 0, cases: 0, jobs: 0 }

  const agent = buildAgentDto(code, ctx, result, c)
  const p1 = result.outputs.filter((o) => o.priority === 'P1').length
  const summary =
    result.outputs.length === 0
      ? 'Bu çalıştırmada çıktı üretilmedi.'
      : `${result.outputs.length} çıktı; ${p1} P1 öncelikli.`

  return { ...agent, summary, outputs: result.outputs }
}

export function isValidAgentCode(code: string): code is AgentCode {
  return ALL_AGENT_CODES.includes(code as AgentCode)
}
