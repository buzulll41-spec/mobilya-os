import { getOrders } from './mockApi.js'
import { mockGetActionCenter } from './mockActionCenterApi.js'

/**
 * Mock Operasyon Orkestrasyon Merkezi — backend `buildCases` mantığının aynası.
 * Faz 8 mockActionCenterApi'nin ürettiği görevleri (görünüm filtreleri OLMADAN,
 * yalnızca salesPerson/limitedView kapsamıyla) yeniden kullanır ve operasyon
 * vakalarına gruplar. Durum/sahip/timeline in-memory store ile yönetilir (PATCH mock).
 * Depo Katı görev üretmediği için vaka da üretmez.
 */

const PRIORITY_RANK = { P1: 1, P2: 2, P3: 3, P4: 4, P5: 5 }
const RISK_RANK = { Kritik: 5, Yüksek: 4, Orta: 3, Düşük: 2, Yok: 1 }
const RISK_LABEL_TR = { CRITICAL: 'Kritik', HIGH: 'Yüksek', MEDIUM: 'Orta', LOW: 'Düşük', NONE: 'Yok' }
const ACTIVE = new Set(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING'])
const STATUSES = new Set(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'])
const FORWARD = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']

const round1 = (n) => Math.round(n * 10) / 10

/** Modül seviyesinde in-memory durum/sahip store'u. */
const caseStore = new Map()

export function resetMockCaseStore() {
  caseStore.clear()
}

function canTransition(from, to) {
  if (to === 'CLOSED') return true
  if (to === 'WAITING') return from === 'IN_PROGRESS' || from === 'WAITING'
  if (from === 'WAITING') return to === 'IN_PROGRESS'
  const f = FORWARD.indexOf(from)
  const t = FORWARD.indexOf(to)
  if (f < 0 || t < 0) return false
  return t >= f
}

function actionOrderId(a) {
  if (a.relatedEntityType === 'order') return a.relatedEntityId
  if (a.relatedEntityType === 'orderLine') {
    const oid = a.evidence?.orderId
    return typeof oid === 'string' && oid ? oid : null
  }
  return null
}

function caseGroupKey(a) {
  const orderId = actionOrderId(a)
  if (orderId) return { caseNumber: `CASE-${orderId}`, kind: 'order' }
  if (a.category === 'SUPPLIER') return { caseNumber: `CASE-supplier-${a.relatedEntityId ?? 'all'}`, kind: 'supplier' }
  if (a.category === 'SALES') return { caseNumber: 'CASE-sales-general', kind: 'sales' }
  return { caseNumber: `CASE-misc-${a.id}`, kind: 'misc' }
}

function actionRiskLabel(a) {
  if (a.riskLabel) return a.riskLabel
  const ev = a.evidence?.risk
  if (typeof ev === 'string' && RISK_LABEL_TR[ev]) return RISK_LABEL_TR[ev]
  return null
}

function higherPriority(a, b) {
  return PRIORITY_RANK[a] <= PRIORITY_RANK[b] ? a : b
}

async function buildOrderIndex() {
  const orders = await getOrders()
  const idx = new Map()
  for (const o of orders) {
    idx.set(o.id, {
      customerId: o.customerId ?? null,
      customerName: o.customerDisplayName ?? null,
      riskSeverity: String(o.currentRiskSeverity ?? 'NONE'),
    })
  }
  return idx
}

/** Görevleri vaka çekirdeklerine gruplar (backend buildCaseCores aynası). */
function buildCaseCores(actions, orderIndex) {
  const groups = new Map()
  for (const a of actions) {
    const { caseNumber, kind } = caseGroupKey(a)
    const orderId = actionOrderId(a)
    let core = groups.get(caseNumber)
    if (!core) {
      core = {
        caseNumber, kind, priority: a.priority, riskLevel: null,
        customerId: null, customerName: null, orderIds: [], primaryOrderNumber: null,
        actions: [], title: '', description: '', createdAt: a.createdAt,
      }
      groups.set(caseNumber, core)
    }
    core.actions.push(a)
    core.priority = higherPriority(core.priority, a.priority)
    if (a.createdAt < core.createdAt) core.createdAt = a.createdAt
    if (orderId && !core.orderIds.includes(orderId)) core.orderIds.push(orderId)
    if (orderId && !core.primaryOrderNumber && a.relatedOrder) core.primaryOrderNumber = a.relatedOrder

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

function applyOverride(core) {
  const ov = caseStore.get(core.caseNumber)
  return {
    id: core.caseNumber,
    caseNumber: core.caseNumber,
    priority: core.priority,
    status: ov?.status ?? 'OPEN',
    title: core.title,
    description: core.description,
    customerId: core.customerId,
    customerName: core.customerName,
    orderIds: core.orderIds,
    actionIds: core.actions.map((a) => a.id),
    riskLevel: core.riskLevel,
    ownerUserId: ov?.ownerUserId ?? null,
    ownerRole: ov?.ownerRole ?? null,
    createdAt: core.createdAt,
    updatedAt: ov?.updatedAt ?? core.createdAt,
    closedAt: ov?.closedAt ?? null,
    actionCount: core.actions.length,
    orderCount: core.orderIds.length,
    primaryOrderNumber: core.primaryOrderNumber,
  }
}

function buildTimeline(core) {
  const events = []
  events.push({ at: core.createdAt, type: 'CASE_CREATED', message: 'Vaka oluşturuldu', actor: 'sistem' })
  for (const a of core.actions) {
    events.push({ at: a.createdAt, type: 'ACTION_ADDED', message: `Görev eklendi: ${a.title}`, actor: a.assignedRole ?? null })
  }
  const ov = caseStore.get(core.caseNumber)
  if (ov) for (const ev of ov.events) events.push(ev)
  return events.sort((x, y) => (x.at < y.at ? -1 : x.at > y.at ? 1 : 0))
}

async function buildAll(query = {}) {
  const salesPerson = (query.salesPerson || '').trim() || undefined
  const limited = query.limitedView === 'true' || query.limitedView === true || query.limitedView === '1'
  const actionResult = await mockGetActionCenter({ salesPerson, limitedView: limited ? 'true' : undefined })
  const orderIndex = await buildOrderIndex()
  const cores = buildCaseCores(actionResult.actions, orderIndex)
  return { actionResult, cores }
}

/**
 * @param {Record<string, string>} [query]
 * @returns {Promise<import('../contracts/v1/operationCase.js').OperationCasesResponseDto>}
 */
export async function mockGetOperationCases(query = {}) {
  const { actionResult, cores } = await buildAll(query)
  const allCases = cores.map(applyOverride)

  const openCases = allCases.filter((c) => ACTIVE.has(c.status)).length
  const p1Cases = allCases.filter((c) => c.priority === 'P1' && ACTIVE.has(c.status)).length
  const unassigned = allCases.filter((c) => ACTIVE.has(c.status) && !c.ownerUserId && !c.ownerRole).length
  const waiting = allCases.filter((c) => c.status === 'WAITING').length
  const resolved = allCases.filter((c) => c.status === 'RESOLVED' || c.status === 'CLOSED').length
  const closed = allCases.filter((c) => c.closedAt)
  let avgResolutionHours = 0
  if (closed.length > 0) {
    const total = closed.reduce((s, c) => {
      const a = Date.parse(c.createdAt)
      const b = Date.parse(c.closedAt)
      if (!Number.isFinite(a) || !Number.isFinite(b)) return s
      return s + Math.max(0, (b - a) / 3_600_000)
    }, 0)
    avgResolutionHours = round1(total / closed.length)
  }

  const fPriority = (query.priority || '').trim().toUpperCase() || undefined
  const fStatus = (query.status || '').trim().toUpperCase() || undefined
  const fq = (query.q || '').trim().toLocaleLowerCase('tr') || undefined

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
  filtered = [...filtered].sort((a, b) => {
    const r = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
    if (r !== 0) return r
    return a.caseNumber < b.caseNumber ? -1 : a.caseNumber > b.caseNumber ? 1 : 0
  })

  return {
    summary: { openCases, p1Cases, unassigned, waiting, resolved, avgResolutionHours },
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

/**
 * @param {string} id
 * @param {Record<string, string>} [query]
 * @returns {Promise<import('../contracts/v1/operationCase.js').OperationCaseDetailDto>}
 */
export async function mockGetOperationCaseDetail(id, query = {}) {
  const { cores } = await buildAll(query)
  const core = cores.find((c) => c.caseNumber === id)
  if (!core) {
    const err = new Error('Vaka bulunamadı')
    err.status = 404
    throw err
  }
  const relatedOrders = []
  const seen = new Set()
  for (const a of core.actions) {
    const oid = actionOrderId(a)
    if (!oid || seen.has(oid)) continue
    seen.add(oid)
    relatedOrders.push({ orderId: oid, orderNumber: a.relatedOrder ?? null, customerName: a.relatedCustomer ?? core.customerName })
  }
  return {
    case: applyOverride(core),
    relatedActions: core.actions,
    timeline: buildTimeline(core),
    relatedOrders,
    notes: [],
  }
}

/**
 * @param {string} id
 * @param {{ status?: string, ownerUserId?: string|null, ownerRole?: string|null }} patch
 */
export async function mockUpdateOperationCase(id, patch) {
  const existing = caseStore.get(id)
  const now = new Date().toISOString()
  const events = existing ? [...existing.events] : []
  const actor = patch.ownerRole ?? patch.ownerUserId ?? existing?.ownerRole ?? null
  const next = {
    status: existing?.status,
    ownerUserId: existing?.ownerUserId ?? null,
    ownerRole: existing?.ownerRole ?? null,
    events,
    updatedAt: now,
    closedAt: existing?.closedAt ?? null,
  }

  const ownerChanged =
    (patch.ownerUserId !== undefined && patch.ownerUserId !== (existing?.ownerUserId ?? null)) ||
    (patch.ownerRole !== undefined && patch.ownerRole !== (existing?.ownerRole ?? null))
  if (patch.ownerUserId !== undefined) next.ownerUserId = patch.ownerUserId
  if (patch.ownerRole !== undefined) next.ownerRole = patch.ownerRole
  if (ownerChanged) {
    const who = next.ownerRole ?? next.ownerUserId ?? 'bilinmeyen'
    events.push({ at: now, type: 'ASSIGNED', message: `Vaka devralındı/atandı: ${who}`, actor })
  }

  if (patch.status !== undefined && patch.status !== null && patch.status !== '') {
    const to = String(patch.status).trim().toUpperCase()
    if (!STATUSES.has(to)) {
      const err = new Error('Geçersiz vaka durumu')
      err.status = 400
      throw err
    }
    const from = existing?.status ?? 'OPEN'
    if (!canTransition(from, to)) {
      const err = new Error(`Geçersiz durum geçişi: ${from} → ${to}`)
      err.status = 400
      throw err
    }
    next.status = to
    events.push({ at: now, type: 'STATUS_CHANGED', message: `Durum güncellendi: ${from} → ${to}`, actor })
    if (to === 'RESOLVED' || to === 'CLOSED') next.closedAt = now
  }

  caseStore.set(id, next)
  return next
}
