import type { Prisma, PrismaClient } from '@prisma/client'
import type {
  AiToolExecutionDto,
  AiExecutionSummaryDto,
  ExecuteToolRequest,
  ToolExecutionStatus,
} from '../../../contracts/aiToolDto.js'
import {
  TOOL_EXECUTION_STATUS,
  WORKER_TOOL_PERMISSIONS,
  isAiToolExecutionLiveEnabled,
} from '../../../contracts/aiToolDto.js'
import { resolveWorkerCode } from '../../memory/memoryFromDomainEvent.js'
import { AI_TOOL_CATALOG, getToolMeta } from './aiToolCatalog.js'
import { writeToolApprovalEvent, writeToolAuditEvents } from './ToolAuditService.js'

export type ToolHandlerContext = {
  prisma: PrismaClient
  workerId: string
  orderId?: string
  runId?: string
  taskId?: string
  liveMode: boolean
}

export type RegisteredTool = {
  meta: (typeof AI_TOOL_CATALOG)[number]
  execute: (ctx: ToolHandlerContext, args: Record<string, unknown>) => Promise<Record<string, unknown>>
}

const registry = new Map<string, RegisteredTool>()

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

async function loadOrder(prisma: PrismaClient, orderId: string) {
  return prisma.salesOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      customerName: true,
      displayStatus: true,
      totalAmount: true,
      paidAmount: true,
      remainingAmount: true,
      dueDate: true,
    },
  })
}

function safeResult(
  toolName: string,
  preview: Record<string, unknown>,
  liveMode: boolean,
): Record<string, unknown> {
  return {
    tool: toolName,
    safeMode: !liveMode,
    simulated: !liveMode,
    ...preview,
  }
}

function registerBuiltInTools(): void {
  for (const meta of AI_TOOL_CATALOG) {
    registerTool(meta.name, meta, async (ctx, args) => {
      const orderId = str(args.orderId) || ctx.orderId || ''
      const order = orderId ? await loadOrder(ctx.prisma, orderId) : null

      switch (meta.name) {
        case 'getOrder':
          if (!order) throw new Error(`Order not found: ${orderId}`)
          return safeResult(meta.name, {
            order: {
              id: order.id,
              customer: order.customerName,
              status: order.displayStatus,
              total: order.totalAmount.toString(),
              paid: order.paidAmount.toString(),
              remaining: order.remainingAmount.toString(),
              dueDate: order.dueDate?.toISOString?.()?.slice(0, 10) ?? null,
            },
          }, ctx.liveMode)

        case 'updateOrder':
          if (!order) throw new Error(`Order not found: ${orderId}`)
          if (!ctx.liveMode) {
            return safeResult(meta.name, {
              validated: true,
              wouldUpdate: { notes: args.notes, statusHint: args.statusHint },
            }, false)
          }
          return safeResult(meta.name, { updated: true }, true)

        case 'changeDeliveryDate':
          if (!order) throw new Error(`Order not found: ${orderId}`)
          return safeResult(meta.name, {
            validated: true,
            orderId,
            newDate: args.newDate,
            reason: args.reason,
            applied: ctx.liveMode,
          }, ctx.liveMode)

        case 'changeShipmentPlan':
          if (!order) throw new Error(`Order not found: ${orderId}`)
          return safeResult(meta.name, {
            validated: true,
            planNote: args.planNote,
            applied: ctx.liveMode,
          }, ctx.liveMode)

        case 'changePriority':
          if (!order) throw new Error(`Order not found: ${orderId}`)
          return safeResult(meta.name, {
            validated: true,
            priority: args.priority,
            applied: ctx.liveMode,
          }, ctx.liveMode)

        case 'getCustomerBalance':
          if (!order) throw new Error(`Order not found: ${orderId}`)
          return safeResult(meta.name, {
            orderId: order.id,
            customer: order.customerName,
            remaining: order.remainingAmount.toString(),
            paid: order.paidAmount.toString(),
          }, ctx.liveMode)

        case 'recordCollectionNote':
        case 'createReminder':
        case 'closeCollectionTask':
          if (!order) throw new Error(`Order not found: ${orderId}`)
          return safeResult(meta.name, { recorded: true, ...args, applied: ctx.liveMode }, ctx.liveMode)

        case 'planShipment':
        case 'changeShipmentDate':
        case 'markWarehouseReady':
        case 'createShipmentNote':
          if (!order) throw new Error(`Order not found: ${orderId}`)
          return safeResult(meta.name, { recorded: true, ...args, applied: ctx.liveMode }, ctx.liveMode)

        case 'getSupplier':
          return safeResult(meta.name, {
            orderId: orderId || null,
            supplierId: args.supplierId ?? 'unknown',
            status: 'lookup_ok',
          }, ctx.liveMode)

        case 'changeSupplierETA':
        case 'createPurchaseReminder':
        case 'recordSupplierNote':
          return safeResult(meta.name, { recorded: true, ...args, applied: ctx.liveMode }, ctx.liveMode)

        case 'createExecutiveNote':
          return safeResult(meta.name, {
            subject: args.subject,
            note: args.note,
            relatedOrderId: args.relatedOrderId ?? null,
            applied: ctx.liveMode,
          }, ctx.liveMode)

        case 'markRiskReviewed':
          return safeResult(meta.name, {
            riskId: args.riskId,
            reviewNote: args.reviewNote,
            applied: ctx.liveMode,
          }, ctx.liveMode)

        default:
          throw new Error(`Handler not implemented: ${meta.name}`)
      }
    })
  }
}

let initialized = false

function ensureInit(): void {
  if (!initialized) {
    registerBuiltInTools()
    initialized = true
  }
}

export function registerTool(
  name: string,
  meta: RegisteredTool['meta'],
  execute: RegisteredTool['execute'],
): void {
  registry.set(name, { meta, execute })
}

export function getTool(name: string): RegisteredTool | null {
  ensureInit()
  return registry.get(name) ?? null
}

export function listRegisteredTools(workerId?: string) {
  ensureInit()
  const tools = [...registry.values()].map((t) => t.meta)
  return workerId ? tools.filter((t) => t.workerIds.includes(workerId)) : tools
}

function mapRow(row: {
  id: string
  workerId: string
  workerCode: string | null
  toolName: string
  category: string
  permission: string
  approvalRequired: boolean
  parameters: unknown
  status: string
  result: unknown
  orderId: string | null
  runId: string | null
  taskId: string | null
  managerName: string | null
  managerNote: string | null
  approvedAt: Date | null
  rejectedAt: Date | null
  durationMs: number | null
  safeMode: boolean
  createdAt: Date
  updatedAt: Date
}): AiToolExecutionDto {
  return {
    id: row.id,
    workerId: row.workerId,
    workerCode: row.workerCode,
    toolName: row.toolName,
    category: row.category as AiToolExecutionDto['category'],
    permission: row.permission as AiToolExecutionDto['permission'],
    approvalRequired: row.approvalRequired,
    parameters: (row.parameters ?? {}) as Record<string, unknown>,
    status: row.status as ToolExecutionStatus,
    result: (row.result ?? null) as Record<string, unknown> | null,
    orderId: row.orderId,
    runId: row.runId,
    taskId: row.taskId,
    managerName: row.managerName,
    managerNote: row.managerNote,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    rejectedAt: row.rejectedAt?.toISOString() ?? null,
    durationMs: row.durationMs,
    safeMode: row.safeMode,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function checkPermission(workerId: string, permission: string): boolean {
  const allowed = WORKER_TOOL_PERMISSIONS[workerId] ?? []
  return allowed.includes(permission as (typeof allowed)[number])
}

export async function executeTool(
  prisma: PrismaClient,
  req: ExecuteToolRequest,
): Promise<AiToolExecutionDto> {
  ensureInit()
  const started = Date.now()
  const liveMode = isAiToolExecutionLiveEnabled()
  const meta = getToolMeta(req.toolName)
  const orderId = str(req.orderId) || str(req.parameters.orderId) || null

  if (!meta) {
    const row = await prisma.aIToolExecution.create({
      data: {
        workerId: req.workerId,
        workerCode: resolveWorkerCode(req.workerId),
        toolName: req.toolName,
        category: 'ORDER',
        permission: 'ORDER_READ',
        approvalRequired: false,
        parameters: req.parameters as Prisma.InputJsonValue,
        status: TOOL_EXECUTION_STATUS.NOT_FOUND,
        result: { error: `Tool not found: ${req.toolName}` } as Prisma.InputJsonValue,
        orderId,
        runId: req.runId ?? null,
        taskId: req.taskId ?? null,
        durationMs: Date.now() - started,
        safeMode: !liveMode,
      },
    })
    return mapRow(row)
  }

  if (!meta.workerIds.includes(req.workerId)) {
    const row = await prisma.aIToolExecution.create({
      data: {
        workerId: req.workerId,
        workerCode: resolveWorkerCode(req.workerId),
        toolName: req.toolName,
        category: meta.category,
        permission: meta.permission,
        approvalRequired: meta.approvalRequired,
        parameters: req.parameters as Prisma.InputJsonValue,
        status: TOOL_EXECUTION_STATUS.DENIED,
        result: { error: 'Worker not allowed for this tool' } as Prisma.InputJsonValue,
        orderId,
        runId: req.runId ?? null,
        taskId: req.taskId ?? null,
        durationMs: Date.now() - started,
        safeMode: !liveMode,
      },
    })
    await writeToolAuditEvents(prisma, {
      executionId: row.id,
      workerId: req.workerId,
      toolName: req.toolName,
      orderId,
      runId: req.runId,
      taskId: req.taskId,
      parameters: req.parameters,
      status: TOOL_EXECUTION_STATUS.DENIED,
      result: { error: 'Worker not allowed' },
      safeMode: !liveMode,
    })
    return mapRow(row)
  }

  if (!checkPermission(req.workerId, meta.permission)) {
    const row = await prisma.aIToolExecution.create({
      data: {
        workerId: req.workerId,
        workerCode: resolveWorkerCode(req.workerId),
        toolName: req.toolName,
        category: meta.category,
        permission: meta.permission,
        approvalRequired: meta.approvalRequired,
        parameters: req.parameters as Prisma.InputJsonValue,
        status: TOOL_EXECUTION_STATUS.DENIED,
        result: { error: 'Permission denied' } as Prisma.InputJsonValue,
        orderId,
        runId: req.runId ?? null,
        taskId: req.taskId ?? null,
        durationMs: Date.now() - started,
        safeMode: !liveMode,
      },
    })
    await writeToolAuditEvents(prisma, {
      executionId: row.id,
      workerId: req.workerId,
      toolName: req.toolName,
      orderId,
      parameters: req.parameters,
      status: TOOL_EXECUTION_STATUS.DENIED,
      safeMode: !liveMode,
    })
    return mapRow(row)
  }

  if (meta.approvalRequired && !req.skipApproval) {
    const row = await prisma.aIToolExecution.create({
      data: {
        workerId: req.workerId,
        workerCode: resolveWorkerCode(req.workerId),
        toolName: req.toolName,
        category: meta.category,
        permission: meta.permission,
        approvalRequired: true,
        parameters: req.parameters as Prisma.InputJsonValue,
        status: TOOL_EXECUTION_STATUS.WAITING_APPROVAL,
        result: { message: 'Manager approval required' } as Prisma.InputJsonValue,
        orderId,
        runId: req.runId ?? null,
        taskId: req.taskId ?? null,
        durationMs: Date.now() - started,
        safeMode: !liveMode,
      },
    })
    await writeToolAuditEvents(prisma, {
      executionId: row.id,
      workerId: req.workerId,
      toolName: req.toolName,
      orderId,
      parameters: req.parameters,
      status: TOOL_EXECUTION_STATUS.WAITING_APPROVAL,
      safeMode: !liveMode,
    })
    return mapRow(row)
  }

  const tool = registry.get(req.toolName)
  if (!tool) {
    const row = await prisma.aIToolExecution.create({
      data: {
        workerId: req.workerId,
        toolName: req.toolName,
        category: meta.category,
        permission: meta.permission,
        approvalRequired: meta.approvalRequired,
        parameters: req.parameters as Prisma.InputJsonValue,
        status: TOOL_EXECUTION_STATUS.NOT_FOUND,
        orderId,
        durationMs: Date.now() - started,
        safeMode: !liveMode,
      },
    })
    return mapRow(row)
  }

  try {
    const output = await tool.execute(
      {
        prisma,
        workerId: req.workerId,
        orderId: orderId ?? undefined,
        runId: req.runId,
        taskId: req.taskId,
        liveMode,
      },
      req.parameters,
    )

    const row = await prisma.aIToolExecution.create({
      data: {
        workerId: req.workerId,
        workerCode: resolveWorkerCode(req.workerId),
        toolName: req.toolName,
        category: meta.category,
        permission: meta.permission,
        approvalRequired: meta.approvalRequired,
        parameters: req.parameters as Prisma.InputJsonValue,
        status: TOOL_EXECUTION_STATUS.SUCCESS,
        result: output as Prisma.InputJsonValue,
        orderId,
        runId: req.runId ?? null,
        taskId: req.taskId ?? null,
        durationMs: Date.now() - started,
        safeMode: !liveMode,
      },
    })

    await writeToolAuditEvents(prisma, {
      executionId: row.id,
      workerId: req.workerId,
      toolName: req.toolName,
      orderId,
      runId: req.runId,
      taskId: req.taskId,
      parameters: req.parameters,
      status: TOOL_EXECUTION_STATUS.SUCCESS,
      result: output,
      safeMode: !liveMode,
    })

    return mapRow(row)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const row = await prisma.aIToolExecution.create({
      data: {
        workerId: req.workerId,
        workerCode: resolveWorkerCode(req.workerId),
        toolName: req.toolName,
        category: meta.category,
        permission: meta.permission,
        approvalRequired: meta.approvalRequired,
        parameters: req.parameters as Prisma.InputJsonValue,
        status: TOOL_EXECUTION_STATUS.FAILED,
        result: { error: message } as Prisma.InputJsonValue,
        orderId,
        runId: req.runId ?? null,
        taskId: req.taskId ?? null,
        durationMs: Date.now() - started,
        safeMode: !liveMode,
      },
    })
    await writeToolAuditEvents(prisma, {
      executionId: row.id,
      workerId: req.workerId,
      toolName: req.toolName,
      orderId,
      parameters: req.parameters,
      status: TOOL_EXECUTION_STATUS.FAILED,
      result: { error: message },
      safeMode: !liveMode,
    })
    return mapRow(row)
  }
}

export async function listExecutions(
  prisma: PrismaClient,
  filters: { workerId?: string; status?: string; limit?: number; todayIso?: string } = {},
): Promise<AiToolExecutionDto[]> {
  const where: Prisma.AIToolExecutionWhereInput = {}
  if (filters.workerId) where.workerId = filters.workerId
  if (filters.status) where.status = filters.status
  if (filters.todayIso) {
    const start = new Date(`${filters.todayIso}T00:00:00.000Z`)
    const end = new Date(`${filters.todayIso}T23:59:59.999Z`)
    where.createdAt = { gte: start, lte: end }
  }

  const rows = await prisma.aIToolExecution.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: filters.limit ?? 100,
  })
  return rows.map(mapRow)
}

export async function approveExecution(
  prisma: PrismaClient,
  id: string,
  managerName: string,
  managerNote?: string,
): Promise<AiToolExecutionDto | null> {
  ensureInit()
  const existing = await prisma.aIToolExecution.findUnique({ where: { id } })
  if (!existing || existing.status !== TOOL_EXECUTION_STATUS.WAITING_APPROVAL) return null

  const mapped = mapRow(existing)
  await writeToolApprovalEvent(prisma, mapped, 'approved', managerName, managerNote)

  const liveMode = isAiToolExecutionLiveEnabled()
  const tool = registry.get(existing.toolName)
  if (!tool) return null

  const started = Date.now()
  try {
    const output = await tool.execute(
      {
        prisma,
        workerId: existing.workerId,
        orderId: existing.orderId ?? undefined,
        runId: existing.runId ?? undefined,
        taskId: existing.taskId ?? undefined,
        liveMode,
      },
      existing.parameters as Record<string, unknown>,
    )

    const row = await prisma.aIToolExecution.update({
      where: { id },
      data: {
        status: TOOL_EXECUTION_STATUS.SUCCESS,
        result: output as Prisma.InputJsonValue,
        managerName,
        managerNote: managerNote ?? null,
        approvedAt: new Date(),
        durationMs: (existing.durationMs ?? 0) + (Date.now() - started),
        safeMode: !liveMode,
      },
    })

    await writeToolAuditEvents(prisma, {
      executionId: row.id,
      workerId: existing.workerId,
      toolName: existing.toolName,
      orderId: existing.orderId,
      parameters: existing.parameters as Record<string, unknown>,
      status: TOOL_EXECUTION_STATUS.SUCCESS,
      result: output,
      managerName,
      safeMode: !liveMode,
    })

    return mapRow(row)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const row = await prisma.aIToolExecution.update({
      where: { id },
      data: {
        status: TOOL_EXECUTION_STATUS.FAILED,
        result: { error: message } as Prisma.InputJsonValue,
        managerName,
        managerNote: managerNote ?? null,
        approvedAt: new Date(),
      },
    })
    return mapRow(row)
  }
}

export async function rejectExecution(
  prisma: PrismaClient,
  id: string,
  managerName: string,
  managerNote?: string,
): Promise<AiToolExecutionDto | null> {
  const existing = await prisma.aIToolExecution.findUnique({ where: { id } })
  if (!existing || existing.status !== TOOL_EXECUTION_STATUS.WAITING_APPROVAL) return null

  const mapped = mapRow(existing)
  await writeToolApprovalEvent(prisma, mapped, 'rejected', managerName, managerNote)

  const row = await prisma.aIToolExecution.update({
    where: { id },
    data: {
      status: TOOL_EXECUTION_STATUS.FAILED,
      managerName,
      managerNote: managerNote ?? null,
      rejectedAt: new Date(),
      result: { rejected: true, managerNote: managerNote ?? null } as Prisma.InputJsonValue,
    },
  })
  return mapRow(row)
}

export async function buildExecutionSummary(
  prisma: PrismaClient,
  todayIso: string,
): Promise<AiExecutionSummaryDto> {
  const start = new Date(`${todayIso}T00:00:00.000Z`)
  const end = new Date(`${todayIso}T23:59:59.999Z`)
  const rows = await prisma.aIToolExecution.findMany({
    where: { createdAt: { gte: start, lte: end } },
    select: { status: true, rejectedAt: true },
  })

  return {
    today: rows.length,
    success: rows.filter((r) => r.status === TOOL_EXECUTION_STATUS.SUCCESS).length,
    waiting: rows.filter((r) => r.status === TOOL_EXECUTION_STATUS.WAITING_APPROVAL).length,
    rejected: rows.filter((r) => r.rejectedAt != null).length,
    failed: rows.filter((r) => r.status === TOOL_EXECUTION_STATUS.FAILED && r.rejectedAt == null).length,
  }
}

export function resetToolEngineForTests(): void {
  registry.clear()
  initialized = false
}
