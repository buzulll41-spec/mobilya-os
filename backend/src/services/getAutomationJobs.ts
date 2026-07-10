/**
 * Operasyon Otomasyonu — vaka/görev çıktılarından deterministik otomasyon işleri üretir.
 *
 * Faz 8 `buildActions` ve Faz 9 `buildCases` çıktılarını yeniden kullanır; yeni risk
 * motoru yazılmaz. İş durum override'ları in-memory store'da tutulur (approve/run/cancel).
 * Depo Katı satış kaynağı görev/job üretmediği için otomasyon da üretmez.
 */

import type { PrismaClient } from '@prisma/client'
import { assertServiceErrorMapped } from '../errors/mapServiceError.js'
import { aggregateProfitability, loadProfitabilityOrders } from './getProfitabilityAnalytics.js'
import { buildCases } from './getOperationCases.js'
import { gatherActionResult } from './getOperationCases.js'
import { getCaseOverrides } from './updateOperationCase.js'
import type { ActionCenterResponseDto, ActionDto } from '../contracts/actionCenterDto.js'
import type { OperationCasesResponseDto } from '../contracts/operationCaseDto.js'
import type { ProfitabilityAnalyticsResponseDto } from '../contracts/profitabilityAnalyticsDto.js'
import type {
  AutomationJobDto,
  AutomationJobsResponseDto,
  AutomationJobStatus,
  AutomationQueueDto,
} from '../contracts/automationJobDto.js'
import type { ActionPriority } from '../contracts/actionCenterDto.js'
import type { SalesOrderListItemDto } from '../projection/salesOrderListItemProjection.js'
import { ruleBoolean, rulePercent } from './businessRulesEngine.js'

const PRIORITY_RANK: Record<ActionPriority, number> = { P1: 1, P2: 2, P3: 3, P4: 4, P5: 5 }

export type AutomationJobsQuery = {
  status?: string
  priority?: string
  q?: string
  salesPerson?: string
  limitedView?: boolean
}

/** In-memory iş durumu override'ı. */
export type JobOverride = {
  status: AutomationJobStatus
  approvedBy?: string | null
  executedAt?: string | null
  updatedAt: string
}

const jobStore = new Map<string, JobOverride>()

export function getJobOverrides(): Map<string, JobOverride> {
  return new Map(jobStore)
}

export function resetJobStore(): void {
  jobStore.clear()
}

export function setJobOverride(id: string, override: JobOverride): void {
  jobStore.set(id, override)
}

function trimOrUndef(v?: string): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

function actionOrderId(a: ActionDto): string | null {
  if (a.relatedEntityType === 'order') return a.relatedEntityId
  if (a.relatedEntityType === 'orderLine') {
    const oid = a.evidence?.orderId
    return typeof oid === 'string' && oid ? oid : null
  }
  return null
}

function caseIdForOrder(orderId: string | null): string | null {
  return orderId ? `CASE-${orderId}` : null
}

type JobDraft = Omit<AutomationJobDto, 'status' | 'approvedBy' | 'executedAt' | 'updatedAt'> & {
  initialStatus: AutomationJobStatus
}

function num(s: string): number {
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : 0
}
function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** Saf iş motoru — mevcut aksiyon/vaka/kârlılık çıktılarından iş üretir. */
function isAggregateAction(a: ActionDto): boolean {
  return (
    a.id === 'sales-target-review' ||
    a.id.startsWith('sales-campaign:') ||
    a.id.startsWith('supplier-open-share:') ||
    a.id.startsWith('supplier-profit-review:')
  )
}

function buildSalesPersonIndex(orders: SalesOrderListItemDto[]): Map<string, string | null> {
  const idx = new Map<string, string | null>()
  for (const o of orders) idx.set(o.id, o.salesPerson ?? null)
  return idx
}

export function buildJobs(args: {
  actionResult: ActionCenterResponseDto
  monthSrc: ProfitabilityAnalyticsResponseDto
  prevMonthSrc: ProfitabilityAnalyticsResponseDto
  overrides: Map<string, JobOverride>
  orders?: SalesOrderListItemDto[]
  query?: AutomationJobsQuery
}): AutomationJobsResponseDto {
  const { actionResult, monthSrc, prevMonthSrc, overrides, query = {} } = args
  const salesPersonIdx = buildSalesPersonIndex(args.orders ?? [])
  const limited = Boolean(query.limitedView)
  const fSalesPerson = trimOrUndef(query.salesPerson)
  const createdAt = `${actionResult.today}T08:00:00.000Z`
  const generatedAt = actionResult.generatedAt

  const drafts: JobDraft[] = []

  for (const a of actionResult.actions) {
    const orderId = actionOrderId(a)
    const relatedCaseId = caseIdForOrder(orderId)
    const base = {
      triggerSource: 'action',
      relatedCaseId,
      relatedOrderId: orderId,
      salesPerson: orderId ? (salesPersonIdx.get(orderId) ?? null) : null,
      aggregate: isAggregateAction(a),
      reason: a.reason,
      createdAt: a.createdAt,
    }

    if (a.id.startsWith('collection-call:') && ruleBoolean('AUTO_CREATE_COLLECTION_CASE', true)) {
      drafts.push({
        id: `job:collection:${orderId ?? a.id}`,
        jobType: 'CREATE_COLLECTION_CASE',
        priority: 'P1',
        initialStatus: 'WAITING_APPROVAL',
        recommendedAction: 'Müşteri tahsilat listesine eklensin',
        requiresApproval: true,
        title: 'Tahsilat vakası hazırla',
        ...base,
      })
    } else if (a.id.startsWith('shipment-overdue:') && ruleBoolean('AUTO_CREATE_SHIPMENT_CASE', true)) {
      drafts.push({
        id: `job:shipment:${orderId ?? a.id}`,
        jobType: 'CREATE_SHIPMENT_CASE',
        priority: 'P1',
        initialStatus: 'WAITING_APPROVAL',
        recommendedAction: 'Sevk operasyonuna aktar',
        requiresApproval: true,
        title: 'Geciken sevk vakası hazırla',
        ...base,
      })
    } else if (a.id.startsWith('dq-zero-cost:') && ruleBoolean('AUTO_CREATE_ZERO_COST_CASE', true)) {
      drafts.push({
        id: `job:dq-cost:${a.relatedEntityId ?? a.id}`,
        jobType: 'CREATE_DATA_QUALITY_CASE',
        priority: 'P1',
        initialStatus: 'CREATED',
        recommendedAction: 'Alış maliyeti tamamlanmalı',
        requiresApproval: false,
        title: 'Maliyet düzeltme vakası hazırla',
        ...base,
      })
    } else if (a.id.startsWith('dq-unknown:')) {
      drafts.push({
        id: `job:dq-source:${a.relatedEntityId ?? a.id}`,
        jobType: 'CREATE_SOURCE_REVIEW_CASE',
        priority: 'P2',
        initialStatus: 'WAITING_APPROVAL',
        recommendedAction: 'Satış kaynağı gözden geçirilmeli',
        requiresApproval: true,
        title: 'Kaynak inceleme vakası hazırla',
        ...base,
      })
    } else if (a.id === 'sales-target-review') {
      drafts.push({
        id: 'job:sales-target',
        jobType: 'CREATE_SALES_REVIEW_CASE',
        priority: 'P3',
        initialStatus: 'WAITING_APPROVAL',
        recommendedAction: 'Satış ekibi hedef altı performansı değerlendirsin',
        requiresApproval: true,
        title: 'Hedef altı satış incelemesi',
        triggerSource: 'forecast',
        relatedCaseId: 'CASE-sales-general',
        relatedOrderId: null,
        salesPerson: null,
        aggregate: true,
        reason: a.reason,
        createdAt: a.createdAt,
      })
    }
  }

  // Kâr düşüşü > %15 — aggregate
  const prevByKey = new Map(prevMonthSrc.rows.map((r) => [r.key, num(r.grossProfit)]))
  for (const r of monthSrc.rows) {
    const cur = num(r.grossProfit)
    const prev = prevByKey.get(r.key) ?? 0
    if (prev > 0) {
      const changePct = round1(((cur - prev) / prev) * 100)
      const profitDropThreshold = rulePercent('PROFITABILITY_DROP_WARNING', 15)
      if (changePct <= -profitDropThreshold) {
        drafts.push({
          id: `job:profit:${r.key}`,
          jobType: 'CREATE_PROFIT_REVIEW_CASE',
          priority: 'P2',
          initialStatus: 'WAITING_APPROVAL',
          recommendedAction: `${r.label} kârlılığı gözden geçirilmeli`,
          requiresApproval: true,
          title: `${r.label} kâr incelemesi`,
          triggerSource: 'profitability',
          relatedCaseId: null,
          relatedOrderId: null,
          salesPerson: null,
          aggregate: true,
          reason: `${r.label} brüt kârı geçen aya göre %${Math.abs(changePct)} azaldı.`,
          createdAt,
        })
      }
    }
  }

  // SALES limitedView — aggregate işleri gizle, yalnızca kendi siparişleri
  let scoped = drafts
  if (limited) {
    scoped = drafts.filter((d) => {
      if (d.aggregate) return false
      if (!fSalesPerson) return true
      return d.salesPerson === fSalesPerson
    })
  } else if (fSalesPerson) {
    scoped = drafts.filter((d) => d.aggregate || d.salesPerson === fSalesPerson || !d.salesPerson)
  }

  const allJobs: AutomationJobDto[] = scoped.map((d) => {
    const ov = overrides.get(d.id)
    const status = ov?.status ?? d.initialStatus
    return {
      id: d.id,
      jobType: d.jobType,
      priority: d.priority,
      status,
      triggerSource: d.triggerSource,
      relatedCaseId: d.relatedCaseId,
      relatedOrderId: d.relatedOrderId,
      recommendedAction: d.recommendedAction,
      requiresApproval: d.requiresApproval,
      approvedBy: ov?.approvedBy ?? null,
      executedAt: ov?.executedAt ?? null,
      createdAt: d.createdAt,
      updatedAt: ov?.updatedAt ?? d.createdAt,
      title: d.title,
      reason: d.reason,
      salesPerson: d.salesPerson,
      aggregate: d.aggregate,
    }
  })

  const summary = {
    totalJobs: allJobs.length,
    pendingCount: allJobs.filter((j) => j.status === 'CREATED').length,
    waitingApprovalCount: allJobs.filter((j) => j.status === 'WAITING_APPROVAL').length,
    executingCount: allJobs.filter((j) => j.status === 'EXECUTING').length,
    completedCount: allJobs.filter((j) => j.status === 'COMPLETED').length,
    failedCount: allJobs.filter((j) => j.status === 'FAILED').length,
    cancelledCount: allJobs.filter((j) => j.status === 'CANCELLED').length,
    autoRunReadyCount: allJobs.filter((j) => j.status === 'CREATED' && !j.requiresApproval).length,
  }

  const queue: AutomationQueueDto = {
    pending: allJobs.filter((j) => j.status === 'CREATED'),
    waitingApproval: allJobs.filter((j) => j.status === 'WAITING_APPROVAL'),
    executing: allJobs.filter((j) => j.status === 'EXECUTING' || j.status === 'APPROVED'),
    completed: allJobs.filter((j) => j.status === 'COMPLETED'),
    failed: allJobs.filter((j) => j.status === 'FAILED'),
  }

  // Kuyruk sıralaması: öncelik (P1 üstte), eşitlikte id
  const sortJobs = (arr: AutomationJobDto[]) =>
    [...arr].sort((a, b) => {
      const r = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
      if (r !== 0) return r
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
    })

  queue.pending = sortJobs(queue.pending)
  queue.waitingApproval = sortJobs(queue.waitingApproval)
  queue.executing = sortJobs(queue.executing)
  queue.completed = sortJobs(queue.completed)
  queue.failed = sortJobs(queue.failed)

  const fStatus = trimOrUndef(query.status)?.toUpperCase()
  const fPriority = trimOrUndef(query.priority)?.toUpperCase()
  const fq = trimOrUndef(query.q)?.toLocaleLowerCase('tr')

  let filtered = allJobs
  if (fStatus) filtered = filtered.filter((j) => j.status === fStatus)
  if (fPriority) filtered = filtered.filter((j) => j.priority === fPriority)
  if (fq) {
    filtered = filtered.filter((j) =>
      `${j.id} ${j.jobType} ${j.title ?? ''} ${j.reason ?? ''} ${j.recommendedAction} ${j.relatedOrderId ?? ''}`
        .toLocaleLowerCase('tr')
        .includes(fq),
    )
  }
  filtered = sortJobs(filtered)

  return {
    summary,
    jobs: filtered,
    queue,
    filters: {
      status: fStatus ?? null,
      priority: fPriority ?? null,
      q: fq ?? null,
      salesPerson: actionResult.filters.salesPerson ?? null,
      limitedView: actionResult.filters.limitedView,
    },
    currency: actionResult.currency,
    today: actionResult.today,
    generatedAt,
  }
}

function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate()
}
function monthBounds(ym: string): { from: string; to: string } {
  const year = Number.parseInt(ym.slice(0, 4), 10)
  const month = Number.parseInt(ym.slice(5, 7), 10)
  const total = daysInMonth(year, month)
  return { from: `${ym}-01`, to: `${ym}-${String(total).padStart(2, '0')}` }
}
function prevMonthBounds(ym: string): { from: string; to: string } {
  const year = Number.parseInt(ym.slice(0, 4), 10)
  const month = Number.parseInt(ym.slice(5, 7), 10)
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const ymPrev = `${prevYear}-${String(prevMonth).padStart(2, '0')}`
  return monthBounds(ymPrev)
}

export async function gatherAutomationData(
  prisma: PrismaClient,
  query: AutomationJobsQuery = {},
): Promise<{
  actionResult: ActionCenterResponseDto
  caseResult: OperationCasesResponseDto
  monthSrc: ProfitabilityAnalyticsResponseDto
  prevMonthSrc: ProfitabilityAnalyticsResponseDto
  orders: SalesOrderListItemDto[]
}> {
  const today = process.env.DEMO_TODAY ?? '2026-05-14'
  const ym = today.slice(0, 7)
  const { from, to } = monthBounds(ym)
  const prev = prevMonthBounds(ym)
  const salesPerson = trimOrUndef(query.salesPerson)

  const [profitOrders, { actionResult, orders }] = await Promise.all([
    loadProfitabilityOrders(prisma),
    gatherActionResult(prisma, { salesPerson, limitedView: query.limitedView }),
  ])

  const caseResult = buildCases({
    actionResult,
    overrides: getCaseOverrides(),
    orders,
    query: { salesPerson, limitedView: query.limitedView },
  })

  const monthSrc = aggregateProfitability(profitOrders, { from, to, salesPerson, groupBy: 'source' })
  const prevMonthSrc = aggregateProfitability(profitOrders, {
    from: prev.from,
    to: prev.to,
    salesPerson,
    groupBy: 'source',
  })

  return { actionResult, caseResult, monthSrc, prevMonthSrc, orders }
}

export async function getAutomationJobs(
  prisma: PrismaClient,
  query: AutomationJobsQuery = {},
): Promise<AutomationJobsResponseDto> {
  try {
    const data = await gatherAutomationData(prisma, query)
    return buildJobs({
      ...data,
      overrides: getJobOverrides(),
      query,
    })
  } catch (err) {
    assertServiceErrorMapped(err)
    throw err
  }
}
