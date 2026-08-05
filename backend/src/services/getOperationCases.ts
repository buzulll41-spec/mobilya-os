/**
 * Operasyon Orkestrasyon Merkezi — tekil görevleri (Faz 8 buildActions) operasyon
 * VAKALARINA gruplar.
 *
 * Bu modül LLM kullanmaz ve risk/görev mantığını YENİDEN YAZMAZ — Faz 8
 * `getActionCenter`/`buildActions` çıktısını yeniden kullanır. Vakalar deterministik
 * üretilir: aynı siparişe ait görevler tek vakada (caseNumber = `CASE-<orderId>`),
 * sipariş/müşteriyle ilişkilendirilemeyen aggregate görevler kendi kategorisinde
 * (tedarikçi/satış) gruplanır. Vaka önceliği = içindeki görevlerin en yükseği.
 *
 * Durum/sahip/timeline override'ları in-memory store'dan (updateOperationCase) uygulanır.
 * Depo Katı satış kaynağı görev üretmediği için vaka da üretmez.
 */

import type { PrismaClient } from '@prisma/client'
import { assertServiceErrorMapped } from '../errors/mapServiceError.js'
import { buildActions, type ActionCenterQuery } from './getActionCenter.js'
import {
  aggregateProfitability,
  loadProfitabilityOrders,
} from './getProfitabilityAnalytics.js'
import { getDataQualityReport } from './getDataQualityReport.js'
import { listSalesOrderListItems } from './listOrdersProjection.js'
import { buildForecast } from './getForecastEngine.js'
import { getActionStatusOverrides } from './updateActionStatus.js'
import { getCaseOverrides, type CaseOverride } from './updateOperationCase.js'
import type { SalesOrderListItemDto } from '../projection/salesOrderListItemProjection.js'
import type { ActionCenterResponseDto, ActionDto, ActionPriority } from '../contracts/actionCenterDto.js'
import type {
  CasePriority,
  CaseStatus,
  CaseTimelineEventDto,
  OperationCaseDto,
  OperationCasesResponseDto,
  OperationCasesSummaryDto,
} from '../contracts/operationCaseDto.js'

const PRIORITY_RANK: Record<ActionPriority, number> = { P1: 1, P2: 2, P3: 3, P4: 4, P5: 5 }

const RISK_RANK: Record<string, number> = { Kritik: 5, Yüksek: 4, Orta: 3, Düşük: 2, Yok: 1 }
const RISK_LABEL_TR: Record<string, string> = {
  CRITICAL: 'Kritik',
  HIGH: 'Yüksek',
  MEDIUM: 'Orta',
  LOW: 'Düşük',
  NONE: 'Yok',
}

const ACTIVE_CASE_STATUSES = new Set<CaseStatus>(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING'])

export type OperationCasesQuery = {
  priority?: string
  status?: string
  q?: string
  salesPerson?: string
  limitedView?: boolean
}

function trimOrUndef(v?: string): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}
function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** Bir görevin ait olduğu sipariş kimliği (varsa). */
function actionOrderId(a: ActionDto): string | null {
  if (a.relatedEntityType === 'order') return a.relatedEntityId
  if (a.relatedEntityType === 'orderLine') {
    const oid = a.evidence?.orderId
    return typeof oid === 'string' && oid ? oid : null
  }
  return null
}

/** Sipariş zenginleştirme indeksi — customerId/risk için. */
type OrderIndexEntry = { customerId: string | null; customerName: string | null; riskSeverity: string }

function buildOrderIndex(orders: SalesOrderListItemDto[]): Map<string, OrderIndexEntry> {
  const idx = new Map<string, OrderIndexEntry>()
  for (const o of orders) {
    idx.set(o.id, {
      customerId: o.customerId ?? null,
      customerName: o.customerDisplayName ?? null,
      riskSeverity: String(o.currentRiskSeverity ?? 'NONE'),
    })
  }
  return idx
}

/** Gruplanmış vaka çekirdeği — DTO'ya dönüştürülmeden önceki ham hal. */
export type CaseCore = {
  caseNumber: string
  kind: 'order' | 'supplier' | 'sales' | 'misc'
  priority: CasePriority
  riskLevel: string | null
  customerId: string | null
  customerName: string | null
  orderIds: string[]
  primaryOrderNumber: string | null
  actions: ActionDto[]
  title: string
  description: string
  createdAt: string
}

function caseGroupKey(a: ActionDto): { caseNumber: string; kind: CaseCore['kind'] } {
  const orderId = actionOrderId(a)
  if (orderId) return { caseNumber: `CASE-${orderId}`, kind: 'order' }
  if (a.category === 'SUPPLIER') {
    return { caseNumber: `CASE-supplier-${a.relatedEntityId ?? 'all'}`, kind: 'supplier' }
  }
  if (a.category === 'SALES') {
    return { caseNumber: 'CASE-sales-general', kind: 'sales' }
  }
  return { caseNumber: `CASE-misc-${a.id}`, kind: 'misc' }
}

function higherPriority(a: CasePriority, b: CasePriority): CasePriority {
  return PRIORITY_RANK[a] <= PRIORITY_RANK[b] ? a : b
}

function actionRiskLabel(a: ActionDto): string | null {
  if (a.riskLabel) return a.riskLabel
  const ev = a.evidence?.risk
  if (typeof ev === 'string' && RISK_LABEL_TR[ev]) return RISK_LABEL_TR[ev]
  return null
}

/**
 * Görevleri (ActionDto[]) deterministik vaka çekirdeklerine gruplar. Saf fonksiyon.
 */
export function buildCaseCores(
  actions: ActionDto[],
  orderIndex: Map<string, OrderIndexEntry> = new Map(),
): CaseCore[] {
  const groups = new Map<string, CaseCore>()

  for (const a of actions) {
    const { caseNumber, kind } = caseGroupKey(a)
    const orderId = actionOrderId(a)
    let core = groups.get(caseNumber)
    if (!core) {
      core = {
        caseNumber,
        kind,
        priority: a.priority,
        riskLevel: null,
        customerId: null,
        customerName: null,
        orderIds: [],
        primaryOrderNumber: null,
        actions: [],
        title: '',
        description: '',
        createdAt: a.createdAt,
      }
      groups.set(caseNumber, core)
    }
    core.actions.push(a)
    core.priority = higherPriority(core.priority, a.priority)
    if (a.createdAt < core.createdAt) core.createdAt = a.createdAt

    if (orderId && !core.orderIds.includes(orderId)) core.orderIds.push(orderId)
    if (orderId && !core.primaryOrderNumber && a.relatedOrder) core.primaryOrderNumber = a.relatedOrder

    // customer / risk türetimi
    const idxEntry = orderId ? orderIndex.get(orderId) : undefined
    if (!core.customerName) core.customerName = idxEntry?.customerName ?? a.relatedCustomer ?? null
    if (!core.customerId && idxEntry?.customerId) core.customerId = idxEntry.customerId

    const orderRiskLabel = idxEntry ? RISK_LABEL_TR[idxEntry.riskSeverity] ?? null : null
    const candidateRisk = orderRiskLabel ?? actionRiskLabel(a)
    if (candidateRisk) {
      const cur = core.riskLevel
      if (!cur || (RISK_RANK[candidateRisk] ?? 0) > (RISK_RANK[cur] ?? 0)) core.riskLevel = candidateRisk
    }
  }

  // Başlık / açıklama türetimi
  for (const core of groups.values()) {
    core.actions.sort((x, y) => {
      const r = PRIORITY_RANK[x.priority] - PRIORITY_RANK[y.priority]
      if (r !== 0) return r
      return x.id < y.id ? -1 : x.id > y.id ? 1 : 0
    })
    const count = core.actions.length
    if (core.kind === 'order') {
      const label = core.primaryOrderNumber ?? core.orderIds[0] ?? 'Sipariş'
      core.title = core.customerName ? `${core.customerName} · ${label}` : `Sipariş ${label}`
      core.description = `${count} açık görev: ${core.actions.map((x) => x.title).join(', ')}`
    } else if (core.kind === 'supplier') {
      const supplier = core.actions.find((x) => typeof x.evidence?.supplier === 'string')?.evidence?.supplier
      const name = typeof supplier === 'string' ? supplier : 'Tedarikçi'
      core.title = `Tedarikçi vakası · ${name}`
      core.description = `${count} tedarikçi görevi: ${core.actions.map((x) => x.title).join(', ')}`
      core.customerName = core.customerName ?? name
    } else if (core.kind === 'sales') {
      core.title = 'Satış performansı aksiyonları'
      core.description = `${count} satış görevi: ${core.actions.map((x) => x.title).join(', ')}`
    } else {
      core.title = core.actions[0]?.title ?? 'Operasyon vakası'
      core.description = core.actions.map((x) => x.title).join(', ')
    }
  }

  return [...groups.values()]
}

/** Vaka çekirdeğine override (durum/sahip) ve timeline uygular → DTO. */
export function applyCaseOverride(core: CaseCore, override: CaseOverride | undefined): OperationCaseDto {
  const status: CaseStatus = override?.status ?? 'OPEN'
  const updatedAt = override?.updatedAt ?? core.createdAt
  const closedAt = override?.closedAt ?? null
  return {
    id: core.caseNumber,
    caseNumber: core.caseNumber,
    priority: core.priority,
    status,
    title: core.title,
    description: core.description,
    customerId: core.customerId,
    customerName: core.customerName,
    orderIds: core.orderIds,
    actionIds: core.actions.map((a) => a.id),
    riskLevel: core.riskLevel,
    ownerUserId: override?.ownerUserId ?? null,
    ownerRole: override?.ownerRole ?? null,
    createdAt: core.createdAt,
    updatedAt,
    closedAt,
    actionCount: core.actions.length,
    orderCount: core.orderIds.length,
    primaryOrderNumber: core.primaryOrderNumber,
  }
}

/** Vaka için tam timeline (sentezlenen temel olaylar + store kullanıcı olayları). */
export function buildCaseTimeline(core: CaseCore, override: CaseOverride | undefined): CaseTimelineEventDto[] {
  const events: CaseTimelineEventDto[] = []
  events.push({ at: core.createdAt, type: 'CASE_CREATED', message: 'Vaka oluşturuldu', actor: 'sistem' })
  for (const a of core.actions) {
    events.push({
      at: a.createdAt,
      type: 'ACTION_ADDED',
      message: `Görev eklendi: ${a.title}`,
      actor: a.assignedRole ?? null,
    })
  }
  if (override) {
    for (const ev of override.events) events.push(ev)
  }
  return events.sort((x, y) => (x.at < y.at ? -1 : x.at > y.at ? 1 : 0))
}

export type BuildCasesArgs = {
  actionResult: ActionCenterResponseDto
  overrides: Map<string, CaseOverride>
  orders?: SalesOrderListItemDto[]
  query?: OperationCasesQuery
}

/**
 * Saf vaka motoru — `buildActions` çıktısını alır, vakalara gruplar, override'ları
 * uygular, özet hesaplar ve görünüm filtrelerini (priority/status/q) uygular.
 */
export function buildCases(args: BuildCasesArgs): OperationCasesResponseDto {
  const { actionResult, overrides, query = {} } = args
  const orderIndex = buildOrderIndex(args.orders ?? [])
  const cores = buildCaseCores(actionResult.actions, orderIndex)

  const allCases = cores.map((c) => applyCaseOverride(c, overrides.get(c.caseNumber)))

  // ── Özet (görünüm filtrelerinden bağımsız, tam set üzerinden) ──
  const openCases = allCases.filter((c) => ACTIVE_CASE_STATUSES.has(c.status)).length
  const p1Cases = allCases.filter((c) => c.priority === 'P1' && ACTIVE_CASE_STATUSES.has(c.status)).length
  const unassigned = allCases.filter((c) => ACTIVE_CASE_STATUSES.has(c.status) && !c.ownerUserId && !c.ownerRole).length
  const waiting = allCases.filter((c) => c.status === 'WAITING').length
  const resolved = allCases.filter((c) => c.status === 'RESOLVED' || c.status === 'CLOSED').length

  const closed = allCases.filter((c) => c.closedAt)
  let avgResolutionHours = 0
  if (closed.length > 0) {
    const totalHours = closed.reduce((s, c) => {
      const a = Date.parse(c.createdAt)
      const b = Date.parse(c.closedAt as string)
      if (!Number.isFinite(a) || !Number.isFinite(b)) return s
      return s + Math.max(0, (b - a) / 3_600_000)
    }, 0)
    avgResolutionHours = round1(totalHours / closed.length)
  }

  const summary: OperationCasesSummaryDto = {
    openCases,
    p1Cases,
    unassigned,
    waiting,
    resolved,
    avgResolutionHours,
  }

  // ── Görünüm filtreleri ──
  const fPriority = trimOrUndef(query.priority)?.toUpperCase()
  const fStatus = trimOrUndef(query.status)?.toUpperCase()
  const fq = trimOrUndef(query.q)?.toLocaleLowerCase('tr')

  let filtered = allCases
  if (fPriority) filtered = filtered.filter((c) => c.priority === fPriority)
  if (fStatus) filtered = filtered.filter((c) => c.status === fStatus)
  if (fq) {
    filtered = filtered.filter((c) =>
      `${c.caseNumber} ${c.title} ${c.description} ${c.customerName ?? ''} ${c.orderIds.join(' ')}`
        .toLocaleLowerCase('tr')
        .includes(fq),
    )
  }

  // Önceliğe göre (P1 üstte), eşitlikte stabil caseNumber.
  filtered = [...filtered].sort((a, b) => {
    const r = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
    if (r !== 0) return r
    return a.caseNumber < b.caseNumber ? -1 : a.caseNumber > b.caseNumber ? 1 : 0
  })

  return {
    summary,
    cases: filtered,
    filters: {
      priority: fPriority ?? null,
      status: fStatus ?? null,
      q: fq ?? null,
      salesPerson: actionResult.filters.salesPerson ?? null,
      limitedView: actionResult.filters.limitedView,
    },
    currency: actionResult.currency,
    today: actionResult.today,
    generatedAt: actionResult.generatedAt,
  }
}

function addDays(iso: string, delta: number): string {
  const t = Date.parse(`${iso}T00:00:00Z`)
  return new Date(t + delta * 86_400_000).toISOString().slice(0, 10)
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

/**
 * Faz 8 getActionCenter ile aynı veri toplama; buildActions'ı görünüm filtreleri
 * OLMADAN (yalnızca salesPerson/limitedView kapsamıyla) çağırır, sonra vakalara gruplar.
 * Bu sayede vakalar eksiksiz oluşur, filtreler vaka seviyesinde uygulanır.
 */
export async function gatherActionResult(
  prisma: PrismaClient,
  query: OperationCasesQuery,
): Promise<{ actionResult: ActionCenterResponseDto; orders: SalesOrderListItemDto[] }> {
  const today = process.env.DEMO_TODAY ?? '2026-05-14'
  const ym = today.slice(0, 7)
  const { from, to } = monthBounds(ym)
  const salesPerson = trimOrUndef(query.salesPerson)

  const [profitOrders, dqCurrent, dqPrevious, shipments, listItems] = await Promise.all([
    loadProfitabilityOrders(prisma),
    getDataQualityReport(prisma, { from, to, salesPerson }),
    getDataQualityReport(prisma, { from: addDays(from, -30), to: addDays(from, -1), salesPerson }),
    prisma.shipment.findMany({
      where: { plannedShipDate: { gte: new Date(`${addDays(today, -89)}T00:00:00.000Z`) } },
      select: { plannedShipDate: true },
    }),
    listSalesOrderListItems(prisma),
  ])

  const d30 = addDays(today, -29)
  const d60 = addDays(today, -59)
  const d90 = addDays(today, -89)
  let last30 = 0
  let last60 = 0
  let last90 = 0
  for (const s of shipments) {
    if (!s.plannedShipDate) continue
    const iso = s.plannedShipDate.toISOString().slice(0, 10)
    if (iso > today) continue
    if (iso >= d90) last90 += 1
    if (iso >= d60) last60 += 1
    if (iso >= d30) last30 += 1
  }

  const supplierRes = aggregateProfitability(profitOrders, { from, to, salesPerson, groupBy: 'supplier' })
  const forecast = buildForecast({
    today,
    profitOrders,
    shipmentWindows: { last30, last60, last90 },
    dataQuality: {
      currentScore: dqCurrent.totals.averageQualityScore,
      previousScore: dqPrevious.totals.averageQualityScore,
    },
    query: { salesPerson, limitedView: query.limitedView },
  })

  // Görünüm filtreleri (priority/status/q) buildActions'a verilmez — vaka seviyesinde uygulanır.
  const actionQuery: ActionCenterQuery = { salesPerson, limitedView: query.limitedView }
  const actionResult = buildActions({
    today,
    listItems,
    dq: dqCurrent,
    forecast,
    supplierRes,
    overrides: getActionStatusOverrides(),
    query: actionQuery,
  })

  return { actionResult, orders: listItems }
}

export async function getOperationCases(
  prisma: PrismaClient,
  query: OperationCasesQuery = {},
): Promise<OperationCasesResponseDto> {
  try {
    const { actionResult, orders } = await gatherActionResult(prisma, query)
    return buildCases({ actionResult, overrides: getCaseOverrides(), orders, query })
  } catch (err) {
    assertServiceErrorMapped(err)
    throw err
  }
}
