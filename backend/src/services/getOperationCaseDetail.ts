/**
 * Tek vaka detayı — vaka özeti + ilişkili görevler (ActionDto[]) + timeline +
 * ilişkili siparişler + notlar. Liste motoruyla aynı gruplama/override mantığını
 * yeniden kullanır (getOperationCases.buildCaseCores).
 */

import type { PrismaClient } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import { assertServiceErrorMapped } from '../errors/mapServiceError.js'
import {
  applyCaseOverride,
  buildCaseCores,
  buildCaseTimeline,
  gatherActionResult,
  type CaseCore,
  type OperationCasesQuery,
} from './getOperationCases.js'
import { getCaseOverrides } from './updateOperationCase.js'
import type { ActionDto } from '../contracts/actionCenterDto.js'
import type {
  CaseRelatedOrderDto,
  OperationCaseDetailDto,
} from '../contracts/operationCaseDto.js'

function buildRelatedOrders(core: CaseCore): CaseRelatedOrderDto[] {
  const byOrder = new Map<string, CaseRelatedOrderDto>()
  for (const a of core.actions) {
    const oid =
      a.relatedEntityType === 'order'
        ? a.relatedEntityId
        : a.relatedEntityType === 'orderLine' && typeof a.evidence?.orderId === 'string'
          ? (a.evidence.orderId as string)
          : null
    if (!oid) continue
    if (!byOrder.has(oid)) {
      byOrder.set(oid, {
        orderId: oid,
        orderNumber: a.relatedOrder ?? null,
        customerName: a.relatedCustomer ?? core.customerName,
      })
    }
  }
  return [...byOrder.values()]
}

export async function getOperationCaseDetail(
  prisma: PrismaClient,
  id: string,
  query: OperationCasesQuery = {},
): Promise<OperationCaseDetailDto> {
  try {
    const caseId = typeof id === 'string' ? id.trim() : ''
    if (!caseId) {
      throw new AppHttpError(400, 'Vaka kimliği gerekli', 'Bad Request', { id: 'Required' })
    }

    const { actionResult, orders } = await gatherActionResult(prisma, query)
    const orderIndex = new Map(
      orders.map((o) => [
        o.id,
        {
          customerId: o.customerId ?? null,
          customerName: o.customerDisplayName ?? null,
          riskSeverity: String(o.currentRiskSeverity ?? 'NONE'),
        },
      ]),
    )
    const cores = buildCaseCores(actionResult.actions, orderIndex)
    const core = cores.find((c) => c.caseNumber === caseId)
    if (!core) {
      throw new AppHttpError(404, 'Vaka bulunamadı', 'Not Found', { id: caseId })
    }

    const overrides = getCaseOverrides()
    const override = overrides.get(core.caseNumber)
    const dto = applyCaseOverride(core, override)
    const timeline = buildCaseTimeline(core, override)
    const relatedActions: ActionDto[] = core.actions
    const relatedOrders = buildRelatedOrders(core)

    return {
      case: dto,
      relatedActions,
      timeline,
      relatedOrders,
      notes: [],
    }
  } catch (err) {
    assertServiceErrorMapped(err)
    throw err
  }
}
