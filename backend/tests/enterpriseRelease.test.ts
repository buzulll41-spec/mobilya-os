import { describe, expect, it } from 'vitest'
import { ENTERPRISE_VERSION } from '../src/contracts/enterpriseReleaseDto.js'
import {
  assembleEnterpriseReleaseReport,
  buildEnterpriseErpChecklist,
  computeEnterpriseFinalScore,
  formatEnterpriseReleaseReportMarkdown,
  runProductionValidationSimulation,
  runStressTestEvaluation,
} from '../src/services/enterprise/EnterpriseReleaseEngine.js'
import { getEnterpriseReleaseReport } from '../src/services/enterprise/EnterpriseReleaseService.js'

describe('MOBILYA OS Enterprise 1.0 (FAZ 110)', () => {
  describe('Enterprise Checklist', () => {
    it('ERP modülleri', () => {
      expect(buildEnterpriseErpChecklist().length).toBe(17)
    })
  })

  describe('Production Validation', () => {
    it('metrics targets', () => {
      const prod = runProductionValidationSimulation()
      expect(prod.metrics.workerRuns).toBe(5000)
      expect(prod.metrics.queueEvents).toBe(100000)
    })
  })

  describe('Stress Test', () => {
    it('passed', () => {
      expect(runStressTestEvaluation().passed).toBe(true)
    })
  })

  describe('Final Score', () => {
    it('score >= 80', () => {
      expect(computeEnterpriseFinalScore().totalScore).toBeGreaterThanOrEqual(80)
    })
  })

  describe('Release Candidate', () => {
    it('API report', () => {
      const report = getEnterpriseReleaseReport()
      expect(report.release.VERSION).toBe(ENTERPRISE_VERSION.VERSION)
      expect(report.releaseCandidateReady).toBe(true)
    })

    it('markdown', () => {
      const md = formatEnterpriseReleaseReportMarkdown(assembleEnterpriseReleaseReport())
      expect(md).toContain('MOBILYA OS')
    })
  })
})
