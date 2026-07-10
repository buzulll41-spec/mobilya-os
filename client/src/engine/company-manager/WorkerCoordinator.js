import { WORKER_PRIORITY } from '../../contracts/v1/digitalWorker.js'
import {
  AI_COLLECTION_SPECIALIST_WORKER_ID,
} from '../../contracts/v1/aiCollectionSpecialist.js'
import { AI_PROCUREMENT_SPECIALIST_WORKER_ID } from '../../contracts/v1/aiProcurementSpecialist.js'
import { AI_SALES_FOLLOW_UP_WORKER_ID } from '../../contracts/v1/aiSalesFollowUp.js'
import { AI_SHIPMENT_SPECIALIST_WORKER_ID } from '../../contracts/v1/aiShipmentSpecialist.js'
import { COMPANY_MANAGER_DECISION } from '../../contracts/v1/aiCompanyManager.js'
import {
  cancelWorkerTask,
  createCoordinatorTask,
  enqueueWorkerTask,
  pauseDigitalWorker,
  reassignWorkerTask,
  resumeDigitalWorker,
  setWorkerQueuePriority,
} from '../../services/mockDigitalWorkforceStore.js'

/** @typedef {import('../../contracts/v1/aiCompanyManager.js').CompanyManagerDecisionDto} CompanyManagerDecisionDto */
/** @typedef {import('../../contracts/v1/workerTask.js').WorkerTask} WorkerTask */

/**
 * @param {CompanyManagerDecisionDto} decision
 */
export function applyCompanyManagerDecision(decision) {
  switch (decision.type) {
    case COMPANY_MANAGER_DECISION.RUN_SALES:
      if (decision.workerId) resumeDigitalWorker(decision.workerId)
      break
    case COMPANY_MANAGER_DECISION.COLLECTION_WAIT:
      if (decision.workerId) pauseDigitalWorker(decision.workerId, decision.reason ?? decision.message)
      break
    case COMPANY_MANAGER_DECISION.COLLECTION_PRIORITY:
      if (decision.workerId) {
        resumeDigitalWorker(decision.workerId)
        setWorkerQueuePriority(decision.workerId, decision.priority ?? WORKER_PRIORITY.HIGH)
      }
      break
    case COMPANY_MANAGER_DECISION.SHIPMENT_PRIORITY:
      if (decision.workerId) {
        resumeDigitalWorker(decision.workerId)
        setWorkerQueuePriority(decision.workerId, WORKER_PRIORITY.CRITICAL)
      }
      break
    case COMPANY_MANAGER_DECISION.PROCUREMENT_STOP:
      if (decision.workerId) pauseDigitalWorker(decision.workerId, decision.reason ?? decision.message)
      break
    case COMPANY_MANAGER_DECISION.SHIPMENT_PAUSE:
    case COMPANY_MANAGER_DECISION.SALES_PAUSE:
      if (decision.workerId) pauseDigitalWorker(decision.workerId, decision.reason ?? decision.message)
      break
    case COMPANY_MANAGER_DECISION.WORKER_PRIORITY_SET:
      if (decision.workerId && decision.priority) {
        setWorkerQueuePriority(decision.workerId, decision.priority)
      }
      break
    case COMPANY_MANAGER_DECISION.WORKLOAD_REASSIGN:
      if (decision.taskId && decision.targetWorkerId) {
        reassignWorkerTask(decision.taskId, decision.targetWorkerId)
      }
      break
    case COMPANY_MANAGER_DECISION.CEO_NOTIFY:
      break
    case COMPANY_MANAGER_DECISION.RESUME_WORKER:
      if (decision.workerId) resumeDigitalWorker(decision.workerId)
      break
    case COMPANY_MANAGER_DECISION.CREATE_TASK:
      if (decision.targetWorkerId && decision.orderId) {
        const task = createCoordinatorTask({
          workerId: decision.targetWorkerId,
          orderId: decision.orderId,
          title: decision.message,
          priority: decision.priority ?? WORKER_PRIORITY.HIGH,
        })
        enqueueWorkerTask(task)
      }
      break
    case COMPANY_MANAGER_DECISION.CANCEL_TASK:
      if (decision.taskId) cancelWorkerTask(decision.taskId, decision.reason ?? decision.message)
      break
    case COMPANY_MANAGER_DECISION.REASSIGN_TASK:
      if (decision.taskId && decision.targetWorkerId) {
        reassignWorkerTask(decision.taskId, decision.targetWorkerId)
      }
      break
    case COMPANY_MANAGER_DECISION.RISK_REDUCED:
      break
    default:
      break
  }
}

/**
 * @param {CompanyManagerDecisionDto[]} decisions
 */
export function applyCompanyManagerDecisions(decisions) {
  for (const decision of decisions) {
    applyCompanyManagerDecision(decision)
  }
}

export const WORKER_BY_DOMAIN = {
  sales: AI_SALES_FOLLOW_UP_WORKER_ID,
  shipment: AI_SHIPMENT_SPECIALIST_WORKER_ID,
  collection: AI_COLLECTION_SPECIALIST_WORKER_ID,
  procurement: AI_PROCUREMENT_SPECIALIST_WORKER_ID,
}

export {}
