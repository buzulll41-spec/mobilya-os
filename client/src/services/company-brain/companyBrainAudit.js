import { DOMAIN_EVENT_TYPE } from '../../contracts/v1/domainEventTypes.js'
import { appendDomainEvent } from '../mockDomainEventStore.js'
import { recordAuditEvent } from '../../lib/audit/recordAuditEvent.js'
import { AUDIT_MODULE } from '../../contracts/v1/auditModule.js'
import { AI_COMPANY_MANAGER_WORKER_ID } from '../../contracts/v1/aiCompanyManager.js'
import { publishCompanyManagerDecisionEvents } from '../company-manager/companyManagerAudit.js'

/** @typedef {import('../../contracts/v1/aiCompanyManager.js').CompanyManagerDecisionDto} CompanyManagerDecisionDto */

/**
 * @param {CompanyManagerDecisionDto[]} decisions
 * @param {string} scenarioId
 */
export function publishCompanyBrainDecisionEvents(decisions, scenarioId) {
  publishCompanyManagerDecisionEvents(decisions)

  for (const decision of decisions) {
    appendDomainEvent({
      id: `evt-brain-${decision.id}`,
      type: DOMAIN_EVENT_TYPE.AI_COMPANY_BRAIN_DECISION,
      aggregateType: 'CompanyBrain',
      aggregateId: decision.orderId ?? AI_COMPANY_MANAGER_WORKER_ID,
      occurredAt: decision.occurredAt,
      correlationId: decision.id,
      payloadSchemaVersion: '1',
      payload: {
        title: 'AI Company Brain',
        decisionType: decision.type,
        message: decision.message,
        scenarioId: decision.scenarioId ?? scenarioId,
        workerId: decision.workerId ?? null,
        targetWorkerId: decision.targetWorkerId ?? null,
      },
    })

    recordAuditEvent({
      id: `audit-brain-${decision.id}`,
      type: DOMAIN_EVENT_TYPE.AI_COMPANY_BRAIN_DECISION,
      aggregateId: decision.orderId ?? AI_COMPANY_MANAGER_WORKER_ID,
      correlationId: decision.id,
      module: AUDIT_MODULE.SYSTEM,
      recordId: decision.id,
      description: decision.message,
      extraPayload: {
        source: 'company_brain',
        decisionType: decision.type,
        scenarioId: decision.scenarioId ?? scenarioId,
      },
    })
  }
}

export {}
