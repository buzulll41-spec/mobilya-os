import { COLLABORATION_MESSAGE_TYPE, type CollaborationGraphEdgeDto, type WorkerCollaborationMessageDto } from '../../contracts/collaborationDto.js'

export const PIPELINE_WORKER_IDS = [
  'dw-sales-follow-up',
  'dw-shipment',
  'dw-collection',
  'dw-procurement',
  'dw-ceo-assistant',
]

export const WORKER_LABELS: Record<string, string> = {
  'dw-sales-follow-up': 'Sales AI',
  'dw-shipment': 'Shipment AI',
  'dw-collection': 'Collection AI',
  'dw-procurement': 'Procurement AI',
  'dw-ceo-assistant': 'Executive AI',
}

const DOMAIN_TO_WORKER: Record<string, string> = {
  sales: 'dw-sales-follow-up',
  shipment: 'dw-shipment',
  collection: 'dw-collection',
  procurement: 'dw-procurement',
}

const MESSAGE_PRIORITY: Record<string, number> = {
  [COLLABORATION_MESSAGE_TYPE.RISK_ALERT]: 5,
  [COLLABORATION_MESSAGE_TYPE.WAIT]: 4,
  [COLLABORATION_MESSAGE_TYPE.PRIORITY_CHANGE]: 4,
  [COLLABORATION_MESSAGE_TYPE.TASK_TRANSFER]: 3,
  [COLLABORATION_MESSAGE_TYPE.REQUEST_HELP]: 3,
  [COLLABORATION_MESSAGE_TYPE.CONTINUE]: 2,
  [COLLABORATION_MESSAGE_TYPE.INFO]: 1,
}

let seq = 0

export function createCollaborationMessage(
  fromWorkerId: string,
  toWorkerId: string,
  type: keyof typeof COLLABORATION_MESSAGE_TYPE,
  payload: { reason: string; orderId?: string; status?: string; occurredAt?: string },
): WorkerCollaborationMessageDto {
  seq += 1
  return {
    id: `collab-${Date.now()}-${seq}`,
    fromWorkerId,
    toWorkerId,
    fromWorkerLabel: WORKER_LABELS[fromWorkerId] ?? fromWorkerId,
    toWorkerLabel: WORKER_LABELS[toWorkerId] ?? toWorkerId,
    type: COLLABORATION_MESSAGE_TYPE[type],
    reason: payload.reason,
    orderId: payload.orderId,
    status: payload.status,
    occurredAt: payload.occurredAt ?? new Date().toISOString(),
    priority: MESSAGE_PRIORITY[type] ?? 2,
  }
}

export type CollaborationScanContext = {
  domains: {
    collection: { score: number; pressure: number }
    procurement: { score: number; pressure: number }
    sales: { score: number; pressure: number }
  }
  dominant: string
  conflicts: Array<{ kind: string; message: string; orderId?: string; workerId?: string; workerIds?: string[] }>
  topOrderId?: string
  todayIso: string
}

export function detectCollaborationSignals(ctx: CollaborationScanContext): WorkerCollaborationMessageDto[] {
  const { domains, dominant, conflicts, topOrderId, todayIso } = ctx
  const occurredAt = `${todayIso}T09:15:00.000Z`
  const messages: WorkerCollaborationMessageDto[] = []

  if (domains.collection.pressure >= 2 || domains.collection.score >= 3) {
    messages.push(
      createCollaborationMessage('dw-collection', 'dw-shipment', 'WAIT', {
        reason: 'Tahsilat riski HIGH · sevkiyat beklet',
        orderId: topOrderId,
        occurredAt,
      }),
    )
  }

  if (domains.procurement.pressure >= 2 || dominant === 'procurement') {
    messages.push(
      createCollaborationMessage('dw-procurement', 'dw-sales-follow-up', 'RISK_ALERT', {
        reason: 'Termin gecikecek · müşteriyi bilgilendir',
        orderId: topOrderId,
        occurredAt,
      }),
    )
  }

  if (domains.sales.pressure >= 1 && domains.collection.pressure <= 1) {
    messages.push(
      createCollaborationMessage('dw-sales-follow-up', 'dw-collection', 'INFO', {
        reason: 'Müşteri ödeme yaptı',
        status: 'PAID',
        orderId: topOrderId,
        occurredAt,
      }),
    )
    messages.push(
      createCollaborationMessage('dw-collection', 'dw-shipment', 'CONTINUE', {
        reason: 'Tahsilat CLOSED · sevkiyat devam',
        orderId: topOrderId,
        occurredAt,
      }),
    )
  }

  for (const conflict of conflicts.slice(0, 2)) {
    messages.push(
      createCollaborationMessage(
        conflict.workerIds?.[0] ?? conflict.workerId ?? 'dw-collection',
        'dw-ceo-assistant',
        'REQUEST_HELP',
        { reason: conflict.message, orderId: conflict.orderId, occurredAt },
      ),
    )
  }

  const overload = conflicts.find((c) => c.kind === 'QUEUE_OVERLOAD')
  if (overload?.workerId) {
    const transferTarget = overload.workerId === 'dw-shipment' ? 'dw-collection' : 'dw-shipment'
    messages.push(
      createCollaborationMessage(overload.workerId, transferTarget, 'TASK_TRANSFER', {
        reason: 'Kuyruk yoğun · görev devri',
        occurredAt,
      }),
    )
  }

  const dominantWorker = DOMAIN_TO_WORKER[dominant] ?? 'dw-ceo-assistant'
  messages.push(
    createCollaborationMessage('dw-ceo-assistant', dominantWorker, 'PRIORITY_CHANGE', {
      reason: `${dominant} domain öncelikli`,
      status: 'HIGH',
      occurredAt,
    }),
  )

  return dedupeMessages(messages)
}

function dedupeMessages(messages: WorkerCollaborationMessageDto[]): WorkerCollaborationMessageDto[] {
  const seen = new Set<string>()
  return messages.filter((m) => {
    const key = `${m.fromWorkerId}|${m.toWorkerId}|${m.type}|${m.reason}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function buildCollaborationGraph(messages: WorkerCollaborationMessageDto[]): CollaborationGraphEdgeDto[] {
  const edges = new Map<string, CollaborationGraphEdgeDto>()
  for (const msg of messages) {
    const id = `${msg.fromWorkerId}->${msg.toWorkerId}:${msg.type}`
    const existing = edges.get(id)
    if (existing) existing.weight += 1
    else
      edges.set(id, {
        id,
        fromWorkerId: msg.fromWorkerId,
        toWorkerId: msg.toWorkerId,
        messageType: msg.type,
        weight: 1,
      })
  }
  return [...edges.values()]
}

export function sortMessagesByPriority(messages: WorkerCollaborationMessageDto[]): WorkerCollaborationMessageDto[] {
  return [...messages].sort((a, b) => b.priority - a.priority || b.occurredAt.localeCompare(a.occurredAt))
}

export function countHelpRequests(messages: WorkerCollaborationMessageDto[], workerId: string): number {
  return messages.filter(
    (m) => m.fromWorkerId === workerId && m.type === COLLABORATION_MESSAGE_TYPE.REQUEST_HELP,
  ).length
}

export function findBusiestTeamLabel(graph: CollaborationGraphEdgeDto[]): string {
  if (!graph.length) return 'Sales ↔ Shipment'
  const top = [...graph].sort((a, b) => b.weight - a.weight)[0]
  const from = WORKER_LABELS[top.fromWorkerId] ?? top.fromWorkerId
  const to = WORKER_LABELS[top.toWorkerId] ?? top.toWorkerId
  return `${from} ↔ ${to}`
}

export function resetCollaborationEngineSeqForTests(): void {
  seq = 0
}
