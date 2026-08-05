import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { initialOrders } from '../../src/data/seedOrders.js'
import { projectLegacyOrderToListItemDto } from '../../src/services/orderListItemProjection.js'
import { bootstrapMockOrderLinesFromOrders } from '../../src/services/mockOrderLineBootstrap.js'
import { ENTERPRISE_VERSION } from '../../src/contracts/v1/enterpriseRelease.js'
import {
  assembleEnterpriseReleaseReport,
  buildEnterpriseErpChecklist,
  computeEnterpriseFinalScore,
  formatEnterpriseReleaseReportMarkdown,
  runProductionValidationSimulation,
  runStressTestEvaluation,
} from '../../src/engine/enterprise/EnterpriseReleaseEngine.js'
import {
  getEnterpriseReleaseReportLocal,
  resetEnterpriseReleaseStoreForTests,
  runEnterpriseReleaseValidation,
} from '../../src/services/enterprise/EnterpriseReleaseService.js'
import { resetBoardMeetingStoreForTests } from '../../src/services/board/BoardMeetingService.js'
import { resetCollaborationStoreForTests } from '../../src/services/collaboration/CollaborationService.js'
import { resetDecisionQualityStoreForTests } from '../../src/services/decision/DecisionQualityService.js'
import { resetSelfOptimizationStoreForTests } from '../../src/services/optimization/SelfOptimizationService.js'
import { resetCompanyManagerStore } from '../../src/services/company-manager/companyManagerStore.js'

describe('MOBILYA OS Enterprise 1.0 (FAZ 110)', () => {
  const orders = initialOrders.filter((o) => o.status !== 'İptal')
  let dtos
  const runtimeCtx = () => ({ orders, dtos, collectionRows: [], todayIso: DEMO_TODAY })

  beforeEach(() => {
    resetEnterpriseReleaseStoreForTests()
    resetBoardMeetingStoreForTests()
    resetCollaborationStoreForTests()
    resetDecisionQualityStoreForTests()
    resetSelfOptimizationStoreForTests()
    resetCompanyManagerStore()
    bootstrapMockOrderLinesFromOrders(orders)
    dtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
  })

  describe('Enterprise Checklist', () => {
    it('17 ERP modülü doğrulanır', () => {
      expect(buildEnterpriseErpChecklist().length).toBe(17)
      expect(buildEnterpriseErpChecklist().every((c) => c.status === 'pass')).toBe(true)
    })
  })

  describe('Production Validation', () => {
    it('8 saat simülasyon hedefleri', () => {
      const prod = runProductionValidationSimulation()
      expect(prod.passed).toBe(true)
      expect(prod.simulatedHours).toBe(8)
      expect(prod.metrics.orders).toBeGreaterThanOrEqual(1000)
    })
  })

  describe('Stress Test', () => {
    it('stress metrikleri geçer', () => {
      expect(runStressTestEvaluation().passed).toBe(true)
    })
  })

  describe('Final Score', () => {
    it('enterprise final score hesaplanır', () => {
      const score = computeEnterpriseFinalScore()
      expect(score.totalScore).toBeGreaterThanOrEqual(80)
      expect(score.label).toMatch(/Release Candidate/)
    })
  })

  describe('Release Candidate', () => {
    it('release report RC ready', () => {
      const report = assembleEnterpriseReleaseReport()
      expect(report.releaseCandidateReady).toBe(true)
      expect(report.successMessage).toMatch(/Enterprise 1.0/)
    })

    it('validation pipeline', () => {
      const report = runEnterpriseReleaseValidation(runtimeCtx())
      expect(report.finalScore.totalScore).toBeGreaterThan(0)
      expect(getEnterpriseReleaseReportLocal(runtimeCtx())).toBeTruthy()
    })

    it('markdown rapor', () => {
      const md = formatEnterpriseReleaseReportMarkdown(assembleEnterpriseReleaseReport())
      expect(md).toContain(ENTERPRISE_VERSION.EDITION)
      expect(md).toContain('Release Candidate Ready')
    })
  })
})
