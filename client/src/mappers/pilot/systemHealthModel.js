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

    polledAt = new Date().toISOString(),

  } = input



  /** @type {SystemHealthItem[]} */

  const items = [

    {

      id: 'api',

      label: 'API',

      tone: !apiMode ? (isProductionMode() ? 'critical' : 'warning') : toneFrom(apiOk === true),

      detail: !apiMode

        ? isProductionMode()

          ? 'Production modunda API zorunlu'

          : 'Mock mod — yerel veri'

        : apiOk

          ? `Canlı · ${apiBase}`

          : 'API yanıt vermiyor',

    },

    {

      id: 'database',

      label: 'Database',

      tone: !apiMode ? (isProductionMode() ? 'critical' : 'warning') : toneFrom(dbOk === true),

      detail: !apiMode

        ? 'Mock store'

        : dbOk

          ? 'PostgreSQL bağlı'

          : 'Veritabanı erişilemiyor',

    },

    {

      id: 'redis',

      label: 'Redis',

      tone:

        redisOk === true

          ? 'success'

          : redisOk === false

            ? 'critical'

            : 'warning',

      detail:

        redisOk === true

          ? 'Redis bağlı'

          : redisOk === false

            ? 'Redis erişilemiyor'

            : 'Yapılandırılmamış / opsiyonel',

    },

    {

      id: 'ai_workers',

      label: 'AI',

      tone: aiWorkersTotal === 0 ? 'warning' : toneFrom(aiWorkersActive > 0, aiWorkersActive === 0),

      detail:

        aiWorkersTotal === 0

          ? 'Worker tanımı yok'

          : `${aiWorkersActive}/${aiWorkersTotal} aktif`,

      metric: aiWorkersActive,

    },

    {

      id: 'company_brain',

      label: 'Company Brain',

      tone: companyBrainEnabled ? 'success' : 'warning',

      detail: companyBrainEnabled ? 'Company Brain aktif' : 'Company Brain kapalı',

    },

    {

      id: 'memory',

      label: 'Memory',

      tone: aiMemoryCount > 0 ? 'success' : 'warning',

      detail:

        aiMemoryCount === 0

          ? 'Henüz şirket hafızası yok'

          : `${aiMemoryCount} kayıt · heap ${clientMemoryMb ?? '?'} MB`,

      metric: aiMemoryCount,

    },

    {

      id: 'queue',

      label: 'Queue',

      tone: queueDepth > 120 ? 'critical' : queueDepth > 50 ? 'warning' : 'success',

      detail: queueDepth === 0 ? 'Kuyruk boş' : `${queueDepth} bekleyen görev`,

      metric: queueDepth,

    },

    {

      id: 'tool_engine',

      label: 'Tool Engine',

      tone: toolEngineFailed > 3 ? 'critical' : toolEngineFailed > 0 ? 'warning' : 'success',

      detail:

        toolEngineToday === 0

          ? 'Bugün çalıştırma yok'

          : `${toolEngineToday} çalıştırma · ${toolEngineFailed} hata`,

      metric: toolEngineToday,

    },

    {

      id: 'llm_provider',

      label: 'LLM Provider',

      tone:

        llmConfigured === true

          ? 'success'

          : llmConfigured === false

            ? 'critical'

            : 'warning',

      detail:

        llmConfigured === true

          ? 'LLM sağlayıcı yapılandırıldı'

          : llmConfigured === false

            ? 'LLM erişilemiyor'

            : 'Yerel mod / yapılandırılmamış',

    },

  ]



  if (migrationCurrent != null) {

    items.splice(2, 0, {

      id: 'migration',

      label: 'Migration',

      tone: toneFrom(migrationCurrent === true),

      detail: migrationCurrent ? 'Migration güncel' : 'Bekleyen migration var',

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

    dataSourceLabel: mockData ? 'Mock' : 'Canlı API',

    healthy: criticalCount === 0,

    summary: { criticalCount, warningCount, successCount: items.length - criticalCount - warningCount },

  }

}


