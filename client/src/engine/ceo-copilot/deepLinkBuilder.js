import { CEO_COPILOT_INTENT } from '../../contracts/v1/ceoCopilot.js'
import { intentToDeepLinkPage, intentToWorkerId } from './CeoCopilotIntentEngine.js'

/**
 * @param {string} pageId
 * @param {{ workerId?: string, label?: string }} [extra]
 */
export function buildCeoCopilotDeepLink(pageId, extra = {}) {
  let hash = `#/${pageId}`
  if (extra.workerId && pageId === 'digital-workforce') {
    hash = `#/digital-workforce?worker=${encodeURIComponent(extra.workerId)}`
  }
  return {
    pageId,
    label: extra.label ?? pageId,
    hash,
  }
}

/**
 * @param {string} intent
 * @param {import('./CeoCopilotContextEngine.js').CeoCopilotContext} ctx
 */
export function buildDeepLinksForIntent(intent, ctx) {
  /** @type {{ pageId: string, label: string, hash?: string }[]} */
  const links = []

  if (intent === CEO_COPILOT_INTENT.SHOW_DETAIL && ctx.lastIntent) {
    const page = intentToDeepLinkPage(ctx.lastIntent)
    const workerId = intentToWorkerId(ctx.lastIntent)
    links.push(
      buildCeoCopilotDeepLink(page, {
        workerId: workerId ?? undefined,
        label: workerId ? `${page} · worker` : page,
      }),
    )
    return links
  }

  const page = intentToDeepLinkPage(intent)
  const workerId = intentToWorkerId(intent)
  links.push(
    buildCeoCopilotDeepLink(page, {
      workerId: workerId ?? undefined,
      label: page,
    }),
  )

  if (intent === CEO_COPILOT_INTENT.TODAY_ISSUES || intent === CEO_COPILOT_INTENT.RISKS) {
    links.push(buildCeoCopilotDeepLink('collection', { label: 'Tahsilat' }))
    links.push(buildCeoCopilotDeepLink('shipment-ops', { label: 'Sevk' }))
  }

  return links
}
