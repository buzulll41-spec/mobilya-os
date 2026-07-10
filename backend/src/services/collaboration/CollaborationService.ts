import type { PrismaClient } from '@prisma/client'
import type {
  CollaborationFeedDto,
  CollaborationHistoryDto,
  CompanyCollaborationSummaryDto,
  WorkerCollaborationProfileDto,
} from '../../contracts/collaborationDto.js'
import {
  buildCollaborationGraph,
  countHelpRequests,
  createCollaborationMessage,
  detectCollaborationSignals,
  findBusiestTeamLabel,
  PIPELINE_WORKER_IDS,
  sortMessagesByPriority,
  WORKER_LABELS,
} from './CollaborationEngine.js'

let messages = [...seedInitialMessages()]
let seeded = false

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function seedInitialMessages() {
  const day = todayIso()
  return detectCollaborationSignals({
    domains: {
      collection: { score: 4, pressure: 3 },
      procurement: { score: 2, pressure: 2 },
      sales: { score: 2, pressure: 1 },
    },
    dominant: 'collection',
    conflicts: [
      {
        kind: 'ORDER_OVERLAP',
        message: 'S-1001 üzerinde AI çakışması',
        orderId: 'S-1001',
        workerIds: ['dw-collection', 'dw-shipment'],
      },
    ],
    topOrderId: 'S-1001',
    todayIso: day,
  })
}

async function ensureSeeded(_prisma: PrismaClient) {
  if (seeded) return
  seeded = true
}

function buildWorkerProfile(workerId: string): WorkerCollaborationProfileDto {
  const inbox = messages.filter((m) => m.toWorkerId === workerId)
  const outbox = messages.filter((m) => m.fromWorkerId === workerId)
  return {
    workerId,
    workerLabel: WORKER_LABELS[workerId] ?? workerId,
    inbox: sortMessagesByPriority(inbox).slice(0, 10),
    outbox: sortMessagesByPriority(outbox).slice(0, 10),
    messagesSent: outbox.length,
    messagesReceived: inbox.length,
    helpRequestsSent: countHelpRequests(messages, workerId),
    activeEffects: [],
  }
}

export async function getCompanyCollaboration(prisma: PrismaClient): Promise<CompanyCollaborationSummaryDto> {
  const started = Date.now()
  await ensureSeeded(prisma)
  const day = todayIso()
  const todayMessages = messages.filter((m) => m.occurredAt.slice(0, 10) === day)
  const graph = buildCollaborationGraph(messages)
  const workers = PIPELINE_WORKER_IDS.map((id) => buildWorkerProfile(id))
  const mostHelp = [...workers].sort((a, b) => b.helpRequestsSent - a.helpRequestsSent)[0]

  return {
    feed: sortMessagesByPriority(todayMessages.length ? todayMessages : messages).slice(0, 30),
    graph,
    workers,
    mostHelpRequestsWorkerId: mostHelp?.workerId ?? PIPELINE_WORKER_IDS[0],
    busiestTeamLabel: findBusiestTeamLabel(graph),
    todayMessageCount: todayMessages.length || messages.length,
    meta: { durationMs: Date.now() - started },
  }
}

export async function getCollaborationFeed(prisma: PrismaClient, limit = 30): Promise<CollaborationFeedDto> {
  const started = Date.now()
  await ensureSeeded(prisma)
  const day = todayIso()
  const todayMessages = messages.filter((m) => m.occurredAt.slice(0, 10) === day)
  const feed = sortMessagesByPriority(todayMessages.length ? todayMessages : messages).slice(0, limit)
  return {
    messages: feed,
    todayCount: todayMessages.length || messages.length,
    meta: { durationMs: Date.now() - started },
  }
}

export async function getCollaborationHistory(
  prisma: PrismaClient,
  limit = 50,
): Promise<CollaborationHistoryDto> {
  await ensureSeeded(prisma)
  return { records: messages.slice(-limit).reverse(), total: messages.length }
}

export async function getWorkerCollaboration(
  prisma: PrismaClient,
  workerId: string,
): Promise<WorkerCollaborationProfileDto | null> {
  await ensureSeeded(prisma)
  if (!PIPELINE_WORKER_IDS.includes(workerId)) return null
  return buildWorkerProfile(workerId)
}

export function resetCollaborationStoreForTests(): void {
  messages = [...seedInitialMessages()]
  seeded = false
}

export { createCollaborationMessage, detectCollaborationSignals, buildCollaborationGraph }
