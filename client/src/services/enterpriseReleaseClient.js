import { getApiBaseUrl } from '../config/dataSource.js'
import {
  getEnterpriseReleaseMarkdownLocal,
  getEnterpriseReleaseReportLocal,
  runEnterpriseReleaseValidation,
} from './enterprise/EnterpriseReleaseService.js'

/**
 * @param {object} runtimeCtx
 */
export async function fetchEnterpriseReleaseReport(runtimeCtx) {
  const base = getApiBaseUrl()
  if (base) {
    try {
      const res = await fetch(`${base.replace(/\/+$/, '')}/v1/enterprise/release`, { cache: 'no-store' })
      if (res.ok) return res.json()
    } catch {
      /* fallback */
    }
  }
  if (!runtimeCtx) throw new Error('Enterprise release runtime context required in mock mode')
  return getEnterpriseReleaseReportLocal(runtimeCtx)
}

/**
 * @param {object} runtimeCtx
 */
export async function fetchEnterpriseReleaseMarkdown(runtimeCtx) {
  const base = getApiBaseUrl()
  if (base) {
    try {
      const res = await fetch(`${base.replace(/\/+$/, '')}/v1/enterprise/release/report`, { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        return data.markdown ?? ''
      }
    } catch {
      /* fallback */
    }
  }
  return getEnterpriseReleaseMarkdownLocal(runtimeCtx)
}

export { runEnterpriseReleaseValidation }

export {}
