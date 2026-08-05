import fs from 'node:fs/promises'
import { execSync } from 'node:child_process'

function run(command) {
  execSync(command, {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
  })
}

function secondsSince(startMs) {
  return Math.round((Date.now() - startMs) / 1000)
}

async function readJson(path) {
  return await fs.readFile(path, 'utf8').then((x) => JSON.parse(x))
}

const startedAt = Date.now()

async function main() {
  run('npm run prod:up')
  run('npm run prod:smoke')
  run('npm run prod:report')

  const smoke = await readJson('test-artifacts/production-smoke-report.json')
  const audit = await readJson('test-artifacts/release-audit.json')

  const readinessScore = Number(audit?.readinessScore ?? 0)
  const smokeResult = smoke?.status === 'ok' ? 'PASS' : 'FAIL'
  const releaseVersion = readinessScore >= 95 ? 'RC-1 (Release Candidate)' : 'NOT_READY'

  console.log(`Release Candidate Version: ${releaseVersion}`)
  console.log(`Build Duration: ${secondsSince(startedAt)}s`)
  console.log(`Smoke Test Result: ${smokeResult}`)
  console.log(`Overall Readiness Score: ${readinessScore}%`)
}

main().catch(async (error) => {
  const message = error instanceof Error ? error.message : String(error)

  console.log('Release Candidate Version: NOT_READY')
  console.log(`Build Duration: ${secondsSince(startedAt)}s`)
  console.log('Smoke Test Result: FAIL')
  console.log('Overall Readiness Score: 0%')

  await fs.mkdir('test-artifacts', { recursive: true })
  await fs.writeFile(
    'test-artifacts/release-audit.json',
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        readinessScore: 0,
        gaps: [message],
      },
      null,
      2,
    ),
    'utf8',
  )

  process.exit(1)
})
