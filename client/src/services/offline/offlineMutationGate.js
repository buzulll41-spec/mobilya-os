import { OFFLINE_MUTATION_TYPE } from '../../contracts/v1/offlineFirstErp.js'
import { cachePhotoCapture } from './offlineCacheStore.js'
import { enqueueSyncItem } from './offlineSyncQueueStore.js'

/** @returns {boolean} */
export function isOfflineMode() {
  return typeof navigator !== 'undefined' && !navigator.onLine
}

/**
 * @template T
 * @param {{
 *   type: import('../../contracts/v1/offlineFirstErp.js').OfflineMutationType
 *   payload: unknown
 *   entityKey?: string
 *   localVersion?: number
 *   onlineExecutor: () => Promise<T>
 *   onQueued?: () => void | Promise<void>
 * }} input
 * @returns {Promise<T | { queued: true; id: string }>}
 */
export async function runWithOfflineQueue(input) {
  if (!isOfflineMode()) {
    return input.onlineExecutor()
  }
  const item = await enqueueSyncItem({
    type: input.type,
    payload: input.payload,
    entityKey: input.entityKey,
    localVersion: input.localVersion,
  })
  if (input.type === OFFLINE_MUTATION_TYPE.PHOTO_CAPTURE) {
    const photo = /** @type {{ id: string; orderId?: string; fileName: string; mimeType: string; dataUrl: string }} */ (
      input.payload
    )
    await cachePhotoCapture(photo)
  }
  await input.onQueued?.()
  return { queued: true, id: item.id }
}

/**
 * @param {File} file
 * @param {{ orderId?: string }} [meta]
 */
export async function queueOfflinePhotoCapture(file, meta = {}) {
  const dataUrl = await readFileAsDataUrl(file)
  const payload = {
    id: `photo-${Date.now()}`,
    orderId: meta.orderId,
    fileName: file.name,
    mimeType: file.type || 'image/jpeg',
    dataUrl,
  }
  return runWithOfflineQueue({
    type: OFFLINE_MUTATION_TYPE.PHOTO_CAPTURE,
    payload,
    onlineExecutor: async () => ({ uploaded: true, ...payload }),
    onQueued: async () => {
      await cachePhotoCapture(payload)
    },
  })
}

/**
 * @param {File} file
 * @returns {Promise<string>}
 */
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('Dosya okunamadı'))
    reader.readAsDataURL(file)
  })
}

export { OFFLINE_MUTATION_TYPE }
