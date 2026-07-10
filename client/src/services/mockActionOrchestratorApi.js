const LIST = (prefix, n) => Array.from({ length: n }, (_, i) => `${prefix} ${i + 1} — deterministik demo.`)

/**
 * @returns {Promise<import('../contracts/v1/actionOrchestrator.js').ActionOrchestratorResponseDto>}
 */
export async function mockGetActionOrchestrator() {
  return {
    orchestratorScore: 68.5,
    activeStrategy: 'COLLECTION_FIRST',
    brainScore: 55.4,
    affectedTasks: [
      { id: 't1', name: 'Tahsilat ara', category: 'COLLECTION', originalPriority: 'P2', boostedPriority: 'P1', boost: 50 },
    ],
    affectedCases: [
      { id: 'c1', name: 'CASE-O1', category: 'COLLECTION', originalPriority: 'P2', boostedPriority: 'P1', boost: 50 },
    ],
    affectedJobs: [
      { id: 'j1', name: 'CREATE_COLLECTION_CASE', category: 'COLLECTION', originalPriority: 'P2', boostedPriority: 'P1', boost: 40 },
    ],
    affectedAgents: [
      { id: 'a1', name: 'Tahsilat Ajanı', category: 'COLLECTION_AGENT', originalPriority: 'P2', boostedPriority: 'P1', boost: 50 },
    ],
    executionPlan: LIST('Aksiyon', 20),
    priorityOverrides: [
      { target: 'COLLECTION', targetType: 'ACTION_CATEGORY', boost: 50, reason: 'COLLECTION_FIRST — COLLECTION +50' },
      { target: 'COLLECTION_AGENT', targetType: 'AGENT', boost: 50, reason: 'COLLECTION_FIRST — agent önceliği' },
    ],
    lastRunAt: null,
    runStatus: 'PLANNED',
    today: '2026-05-14',
    generatedAt: new Date().toISOString(),
    meta: { depoKatiExcluded: true, sources: ['actionCenter', 'businessBrain'] },
  }
}

/**
 * @returns {Promise<import('../contracts/v1/actionOrchestrator.js').ActionOrchestratorResponseDto>}
 */
export async function mockRunActionOrchestrator() {
  const data = await mockGetActionOrchestrator()
  return { ...data, runStatus: 'APPLIED', lastRunAt: new Date().toISOString() }
}
