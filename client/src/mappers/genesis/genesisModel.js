import { getGenesisSnapshot } from '../../services/genesis/GenesisEngine.js'
import { getGenesisLivingState } from '../../services/genesis/genesisStore.js'
import { listGlobalMemories } from '../../services/genesis/globalMemoryStore.js'
import { GENESIS_LIVING_PHASE } from '../../contracts/v1/genesis.js'

export function buildGenesisLivingPanelVm() {
  const living = getGenesisLivingState()
  const phaseLabels = {
    [GENESIS_LIVING_PHASE.OBSERVE]: 'Gözlemliyor',
    [GENESIS_LIVING_PHASE.DECIDE]: 'Karar üretiyor',
    [GENESIS_LIVING_PHASE.ACT]: 'Worker atıyor',
    [GENESIS_LIVING_PHASE.LEARN]: 'Öğreniyor',
    [GENESIS_LIVING_PHASE.NOTIFY]: 'CEO bilgilendiriyor',
  }
  return {
    phase: living.phase,
    phaseLabel: phaseLabels[living.phase] ?? living.phase,
    riskLevel: living.riskLevel,
    riskScore: living.riskScore,
    heartbeatCount: living.heartbeatCount,
    lastHeartbeatAt: living.lastHeartbeatAt,
    breathing: true,
  }
}

export function buildGenesisCompanyScoreVm() {
  const snapshot = getGenesisSnapshot()
  return {
    totalScore: snapshot.companyScore.totalScore,
    dimensions: snapshot.companyScore.dimensions.map((d) => ({
      id: d.id,
      label: d.label,
      score: d.score,
    })),
  }
}

export function buildGenesisPredictionsVm() {
  return getGenesisSnapshot().predictions.map((p) => ({
    ...p,
    severityLabel: p.severity === 'high' ? 'Yüksek' : p.severity === 'medium' ? 'Orta' : 'Düşük',
  }))
}

export function buildDigitalBoardMeetingVm() {
  const meeting = getGenesisSnapshot().boardMeeting
  if (!meeting) {
    return { hasMeeting: false, transcript: [], ceoSummary: 'Henüz board toplantısı yapılmadı.' }
  }
  return {
    hasMeeting: true,
    meetingAt: meeting.meetingAt,
    transcript: meeting.transcript,
    ceoSummary: meeting.ceoSummary,
  }
}

export function buildCeoChatVm() {
  return getGenesisSnapshot().chatHistory.slice().reverse()
}

export function buildGlobalMemoryPanelVm(limit = 8) {
  return listGlobalMemories(limit).map((m) => ({
    id: m.id,
    category: m.category,
    title: m.title,
    detail: m.detail,
    success: m.success,
    timeLabel: m.occurredAt.slice(11, 16),
  }))
}

export function buildGenesisHubExtras() {
  return {
    genesisLiving: buildGenesisLivingPanelVm(),
    genesisScore: buildGenesisCompanyScoreVm(),
    genesisPredictions: buildGenesisPredictionsVm(),
    boardMeeting: buildDigitalBoardMeetingVm(),
    ceoChat: buildCeoChatVm(),
    globalMemory: buildGlobalMemoryPanelVm(),
  }
}

export {}
