import { DOMAIN_EVENT_TYPE } from '../contracts/v1/domainEventTypes.js'
import { AUDIT_MODULE } from '../contracts/v1/auditModule.js'
import { recordAuditEvent } from '../lib/audit/recordAuditEvent.js'
import { appendDomainEvent } from './mockDomainEventStore.js'
import { WORKER_DISPLAY_NAMES } from '../contracts/v1/workerOrchestration.js'
import { AI_SALES_FOLLOW_UP_WORKER_ID } from '../contracts/v1/aiSalesFollowUp.js'
import { AI_COLLECTION_SPECIALIST_WORKER_ID } from '../contracts/v1/aiCollectionSpecialist.js'
import { AI_SHIPMENT_SPECIALIST_WORKER_ID } from '../contracts/v1/aiShipmentSpecialist.js'
import { AI_PROCUREMENT_SPECIALIST_WORKER_ID } from '../contracts/v1/aiProcurementSpecialist.js'

/** @typedef {import('../contracts/v1/workerTask.js').WorkerTaskHistoryEntry} WorkerTaskHistoryEntry */

/** @type {Record<string, { completed: string, module: string }>} */
const WORKER_EVENT_MAP = {
  [AI_SALES_FOLLOW_UP_WORKER_ID]: {
    completed: DOMAIN_EVENT_TYPE.AI_SALES_TASK_COMPLETED,
    module: AUDIT_MODULE.SALES,
  },
  [AI_SHIPMENT_SPECIALIST_WORKER_ID]: {
    completed: DOMAIN_EVENT_TYPE.AI_SHIPMENT_TASK_COMPLETED,
    module: AUDIT_MODULE.SHIPMENT,
  },
  [AI_COLLECTION_SPECIALIST_WORKER_ID]: {
    completed: DOMAIN_EVENT_TYPE.AI_COLLECTION_TASK_COMPLETED,
    module: AUDIT_MODULE.COLLECTION,
  },
  [AI_PROCUREMENT_SPECIALIST_WORKER_ID]: {
    completed: DOMAIN_EVENT_TYPE.AI_PROCUREMENT_TASK_COMPLETED,
    module: AUDIT_MODULE.SUPPLY,
  },
}

/**
 * @param {WorkerTaskHistoryEntry} entry
 * @param {{ toWorkerId?: string | null, chainId?: string }} [meta]
 */
export function recordWorkerTaskCompletedEvent(entry, meta = {}) {
  const mapping = WORKER_EVENT_MAP[entry.workerId]
  if (!mapping) return

  const workerLabel = WORKER_DISPLAY_NAMES[entry.workerId] ?? entry.workerId
  const orderId = entry.relatedEntityId ?? '—'
  const description = `${workerLabel}: ${entry.title} tamamlandı (${entry.durationLabel})`

  recordAuditEvent({
    id: `audit-complete-${entry.id}`,
    type: mapping.completed,
    aggregateId: orderId,
    correlationId: entry.id,
    occurredAt: entry.finishedAt ?? entry.completedAt ?? new Date().toISOString(),
    module: mapping.module,
    recordId: entry.id,
    newValue: entry.result ?? 'Tamamlandı',
    description,
    extraPayload: {
      workerId: entry.workerId,
      durationMs: entry.durationMs,
      durationSeconds: Math.round((entry.durationMs ?? 0) / 1000),
      toWorkerId: meta.toWorkerId ?? null,
      chainId: meta.chainId ?? null,
    },
  })

  appendDomainEvent({
    id: `evt-complete-${entry.id}`,
    type: mapping.completed,
    aggregateType: 'SalesOrder',
    aggregateId: orderId,
    occurredAt: entry.finishedAt ?? entry.completedAt ?? new Date().toISOString(),
    correlationId: entry.id,
    payloadSchemaVersion: '1',
    payload: {
      title: 'AI Task Completed',
      taskTitle: entry.title,
      worker: workerLabel,
      workerId: entry.workerId,
      durationMs: entry.durationMs,
      durationSeconds: Math.round((entry.durationMs ?? 0) / 1000),
      toWorkerId: meta.toWorkerId ?? null,
      chainId: meta.chainId ?? null,
      description,
      audit: {
        module: mapping.module,
        recordId: entry.id,
        description,
      },
    },
  })
}

/**
 * @param {string} orderId
 * @param {string} chainId
 * @param {string} occurredAt
 */
export function recordOrchestrationChainCompleted(orderId, chainId, occurredAt) {
  const description = 'Operasyon tamamlandı — AI zinciri bitti'

  recordAuditEvent({
    id: `audit-chain-${chainId}`,
    type: DOMAIN_EVENT_TYPE.AI_ORCHESTRATION_CHAIN_COMPLETED,
    aggregateId: orderId,
    correlationId: chainId,
    occurredAt,
    module: AUDIT_MODULE.SYSTEM,
    recordId: chainId,
    newValue: 'COMPLETED',
    description,
  })

  appendDomainEvent({
    id: `evt-chain-${chainId}`,
    type: DOMAIN_EVENT_TYPE.AI_ORCHESTRATION_CHAIN_COMPLETED,
    aggregateType: 'SalesOrder',
    aggregateId: orderId,
    occurredAt,
    correlationId: chainId,
    payloadSchemaVersion: '1',
    payload: {
      title: 'Operasyon Tamamlandı',
      description,
      chainId,
    },
  })
}
