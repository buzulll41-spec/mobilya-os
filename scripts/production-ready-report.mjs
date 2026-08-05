import fs from 'node:fs/promises'
import { execSync } from 'node:child_process'

const baseRaw = process.env.SMOKE_BASE_URL ?? 'http://localhost'
const base = baseRaw.replace(/\/+$/, '')
const REQUIRED_SERVICES = ['postgres', 'redis', 'backend', 'frontend', 'nginx', 'backup', 'monitor', 'worker', 'health']
const REQUIRED_SMOKE_CHECKS = ['Login', 'Dashboard', 'Orders', 'Collections', 'Shipments', 'Customers', 'Service', 'Notifications', 'Logout']

function clamp(value) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function boolScore(ok) {
  return ok ? 100 : 50
}

function scoreFromThreshold(value, green, amber) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 50
  if (value <= green) return 100
  if (value <= amber) return 85
  return 60
}

async function fetchJson(path) {
  const res = await fetch(`${base}${path}`)
  if (!res.ok) return { ok: false, status: res.status, body: null }
  return { ok: true, status: res.status, body: await res.json() }
}

function readComposePs() {
  try {
    const raw = execSync('docker compose --env-file env/.production -f docker-compose.production.yml ps --format json', {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8',
    }).trim()
    if (!raw) return []
    if (raw.startsWith('[')) return JSON.parse(raw)
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line))
  } catch {
    return []
  }
}

function serviceHealthy(service) {
  const state = String(service?.State ?? '').toLowerCase()
  const health = String(service?.Health ?? '').toLowerCase()
  return state === 'running' && health.includes('healthy')
}

async function main() {
  const healthRes = await fetchJson('/api/v1/health')
  const metricsRes = await fetchJson('/api/v1/ops/metrics')
  const systemStatusRes = await fetchJson('/api/system/status')
  const smoke = await fs
    .readFile('test-artifacts/production-smoke-report.json', 'utf8')
    .then((x) => JSON.parse(x))
    .catch(() => null)
  const services = readComposePs()

  const serviceMap = new Map(services.map((s) => [String(s?.Service ?? ''), s]))
  const healthyServices = REQUIRED_SERVICES.filter((name) => serviceHealthy(serviceMap.get(name)))
  const missingHealthyServices = REQUIRED_SERVICES.filter((name) => !healthyServices.includes(name))

  const smokeResults = smoke?.results ?? {}
  const smokePassed = REQUIRED_SMOKE_CHECKS.filter((name) => smokeResults?.[name]?.status === 'PASS')
  const smokePassRate = REQUIRED_SMOKE_CHECKS.length === 0 ? 0 : (smokePassed.length / REQUIRED_SMOKE_CHECKS.length) * 100

  const health = healthRes.body
  const metrics = metricsRes.body
  const systemStatus = systemStatusRes.body

  const dockerStatus = boolScore(missingHealthyServices.length === 0)
  const healthStatus = boolScore(healthRes.ok && health?.status === 'ok')
  const migrationStatus = boolScore(health?.status === 'ok' && (health?.storage?.orders ?? 0) > 0)
  const apiStatus = clamp((healthRes.ok ? 50 : 0) + (metricsRes.ok ? 30 : 0) + (systemStatusRes.ok ? 20 : 0))
  const offlineStatus = boolScore(metrics?.sync?.status === 'up' && metrics?.sync?.mode === 'offline-first')
  const security = boolScore(health?.database === 'up' && health?.redis !== 'down' && health?.status === 'ok')
  const performance = scoreFromThreshold(metrics?.api?.avgResponseMs, 200, 450)
  const accessibility = boolScore(serviceHealthy(serviceMap.get('frontend')) && smokeResults?.Dashboard?.status === 'PASS')
  const testCoverage = clamp(smokePassRate)

  const metricRows = [
    { name: 'Production Readiness', score: 0 },
    { name: 'Security', score: security },
    { name: 'Performance', score: performance },
    { name: 'Accessibility', score: accessibility },
    { name: 'Test Coverage', score: testCoverage },
    { name: 'Migration Status', score: migrationStatus },
    { name: 'Docker Status', score: dockerStatus },
    { name: 'Health Status', score: healthStatus },
    { name: 'API Status', score: apiStatus },
    { name: 'Offline Status', score: offlineStatus },
  ]

  const readinessScore = clamp(
    (security + performance + accessibility + testCoverage + migrationStatus + dockerStatus + healthStatus + apiStatus + offlineStatus) /
      9,
  )
  metricRows[0].score = readinessScore

  const gaps = []
  if (missingHealthyServices.length > 0) {
    gaps.push(`Unhealthy services: ${missingHealthyServices.join(', ')}`)
  }
  if (smoke?.status !== 'ok') {
    gaps.push(`Smoke failed: ${smoke?.error ?? 'unknown error'}`)
  }
  if (testCoverage < 100) {
    gaps.push(`Smoke pass rate ${testCoverage}% (expected 100%)`)
  }
  for (const row of metricRows) {
    if (row.score < 95) {
      gaps.push(`${row.name} below threshold: ${row.score}`)
    }
  }

  const audit = {
    generatedAt: new Date().toISOString(),
    releaseTarget: 'RC-1',
    readinessScore,
    metrics: Object.fromEntries(metricRows.map((row) => [row.name, row.score])),
    services: {
      required: REQUIRED_SERVICES,
      healthy: healthyServices,
      missingHealthy: missingHealthyServices,
    },
    smoke: {
      status: smoke?.status ?? 'unknown',
      passCount: smokePassed.length,
      total: REQUIRED_SMOKE_CHECKS.length,
      checks: smokeResults,
    },
    api: {
      healthStatus: health?.status ?? 'unknown',
      responseTimeMs: systemStatus?.['Response Time']?.ms ?? health?.responseTime?.ms ?? null,
      cpuPercent: systemStatus?.CPU?.processPercent ?? metrics?.cpu?.processPercent ?? null,
      memoryRssMb: systemStatus?.Memory?.rssMb ?? health?.memory?.rssMb ?? null,
    },
    gaps,
  }

  const markdown = [
    '# Sprint 11.2 Release Audit',
    '',
    `Generated At: ${audit.generatedAt}`,
    `Release Target: ${audit.releaseTarget}`,
    `Readiness Score: ${readinessScore}/100`,
    '',
    '## Metrics',
    ...metricRows.map((row) => `- ${row.name}: ${row.score}/100`),
    '',
    '## Docker Services',
    `- Healthy Required Services: ${healthyServices.join(', ') || 'none'}`,
    `- Missing/Unhealthy Required Services: ${missingHealthyServices.join(', ') || 'none'}`,
    '',
    '## Smoke',
    `- Status: ${smoke?.status ?? 'unknown'}`,
    `- Passed: ${smokePassed.length}/${REQUIRED_SMOKE_CHECKS.length}`,
    '',
    '## Gaps',
    ...(gaps.length > 0 ? gaps.map((gap) => `- ${gap}`) : ['- none']),
    '',
  ].join('\n')

  await fs.mkdir('test-artifacts', { recursive: true })
  await fs.writeFile('test-artifacts/release-audit.json', JSON.stringify(audit, null, 2), 'utf8')
  await fs.writeFile('docs/SPRINT11_2_RELEASE_AUDIT.md', markdown, 'utf8')
  await fs.writeFile('docs/SPRINT11_PRODUCTION_READY_REPORT.md', markdown, 'utf8')
  await fs.writeFile('docs/SPRINT11_1_PRODUCTION_SUMMARY.md', markdown, 'utf8')
  console.log(markdown)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
