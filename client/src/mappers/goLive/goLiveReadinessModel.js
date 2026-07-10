import { GO_LIVE_CHECK } from '../../contracts/v1/goLive.js'
import { getAppMode, getAppModeLabel, isProductionMode } from '../../config/appMode.js'
import { getApiBaseUrl, isUsingMockData } from '../../config/dataSource.js'
import { isCompanyBrainEnabled } from '../../config/companyBrainConfig.js'
import { isGenesisEnabled } from '../../config/genesisConfig.js'
import { loadAuthSession } from '../../services/authSessionStore.js'
import { getBackupStatus } from '../../services/backupClient.js'
import { collectSecurityPosture } from '../../services/securityCheckClient.js'
import { collectSystemHealthSnapshot } from '../../services/systemHealthClient.js'
import { getPerformanceSnapshot } from '../../lib/performanceMonitor.js'
import { buildLiveSystemHealthView } from '../pilot/systemHealthModel.js'

/** @typedef {'pass' | 'warn' | 'fail'} CheckStatus */

/**
 * @typedef {Object} GoLiveCheckItem
 * @property {string} id
 * @property {string} label
 * @property {CheckStatus} status
 * @property {string} detail
 * @property {boolean} checked
 */

/**
 * @param {Awaited<ReturnType<typeof collectSystemHealthSnapshot>>} healthRaw
 * @param {Awaited<ReturnType<typeof collectSecurityPosture>>} security
 * @param {ReturnType<typeof getBackupStatus>} backup
 * @param {ReturnType<typeof getPerformanceSnapshot>} perf
 */
export function buildGoLiveChecklist(healthRaw, security, backup, perf) {
  const health = buildLiveSystemHealthView(healthRaw)
  const apiItem = health.items.find((i) => i.id === 'api')
  const dbItem = health.items.find((i) => i.id === 'database')
  const migrationItem = health.items.find((i) => i.id === 'migration')
  const aiItem = health.items.find((i) => i.id === 'ai_workers')
  const brainItem = health.items.find((i) => i.id === 'company_brain')
  const memoryItem = health.items.find((i) => i.id === 'memory')
  const toolItem = health.items.find((i) => i.id === 'tool_engine')
  const queueItem = health.items.find((i) => i.id === 'queue')

  const session = loadAuthSession()
  const authOk = security.jwtPresent || !getApiBaseUrl() || Boolean(session?.user)

  const envOk = security.envValid && (!isProductionMode() || !isUsingMockData())

  const buildOk = typeof import.meta.env !== 'undefined' && import.meta.env.PROD === true
    ? perf.initialLoadMs == null || perf.initialLoadMs < 5000
    : true

  const backupRecent =
    backup.lastBackupAt &&
    Date.now() - new Date(backup.lastBackupAt).getTime() < 7 * 24 * 60 * 60 * 1000

  /** @param {import('../pilot/systemHealthModel.js').SystemHealthItem['tone'] | undefined} tone */
  const toneToStatus = (tone) => {
    if (tone === 'success') return /** @type {const} */ ('pass')
    if (tone === 'warning') return /** @type {const} */ ('warn')
    return /** @type {const} */ ('fail')
  }

  /** @type {GoLiveCheckItem[]} */
  const checks = [
    {
      id: GO_LIVE_CHECK.API,
      label: 'API çalışıyor',
      status: toneToStatus(apiItem?.tone),
      detail: apiItem?.detail ?? '—',
      checked: apiItem?.tone === 'success',
    },
    {
      id: GO_LIVE_CHECK.DATABASE,
      label: 'Database bağlı',
      status: toneToStatus(dbItem?.tone),
      detail: dbItem?.detail ?? '—',
      checked: dbItem?.tone === 'success',
    },
    {
      id: GO_LIVE_CHECK.MIGRATION,
      label: 'Migration güncel',
      status: migrationItem ? toneToStatus(migrationItem.tone) : isUsingMockData() ? 'warn' : 'pass',
      detail: migrationItem?.detail ?? (isUsingMockData() ? 'Mock mod — migration N/A' : 'Health endpoint migration bilgisi yok'),
      checked: migrationItem ? migrationItem.tone === 'success' : !isUsingMockData(),
    },
    {
      id: GO_LIVE_CHECK.AUTH,
      label: 'Authentication OK',
      status: authOk ? 'pass' : 'fail',
      detail: authOk ? 'Oturum / rol doğrulandı' : 'JWT veya kullanıcı oturumu eksik',
      checked: authOk,
    },
    {
      id: GO_LIVE_CHECK.AI_WORKERS,
      label: 'AI Workers çalışıyor',
      status: toneToStatus(aiItem?.tone),
      detail: aiItem?.detail ?? '—',
      checked: aiItem?.tone === 'success',
    },
    {
      id: GO_LIVE_CHECK.COMPANY_BRAIN,
      label: 'Company Brain aktif',
      status: brainItem?.tone === 'success' ? 'pass' : 'warn',
      detail: isCompanyBrainEnabled()
        ? 'Company Brain etkin'
        : 'VITE_COMPANY_BRAIN_ENABLED=false',
      checked: isCompanyBrainEnabled(),
    },
    {
      id: GO_LIVE_CHECK.MEMORY,
      label: 'Memory aktif',
      status: toneToStatus(memoryItem?.tone),
      detail: memoryItem?.detail ?? '—',
      checked: memoryItem?.tone !== 'critical',
    },
    {
      id: GO_LIVE_CHECK.TOOL_ENGINE,
      label: 'Tool Engine aktif',
      status: toneToStatus(toolItem?.tone),
      detail: toolItem?.detail ?? '—',
      checked: toolItem?.tone !== 'critical',
    },
    {
      id: GO_LIVE_CHECK.QUEUE,
      label: 'Queue boş',
      status: queueItem?.tone === 'success' ? 'pass' : toneToStatus(queueItem?.tone),
      detail: queueItem?.detail ?? '—',
      checked: queueItem?.tone === 'success',
    },
    {
      id: GO_LIVE_CHECK.BACKUP,
      label: 'Backup çalışıyor',
      status: backupRecent ? 'pass' : backup.lastBackupAt ? 'warn' : 'warn',
      detail: backup.lastBackupAt
        ? `Son yedek: ${new Date(backup.lastBackupAt).toLocaleString('tr-TR')}`
        : 'Henüz yedek alınmadı (simülasyon)',
      checked: Boolean(backup.lastBackupAt),
    },
    {
      id: GO_LIVE_CHECK.ENVIRONMENT,
      label: 'Environment doğru',
      status: envOk ? 'pass' : 'fail',
      detail: envOk
        ? `${getAppModeLabel()} · ${isUsingMockData() ? 'Mock' : 'API'}`
        : security.issues.join('; ') || 'Production + mock veri',
      checked: envOk,
    },
    {
      id: GO_LIVE_CHECK.BUILD,
      label: 'Build Production OK',
      status: buildOk ? 'pass' : 'warn',
      detail:
        typeof import.meta.env !== 'undefined' && import.meta.env.PROD
          ? `Prod build · ilk yükleme ${perf.initialLoadMs ?? '?'} ms`
          : 'Dev build — production build ile doğrulayın',
      checked: buildOk,
    },
  ]

  const passCount = checks.filter((c) => c.status === 'pass').length
  const warnCount = checks.filter((c) => c.status === 'warn').length
  const failCount = checks.filter((c) => c.status === 'fail').length

  return {
    checks,
    passCount,
    warnCount,
    failCount,
    readyForGoLive: failCount === 0 && warnCount <= 2,
    appMode: getAppMode(),
    appModeLabel: getAppModeLabel(),
    genesisEnabled: isGenesisEnabled(),
  }
}

/**
 * @param {{ passCount: number, warnCount: number, failCount: number, checks: GoLiveCheckItem[] }} checklist
 */
export function computeGoLiveScore(checklist) {
  const total = checklist.checks.length
  const passWeight = checklist.passCount / total
  const warnPenalty = checklist.warnCount * 3
  const failPenalty = checklist.failCount * 12
  const raw = Math.round(passWeight * 100 - warnPenalty - failPenalty)
  const totalScore = Math.max(0, Math.min(100, raw))

  return {
    totalScore,
    label:
      totalScore >= 90
        ? 'Canlıya hazır'
        : totalScore >= 70
          ? 'Son kontroller gerekli'
          : totalScore >= 50
            ? 'Kritik eksikler var'
            : 'Canlıya uygun değil',
    dimensions: [
      { id: 'infrastructure', label: 'Altyapı', score: scoreGroup(checklist.checks, ['api', 'database', 'migration', 'environment', 'build']) },
      { id: 'security', label: 'Güvenlik', score: scoreGroup(checklist.checks, ['auth']) },
      { id: 'ai', label: 'AI & Otomasyon', score: scoreGroup(checklist.checks, ['ai_workers', 'company_brain', 'memory', 'tool_engine', 'queue']) },
      { id: 'ops', label: 'Operasyon', score: scoreGroup(checklist.checks, ['backup']) },
    ],
  }
}

/**
 * @param {GoLiveCheckItem[]} checks
 * @param {string[]} ids
 */
function scoreGroup(checks, ids) {
  const group = checks.filter((c) => ids.includes(c.id))
  if (!group.length) return 0
  const pass = group.filter((c) => c.status === 'pass').length
  return Math.round((pass / group.length) * 100)
}

/**
 * @param {Awaited<ReturnType<typeof collectSystemHealthSnapshot>>} healthRaw
 * @param {Awaited<ReturnType<typeof collectSecurityPosture>>} security
 * @param {ReturnType<typeof getBackupStatus>} backup
 * @param {ReturnType<typeof getPerformanceSnapshot>} perf
 */
export function buildGoLiveReadinessView(healthRaw, security, backup, perf) {
  const checklist = buildGoLiveChecklist(healthRaw, security, backup, perf)
  const score = computeGoLiveScore(checklist)
  const health = buildLiveSystemHealthView(healthRaw)

  const perfOk =
    (perf.initialLoadMs == null || perf.initialLoadMs < 2000) &&
    (perf.lastTransitionMs == null || perf.lastTransitionMs < 500)

  return {
    checklist,
    score,
    health,
    security,
    backup,
    performance: {
      ...perf,
      initialLoadOk: perf.initialLoadMs == null || perf.initialLoadMs < 2000,
      transitionOk: perf.lastTransitionMs == null || perf.lastTransitionMs < 500,
      allOk: perfOk,
    },
  }
}
