import {
  mockGetDigitalWorkforceSnapshot,
  mockGetDigitalWorkerDetail,
} from './mockDigitalWorkforceApi.js'

export function getDigitalWorkforceSnapshot() {
  return mockGetDigitalWorkforceSnapshot()
}

/** @param {string} workerIdOrCode */
export function getDigitalWorkerDetail(workerIdOrCode) {
  return mockGetDigitalWorkerDetail(workerIdOrCode)
}

export { subscribeDigitalWorkforceStore } from './mockDigitalWorkforceStore.js'
