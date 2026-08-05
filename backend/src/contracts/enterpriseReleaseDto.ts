export const ENTERPRISE_VERSION = {
  PRODUCT: 'MOBILYA OS',
  EDITION: 'Enterprise 1.0',
  VERSION: '1.0.0',
  BUILD: '1.0.0-rc.1',
  API_VERSION: 'v1',
  AI_VERSION: '1.0.0',
  DATABASE_VERSION: '2026.06',
} as const

export type ReleaseCheckStatus = 'pass' | 'warn' | 'fail'

export type ReleaseCheckItemDto = {
  id: string
  label: string
  status: ReleaseCheckStatus
  detail: string
}

export type ProductionValidationDto = {
  passed: boolean
  simulatedHours: number
  metrics: Record<string, number>
  checks: ReleaseCheckItemDto[]
}

export type StressTestResultDto = {
  checks: ReleaseCheckItemDto[]
  passed: boolean
}

export type EnterpriseFinalScoreDto = {
  systemHealth: number
  performance: number
  security: number
  aiScore: number
  predictionAccuracy: number
  learningScore: number
  decisionScore: number
  optimizationScore: number
  totalScore: number
  label: string
}

export type EnterpriseReleaseReportDto = {
  release: typeof ENTERPRISE_VERSION
  releaseDate: string
  successMessage: string
  erpChecklist: ReleaseCheckItemDto[]
  productionValidation: ProductionValidationDto
  stressTest: StressTestResultDto
  securityChecks: ReleaseCheckItemDto[]
  recoveryChecks: ReleaseCheckItemDto[]
  performanceChecks: ReleaseCheckItemDto[]
  qualityChecks: ReleaseCheckItemDto[]
  finalScore: EnterpriseFinalScoreDto
  releaseCandidateReady: boolean
}
