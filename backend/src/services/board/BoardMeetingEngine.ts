import {
  BOARD_DIRECTOR_ORDER,
  BOARD_MEMBER_ID,
  BOARD_MEMBER_LABEL,
  type BoardDirectorOpinionDto,
  type BoardMeetingRecordDto,
} from '../../contracts/strategicBoardDto.js'

export { BOARD_MEMBER_ID, BOARD_MEMBER_LABEL, BOARD_DIRECTOR_ORDER }

export function detectBoardQuestionTopic(question: string): string {
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

export function runBoardDiscussion(ctx: {
  question: string
  topic: string
  domains: {
    sales: { pressure: number; score: number }
    collection: { pressure: number; score: number }
    shipment: { pressure: number; score: number }
    procurement: { pressure: number; score: number }
    criticalOrders: number
  }
  dominant: string
}): BoardDirectorOpinionDto[] {
  const { question, topic, domains, dominant } = ctx
  const opinions: Record<string, { theme: string; opinion: string; confidence: number }> = {
    [BOARD_MEMBER_ID.SALES]: {
      theme: 'demand',
      opinion:
        topic === 'sales_drop' || domains.sales.pressure >= 2
          ? 'Müşteri trafiği düştü · pipeline daraldı.'
          : 'Satış kanalları dengeli · dönüşüm izlenmeli.',
      confidence: topic === 'sales_drop' ? 82 : 68,
    },
    [BOARD_MEMBER_ID.FINANCE]: {
      theme: 'cash',
      opinion:
        domains.collection.pressure >= 2
          ? 'Nakit sıkışıklığı başladı · tahsilat hızlandırılmalı.'
          : 'Finansal akış kontrollü · likidite yeterli.',
      confidence: domains.collection.pressure >= 2 ? 78 : 70,
    },
    [BOARD_MEMBER_ID.OPERATION]: {
      theme: 'delivery',
      opinion:
        domains.shipment.pressure >= 2 || dominant === 'shipment'
          ? 'Teslim süreleri uzadı · sevk planı sıkılaştırılmalı.'
          : 'Operasyon akışı stabil · SLA hedeflerinde.',
      confidence: domains.shipment.pressure >= 2 ? 75 : 66,
    },
    [BOARD_MEMBER_ID.PROCUREMENT]: {
      theme: 'supply',
      opinion:
        domains.procurement.pressure >= 2 || dominant === 'procurement'
          ? 'Tedarik terminleri geriliyor · alternatif tedarikçi değerlendir.'
          : 'Tedarik hattı plan dahilinde.',
      confidence: domains.procurement.pressure >= 2 ? 74 : 65,
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

export function buildExecutiveSummary(input: {
  question: string
  discussion: BoardDirectorOpinionDto[]
  topic: string
  dominant: string
  todayIso: string
}) {
  const directors = input.discussion.filter((d) => d.memberId !== BOARD_MEMBER_ID.CEO)
  const sorted = [...directors].sort((a, b) => b.confidence - a.confidence)
  const topDecisions = sorted.slice(0, 3).map((d, i) => `${i + 1}. ${d.memberLabel}: ${d.opinion}`)

  return {
    headline:
      input.topic === 'sales_drop'
        ? 'Satış düşüşü — yönetim kurulu değerlendirmesi'
        : `Strategic Board · ${input.todayIso}`,
    narrative: directors.map((d) => `${d.memberLabel}: ${d.opinion}`).join('\n'),
    topDecisions,
    tomorrowFocus: sorted.slice(0, 3).map((d) => `${d.role}: ${d.opinion.split('·')[0].trim()}`),
    hasConsensus: true,
    conflicts: [],
  }
}

let seq = 0

export function runStrategicBoardMeeting(input: {
  question: string
  todayIso: string
  occurredAt?: string
}): BoardMeetingRecordDto {
  seq += 1
  const topic = detectBoardQuestionTopic(input.question)
  const domains = {
    sales: { pressure: 2, score: 3 },
    collection: { pressure: 2, score: 3 },
    shipment: { pressure: 1, score: 2 },
    procurement: { pressure: 1, score: 1 },
    criticalOrders: 2,
  }
  const discussion = runBoardDiscussion({
    question: input.question,
    topic,
    domains,
    dominant: 'collection',
  })
  const executiveSummary = buildExecutiveSummary({
    question: input.question,
    discussion,
    topic,
    dominant: 'collection',
    todayIso: input.todayIso,
  })

  return {
    id: `board-${Date.now()}-${seq}`,
    question: input.question,
    occurredAt: input.occurredAt ?? `${input.todayIso}T10:00:00.000Z`,
    participantIds: [...BOARD_DIRECTOR_ORDER],
    discussion,
    executiveSummary,
    result: executiveSummary.headline,
  }
}

export function resetBoardMeetingEngineSeqForTests(): void {
  seq = 0
}
