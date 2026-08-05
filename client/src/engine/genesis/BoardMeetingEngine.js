/** @typedef {import('../../contracts/v1/genesis.js').BoardMeetingUtterance} BoardMeetingUtterance */

/**
 * @param {{
 *   todayIso: string
 *   scenario?: string
 *   stats?: { decisionsToday?: number, tasksCompleted?: number }
 *   predictions?: { label: string }[]
 * }} input
 */
export function runDigitalBoardMeeting(input) {
  const { todayIso, scenario = 'BALANCED', stats = {}, predictions = [] } = input

  /** @type {BoardMeetingUtterance[]} */
  const transcript = [
    {
      speaker: 'AI Sales',
      role: 'Sales',
      message: `Bugün ${stats.decisionsToday ?? 0} operasyon kararı izlendi. Satış pipeline ${scenario === 'ORDER_SPIKE' ? 'yoğun' : 'kontrollü'}.`,
    },
    {
      speaker: 'AI Collection',
      role: 'Collection',
      message:
        scenario === 'COLLECTION_DROP'
          ? 'Tahsilat hedefi geride — yarın agresif takip öneriyorum.'
          : 'Tahsilat akışı plan dahilinde.',
    },
    {
      speaker: 'AI Shipment',
      role: 'Shipment',
      message:
        scenario === 'ORDER_SPIKE'
          ? 'Sevk kapasitesi zorlanıyor — ek planlama gerekli.'
          : 'Sevk operasyonu stabil.',
    },
    {
      speaker: 'AI Procurement',
      role: 'Procurement',
      message:
        scenario === 'SUPPLY_STOPPED'
          ? 'Tedarik gecikmesi kritik — satış ve sevk yavaşlatılmalı.'
          : 'Tedarik hattı normal.',
    },
    {
      speaker: 'Company Manager',
      role: 'Executive',
      message: `Gün özeti: ${stats.tasksCompleted ?? 0} görev tamamlandı. Senaryo: ${scenario}.`,
    },
  ]

  if (predictions.length) {
    transcript.push({
      speaker: 'Company Brain',
      role: 'Genesis',
      message: `Yarın tahminleri: ${predictions.slice(0, 2).map((p) => p.label).join(' · ')}`,
    })
  }

  const ceoSummary = [
    `Digital Board Meeting · ${todayIso}`,
    `Senaryo: ${scenario}`,
    `Tamamlanan görev: ${stats.tasksCompleted ?? 0}`,
    predictions[0] ? `Öncelik: ${predictions[0].label}` : 'Operasyon dengeli',
  ].join(' · ')

  return {
    meetingAt: `${todayIso}T00:00:00.000Z`,
    transcript,
    ceoSummary,
    insights: transcript.map((t) => `${t.speaker}: ${t.message}`),
  }
}

export {}
