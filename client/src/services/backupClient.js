const BACKUP_KEY = 'mobilya-os.last-backup'

/** @type {{ lastBackupAt: string | null, restoreTestedAt: string | null } | null} */
let memoryBackup = null

function readStore() {
  if (memoryBackup) return { ...memoryBackup }
  try {
    const raw = localStorage.getItem(BACKUP_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        lastBackupAt: typeof parsed.lastBackupAt === 'string' ? parsed.lastBackupAt : null,
        restoreTestedAt: typeof parsed.restoreTestedAt === 'string' ? parsed.restoreTestedAt : null,
      }
    }
  } catch {
    /* ignore */
  }
  return { lastBackupAt: null, restoreTestedAt: null }
}

function writeStore(data) {
  memoryBackup = { ...data }
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(data))
  } catch {
    /* ignore — test env without localStorage */
  }
}

/**
 * @returns {{ lastBackupAt: string | null, restoreTestedAt: string | null, exportReady: boolean, importReady: boolean }}
 */
export function getBackupStatus() {
  const stored = readStore()
  const apiMode = Boolean(
    typeof import.meta.env !== 'undefined' && import.meta.env.VITE_API_BASE_URL?.trim(),
  )

  return {
    ...stored,
    exportReady: apiMode,
    importReady: apiMode,
  }
}

/** Simüle edilmiş yedekleme — gerçek pg_dump backend tarafında. */
export function runSimulatedBackup() {
  const now = new Date().toISOString()
  const prev = readStore()
  const next = { ...prev, lastBackupAt: now }
  writeStore(next)
  return { ...next, exportReady: getBackupStatus().exportReady, importReady: getBackupStatus().importReady }
}

/** Simüle edilmiş restore testi. */
export function runSimulatedRestoreTest() {
  const now = new Date().toISOString()
  const prev = readStore()
  const next = { ...prev, restoreTestedAt: now, lastBackupAt: prev.lastBackupAt ?? now }
  writeStore(next)
  return { ...next, exportReady: getBackupStatus().exportReady, importReady: getBackupStatus().importReady }
}

export function clearBackupStatusForTests() {
  memoryBackup = null
  try {
    localStorage.removeItem(BACKUP_KEY)
  } catch {
    /* ignore */
  }
}
