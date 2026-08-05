import { collectSecurityPosture } from './securityCheckClient.js'
import { collectSystemHealthSnapshot } from './systemHealthClient.js'
import { getBackupStatus } from './backupClient.js'
import { getPerformanceSnapshot } from '../lib/performanceMonitor.js'
import { buildGoLiveReadinessView } from '../mappers/goLive/goLiveReadinessModel.js'

export async function collectGoLiveReadinessSnapshot() {
  const [healthRaw, security] = await Promise.all([
    collectSystemHealthSnapshot(),
    collectSecurityPosture(),
  ])
  const backup = getBackupStatus()
  const perf = getPerformanceSnapshot()

  return buildGoLiveReadinessView(healthRaw, security, backup, perf)
}
