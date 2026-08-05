import { DOMAIN_EVENT_TYPE } from '../../contracts/v1/domainEventTypes.js'
import { appendDomainEvent } from '../mockDomainEventStore.js'
import { recordAuditEvent } from '../../lib/audit/recordAuditEvent.js'
import { AUDIT_MODULE } from '../../contracts/v1/auditModule.js'
import { AI_COMPANY_MANAGER_WORKER_ID } from '../../contracts/v1/aiCompanyManager.js'

/** @typedef {import('../../contracts/v1/aiCompanyManager.js').CompanyManagerDecisionDto} CompanyManagerDecisionDto */

/**
 * @param {CompanyManagerDecisionDto[]} decisions
 */
export function publishCompanyManagerDecisionEvents(decisions) {
  for (const decision of decisions) {
    appendDomainEvent({
      id: `evt-${decision.id}`,
      type: DOMAIN_EVENT_TYPE.AI_COMPANY_MANAGER_DECISION,
      aggregateType: 'CompanyManager',
      aggregateId: decision.orderId ?? AI_COMPANY_MANAGER_WORKER_ID,
      occurredAt: decision.occurredAt,
      correlationId: decision.id,
      payloadSchemaVersion: '1',
      payload: {
        title: 'AI Company Manager',
        decisionType: decision.type,
        message: decision.message,
        workerId: decision.workerId ?? null,
        targetWorkerId: decision.targetWorkerId ?? null,
        taskId: decision.taskId ?? null,
        orderId: decision.orderId ?? null,
      },
    })

    recordAuditEvent({
      id: `audit-${decision.id}`,
      type: DOMAIN_EVENT_TYPE.AI_COMPANY_MANAGER_DECISION,
      aggregateId: decision.orderId ?? AI_COMPANY_MANAGER_WORKER_ID,
      correlationId: decision.id,
      module: AUDIT_MODULE.SYSTEM,
      recordId: decision.id,
      description: decision.message,
      extraPayload: {
        source: 'company_manager',
        decisionType: decision.type,
        workerId: decision.workerId,
        targetWorkerId: decision.targetWorkerId,
      },
    })
  }
}

export {}
