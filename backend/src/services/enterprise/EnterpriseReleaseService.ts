import { ENTERPRISE_VERSION, type EnterpriseReleaseReportDto } from '../../contracts/enterpriseReleaseDto.js'
import {
  assembleEnterpriseReleaseReport,
  computeEnterpriseFinalScore,
  formatEnterpriseReleaseReportMarkdown,
} from './EnterpriseReleaseEngine.js'

let cachedReport: EnterpriseReleaseReportDto | null = null

export function getEnterpriseReleaseReport(): EnterpriseReleaseReportDto {
  if (!cachedReport) {
    cachedReport = assembleEnterpriseReleaseReport({
      finalScore: computeEnterpriseFinalScore(),
    })
  }
  return cachedReport
}

export function getEnterpriseReleaseMarkdown(): string {
  return formatEnterpriseReleaseReportMarkdown(getEnterpriseReleaseReport())
}

export function resetEnterpriseReleaseStoreForTests(): void {
  cachedReport = null
}

export { ENTERPRISE_VERSION, assembleEnterpriseReleaseReport, computeEnterpriseFinalScore }
