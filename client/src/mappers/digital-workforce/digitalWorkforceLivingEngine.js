import { DIGITAL_WORKER_STATUS } from '../../contracts/v1/digitalWorker.js'
import {
  AI_SPECIALIST_WORKER_IDS,
  resolveDigitalWorkerTheme,
} from './digitalWorkforceExperience.js'
import {
  getAiEmployeeRunState,
  isAiEmployeeRunActive,
} from '../../services/ai-employee/aiEmployeeActivityStore.js'

/** @typedef {'IDLE' | 'THINKING' | 'WORKING' | 'CALLING' | 'WAITING' | 'COMPLETED'} AiLivingStatus */

/** @type {Record<AiLivingStatus, AiLivingStatus>} */
export const AI_LIVING_STATUS = /** @type {const} */ ({
  IDLE: 'IDLE',
  THINKING: 'THINKING',
  WORKING: 'WORKING',
  CALLING: 'CALLING',
  WAITING: 'WAITING',
  COMPLETED: 'COMPLETED',
})

/** Demo modunda otomatik akış sırası. */
export const AI_LIVING_STATUS_CYCLE = /** @type {const} */ ([
  AI_LIVING_STATUS.WAITING,
  AI_LIVING_STATUS.THINKING,
  AI_LIVING_STATUS.WORKING,
  AI_LIVING_STATUS.CALLING,
  AI_LIVING_STATUS.COMPLETED,
  AI_LIVING_STATUS.IDLE,
])

/** @type {Record<AiLivingStatus, { label: string, emoji: string, tone: string, cardClass: string }>} */
export const AI_LIVING_STATUS_META = {
  [AI_LIVING_STATUS.IDLE]: {
    label: 'Hazır',
    emoji: '⚪',
    tone: 'neutral',
    cardClass: 'dw-card--living-idle',
  },
  [AI_LIVING_STATUS.THINKING]: {
    label: 'Thinking',
    emoji: '🔵',
    tone: 'info',
    cardClass: 'dw-card--living-thinking',
  },
  [AI_LIVING_STATUS.WORKING]: {
    label: 'Working',
    emoji: '🟢',
    tone: 'success',
    cardClass: 'dw-card--living-working',
  },
  [AI_LIVING_STATUS.CALLING]: {
    label: 'Calling',
    emoji: '🟡',
    tone: 'warning',
    cardClass: 'dw-card--living-calling',
  },
  [AI_LIVING_STATUS.WAITING]: {
    label: 'Waiting',
    emoji: '⚪',
    tone: 'muted',
    cardClass: 'dw-card--living-waiting',
  },
  [AI_LIVING_STATUS.COMPLETED]: {
    label: 'Completed',
    emoji: '✅',
    tone: 'success',
    cardClass: 'dw-card--living-completed',
  },
}

/** @type {Record<AiLivingStatus, number>} ms */
export const AI_LIVING_PHASE_DURATIONS = {
  [AI_LIVING_STATUS.WAITING]: 2400,
  [AI_LIVING_STATUS.THINKING]: 2800,
  [AI_LIVING_STATUS.WORKING]: 3200,
  [AI_LIVING_STATUS.CALLING]: 2600,
  [AI_LIVING_STATUS.COMPLETED]: 2000,
  [AI_LIVING_STATUS.IDLE]: 1800,
}

/** @type {Record<string, Record<AiLivingStatus, string[]>>} */
export const AI_LIVING_MESSAGES = {
  sales: {
    [AI_LIVING_STATUS.WAITING]: ['Yeni görev kuyruğa alındı…'],
    [AI_LIVING_STATUS.THINKING]: [
      'Ayşe Yılmaz siparişi inceleniyor…',
      'Termin hesaplanıyor…',
      'Müşteri geçmişi taranıyor…',
    ],
    [AI_LIVING_STATUS.WORKING]: [
      'Telefon hazırlanıyor…',
      'Takip planı güncelleniyor…',
      'Satış notları derleniyor…',
    ],
    [AI_LIVING_STATUS.CALLING]: ['Müşteri aranıyor…', 'Müşteri cevap bekleniyor…'],
    [AI_LIVING_STATUS.COMPLETED]: ['Görev tamamlandı.'],
    [AI_LIVING_STATUS.IDLE]: ['Yeni görev bekleniyor…'],
  },
  collection: {
    [AI_LIVING_STATUS.WAITING]: ['Tahsilat kuyruğu hazırlanıyor…'],
    [AI_LIVING_STATUS.THINKING]: [
      'Vadesi geçen ödeme hesaplanıyor…',
      'Risk puanı hesaplanıyor…',
      'Bakiye analizi yapılıyor…',
    ],
    [AI_LIVING_STATUS.WORKING]: [
      'Tahsilat planı oluşturuluyor…',
      'Ödeme hatırlatması hazırlanıyor…',
    ],
    [AI_LIVING_STATUS.CALLING]: ['Müşteri aranıyor…', 'Ödeme teyidi bekleniyor…'],
    [AI_LIVING_STATUS.COMPLETED]: ['Tahsilat tamamlandı.'],
    [AI_LIVING_STATUS.IDLE]: ['Yeni görev bekleniyor…'],
  },
  shipment: {
    [AI_LIVING_STATUS.WAITING]: ['Sevk kuyruğu kontrol ediliyor…'],
    [AI_LIVING_STATUS.THINKING]: [
      'Sevk tarihi kontrol ediliyor…',
      'SSH kontrol ediliyor…',
      'Depo durumu inceleniyor…',
    ],
    [AI_LIVING_STATUS.WORKING]: [
      'Araç planlanıyor…',
      'Montaj ekibi atanıyor…',
      'Sevk rotası oluşturuluyor…',
    ],
    [AI_LIVING_STATUS.CALLING]: ['Müşteri aranıyor…', 'Montaj ekibi bilgilendiriliyor…'],
    [AI_LIVING_STATUS.COMPLETED]: ['Sevk tamamlandı.'],
    [AI_LIVING_STATUS.IDLE]: ['Yeni görev bekleniyor…'],
  },
  procurement: {
    [AI_LIVING_STATUS.WAITING]: ['Tedarik kuyruğu hazırlanıyor…'],
    [AI_LIVING_STATUS.THINKING]: [
      'Termin güncelleniyor…',
      'Eksik ürün kontrolü…',
      'Tedarikçi performansı inceleniyor…',
    ],
    [AI_LIVING_STATUS.WORKING]: [
      'Tedarikçi aranıyor…',
      'Sipariş oluşturuldu…',
      'Tedarik planı güncelleniyor…',
    ],
    [AI_LIVING_STATUS.CALLING]: ['Tedarikçi aranıyor…', 'Termin teyidi bekleniyor…'],
    [AI_LIVING_STATUS.COMPLETED]: ['Tedarik tamamlandı.'],
    [AI_LIVING_STATUS.IDLE]: ['Yeni görev bekleniyor…'],
  },
}

/** @type {Record<AiLivingStatus, number>} */
const AI_LIVING_PROGRESS_ANCHORS = {
  [AI_LIVING_STATUS.WAITING]: 8,
  [AI_LIVING_STATUS.THINKING]: 28,
  [AI_LIVING_STATUS.WORKING]: 58,
  [AI_LIVING_STATUS.CALLING]: 82,
  [AI_LIVING_STATUS.COMPLETED]: 100,
  [AI_LIVING_STATUS.IDLE]: 0,
}

/**
 * @typedef {{
 *   workerId: string
 *   status: AiLivingStatus
 *   message: string
 *   statusLabel: string
 *   statusEmoji: string
 *   statusTone: string
 *   cardClass: string
 *   progress: number
 *   progressLabel: string
 *   progressBlocks: string
 *   lastActionAt: number
 *   lastActionLabel: string
 *   showCompletedAnim: boolean
 *   showNewTaskAnim: boolean
 *   isActive: boolean
 * }} WorkerLivingVm
 */

/**
 * @param {number} sinceMs
 * @param {number} [nowMs]
 */
export function formatLiveRelativeTime(sinceMs, nowMs = Date.now()) {
  if (!sinceMs || sinceMs <= 0) return 'Henüz işlem yok'
  const diffSec = Math.max(0, Math.floor((nowMs - sinceMs) / 1000))
  if (diffSec < 3) return 'Şimdi'
  if (diffSec < 10) return 'Az önce'
  if (diffSec < 60) return `${diffSec} saniye önce`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} dakika önce`
  return `${Math.floor(diffMin / 60)} saat önce`
}

/**
 * @param {AiLivingStatus} status
 * @param {number} phaseElapsedMs
 * @param {number} [phaseDurationMs]
 */
export function computeLivingTaskProgress(status, phaseElapsedMs, phaseDurationMs) {
  if (status === AI_LIVING_STATUS.COMPLETED) return 100
  if (status === AI_LIVING_STATUS.IDLE) return 0
  const base = AI_LIVING_PROGRESS_ANCHORS[status] ?? 0
  const duration = phaseDurationMs ?? AI_LIVING_PHASE_DURATIONS[status] ?? 3000
  const nextIdx = AI_LIVING_STATUS_CYCLE.indexOf(status) + 1
  const nextStatus = AI_LIVING_STATUS_CYCLE[nextIdx] ?? AI_LIVING_STATUS.COMPLETED
  const nextBase = AI_LIVING_PROGRESS_ANCHORS[nextStatus] ?? 100
  const ratio = Math.min(1, Math.max(0, phaseElapsedMs / duration))
  return Math.min(99, Math.round(base + (nextBase - base) * ratio))
}

/**
 * @param {number} progress
 */
export function buildProgressBlocks(progress) {
  const filled = Math.round(progress / 100 * 6)
  return `${'■'.repeat(filled)}${'□'.repeat(6 - filled)}`
}

/**
 * @param {string} workerId
 * @param {AiLivingStatus} status
 * @param {number} messageIndex
 */
export function resolveLivingMessage(workerId, status, messageIndex = 0) {
  const theme = resolveDigitalWorkerTheme(workerId)
  const pool = AI_LIVING_MESSAGES[theme.id]?.[status] ?? AI_LIVING_MESSAGES.sales[status]
  if (!pool?.length) return 'İşlem devam ediyor…'
  return pool[messageIndex % pool.length]
}

/**
 * @param {AiLivingStatus} status
 */
export function resolveLivingStatusMeta(status) {
  return AI_LIVING_STATUS_META[status] ?? AI_LIVING_STATUS_META[AI_LIVING_STATUS.IDLE]
}

/**
 * @param {AiLivingStatus} current
 */
export function advanceLivingStatus(current) {
  const idx = AI_LIVING_STATUS_CYCLE.indexOf(current)
  if (idx < 0) return AI_LIVING_STATUS.WAITING
  const next = AI_LIVING_STATUS_CYCLE[(idx + 1) % AI_LIVING_STATUS_CYCLE.length]
  return next
}

/**
 * @param {import('../../contracts/v1/digitalWorker.js').DigitalWorker['status']} storeStatus
 * @param {boolean} hasPending
 * @param {boolean} isRunning
 */
export function inferInitialLivingStatus(storeStatus, hasPending, isRunning) {
  if (isRunning || storeStatus === DIGITAL_WORKER_STATUS.RUNNING) return AI_LIVING_STATUS.WORKING
  if (storeStatus === DIGITAL_WORKER_STATUS.HUMAN_APPROVAL) return AI_LIVING_STATUS.CALLING
  if (hasPending || storeStatus === DIGITAL_WORKER_STATUS.WAITING) return AI_LIVING_STATUS.WAITING
  return AI_LIVING_STATUS.IDLE
}

/**
 * @typedef {{
 *   status: AiLivingStatus
 *   phaseStartedAt: number
 *   messageIndex: number
 *   lastActionAt: number
 *   lastPendingCount: number
 *   hasWork: boolean
 *   showCompletedAnim: boolean
 *   showNewTaskAnim: boolean
 *   completedAnimUntil: number
 *   newTaskAnimUntil: number
 * }} WorkerLivingState
 */

/** @returns {WorkerLivingState} */
function createWorkerLivingState(status = AI_LIVING_STATUS.IDLE, now = Date.now()) {
  return {
    status,
    phaseStartedAt: now,
    messageIndex: 0,
    lastActionAt: now,
    lastPendingCount: 0,
    hasWork: false,
    showCompletedAnim: false,
    showNewTaskAnim: false,
    completedAnimUntil: 0,
    newTaskAnimUntil: 0,
  }
}

/**
 * @param {WorkerLivingState} state
 * @param {string} workerId
 * @param {number} nowMs
 */
export function buildWorkerLivingVm(state, workerId, nowMs = Date.now()) {
  const meta = resolveLivingStatusMeta(state.status)
  const phaseElapsed = nowMs - state.phaseStartedAt
  const progress = computeLivingTaskProgress(
    state.status,
    phaseElapsed,
    AI_LIVING_PHASE_DURATIONS[state.status],
  )
  const message = resolveLivingMessage(workerId, state.status, state.messageIndex)
  const showCompletedAnim = state.showCompletedAnim && nowMs < state.completedAnimUntil
  const showNewTaskAnim = state.showNewTaskAnim && nowMs < state.newTaskAnimUntil

  return {
    workerId,
    status: state.status,
    message,
    statusLabel: meta.label,
    statusEmoji: meta.emoji,
    statusTone: meta.tone,
    cardClass: meta.cardClass,
    progress,
    progressLabel: `${progress}%`,
    progressBlocks: buildProgressBlocks(progress),
    lastActionAt: state.lastActionAt,
    lastActionLabel: formatLiveRelativeTime(state.lastActionAt, nowMs),
    showCompletedAnim,
    showNewTaskAnim,
    isActive:
      state.status === AI_LIVING_STATUS.WORKING ||
      state.status === AI_LIVING_STATUS.THINKING ||
      state.status === AI_LIVING_STATUS.CALLING,
  }
}

/**
 * FAZ 29A — tek motor, WorkerStore olayları + tick ile yönetilir.
 */
export class DigitalWorkforceLivingEngine {
  constructor() {
    /** @type {Map<string, WorkerLivingState>} */
    this.states = new Map()
    this.dirty = false
    this.tickVersion = 0
  }

  reset() {
    this.states.clear()
    this.dirty = false
    this.tickVersion = 0
  }

  /** @param {string} workerId */
  getOrCreateState(workerId, now = Date.now()) {
    let state = this.states.get(workerId)
    if (!state) {
      state = createWorkerLivingState(AI_LIVING_STATUS.IDLE, now)
      this.states.set(workerId, state)
    }
    return state
  }

  /**
   * WorkerStore snapshot ile senkronize et.
   * @param {{
   *   workers: import('../../contracts/v1/digitalWorker.js').DigitalWorker[]
   *   tasks: import('../../contracts/v1/workerTask.js').WorkerTask[]
   *   taskHistory: import('../../contracts/v1/workerTask.js').WorkerTaskHistoryEntry[]
   * }} snapshot
   * @param {number} [nowMs]
   */
  syncFromSnapshot(snapshot, nowMs = Date.now()) {
    for (const workerId of AI_SPECIALIST_WORKER_IDS) {
      const worker = snapshot.workers.find((w) => w.id === workerId)
      const pending = snapshot.tasks.filter(
        (t) =>
          t.workerId === workerId &&
          (t.status === DIGITAL_WORKER_STATUS.WAITING ||
            t.status === DIGITAL_WORKER_STATUS.RUNNING ||
            t.status === DIGITAL_WORKER_STATUS.HUMAN_APPROVAL ||
            t.status === DIGITAL_WORKER_STATUS.PREPARING),
      ).length
      const running = snapshot.tasks.some(
        (t) => t.workerId === workerId && t.status === DIGITAL_WORKER_STATUS.RUNNING,
      )
      const state = this.getOrCreateState(workerId, nowMs)
      const employeeRun = getAiEmployeeRunState(workerId)
      if (isAiEmployeeRunActive(employeeRun) && employeeRun) {
        state.status = AI_LIVING_STATUS.WORKING
        state.phaseStartedAt = employeeRun.startedAt ?? nowMs
        state.lastActionAt = nowMs
        state.hasWork = true
        state.lastPendingCount = pending
        this.dirty = true
        continue
      }

      const hadWork = state.hasWork
      state.hasWork = pending > 0 || running

      if (pending > state.lastPendingCount) {
        state.status = AI_LIVING_STATUS.WAITING
        state.phaseStartedAt = nowMs
        state.messageIndex = 0
        state.showNewTaskAnim = true
        state.newTaskAnimUntil = nowMs + 900
        state.lastActionAt = nowMs
        this.dirty = true
      } else if (!state.hasWork && hadWork && state.status !== AI_LIVING_STATUS.COMPLETED) {
        state.status = AI_LIVING_STATUS.COMPLETED
        state.phaseStartedAt = nowMs
        state.showCompletedAnim = true
        state.completedAnimUntil = nowMs + 2000
        state.lastActionAt = nowMs
        this.dirty = true
      } else if (state.hasWork && state.status === AI_LIVING_STATUS.IDLE && !state.showCompletedAnim) {
        state.status = inferInitialLivingStatus(worker?.status ?? DIGITAL_WORKER_STATUS.PREPARING, pending > 0, running)
        state.phaseStartedAt = nowMs
        this.dirty = true
      }

      state.lastPendingCount = pending
    }
    if (this.dirty) this.tickVersion += 1
  }

  /** @param {number} nowMs */
  tick(nowMs = Date.now()) {
    let changed = false

    for (const workerId of AI_SPECIALIST_WORKER_IDS) {
      const state = this.getOrCreateState(workerId, nowMs)
      const employeeRun = getAiEmployeeRunState(workerId)
      if (isAiEmployeeRunActive(employeeRun)) {
        changed = true
        continue
      }

      const duration = AI_LIVING_PHASE_DURATIONS[state.status] ?? 2500
      const elapsed = nowMs - state.phaseStartedAt

      if (state.showCompletedAnim && nowMs >= state.completedAnimUntil) {
        state.showCompletedAnim = false
        changed = true
      }
      if (state.showNewTaskAnim && nowMs >= state.newTaskAnimUntil) {
        state.showNewTaskAnim = false
        changed = true
      }

      const nextMessageIndex = Math.floor(elapsed / 2200)
      if (nextMessageIndex !== state.messageIndex) {
        state.messageIndex = nextMessageIndex
        changed = true
      }

      if (state.hasWork && elapsed >= duration) {
        const next = advanceLivingStatus(state.status)
        state.status = next
        state.phaseStartedAt = nowMs
        state.messageIndex = 0
        state.lastActionAt = nowMs
        if (next === AI_LIVING_STATUS.COMPLETED) {
          state.showCompletedAnim = true
          state.completedAnimUntil = nowMs + 2000
        }
        changed = true
      } else if (!state.hasWork && state.status !== AI_LIVING_STATUS.IDLE && state.status !== AI_LIVING_STATUS.COMPLETED) {
        if (elapsed >= duration) {
          state.status = AI_LIVING_STATUS.IDLE
          state.phaseStartedAt = nowMs
          changed = true
        }
      } else if (
        !state.hasWork &&
        state.status === AI_LIVING_STATUS.COMPLETED &&
        elapsed >= AI_LIVING_PHASE_DURATIONS[AI_LIVING_STATUS.COMPLETED]
      ) {
        state.status = AI_LIVING_STATUS.IDLE
        state.phaseStartedAt = nowMs
        changed = true
      } else if (
        !state.hasWork &&
        state.status === AI_LIVING_STATUS.IDLE &&
        elapsed >= AI_LIVING_PHASE_DURATIONS[AI_LIVING_STATUS.IDLE] &&
        state.lastPendingCount > 0
      ) {
        state.status = AI_LIVING_STATUS.THINKING
        state.phaseStartedAt = nowMs
        state.hasWork = true
        changed = true
      }
    }

    if (changed) {
      this.dirty = true
      this.tickVersion += 1
    }
    return changed
  }

  consumeDirty() {
    const was = this.dirty
    this.dirty = false
    return was
  }

  /** @param {number} [nowMs] */
  getLivingMap(nowMs = Date.now()) {
    /** @type {Record<string, WorkerLivingVm>} */
    const out = {}
    for (const workerId of AI_SPECIALIST_WORKER_IDS) {
      const state = this.getOrCreateState(workerId, nowMs)
      out[workerId] = buildWorkerLivingVm(state, workerId, nowMs)
    }
    return out
  }

  /**
   * Living durumlara göre KPI overlay.
   * @param {ReturnType<import('./digitalWorkforceModel.js').buildDigitalWorkforceExperienceKpis>} baseKpis
   * @param {Record<string, WorkerLivingVm>} livingMap
   */
  overlayLiveKpis(baseKpis, livingMap) {
    const activeAi = Object.values(livingMap).filter(
      (v) => v.isActive || v.status === AI_LIVING_STATUS.WAITING,
    ).length
    const workingNow = Object.values(livingMap).filter((v) => v.status === AI_LIVING_STATUS.WORKING).length

    return baseKpis.map((kpi) => {
      if (kpi.id === 'active-ai') {
        return {
          ...kpi,
          value: String(Math.max(Number.parseInt(kpi.value, 10) || 0, activeAi)),
          valueTone: activeAi > 0 ? 'success' : kpi.valueTone,
          liveHint: workingNow > 0 ? `${workingNow} çalışıyor` : undefined,
        }
      }
      return kpi
    })
  }

  /**
   * @param {object} card
   * @param {WorkerLivingVm | undefined} living
   */
  enrichCard(card, living) {
    if (!living) return card
    return {
      ...card,
      livingStatus: living.status,
      livingStatusLabel: living.statusLabel,
      livingStatusEmoji: living.statusEmoji,
      livingStatusTone: living.statusTone,
      livingMessage: living.message,
      livingCardClass: living.cardClass,
      livingProgress: living.progress,
      livingProgressLabel: living.progressLabel,
      livingProgressBlocks: living.progressBlocks,
      lastActionLabel: living.lastActionLabel,
      isPulsing: living.status === AI_LIVING_STATUS.WORKING,
      showLivingCompleted: living.showCompletedAnim,
      showLivingNewTask: living.showNewTaskAnim,
    }
  }

  /**
   * @param {object} taskRow
   * @param {AiLivingStatus} [livingStatus]
   * @param {number} [progress]
   */
  enrichTaskRow(taskRow, livingStatus, progress) {
    const p =
      progress ??
      (livingStatus ? AI_LIVING_PROGRESS_ANCHORS[livingStatus] ?? 0 : 0)
    return {
      ...taskRow,
      progress: p,
      progressLabel: `${p}%`,
      progressBlocks: buildProgressBlocks(p),
    }
  }

  /**
   * @param {object} detail
   * @param {WorkerLivingVm | undefined} living
   * @param {number} [nowMs]
   */
  enrichDetail(detail, living, nowMs = Date.now()) {
    if (!living) return detail
    const enrichList = (list) =>
      list.map((task, index) =>
        this.enrichTaskRow(
          task,
          index === 0 ? living.status : undefined,
          index === 0 ? living.progress : task.status === 'COMPLETED' ? 100 : undefined,
        ),
      )

    return {
      ...this.enrichCard(detail, living),
      lastActionLabel: formatLiveRelativeTime(living.lastActionAt, nowMs),
      todayTasks: enrichList(detail.todayTasks ?? []),
      pendingTasks: enrichList(detail.pendingTasks ?? []),
      completedTasks: (detail.completedTasks ?? []).map((t) =>
        this.enrichTaskRow(t, AI_LIVING_STATUS.COMPLETED, 100),
      ),
      taskHistory: detail.taskHistory ?? [],
      createdTasks: enrichList(detail.createdTasks ?? []),
    }
  }
}

/** @type {DigitalWorkforceLivingEngine | null} */
let sharedEngine = null

export function getDigitalWorkforceLivingEngine() {
  if (!sharedEngine) sharedEngine = new DigitalWorkforceLivingEngine()
  return sharedEngine
}

export function resetDigitalWorkforceLivingEngine() {
  if (sharedEngine) sharedEngine.reset()
  sharedEngine = null
}
