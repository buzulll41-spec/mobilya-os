import { CEO_COPILOT_INTENT } from '../../contracts/v1/ceoCopilot.js'
import {
  fetchCollaborationFeed,
  fetchCompanyCollaboration,
} from '../../services/collaborationClient.js'

const WORKER_LABELS = {
  'dw-collection': 'Collection AI',
  'dw-shipment': 'Shipment AI',
  'dw-sales-follow-up': 'Sales AI',
  'dw-procurement': 'Procurement AI',
  'dw-ceo-assistant': 'Executive AI',
}

/**
 * @param {string} intent
 * @param {string} message
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   todayIso: string
 * }} runtimeCtx
 */
export async function buildCollaborationCopilotReply(intent, message, runtimeCtx) {
  const company = await fetchCompanyCollaboration(runtimeCtx)
  const feed = company.feed ?? (await fetchCollaborationFeed(runtimeCtx, { limit: 10 })).messages

  if (intent === CEO_COPILOT_INTENT.COLLABORATION_TODAY_FEED) {
    const lines = feed.slice(0, 5).map(
      (m) => `${m.fromWorkerLabel} → ${m.toWorkerLabel} · ${m.type}: ${m.reason}`,
    )
    return [
      'Multi-Agent Collaboration · Bugünkü mesajlar',
      `Toplam: ${company.todayMessageCount ?? feed.length} mesaj`,
      ...(lines.length ? lines : ['Henüz worker mesajı yok']),
    ].join('\n')
  }

  if (intent === CEO_COPILOT_INTENT.COLLABORATION_MOST_HELP) {
    const workerId = company.mostHelpRequestsWorkerId ?? 'dw-collection'
    const label = WORKER_LABELS[workerId] ?? workerId
    const helpCount = feed.filter((m) => m.fromWorkerId === workerId && m.type === 'REQUEST_HELP').length
    return [
      'Multi-Agent Collaboration · En fazla yardım isteyen worker',
      `${label} · ${helpCount || '—'} REQUEST_HELP mesajı`,
    ].join('\n')
  }

  if (intent === CEO_COPILOT_INTENT.COLLABORATION_BUSIEST_TEAM) {
    return [
      'Multi-Agent Collaboration · En yoğun iş birliği',
      company.busiestTeamLabel ?? 'Sales AI ↔ Shipment AI',
      `Graph kenar sayısı: ${company.graph?.length ?? 0}`,
    ].join('\n')
  }

  void message
  return null
}

export {}
