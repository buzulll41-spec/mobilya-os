import { runCompanyBrainScan } from '../../services/company-brain/CompanyBrain.js'
import { getCompanyBrainDecisionLog } from '../../services/company-brain/companyBrainStore.js'
import { getLastGenesisBoardMeeting, getGenesisLivingState } from '../../services/genesis/genesisStore.js'
import { getGenesisSnapshot } from '../../services/genesis/GenesisEngine.js'

/** @typedef {import('../../contracts/v1/genesis.js').CeoChatMessage} CeoChatMessage */

/**
 * @param {string} message
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   todayIso: string
 * }} context
 */
export function handleCeoChatMessage(message, context) {
  const normalized = message.trim().toLowerCase()
  const snapshot = getGenesisSnapshot()
  const living = getGenesisLivingState()
  const lastDecision = getCompanyBrainDecisionLog(1)[0]
  const board = getLastGenesisBoardMeeting()

  /** @type {string[]} */
  const actionsTaken = []
  let reply = 'Genesis Engine aktif — şirket durumu izleniyor.'

  if (/sorun|problem|ne oluyor/.test(normalized)) {
    reply = [
      `Şirket risk seviyesi: ${living.riskLevel} (skor ${living.riskScore}).`,
      snapshot.predictions[0]
        ? `Öncelikli tahmin: ${snapshot.predictions[0].label}`
        : 'Kritik tahmin yok.',
      lastDecision ? `Son karar: ${lastDecision.message}` : 'Henüz karar üretilmedi.',
    ].join(' ')
  } else if (/neden|açıkla/.test(normalized)) {
    reply = lastDecision
      ? `${lastDecision.type}: ${lastDecision.message}${lastDecision.reason ? ` — ${lastDecision.reason}` : ''}`
      : board
        ? `Son board toplantısı: ${board.ceoSummary}`
        : 'Henüz açıklanacak karar kaydı yok.'
  } else if (/çöz|düzelt|uygula|fix/.test(normalized)) {
    const scan = runCompanyBrainScan({ ...context, apply: true })
    actionsTaken.push('runCompanyBrainScan')
    reply = `${scan.decisions.length} karar üretildi ve uygulandı. Senaryo: ${scan.scenario ?? 'BALANCED'}.`
  } else {
    reply = `Anladım: "${message}". "Sorun ne?", "Neden?" veya "Çöz." diyebilirsiniz. Skor: ${snapshot.companyScore.totalScore}/100.`
  }

  return {
    ceo: {
      id: `ceo-${Date.now()}`,
      role: /** @type {const} */ ('ceo'),
      content: message,
      occurredAt: new Date().toISOString(),
    },
    genesis: {
      id: `gen-${Date.now()}`,
      role: /** @type {const} */ ('genesis'),
      content: reply,
      occurredAt: new Date().toISOString(),
      actionsTaken,
    },
  }
}

export {}
