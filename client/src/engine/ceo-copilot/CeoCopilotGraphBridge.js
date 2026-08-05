import { CEO_COPILOT_INTENT } from '../../contracts/v1/ceoCopilot.js'
import { GRAPH_QUERY } from '../../contracts/v1/knowledgeGraph.js'
import { fetchGraphQuery } from '../../services/graphClient.js'
import { extractEmployeeNameFromMessage } from './CeoCopilotIntentEngine.js'

/**
 * @param {string} intent
 * @param {string} message
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   collectionRows?: import('../../contracts/v1/collectionRowVm.js').CollectionRowVM[]
 *   todayIso: string
 * }} runtimeCtx
 */
export async function buildGraphCopilotReply(intent, message, runtimeCtx) {
  if (intent === CEO_COPILOT_INTENT.GRAPH_OVERDUE_READY) {
    const result = await fetchGraphQuery(GRAPH_QUERY.OVERDUE_PAYMENT_READY_SHIPMENT, {}, runtimeCtx)
    const orders = result.nodes.filter((n) => n.type === 'Order')
    if (!orders.length) {
      return 'Knowledge Graph: Tahsilatı geciken ve sevki hazır sipariş bulunamadı.'
    }
    const lines = orders.slice(0, 8).map((o) => {
      const cust = result.nodes.find(
        (n) => n.type === 'Customer' && result.matches.some((m) => m.some((x) => x.id === n.id && m.some((y) => y.id === o.id))),
      )
      return `• ${o.label}${cust ? ` · ${cust.label}` : ''}`
    })
    return [
      `Knowledge Graph (${result.path.join(' → ')})`,
      `${orders.length} sipariş eşleşti (${result.meta.durationMs}ms)`,
      ...lines,
    ].join('\n')
  }

  if (intent === CEO_COPILOT_INTENT.GRAPH_EMPLOYEE_RISKY) {
    const employee = extractEmployeeNameFromMessage(message) || 'Nazlı'
    const result = await fetchGraphQuery(
      GRAPH_QUERY.EMPLOYEE_RISKY_CUSTOMERS,
      { employee, name: employee },
      runtimeCtx,
    )
    const customers = result.nodes.filter((n) => n.type === 'Customer')
    const risks = result.nodes.filter((n) => n.type === 'Risk')
    if (!customers.length) {
      return `Knowledge Graph: ${employee} için riskli müşteri bulunamadı.`
    }
    return [
      `Knowledge Graph (${result.path.join(' → ')})`,
      `${employee} · ${customers.length} riskli müşteri · ${risks.length} risk`,
      ...customers.slice(0, 6).map((c) => `• ${c.label}`),
    ].join('\n')
  }

  return null
}
