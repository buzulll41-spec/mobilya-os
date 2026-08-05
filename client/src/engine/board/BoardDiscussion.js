import {
  BOARD_DIRECTOR_ORDER,
  BOARD_MEMBER_ID,
  BOARD_MEMBER_LABEL,
} from '../../contracts/v1/strategicBoard.js'

/** @typedef {import('../../contracts/v1/strategicBoard.js').BoardDirectorOpinionDto} BoardDirectorOpinionDto */
/** @typedef {import('../../contracts/v1/strategicBoard.js').BoardConflictDto} BoardConflictDto */

/**
 * @param {string} question
 */
export function detectBoardQuestionTopic(question) {
  const text = question.toLowerCase()
  if (/satış|sales|ciro|gelir/.test(text)) return 'sales_drop'
  if (/nakit|finans|tahsilat|cash/.test(text)) return 'finance'
  if (/teslim|operasyon|sevk|operation/.test(text)) return 'operation'
  if (/risk|iptal/.test(text)) return 'risk'
  if (/büyüme|growth|reklam|pazarlama/.test(text)) return 'growth'
  if (/tedarik|procurement|termin/.test(text)) return 'procurement'
  if (/yarın|tomorrow|odak|focus/.test(text)) return 'tomorrow_focus'
  if (/karar|decision/.test(text)) return 'decisions'
  return 'general'
}

/**
 * @param {{
 *   question: string
 *   topic: string
 *   domains: {
 *     sales: { pressure: number; score: number }
 *     collection: { pressure: number; score: number }
 *     shipment: { pressure: number; score: number }
 *     procurement: { pressure: number; score: number }
 *     criticalOrders: number
 *   }
 *   dominant: string
 * }} ctx
 * @returns {BoardDirectorOpinionDto[]}
 */
export function runBoardDiscussion(ctx) {
  const { question, topic, domains, dominant } = ctx
  const salesPressure = domains.sales?.pressure ?? 0
  const collectionPressure = domains.collection?.pressure ?? 0
  const shipmentPressure = domains.shipment?.pressure ?? 0
  const procurementPressure = domains.procurement?.pressure ?? 0

  const opinions = {
    [BOARD_MEMBER_ID.SALES]: {
      theme: 'demand',
      opinion:
        topic === 'sales_drop' || salesPressure >= 2
          ? 'Müşteri trafiği düştü · pipeline daraldı.'
          : 'Satış kanalları dengeli · dönüşüm izlenmeli.',
      confidence: topic === 'sales_drop' ? 82 : 68,
    },
    [BOARD_MEMBER_ID.FINANCE]: {
      theme: 'cash',
      opinion:
        collectionPressure >= 2
          ? 'Nakit sıkışıklığı başladı · tahsilat hızlandırılmalı.'
          : 'Finansal akış kontrollü · likidite yeterli.',
      confidence: collectionPressure >= 2 ? 78 : 70,
    },
    [BOARD_MEMBER_ID.OPERATION]: {
      theme: 'delivery',
      opinion:
        shipmentPressure >= 2 || dominant === 'shipment'
          ? 'Teslim süreleri uzadı · sevk planı sıkılaştırılmalı.'
          : 'Operasyon akışı stabil · SLA hedeflerinde.',
      confidence: shipmentPressure >= 2 ? 75 : 66,
    },
    [BOARD_MEMBER_ID.PROCUREMENT]: {
      theme: 'supply',
      opinion:
        procurementPressure >= 2 || dominant === 'procurement'
          ? 'Tedarik terminleri geriliyor · alternatif tedarikçi değerlendir.'
          : 'Tedarik hattı plan dahilinde.',
      confidence: procurementPressure >= 2 ? 74 : 65,
    },
    [BOARD_MEMBER_ID.RISK]: {
      theme: 'risk',
      opinion:
        domains.criticalOrders >= 2 || topic === 'risk'
          ? 'İptaller arttı · risk skorları yükseldi.'
          : 'Risk seviyesi yönetilebilir · kritik siparişler sınırlı.',
      confidence: domains.criticalOrders >= 2 ? 80 : 62,
    },
    [BOARD_MEMBER_ID.GROWTH]: {
      theme: 'marketing',
      opinion:
        topic === 'sales_drop' || topic === 'growth'
          ? 'Reklam performansı düştü · kampanya optimizasyonu gerekli.'
          : 'Büyüme metrikleri hedefe yakın.',
      confidence: topic === 'sales_drop' ? 76 : 64,
    },
    [BOARD_MEMBER_ID.CEO]: {
      theme: 'synthesis',
      opinion: `Soru: "${question}" · ${dominant} domain baskın · ekip görüşleri toplandı.`,
      confidence: 85,
    },
  }

  return BOARD_DIRECTOR_ORDER.map((memberId) => ({
    memberId,
    memberLabel: BOARD_MEMBER_LABEL[memberId],
    role: BOARD_MEMBER_LABEL[memberId].replace(' AI', ''),
    opinion: opinions[memberId].opinion,
    theme: opinions[memberId].theme,
    confidence: opinions[memberId].confidence,
  }))
}

/**
 * @param {BoardDirectorOpinionDto[]} discussion
 * @returns {{ hasConsensus: boolean, conflicts: BoardConflictDto[] }}
 */
export function analyzeBoardConsensus(discussion) {
  const directors = discussion.filter((d) => d.memberId !== BOARD_MEMBER_ID.CEO)
  const negativeThemes = new Set(['cash', 'risk', 'delivery'])
  const negativeCount = directors.filter((d) => negativeThemes.has(d.theme)).length
  const hasConsensus = negativeCount >= 3 || negativeCount <= 1

  /** @type {BoardConflictDto[]} */
  const conflicts = []
  const sales = directors.find((d) => d.memberId === BOARD_MEMBER_ID.SALES)
  const finance = directors.find((d) => d.memberId === BOARD_MEMBER_ID.FINANCE)
  const growth = directors.find((d) => d.memberId === BOARD_MEMBER_ID.GROWTH)

  if (sales?.theme === 'demand' && growth?.theme === 'marketing' && finance?.theme === 'cash') {
    if (sales.confidence >= 75 && finance.confidence >= 75) {
      conflicts.push({
        id: 'conf-growth-vs-cash',
        topic: 'Büyüme yatırımı vs nakit koruma',
        sides: [sales.memberLabel, finance.memberLabel],
        resolution: 'Kısa vadede nakit koruma · seçili kanallarda test bütçesi',
      })
    }
  }

  if (conflicts.length && hasConsensus) {
    return { hasConsensus: false, conflicts }
  }

  return { hasConsensus, conflicts }
}

export {}
