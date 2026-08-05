/**
 * FAZ 42 — Client-side AI Tool Engine (mock persistence + safe mode).
 */

import { recordAuditEvent } from '../../lib/audit/recordAuditEvent.js'
import { AUDIT_MODULE } from '../../contracts/v1/auditModule.js'
import {
  AI_TOOL_DOMAIN_EVENT,
  TOOL_EXECUTION_STATUS,
  WORKER_TOOL_PERMISSIONS,
  isAiToolExecutionLiveEnabled,
} from '../../contracts/v1/aiTool.js'
import { getToolMeta, listToolsForWorker, AI_TOOL_CATALOG } from '../../contracts/v1/aiTool.js'
import { WORKER_ID_TO_CODE } from '../../contracts/v1/aiWorkerMemory.js'
import { initialOrders } from '../../data/seedOrders.js'
import { DEMO_TODAY } from '../../data/constants.js'

/** @typedef {import('../../contracts/v1/aiTool.js').AiToolExecutionDto} AiToolExecutionDto */
/** @typedef {import('../../contracts/v1/aiTool.js').AiExecutionSummaryDto} AiExecutionSummaryDto */

/** @type {AiToolExecutionDto[]} */
let executions = []
let seq = 0

function nowIso(offsetMs = 0) {
  const base = new Date(`${DEMO_TODAY}T09:00:00.000Z`).getTime()
  return new Date(base + offsetMs).toISOString()
}

function str(v) {
  return typeof v === 'string' ? v.trim() : ''
}

function findOrder(orderId) {
  return initialOrders.find((o) => o.id === orderId) ?? null
}

function checkPermission(workerId, permission) {
  const allowed = WORKER_TOOL_PERMISSIONS[workerId] ?? []
  return allowed.includes(permission)
}

function cloneExecution(row) {
  return {
    ...row,
    parameters: { ...row.parameters },
    result: row.result ? { ...row.result } : null,
  }
}

function writeAudit(execution, eventType) {
  const orderId = execution.orderId ?? execution.id
  recordAuditEvent({
    id: `audit-tool-${execution.id}-${eventType}`,
    type: eventType,
    aggregateId: orderId,
    correlationId: `ai-tool-${execution.id}-${eventType}`,
    module: AUDIT_MODULE.SYSTEM,
    recordId: execution.id,
    description: `${execution.toolName} · ${execution.status}`,
    extraPayload: {
      source: 'ai_tool_engine',
      executionId: execution.id,
      workerId: execution.workerId,
      toolName: execution.toolName,
      status: execution.status,
      safeMode: execution.safeMode,
    },
  })
}

/** @param {string} toolName @param {Record<string, unknown>} args @param {boolean} liveMode */
function runToolHandler(toolName, args, liveMode) {
  const orderId = str(args.orderId)
  const order = orderId ? findOrder(orderId) : null

  const wrap = (preview) => ({
    tool: toolName,
    safeMode: !liveMode,
    simulated: !liveMode,
    ...preview,
  })

  switch (toolName) {
    case 'getOrder':
      if (!order) throw new Error(`Order not found: ${orderId}`)
      return wrap({
        order: {
          id: order.id,
          customer: order.customer,
          status: order.status,
          amount: order.amount,
          paidAmount: order.paidAmount ?? 0,
        },
      })
    case 'getCustomerBalance':
      if (!order) throw new Error(`Order not found: ${orderId}`)
      return wrap({
        orderId: order.id,
        customer: order.customer,
        remaining: (order.amount - (order.paidAmount ?? 0)),
      })
    case 'getSupplier':
      return wrap({ supplierId: args.supplierId ?? 'Vega Mobilya', status: 'lookup_ok' })
    default:
      if (orderId && !order && toolName !== 'createExecutiveNote' && toolName !== 'markRiskReviewed') {
        throw new Error(`Order not found: ${orderId}`)
      }
      return wrap({ recorded: true, ...args, applied: liveMode })
  }
}

/**
 * @param {{
 *   workerId: string
 *   toolName: string
 *   parameters?: Record<string, unknown>
 *   orderId?: string
 *   runId?: string
 *   taskId?: string
 *   skipApproval?: boolean
 * }} req
 */
export function executeToolLocal(req) {
  const started = Date.now()
  const liveMode = isAiToolExecutionLiveEnabled()
  const meta = getToolMeta(req.toolName)
  const parameters = { ...(req.parameters ?? {}) }
  const orderId = str(req.orderId) || str(parameters.orderId) || null
  if (orderId) parameters.orderId = orderId

  const base = {
    workerId: req.workerId,
    workerCode: WORKER_ID_TO_CODE[req.workerId] ?? null,
    toolName: req.toolName,
    orderId,
    runId: req.runId ?? null,
    taskId: req.taskId ?? null,
    parameters,
    safeMode: !liveMode,
    managerName: null,
    managerNote: null,
    approvedAt: null,
    rejectedAt: null,
  }

  if (!meta) {
    seq += 1
    const row = cloneExecution({
      id: `aite-${seq}`,
      ...base,
      category: 'ORDER',
      permission: 'ORDER_READ',
      approvalRequired: false,
      status: TOOL_EXECUTION_STATUS.NOT_FOUND,
      result: { error: `Tool not found: ${req.toolName}` },
      durationMs: Date.now() - started,
      createdAt: nowIso(seq * 1000),
      updatedAt: nowIso(seq * 1000),
    })
    executions = [row, ...executions]
    return row
  }

  if (!meta.workerIds.includes(req.workerId) || !checkPermission(req.workerId, meta.permission)) {
    seq += 1
    const row = cloneExecution({
      id: `aite-${seq}`,
      ...base,
      category: meta.category,
      permission: meta.permission,
      approvalRequired: meta.approvalRequired,
      status: TOOL_EXECUTION_STATUS.DENIED,
      result: { error: 'Permission denied' },
      durationMs: Date.now() - started,
      createdAt: nowIso(seq * 1000),
      updatedAt: nowIso(seq * 1000),
    })
    executions = [row, ...executions]
    writeAudit(row, AI_TOOL_DOMAIN_EVENT.DENIED)
    return row
  }

  if (meta.approvalRequired && !req.skipApproval) {
    seq += 1
    const row = cloneExecution({
      id: `aite-${seq}`,
      ...base,
      category: meta.category,
      permission: meta.permission,
      approvalRequired: true,
      status: TOOL_EXECUTION_STATUS.WAITING_APPROVAL,
      result: { message: 'Manager approval required' },
      durationMs: Date.now() - started,
      createdAt: nowIso(seq * 1000),
      updatedAt: nowIso(seq * 1000),
    })
    executions = [row, ...executions]
    writeAudit(row, AI_TOOL_DOMAIN_EVENT.WAITING_APPROVAL)
    return row
  }

  try {
    const output = runToolHandler(req.toolName, parameters, liveMode)
    seq += 1
    const row = cloneExecution({
      id: `aite-${seq}`,
      ...base,
      category: meta.category,
      permission: meta.permission,
      approvalRequired: meta.approvalRequired,
      status: TOOL_EXECUTION_STATUS.SUCCESS,
      result: output,
      durationMs: Date.now() - started,
      createdAt: nowIso(seq * 1000),
      updatedAt: nowIso(seq * 1000),
    })
    executions = [row, ...executions]
    writeAudit(row, AI_TOOL_DOMAIN_EVENT.EXECUTED)
    return row
  } catch (err) {
    seq += 1
    const row = cloneExecution({
      id: `aite-${seq}`,
      ...base,
      category: meta.category,
      permission: meta.permission,
      approvalRequired: meta.approvalRequired,
      status: TOOL_EXECUTION_STATUS.FAILED,
      result: { error: err instanceof Error ? err.message : String(err) },
      durationMs: Date.now() - started,
      createdAt: nowIso(seq * 1000),
      updatedAt: nowIso(seq * 1000),
    })
    executions = [row, ...executions]
    writeAudit(row, AI_TOOL_DOMAIN_EVENT.FAILED)
    return row
  }
}

/** @param {string} id @param {string} managerName @param {string} [managerNote] */
export function approveExecutionLocal(id, managerName, managerNote) {
  const idx = executions.findIndex((e) => e.id === id)
  if (idx < 0) return null
  const existing = executions[idx]
  if (existing.status !== TOOL_EXECUTION_STATUS.WAITING_APPROVAL) return null

  const liveMode = isAiToolExecutionLiveEnabled()
  const started = Date.now()
  try {
    const output = runToolHandler(existing.toolName, existing.parameters, liveMode)
    const updated = {
      ...existing,
      status: TOOL_EXECUTION_STATUS.SUCCESS,
      result: output,
      managerName,
      managerNote: managerNote ?? null,
      approvedAt: nowIso(Date.now() % 100000),
      updatedAt: nowIso(Date.now() % 100000),
      durationMs: (existing.durationMs ?? 0) + (Date.now() - started),
    }
    executions[idx] = updated
    writeAudit(updated, AI_TOOL_DOMAIN_EVENT.APPROVED)
    return cloneExecution(updated)
  } catch (err) {
    const updated = {
      ...existing,
      status: TOOL_EXECUTION_STATUS.FAILED,
      result: { error: err instanceof Error ? err.message : String(err) },
      managerName,
      managerNote: managerNote ?? null,
      approvedAt: nowIso(Date.now() % 100000),
      updatedAt: nowIso(Date.now() % 100000),
    }
    executions[idx] = updated
    return cloneExecution(updated)
  }
}

/** @param {string} id @param {string} managerName @param {string} [managerNote] */
export function rejectExecutionLocal(id, managerName, managerNote) {
  const idx = executions.findIndex((e) => e.id === id)
  if (idx < 0) return null
  const existing = executions[idx]
  if (existing.status !== TOOL_EXECUTION_STATUS.WAITING_APPROVAL) return null

  const updated = {
    ...existing,
    status: TOOL_EXECUTION_STATUS.FAILED,
    managerName,
    managerNote: managerNote ?? null,
    rejectedAt: nowIso(seq * 1000 + 500),
    updatedAt: nowIso(seq * 1000 + 500),
    result: { rejected: true, managerNote: managerNote ?? null },
  }
  executions[idx] = updated
  writeAudit(updated, AI_TOOL_DOMAIN_EVENT.REJECTED)
  return cloneExecution(updated)
}

/** @param {{ workerId?: string, status?: string, limit?: number }} [filters] */
export function listExecutionsLocal(filters = {}) {
  let rows = executions.map(cloneExecution)
  if (filters.workerId) rows = rows.filter((r) => r.workerId === filters.workerId)
  if (filters.status) rows = rows.filter((r) => r.status === filters.status)
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  if (filters.limit) rows = rows.slice(0, filters.limit)
  return rows
}

/** @param {string} todayIso */
export function buildExecutionSummaryLocal(todayIso) {
  const rows = executions.filter((e) => e.createdAt.slice(0, 10) === todayIso)
  return /** @type {AiExecutionSummaryDto} */ ({
    today: rows.length,
    success: rows.filter((r) => r.status === TOOL_EXECUTION_STATUS.SUCCESS).length,
    waiting: rows.filter((r) => r.status === TOOL_EXECUTION_STATUS.WAITING_APPROVAL).length,
    rejected: rows.filter((r) => r.rejectedAt != null).length,
    failed: rows.filter((r) => r.status === TOOL_EXECUTION_STATUS.FAILED && !r.rejectedAt).length,
  })
}

export function listRegisteredToolsLocal(workerId) {
  return workerId ? listToolsForWorker(workerId) : AI_TOOL_CATALOG
}

/** @param {AiToolExecutionDto} execution */
export function buildToolExecutionRowVm(execution) {
  const time = execution.createdAt.slice(11, 16)
  const date = execution.createdAt.slice(0, 10)
  return {
    id: execution.id,
    toolName: execution.toolName,
    timeLabel: `${date} ${time}`,
    status: execution.status,
    statusLabel:
      execution.status === 'SUCCESS'
        ? 'Başarılı'
        : execution.status === 'FAILED'
          ? execution.rejectedAt
            ? 'Reddedildi'
            : 'Başarısız'
          : execution.status === 'WAITING_APPROVAL'
            ? 'Onay Bekliyor'
            : execution.status === 'DENIED'
              ? 'İzin Yok'
              : 'Bulunamadı',
    statusTone:
      execution.status === 'SUCCESS'
        ? 'success'
        : execution.status === 'WAITING_APPROVAL'
          ? 'warning'
          : execution.status === 'DENIED' || execution.status === 'FAILED'
            ? 'critical'
            : 'muted',
    managerLabel: execution.managerName ?? '—',
    approvalLabel: execution.approvalRequired
      ? execution.approvedAt
        ? 'Onaylandı'
        : execution.rejectedAt
          ? 'Reddedildi'
          : 'Bekliyor'
      : 'Gerekmez',
    durationLabel: execution.durationMs != null ? `${execution.durationMs} ms` : '—',
    orderId: execution.orderId,
    safeMode: execution.safeMode,
  }
}

export function resetMockAiToolExecutionStore() {
  executions = []
  seq = 0
}

export function seedDemoToolExecutions() {
  executeToolLocal({
    workerId: 'dw-sales-follow-up',
    toolName: 'getOrder',
    parameters: { orderId: 'S-24089' },
    orderId: 'S-24089',
  })
  executeToolLocal({
    workerId: 'dw-collection',
    toolName: 'createReminder',
    parameters: { orderId: 'S-24089', amount: '50000', dueNote: 'Kapora takibi' },
    orderId: 'S-24089',
  })
  executeToolLocal({
    workerId: 'dw-sales-follow-up',
    toolName: 'changeDeliveryDate',
    parameters: { orderId: 'S-24089', newDate: '2026-05-20', reason: 'Müşteri talebi' },
    orderId: 'S-24089',
  })
}

seedDemoToolExecutions()

export {}
