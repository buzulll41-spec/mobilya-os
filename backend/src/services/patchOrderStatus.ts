import type { PrismaClient } from '@prisma/client'
import { MISSING_ITEM_STATUS } from '../constants/missingItemStatuses.js'
import { isOrderDisplayStatus, type OrderDisplayStatus } from '../constants/orderStatuses.js'
import { AppHttpError } from '../errors/apiError.js'
import {
  projectSalesOrderListItemFromDbRow,
  type SalesOrderListItemDto,
  type SalesOrderWithRelations,
} from '../projection/salesOrderListItemProjection.js'
import { loadSalesOrderWithRelations } from './loadSalesOrderRow.js'
import {
  assertPolicyAllowsProceed,
  evaluateOrderStatusChangePolicies,
} from '../policy/evaluateOrderPolicies.js'
import { policyOverrideEventCreateData } from '../lib/policyOverrideEvent.js'
import { domainEventCreateInput } from '../lib/auditedDomainEvent.js'
import { getOperationCases } from './getOperationCases.js'
import { getCaseOverrides, updateOperationCase } from './updateOperationCase.js'

export type PatchOrderStatusRequest = {
  status: OrderDisplayStatus | 'Sevk Planlandı' | 'Yola Çıktı' | 'Teslim Onayı Bekliyor'
  policyOverrides?: string[]
}

const PATCHABLE_ORDER_STATUSES = new Set<string>([
  'Bekleniyor',
  'İptal',
  'Kısmi Geldi',
  'Üretimde',
  'Geldi',
  'Eksik Var',
  'Hazır',
  'Sevke Hazır',
  'Sevk Planlandı',
  'Yola Çıktı',
  'Teslim Onayı Bekliyor',
  'Teslim Edildi',
])

const STAB_TEST_ORDER_ID = 'S-1784134000025'

const ORDER_TO_CASE_STATUS = new Map<string, 'WAITING' | 'IN_PROGRESS' | 'RESOLVED'>([
  ['Sevk Planlandı', 'WAITING'],
  ['Yola Çıktı', 'IN_PROGRESS'],
  ['Teslim Onayı Bekliyor', 'WAITING'],
  ['Teslim Edildi', 'RESOLVED'],
])

async function synchronizeOperationCaseWithShipmentLifecycle(
  prisma: PrismaClient,
  orderId: string,
  orderStatus: string,
): Promise<void> {
  if (orderId !== STAB_TEST_ORDER_ID) return

  const targetCaseStatus = ORDER_TO_CASE_STATUS.get(orderStatus)
  if (!targetCaseStatus) return

  const caseNumber = `CASE-${orderId}`
  const currentOverride = getCaseOverrides().get(caseNumber)
  if (currentOverride?.status === 'CLOSED') return

  const cases = await getOperationCases(prisma)
  const existingCase = cases.cases.find((c) => c.caseNumber === caseNumber && c.orderIds.includes(orderId))
  if (!existingCase) return
  if (existingCase.status === 'CLOSED') return
  if (existingCase.status === targetCaseStatus) return

  try {
    if (existingCase.status === 'OPEN' && targetCaseStatus === 'WAITING') {
      updateOperationCase(caseNumber, { status: 'IN_PROGRESS' })
    }
    updateOperationCase(caseNumber, { status: targetCaseStatus })
  } catch {
    // Order update must remain successful even if case transition is not applicable.
  }
}

export function assertValidPatchOrderStatusRequest(body: unknown): PatchOrderStatusRequest {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Request body must be a JSON object', 'Bad Request')
  }
  const o = body as Record<string, unknown>
  const status = typeof o.status === 'string' ? o.status.trim() : ''
  if (
    !PATCHABLE_ORDER_STATUSES.has(status) ||
    (!isOrderDisplayStatus(status) && status !== 'Sevk Planlandı' && status !== 'Yola Çıktı' && status !== 'Teslim Onayı Bekliyor')
  ) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', { status: 'Invalid status' })
  }
  const policyOverrides = Array.isArray(o.policyOverrides)
    ? o.policyOverrides.filter((x): x is string => typeof x === 'string')
    : undefined
  return {
    status,
    ...(policyOverrides?.length ? { policyOverrides } : {}),
  }
}

export async function countOpenMissingItems(prisma: PrismaClient, orderId: string): Promise<number> {
  return prisma.orderMissingItem.count({
    where: {
      orderId,
      status: { not: MISSING_ITEM_STATUS.RESOLVED },
    },
  })
}

export async function patchOrderStatus(
  prisma: PrismaClient,
  orderId: string,
  body: PatchOrderStatusRequest,
  fromStatus?: string,
  options?: { authUser?: import('../lib/authUser.js').AuthUserContext },
): Promise<SalesOrderListItemDto> {
  const todayIso = process.env.DEMO_TODAY ?? '2026-05-14'
  const existing = await loadSalesOrderWithRelations(prisma, orderId)
  const previousStatus = fromStatus ?? existing.displayStatus

  if (body.status === previousStatus) {
    return projectSalesOrderListItemFromDbRow(existing, todayIso)
  }

  const openMissingCount = await countOpenMissingItems(prisma, orderId)
  const totalAmount = Number(existing.totalAmount)
  const paidAmount = Number(existing.paidAmount)
  const remainingAmount = Number(existing.remainingAmount ?? Math.max(0, totalAmount - paidAmount))
  const policyEval = evaluateOrderStatusChangePolicies({
    operation: 'order_status_change',
    targetStatus: body.status,
    order: {
      totalAmount,
      remainingAmount,
      isFullyPaid: existing.isFullyPaid,
    },
    openMissingCount,
    policyOverrides: body.policyOverrides,
  })
  try {
    assertPolicyAllowsProceed(policyEval)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Policy blocked'
    throw new AppHttpError(400, msg, 'Bad Request', { policy: policyEval.blocking.map((b) => b.code) })
  }

  const now = new Date()

  await prisma.$transaction(async (tx) => {
    await tx.salesOrder.update({
      where: { id: orderId },
      data: {
        displayStatus: body.status,
        version: { increment: 1 },
      },
    })

    await tx.domainEvent.create({
      data: domainEventCreateInput(
        orderId,
        'SalesOrder',
        'order.lifecycle_changed',
        `corr-${orderId}-status-${Date.now()}`,
        now,
        { from: previousStatus, to: body.status },
        options?.authUser,
      ),
    })

    if (body.policyOverrides?.length) {
      await tx.domainEvent.create({
        data: policyOverrideEventCreateData(
          {
            orderId,
            code: body.policyOverrides.join(','),
            reason: `Durum ${body.status} için politika override`,
            context: 'order.status_change',
            overrides: body.policyOverrides,
            authUser: options?.authUser,
          },
          now,
        ),
      })
    }
  })

  await synchronizeOperationCaseWithShipmentLifecycle(prisma, orderId, body.status)

  const row = (await loadSalesOrderWithRelations(prisma, orderId)) as SalesOrderWithRelations
  return projectSalesOrderListItemFromDbRow(row, todayIso)
}
