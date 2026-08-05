import { getApiBaseUrl, isUsingMockData } from '../../config/dataSource.js'
import { getAppMode, getAppModeLabel, isProductionMode, isRuntimeModeAllowed } from '../../config/appMode.js'

/** @typedef {'success' | 'warning' | 'critical'} HealthTone */

/**
 * @typedef {Object} SystemHealthItem
 * @property {string} id
 * @property {string} label
 * @property {HealthTone} tone
 * @property {string} detail
 * @property {number} [metric]
 */

/**
 * @param {boolean} ok
 * @param {boolean} [soft]
 */
function toneFrom(ok, soft = false) {
  if (ok) return 'success'
  return soft ? 'warning' : 'critical'
}

/**
 * @param {{
 *   apiOk?: boolean | null
 *   dbOk?: boolean | null
 *   redisOk?: boolean | null
 *   migrationCurrent?: boolean | null
 *   aiWorkersActive?: number
 *   aiWorkersTotal?: number
 *   companyBrainEnabled?: boolean
 *   queueDepth?: number
 *   aiMemoryCount?: number
 *   clientMemoryMb?: number | null
 *   toolEngineToday?: number
 *   toolEngineFailed?: number
 *   llmConfigured?: boolean | null
 *   backendQueueDepth?: number | null
 *   backendNotificationBacklog?: number | null
 *   backendStorageRecords?: number | null
 *   backendSyncStatus?: string | null
 *   backendAuditStatus?: string | null
 *   backendVersion?: string | null
 *   backendCpuPercent?: number | null
 *   backendRamMb?: number | null
 *   backendApiAvgResponseMs?: number | null
 *   backendDbResponseMs?: number | null
 *   offlinePending?: number
 *   offlineConflicts?: number
 *   offlineSyncing?: boolean
 *   polledAt?: string
 * }} input
 */
export function buildLiveSystemHealthView(input) {
  const apiBase = getApiBaseUrl()
  const apiMode = Boolean(apiBase)
  const mockData = isUsingMockData()

  const {
    apiOk = null,
    dbOk = null,
    redisOk = null,
    migrationCurrent = null,
    aiWorkersActive = 0,
    aiWorkersTotal = 0,
    companyBrainEnabled = false,
    queueDepth = 0,
    aiMemoryCount = 0,
    clientMemoryMb = null,
    toolEngineToday = 0,
    toolEngineFailed = 0,
    llmConfigured = null,
    backendQueueDepth = null,
    backendNotificationBacklog = null,
    backendStorageRecords = null,
    backendSyncStatus = null,
    backendAuditStatus = null,
    backendVersion = null,
    backendCpuPercent = null,
    backendRamMb = null,
    backendApiAvgResponseMs = null,
    backendDbResponseMs = null,
    offlinePending = 0,
    offlineConflicts = 0,
    offlineSyncing = false,
    polledAt = new Date().toISOString(),
  } = input

  const queueMetric = backendQueueDepth ?? queueDepth

  /** @type {SystemHealthItem[]} */
  const items = [
    {
      id: 'api',
      label: 'API',
      tone: !apiMode ? (isProductionMode() ? 'critical' : 'warning') : toneFrom(apiOk === true),
      detail: !apiMode
        ? isProductionMode()
          ? 'Production modunda API zorunlu'
          : 'Mock mod - yerel veri'
        : apiOk
          ? `Canli - ${apiBase}`
          : 'API yanit vermiyor',
    },
    {
      id: 'database',
      label: 'Database',
      tone: !apiMode ? (isProductionMode() ? 'critical' : 'warning') : toneFrom(dbOk === true),
      detail: !apiMode ? 'Mock store' : dbOk ? 'PostgreSQL bagli' : 'Veritabani erisilemiyor',
    },
    {
      id: 'redis',
      label: 'Redis',
      tone: redisOk === true ? 'success' : redisOk === false ? 'critical' : 'warning',
      detail:
        redisOk === true
          ? 'Redis bagli'
          : redisOk === false
            ? 'Redis erisilemiyor'
            : 'Yapilandirilmamis / opsiyonel',
    },
    {
      id: 'ai_workers',
      label: 'AI',
      tone: aiWorkersTotal === 0 ? 'warning' : toneFrom(aiWorkersActive > 0, aiWorkersActive === 0),
      detail: aiWorkersTotal === 0 ? 'Worker tanimi yok' : `${aiWorkersActive}/${aiWorkersTotal} aktif`,
      metric: aiWorkersActive,
    },
    {
      id: 'company_brain',
      label: 'Company Brain',
      tone: companyBrainEnabled ? 'success' : 'warning',
      detail: companyBrainEnabled ? 'Company Brain aktif' : 'Company Brain kapali',
    },
    {
      id: 'memory',
      label: 'Memory',
      tone: aiMemoryCount > 0 ? 'success' : 'warning',
      detail:
        aiMemoryCount === 0
          ? 'Henuz sirket hafizasi yok'
          : `${aiMemoryCount} kayit - heap ${clientMemoryMb ?? '?'} MB`,
      metric: aiMemoryCount,
    },
    {
      id: 'cpu',
      label: 'CPU',
      tone:
        backendCpuPercent == null
          ? 'warning'
          : backendCpuPercent > 90
            ? 'critical'
            : backendCpuPercent > 75
              ? 'warning'
              : 'success',
      detail:
        backendCpuPercent == null
          ? 'CPU metriği yok'
          : `${backendCpuPercent.toFixed(2)}% process kullanımı`,
      metric: backendCpuPercent ?? undefined,
    },
    {
      id: 'ram',
      label: 'RAM',
      tone:
        backendRamMb == null
          ? 'warning'
          : backendRamMb > 2048
            ? 'critical'
            : backendRamMb > 1536
              ? 'warning'
              : 'success',
      detail:
        backendRamMb == null
          ? 'RAM metriği yok'
          : `${backendRamMb.toFixed(0)} MB RSS`,
      metric: backendRamMb ?? undefined,
    },
    {
      id: 'response_time',
      label: 'Response Time',
      tone:
        backendApiAvgResponseMs == null
          ? 'warning'
          : backendApiAvgResponseMs > 800
            ? 'critical'
            : backendApiAvgResponseMs > 350
              ? 'warning'
              : 'success',
      detail:
        backendApiAvgResponseMs == null
          ? 'API gecikme metriği yok'
          : `Ortalama ${backendApiAvgResponseMs.toFixed(1)} ms`,
      metric: backendApiAvgResponseMs ?? undefined,
    },
    {
      id: 'db_response',
      label: 'DB Response',
      tone:
        backendDbResponseMs == null
          ? 'warning'
          : backendDbResponseMs > 600
            ? 'critical'
            : backendDbResponseMs > 250
              ? 'warning'
              : 'success',
      detail:
        backendDbResponseMs == null
          ? 'DB yanıt metriği yok'
          : `${backendDbResponseMs.toFixed(0)} ms`,
      metric: backendDbResponseMs ?? undefined,
    },
    {
      id: 'queue',
      label: 'Queue',
      tone: queueMetric > 120 ? 'critical' : queueMetric > 50 ? 'warning' : 'success',
      detail: queueMetric === 0 ? 'Kuyruk bos' : `${queueMetric} bekleyen gorev`,
      metric: queueMetric,
    },
    {
      id: 'offline',
      label: 'Offline',
      tone: offlineConflicts > 0 ? 'critical' : offlinePending > 0 ? 'warning' : 'success',
      detail: offlineSyncing
        ? `Senkronizasyon aktif - bekleyen ${offlinePending}`
        : `Bekleyen ${offlinePending} - catisma ${offlineConflicts}`,
      metric: offlinePending,
    },
    {
      id: 'notification',
      label: 'Notification',
      tone:
        (backendNotificationBacklog ?? 0) > 1000
          ? 'critical'
          : (backendNotificationBacklog ?? 0) > 250
            ? 'warning'
            : 'success',
      detail:
        backendNotificationBacklog == null
          ? 'Bildirim backlog bilgisi yok'
          : `${backendNotificationBacklog} event backlog`,
      metric: backendNotificationBacklog ?? 0,
    },
    {
      id: 'storage',
      label: 'Storage',
      tone: backendStorageRecords == null ? 'warning' : 'success',
      detail:
        backendStorageRecords == null
          ? 'Storage kayit bilgisi yok'
          : `${backendStorageRecords} siparis kaydi`,
      metric: backendStorageRecords ?? undefined,
    },
    {
      id: 'sync',
      label: 'Sync',
      tone: backendSyncStatus === 'down' ? 'critical' : backendSyncStatus ? 'success' : 'warning',
      detail:
        backendSyncStatus === 'down'
          ? 'Sync servisi kapali'
          : backendSyncStatus
            ? 'Sync servisi aktif'
            : 'Sync durumu bilinmiyor',
    },
    {
      id: 'audit',
      label: 'Audit',
      tone: backendAuditStatus === 'down' ? 'critical' : backendAuditStatus ? 'success' : 'warning',
      detail:
        backendAuditStatus === 'down'
          ? 'Audit event store kapali'
          : backendAuditStatus
            ? `Audit aktif - v${backendVersion ?? 'dev'}`
            : 'Audit durumu bilinmiyor',
    },
    {
      id: 'tool_engine',
      label: 'Tool Engine',
      tone: toolEngineFailed > 3 ? 'critical' : toolEngineFailed > 0 ? 'warning' : 'success',
      detail:
        toolEngineToday === 0
          ? 'Bugun calistirma yok'
          : `${toolEngineToday} calistirma - ${toolEngineFailed} hata`,
      metric: toolEngineToday,
    },
    {
      id: 'llm_provider',
      label: 'LLM Provider',
      tone:
        llmConfigured === true ? 'success' : llmConfigured === false ? 'critical' : 'warning',
      detail:
        llmConfigured === true
          ? 'LLM saglayici yapilandirildi'
          : llmConfigured === false
            ? 'LLM erisilemiyor'
            : 'Yerel mod / yapilandirilmamis',
    },
  ]

  if (migrationCurrent != null) {
    items.splice(2, 0, {
      id: 'migration',
      label: 'Migration',
      tone: toneFrom(migrationCurrent === true),
      detail: migrationCurrent ? 'Migration guncel' : 'Bekleyen migration var',
    })
  }

  const criticalCount = items.filter((i) => i.tone === 'critical').length
  const warningCount = items.filter((i) => i.tone === 'warning').length

  return {
    items,
    polledAt,
    modeLabel: getAppModeLabel(),
    envMode: getAppMode(),
    runtimeModeAllowed: isRuntimeModeAllowed(),
    dataSourceLabel: mockData ? 'Mock' : 'Canli API',
    healthy: criticalCount === 0,
    summary: {
      criticalCount,
      warningCount,
      successCount: items.length - criticalCount - warningCount,
    },
  }
}
