import {
  getDigitalWorker,
  getDigitalWorkforceCoreSnapshot,
  getWorkerPerformance,
  listWorkerTasks,
  listTaskHistory,
} from './mockDigitalWorkforceStore.js'

/**
 * @returns {Promise<ReturnType<typeof getDigitalWorkforceCoreSnapshot>>}
 */
export async function mockGetDigitalWorkforceSnapshot() {
  await new Promise((r) => setTimeout(r, 120))
  return getDigitalWorkforceCoreSnapshot()
}

/**
 * @param {string} workerIdOrCode
 */
export async function mockGetDigitalWorkerDetail(workerIdOrCode) {
  await new Promise((r) => setTimeout(r, 80))
  const worker = getDigitalWorker(workerIdOrCode)
  if (!worker) {
    throw new Error('Dijital çalışan bulunamadı')
  }
  return {
    worker: { ...worker },
    tasks: listWorkerTasks(worker.id),
    taskHistory: listTaskHistory(worker.id),
    performance: getWorkerPerformance(worker.id),
    queue: listWorkerTasks(worker.id).filter(
      (t) => t.status === 'WAITING' || t.status === 'HUMAN_APPROVAL',
    ),
  }
}
