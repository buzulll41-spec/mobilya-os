import { CEO_COPILOT_TOOL } from '../../contracts/v1/ceoCopilot.js'
import { runCompanyBrainScan } from '../../services/company-brain/CompanyBrain.js'

/**
 * @param {string} tool
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   todayIso: string
 *   apply?: boolean
 * }} ctx
 */
export function executeCeoCopilotTool(tool, ctx) {
  if (tool === CEO_COPILOT_TOOL.RUN_BRAIN_SCAN) {
    const result = runCompanyBrainScan({ ...ctx, apply: ctx.apply !== false })
    return { tool, ok: true, detail: `${result.decisions.length} karar`, result }
  }
  if (tool === CEO_COPILOT_TOOL.FETCH_CONTEXT) {
    return { tool, ok: true, detail: 'context refreshed' }
  }
  return { tool, ok: false, detail: 'unknown tool' }
}

export {}
