import { PWA_MANIFEST_PATH, PWA_SERVICE_WORKER_PATH } from '../contracts/v1/mobilePwa.js'

/**
 * PWA hazırlık denetimi — dosya varlığı ve index.html meta kontrolü.
 * @param {{ indexHtml?: string; manifestText?: string; swText?: string }} [sources]
 */
export function auditPwaReadiness(sources = {}) {
  const indexHtml = sources.indexHtml ?? ''
  const manifestText = sources.manifestText ?? ''
  const swText = sources.swText ?? ''

  return {
    manifestPath: PWA_MANIFEST_PATH,
    serviceWorkerPath: PWA_SERVICE_WORKER_PATH,
    checks: [
      {
        id: 'viewport',
        label: 'Mobile viewport meta',
        pass: /viewport-fit=cover/.test(indexHtml) && /width=device-width/.test(indexHtml),
      },
      {
        id: 'manifest-link',
        label: 'Manifest link',
        pass: indexHtml.includes('manifest.webmanifest'),
      },
      {
        id: 'theme-color',
        label: 'Theme color',
        pass: /theme-color/.test(indexHtml),
      },
      {
        id: 'manifest-standalone',
        label: 'PWA standalone display',
        pass: manifestText.includes('"display": "standalone"'),
      },
      {
        id: 'manifest-display-override',
        label: 'PWA display override',
        pass: manifestText.includes('"display_override"'),
      },
      {
        id: 'service-worker',
        label: 'Service worker fetch handler',
        pass: swText.includes('addEventListener') && swText.includes("'fetch'"),
      },
      {
        id: 'install-meta',
        label: 'Apple mobile web app meta',
        pass:
          /apple-mobile-web-app-capable/.test(indexHtml) &&
          /apple-mobile-web-app-status-bar-style/.test(indexHtml),
      },
    ],
  }
}

/** @param {ReturnType<typeof auditPwaReadiness>} report */
export function isPwaAuditPassing(report) {
  return report.checks.every((c) => c.pass)
}
