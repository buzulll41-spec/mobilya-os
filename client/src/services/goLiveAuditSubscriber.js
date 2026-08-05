import { DOMAIN_EVENT_TYPE } from '../contracts/v1/domainEventTypes.js'
import {
  auditAiDecision,
  auditAiTool,
  auditCollectionMutation,
  auditMemoryMutation,
  auditOrderMutation,
  auditShipmentMutation,
} from '../lib/criticalAuditBridge.js'

let wired = false

/**
 * Domain event akışından kritik audit kayıtları üretir.
 */
export function initGoLiveAuditSubscriber() {
  if (wired) return () => {}
  wired = true

  /** @param {CustomEvent<{ type?: string, payload?: Record<string, unknown> }>} ev */
  const onDomainEvent = (ev) => {
    const detail = ev.detail
    if (!detail?.type) return
    const type = detail.type
    const payload = detail.payload ?? {}
    const actor = payload.actor && typeof payload.actor === 'object' ? payload.actor : {}
    const actorRole = typeof actor.role === 'string' ? actor.role : undefined
    const actorName = typeof actor.name === 'string' ? actor.name : undefined
    const ctx = { role: actorRole, name: actorName }

    if (type.startsWith('order.')) {
      auditOrderMutation(type, { ...ctx, orderId: String(payload.orderId ?? '') })
    } else if (type.startsWith('payment.') || type.startsWith('mailOrder.')) {
      auditCollectionMutation(type, ctx)
    } else if (
      type.startsWith('shipment.') ||
      type.startsWith('dispatch.') ||
      type.startsWith('delivery.')
    ) {
      auditShipmentMutation(type, ctx)
    } else if (
      type === DOMAIN_EVENT_TYPE.AI_COMPANY_MANAGER_DECISION ||
      type === DOMAIN_EVENT_TYPE.AI_COMPANY_BRAIN_DECISION
    ) {
      auditAiDecision(String(payload.message ?? type), {
        workerId: String(payload.workerId ?? 'company-manager'),
        type: String(payload.decisionType ?? type),
      })
    } else if (type.startsWith('ai.tool.')) {
      auditAiTool(type, { toolId: String(payload.toolId ?? ''), workerId: String(payload.workerId ?? '') })
    } else if (type.startsWith('ai.memory.') || type.includes('memory')) {
      auditMemoryMutation(type)
    }
  }

  window.addEventListener('mobilya:domain-event', /** @type {EventListener} */ (onDomainEvent))
  return () => {
    wired = false
    window.removeEventListener('mobilya:domain-event', /** @type {EventListener} */ (onDomainEvent))
  }
}
