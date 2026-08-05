/** @typedef {import('../../contracts/v1/automationJob.js').AutomationJobDto} AutomationJobDto */
/** @typedef {import('../../contracts/v1/automationJob.js').AutomationJobsResponseDto} AutomationJobsResponseDto */

const PRIORITY_RANK = { P1: 1, P2: 2, P3: 3, P4: 4, P5: 5 }
const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED', 'CANCELLED'])
const ACTIVE_STATUSES = new Set(['CREATED', 'WAITING_APPROVAL', 'APPROVED', 'EXECUTING'])

export const JOB_TYPE_LABEL = {
  CREATE_COLLECTION_CASE: 'Tahsilat Vakası',
  CREATE_SHIPMENT_CASE: 'Sevk Vakası',
  CREATE_DATA_QUALITY_CASE: 'Veri Kalitesi',
  CREATE_SOURCE_REVIEW_CASE: 'Kaynak İnceleme',
  CREATE_PROFIT_REVIEW_CASE: 'Kâr İnceleme',
  CREATE_SALES_REVIEW_CASE: 'Satış İnceleme',
}

export const STATUS_LABEL = {
  CREATED: 'Bekleyen',
  WAITING_APPROVAL: 'Onay Bekliyor',
  APPROVED: 'Onaylandı',
  EXECUTING: 'Çalışıyor',
  COMPLETED: 'Tamamlandı',
  FAILED: 'Hatalı',
  CANCELLED: 'İptal',
}

/** Tablo durum görünümü — ERP V1 sadeleştirilmiş etiketler */
export const DISPLAY_STATUS_LABEL = {
  waiting: 'Bekliyor',
  ready: 'Hazır',
  running: 'Çalışıyor',
  completed: 'Tamamlandı',
  failed: 'Hatalı',
  cancelled: 'İptal',
}

const TRIGGER_SOURCE_LABEL = {
  action: 'Aksiyon Merkezi',
  forecast: 'Tahmin Motoru',
  profitability: 'Kârlılık Analizi',
}

export const QUICK_FILTERS = [
  { id: 'all', label: 'Tümü' },
  { id: 'waiting-approval', label: 'Onay Bekleyen' },
  { id: 'ready', label: 'Hazır' },
  { id: 'running', label: 'Çalışan' },
  { id: 'completed', label: 'Tamamlanan' },
  { id: 'failed', label: 'Hatalı' },
  { id: 'critical', label: 'Kritik' },
]

/**
 * @param {AutomationJobDto} job
 */
export function isJobReady(job) {
  return (job.status === 'CREATED' && !job.requiresApproval) || job.status === 'APPROVED'
}

/**
 * @param {AutomationJobDto} job
 */
export function isJobRunning(job) {
  return job.status === 'EXECUTING'
}

/**
 * @param {AutomationJobDto} job
 */
export function isJobCritical(job) {
  return job.priority === 'P1' && ACTIVE_STATUSES.has(job.status)
}

/**
 * @param {string} id
 */
function formatJobNumber(id) {
  return id.replace(/^job:/, 'AUTO-').replace(/:/g, '-')
}

/**
 * @param {AutomationJobDto} job
 */
function approvalLabel(job) {
  if (!job.requiresApproval) return 'Gerekmez'
  if (job.approvedBy) return 'Onaylandı'
  if (job.status === 'WAITING_APPROVAL') return 'Bekliyor'
  if (job.status === 'CANCELLED') return 'İptal'
  return 'Gerekli'
}

/**
 * @param {string} raw
 */
function parseTurkishAmount(raw) {
  if (!raw) return null
  const n = Number.parseInt(String(raw).replace(/\./g, ''), 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * @param {number} amount
 */
function formatAmountTL(amount) {
  return `${amount.toLocaleString('tr-TR')} TL`
}

/**
 * @param {string} text
 * @returns {string|null}
 */
function parseMoneyLabel(text) {
  if (!text) return null

  if (text.includes('→')) {
    const amounts = [...text.matchAll(/(\d{1,3}(?:\.\d{3})+|\d+)\s*₺/g)].map((m) => m[1])
    if (amounts.length >= 2) {
      const prev = parseTurkishAmount(amounts[0])
      const cur = parseTurkishAmount(amounts[1])
      if (prev != null && cur != null && prev > cur) return formatAmountTL(prev - cur)
    }
  }

  const patterns = [
    /açık bakiye\s+(\d{1,3}(?:\.\d{3})+|\d+)\s*₺/i,
    /riskli alacak\s*\((\d{1,3}(?:\.\d{3})+|\d+)\s*₺\)/i,
    /projeksiyon\s+(\d{1,3}(?:\.\d{3})+|\d+)\s*₺/i,
    /(\d{1,3}(?:\.\d{3})+|\d+)\s*₺\s*brüt kâr/i,
    /(\d{1,3}(?:\.\d{3})+|\d+)\s*₺/,
    /(\d{1,3}(?:\.\d{3})+|\d+)\s*TL/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const amount = parseTurkishAmount(match[1])
      if (amount != null) return formatAmountTL(amount)
    }
  }

  return null
}

/**
 * @param {string} reason
 */
function parseCustomerFromReason(reason) {
  if (!reason) return null
  const dash = reason.match(/^(.+?)\s+—/)
  if (dash) return dash[1].trim()
  const order = reason.match(/^(.+?)\s+sipariş/i)
  if (order) return order[1].trim()
  return null
}

/**
 * @param {string} reason
 */
function parseProductFromReason(reason) {
  if (!reason) return null
  const match = reason.match(/^(.+?)\s+\(/)
  return match ? match[1].trim() : null
}

/**
 * @param {string} reason
 */
function parseProfitDropPct(reason) {
  if (!reason) return null
  const match = reason.match(/%(\d+(?:[.,]\d+)?)\s*azaldı/i)
  if (!match) return null
  const pct = Number.parseFloat(match[1].replace(',', '.'))
  return Number.isFinite(pct) ? pct : null
}

/**
 * @param {string} reason
 */
function parseSourceLabelFromReason(reason) {
  if (!reason) return null
  const match = reason.match(/^(.+?)\s+(?:brüt kâr|kaynağının)/i)
  return match ? match[1].trim() : null
}

/**
 * @param {AutomationJobDto} job
 */
function buildEffectLabel(job) {
  const reason = job.reason ?? ''
  const money = parseMoneyLabel(reason)
  const customer = parseCustomerFromReason(reason)
  const product = parseProductFromReason(reason)
  const source = parseSourceLabelFromReason(reason)
  const dropPct = parseProfitDropPct(reason)

  if (job.jobType === 'CREATE_COLLECTION_CASE') {
    if (money) return `${money} riskli alacak için tahsilat vakası oluştur`
    if (customer) return `${customer} için tahsilat vakası oluştur`
    return 'Riskli alacak için tahsilat vakası oluştur'
  }

  if (job.jobType === 'CREATE_SHIPMENT_CASE') {
    if (customer) return `${customer} siparişi için geciken sevk vakası oluştur`
    return 'Geciken sevk vakası oluştur'
  }

  if (job.jobType === 'CREATE_DATA_QUALITY_CASE') {
    if (product) return `${product} için maliyet düzeltme vakası oluştur`
    return 'Eksik maliyet için veri kalitesi vakası oluştur'
  }

  if (job.jobType === 'CREATE_SOURCE_REVIEW_CASE') {
    if (product) return `${product} için satış kaynağı inceleme vakası oluştur`
    return 'Bilinmeyen satış kaynağı için inceleme vakası oluştur'
  }

  if (job.jobType === 'CREATE_PROFIT_REVIEW_CASE') {
    if (source && dropPct != null) {
      return `${source} kaynağında %${dropPct} kâr düşüşü için inceleme vakası oluştur`
    }
    if (source) return `${source} kâr performansı için inceleme vakası oluştur`
    return 'Kâr düşüşü için inceleme vakası oluştur'
  }

  if (job.jobType === 'CREATE_SALES_REVIEW_CASE') {
    return 'Hedef altı satış performansı için inceleme vakası başlat'
  }

  if (job.title) return job.title
  return JOB_TYPE_LABEL[job.jobType] ?? job.jobType
}

/**
 * @param {AutomationJobDto} job
 */
function buildExpectedGainLabel(job) {
  const reason = job.reason ?? ''
  const money = parseMoneyLabel(reason)
  const dropPct = parseProfitDropPct(reason)

  if (job.jobType === 'CREATE_COLLECTION_CASE') {
    return money ?? 'Tahsilat kazanımı'
  }

  if (job.jobType === 'CREATE_SHIPMENT_CASE') {
    return 'Sevk açılacak'
  }

  if (job.jobType === 'CREATE_DATA_QUALITY_CASE') {
    return 'Maliyet doğruluğu'
  }

  if (job.jobType === 'CREATE_SOURCE_REVIEW_CASE') {
    return 'Kaynak netleşecek'
  }

  if (job.jobType === 'CREATE_PROFIT_REVIEW_CASE') {
    if (money) return money
    if (dropPct != null) return `%${dropPct} kâr düşüşü`
    return 'Kâr korunumu'
  }

  if (job.jobType === 'CREATE_SALES_REVIEW_CASE') {
    return money ?? 'Hedef geri kazanımı'
  }

  return money ?? '—'
}

/**
 * @param {AutomationJobDto} job
 * @returns {'waiting'|'ready'|'running'|'completed'|'failed'|'cancelled'}
 */
function displayStatusTone(job) {
  if (job.status === 'EXECUTING') return 'running'
  if (job.status === 'COMPLETED') return 'completed'
  if (job.status === 'FAILED') return 'failed'
  if (job.status === 'CANCELLED') return 'cancelled'
  if (isJobReady(job)) return 'ready'
  return 'waiting'
}

/**
 * @param {AutomationJobDto} job
 */
function displayStatusLabel(job) {
  return DISPLAY_STATUS_LABEL[displayStatusTone(job)] ?? (STATUS_LABEL[job.status] ?? job.status)
}

/**
 * @param {AutomationJobDto[]} jobs
 * @param {AutomationJobsResponseDto['summary']} summary
 */
function buildFirstRecommendedAction(jobs, summary) {
  const waiting = summary.waitingApprovalCount ?? 0
  if (waiting > 0) return `${waiting} onay bekleyen otomasyonu incele`

  const criticalReady = jobs.filter((j) => j.priority === 'P1' && isJobReady(j)).length
  if (criticalReady > 0) return `${criticalReady} kritik otomasyonu çalıştır`

  const failed = summary.failedCount ?? 0
  if (failed > 0) return `${failed} hatalı otomasyonu gözden geçir`

  const ready = jobs.filter((j) => isJobReady(j)).length
  if (ready > 0) return `${ready} çalışmaya hazır otomasyonu değerlendir`

  return null
}

/**
 * @param {AutomationJobDto} job
 */
function lastRunLabel(job) {
  if (job.executedAt) return job.executedAt.slice(0, 16).replace('T', ' ')
  if (job.updatedAt) return job.updatedAt.slice(0, 16).replace('T', ' ')
  return (job.createdAt ?? '').slice(0, 10) || '—'
}

/**
 * @param {AutomationJobDto} job
 */
function nextActionLabel(job) {
  if (job.status === 'WAITING_APPROVAL') return 'Onay bekleniyor'
  if (isJobReady(job)) return 'Çalıştırılabilir'
  if (job.status === 'EXECUTING') return 'Çalışıyor'
  if (job.status === 'COMPLETED') return 'Tamamlandı'
  if (job.status === 'FAILED') return 'Yeniden değerlendir'
  if (job.status === 'CANCELLED') return '—'
  return job.recommendedAction ?? '—'
}

/**
 * @param {AutomationJobDto} job
 */
function canApproveJob(job) {
  return job.status === 'WAITING_APPROVAL'
}

/**
 * @param {AutomationJobDto} job
 */
function canRunJob(job) {
  return isJobReady(job)
}

/**
 * @param {AutomationJobDto} job
 */
function canCancelJob(job) {
  return !TERMINAL_STATUSES.has(job.status)
}

/**
 * @param {AutomationJobDto} job
 * @returns {import('./automationCenterWarRoomModel.js').AutomationTableRow}
 */
function buildTableRow(job) {
  return {
    id: job.id,
    jobNumber: formatJobNumber(job.id),
    source: TRIGGER_SOURCE_LABEL[job.triggerSource] ?? job.triggerSource,
    typeLabel: JOB_TYPE_LABEL[job.jobType] ?? job.jobType,
    status: job.status,
    statusLabel: displayStatusLabel(job),
    statusTone: displayStatusTone(job),
    approvalLabel: approvalLabel(job),
    effectLabel: buildEffectLabel(job),
    expectedGainLabel: buildExpectedGainLabel(job),
    lastRunLabel: lastRunLabel(job),
    nextActionLabel: nextActionLabel(job),
    priority: job.priority,
    priorityRank: PRIORITY_RANK[job.priority] ?? 5,
    isCritical: isJobCritical(job),
    isTerminal: TERMINAL_STATUSES.has(job.status),
    canApprove: canApproveJob(job),
    canRun: canRunJob(job),
    canCancel: canCancelJob(job),
    job,
  }
}

/**
 * @param {AutomationJobDto[]} jobs
 * @param {string} filterId
 */
export function filterAutomationRows(jobs, filterId) {
  const rows = jobs.map(buildTableRow)
  if (filterId === 'all') return rows
  if (filterId === 'waiting-approval') return rows.filter((r) => r.status === 'WAITING_APPROVAL')
  if (filterId === 'ready') return rows.filter((r) => isJobReady(r.job))
  if (filterId === 'running') return rows.filter((r) => isJobRunning(r.job))
  if (filterId === 'completed') return rows.filter((r) => r.status === 'COMPLETED')
  if (filterId === 'failed') return rows.filter((r) => r.status === 'FAILED')
  if (filterId === 'critical') return rows.filter((r) => r.isCritical)
  return rows
}

/**
 * @param {AutomationJobDto[]} jobs
 */
export function buildAutomationFilterCounts(jobs) {
  const rows = jobs.map(buildTableRow)
  return {
    all: rows.length,
    'waiting-approval': rows.filter((r) => r.status === 'WAITING_APPROVAL').length,
    ready: rows.filter((r) => isJobReady(r.job)).length,
    running: rows.filter((r) => isJobRunning(r.job)).length,
    completed: rows.filter((r) => r.status === 'COMPLETED').length,
    failed: rows.filter((r) => r.status === 'FAILED').length,
    critical: rows.filter((r) => r.isCritical).length,
  }
}

/**
 * @typedef {Object} AutomationTableRow
 * @property {string} id
 * @property {string} jobNumber
 * @property {string} source
 * @property {string} typeLabel
 * @property {AutomationJobDto['status']} status
 * @property {string} statusLabel
 * @property {'waiting'|'ready'|'running'|'completed'|'failed'|'cancelled'} statusTone
 * @property {string} approvalLabel
 * @property {string} effectLabel
 * @property {string} expectedGainLabel
 * @property {string} lastRunLabel
 * @property {string} nextActionLabel
 * @property {AutomationJobDto['priority']} priority
 * @property {number} priorityRank
 * @property {boolean} isCritical
 * @property {boolean} isTerminal
 * @property {boolean} canApprove
 * @property {boolean} canRun
 * @property {boolean} canCancel
 * @property {AutomationJobDto} job
 */

/**
 * @typedef {Object} AutomationWarRoomView
 * @property {import('../../components/erp-ops/ErpOpsSummaryStrip.jsx').ErpSummaryMetric[]} kpiMetrics
 * @property {{ id: string, label: string, count: number }[]} todayFocusItems
 * @property {AutomationTableRow[]} rows
 * @property {Record<string, number>} filterCounts
 */

/**
 * @param {AutomationJobsResponseDto} data
 * @returns {AutomationWarRoomView}
 */
export function buildAutomationCenterWarRoomView(data) {
  const jobs = data.jobs ?? []
  const s = data.summary ?? {
    totalJobs: 0,
    waitingApprovalCount: 0,
    autoRunReadyCount: 0,
    executingCount: 0,
    completedCount: 0,
    failedCount: 0,
  }

  const readyCount = jobs.filter((j) => isJobReady(j)).length
  const runningCount = jobs.filter((j) => isJobRunning(j)).length
  const criticalReadyCount = jobs.filter((j) => j.priority === 'P1' && isJobReady(j)).length

  /** @type {import('../../components/erp-ops/ErpOpsSummaryStrip.jsx').ErpSummaryMetric[]} */
  const kpiMetrics = [
    { id: 'total', label: 'Toplam Otomasyon', value: String(s.totalJobs) },
    {
      id: 'waiting-approval',
      label: 'Onay Bekleyen',
      value: String(s.waitingApprovalCount),
      valueTone: 'warning',
      itemTone: 'warning',
    },
    {
      id: 'ready',
      label: 'Çalışmaya Hazır',
      value: String(readyCount),
      itemTone: 'operation',
    },
    {
      id: 'running',
      label: 'Çalışan',
      value: String(runningCount),
      itemTone: 'purple',
    },
    {
      id: 'completed',
      label: 'Tamamlanan',
      value: String(s.completedCount),
      valueTone: 'success',
      itemTone: 'success',
    },
    {
      id: 'failed',
      label: 'Hatalı',
      value: String(s.failedCount),
      valueTone: 'critical',
      itemTone: 'critical',
    },
  ]

  /** @type {{ id: string, label: string, count: number }[]} */
  const todayFocusItems = [
    { id: 'approval', label: 'otomasyon onay bekliyor', count: s.waitingApprovalCount },
    { id: 'critical-ready', label: 'kritik otomasyon çalıştırılabilir', count: criticalReadyCount },
    { id: 'failed', label: 'otomasyon hata verdi', count: s.failedCount },
  ]

  const rows = [...jobs]
    .map(buildTableRow)
    .sort((a, b) => {
      if (a.priorityRank !== b.priorityRank) return a.priorityRank - b.priorityRank
      const aTs = a.job.updatedAt ?? a.job.createdAt ?? ''
      const bTs = b.job.updatedAt ?? b.job.createdAt ?? ''
      return aTs < bTs ? 1 : aTs > bTs ? -1 : a.id.localeCompare(b.id)
    })

  return {
    kpiMetrics,
    todayFocusItems,
    firstRecommendedAction: buildFirstRecommendedAction(jobs, s),
    rows,
    filterCounts: buildAutomationFilterCounts(jobs),
  }
}

/**
 * @param {AutomationJobDto} job
 */
export function buildAutomationTimeline(job) {
  /** @type {{ at: string, message: string, actor?: string }[]} */
  const events = []
  if (job.createdAt) {
    events.push({ at: job.createdAt, message: 'Otomasyon oluşturuldu' })
  }
  if (job.requiresApproval && job.status !== 'CREATED') {
    if (job.approvedBy) {
      events.push({
        at: job.updatedAt ?? job.createdAt,
        message: 'Onaylandı',
        actor: job.approvedBy,
      })
    } else if (job.status === 'WAITING_APPROVAL') {
      events.push({
        at: job.updatedAt ?? job.createdAt,
        message: 'Onay bekleniyor',
      })
    }
  }
  if (job.status === 'EXECUTING') {
    events.push({
      at: job.updatedAt ?? job.createdAt,
      message: 'Çalıştırılıyor',
    })
  }
  if (job.executedAt) {
    events.push({
      at: job.executedAt,
      message: job.status === 'FAILED' ? 'Çalıştırma hatası' : 'Başarıyla çalıştırıldı',
    })
  }
  if (job.status === 'CANCELLED') {
    events.push({
      at: job.updatedAt ?? job.createdAt,
      message: 'İptal edildi',
    })
  }
  if (job.status === 'COMPLETED' && !job.executedAt) {
    events.push({
      at: job.updatedAt ?? job.createdAt,
      message: 'Tamamlandı',
    })
  }

  return events.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
}

/**
 * @param {AutomationJobDto['priority']} priority
 */
export function riskLabelForPriority(priority) {
  if (priority === 'P1') return 'Yüksek'
  if (priority === 'P2') return 'Orta'
  return 'Düşük'
}
