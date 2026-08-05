import { DIGITAL_WORKER_STATUS, WORKER_PRIORITY } from '../../contracts/v1/digitalWorker.js'
import { COMPANY_MANAGER_DECISION } from '../../contracts/v1/aiCompanyManager.js'
import { PIPELINE_WORKERS } from '../company-manager/ConflictResolver.js'

/** @typedef {import('../../contracts/v1/aiCompanyManager.js').CompanyManagerDecisionDto} CompanyManagerDecisionDto */
/** @typedef {import('../../contracts/v1/workerTask.js').WorkerTask} WorkerTask */
/** @typedef {import('../../contracts/v1/digitalWorker.js').DigitalWorker} DigitalWorker */

/**
 * @param {WorkerTask[]} tasks
 * @param {DigitalWorker[]} workers
 */
export function computeWorkerLoads(tasks, workers) {
  return PIPELINE_WORKERS.map((workerId) => {
    const worker = workers.find((w) => w.id === workerId)
    const pending = tasks.filter(
      (t) =>
        t.workerId === workerId &&
        (t.status === DIGITAL_WORKER_STATUS.WAITING ||
          t.status === DIGITAL_WORKER_STATUS.HUMAN_APPROVAL),
    ).length
    const running = tasks.filter(
      (t) => t.workerId === workerId && t.status === DIGITAL_WORKER_STATUS.RUNNING,
    ).length
    return {
      workerId,
      workerName: worker?.name ?? workerId,
      pending,
      running,
      load: pending + running * 2,
      active: worker?.enabled && worker?.status !== DIGITAL_WORKER_STATUS.PAUSED,
    }
  })
}

/**
 * @param {{
 *   tasks: WorkerTask[]
 *   workers: DigitalWorker[]
 *   buildDecision: (type: CompanyManagerDecisionDto['type'], message: string, extra?: Partial<CompanyManagerDecisionDto>) => CompanyManagerDecisionDto
 *   overloadThreshold?: number
 * }} input
 */
export function balanceWorkerLoad(input) {
  const { tasks, workers, buildDecision, overloadThreshold = 5 } = input
  const loads = computeWorkerLoads(tasks, workers)
  const overloaded = loads.filter((l) => l.active && l.pending >= overloadThreshold)
  const underloaded = loads
    .filter((l) => l.active && l.pending <= 1)
    .sort((a, b) => a.load - b.load)

  /** @type {CompanyManagerDecisionDto[]} */
  const decisions = []
  /** @type {import('../../contracts/v1/aiCompany.js').CompanyMapEdgeDto[]} */
  const edges = []

  for (const over of overloaded) {
    const target = loads
      .filter((l) => l.active && l.workerId !== over.workerId && l.load < over.load - 2)
      .sort((a, b) => a.load - b.load)[0]
    if (!target) continue

    const transferable = tasks.find(
      (t) =>
        t.workerId === over.workerId &&
        t.status === DIGITAL_WORKER_STATUS.WAITING &&
        t.priority !== WORKER_PRIORITY.CRITICAL,
    )
    if (!transferable) continue

    decisions.push(
      buildDecision(
        COMPANY_MANAGER_DECISION.WORKLOAD_REASSIGN,
        `${over.workerName} → ${target.workerName} görev aktarımı`,
        {
          taskId: transferable.id,
          workerId: over.workerId,
          targetWorkerId: target.workerId,
          orderId: transferable.relatedEntityId ?? undefined,
          reason: 'Workload Balancer',
        },
      ),
    )

    edges.push({
      id: `edge-${transferable.id}-${Date.now()}`,
      fromWorkerId: over.workerId,
      toWorkerId: target.workerId,
      label: transferable.title ?? 'Görev',
      occurredAt: new Date().toISOString(),
    })
  }

  return { decisions, edges, loads }
}

export {}
