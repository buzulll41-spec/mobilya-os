import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:5180'
const outDir = join(process.cwd(), 'test-artifacts', 'sprint6-1')
mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
const page = await context.newPage()

const startedAt = Date.now()
await page.goto(`${baseUrl}/mobile#/mobile/home`, { waitUntil: 'networkidle' })
await page.waitForSelector('[data-testid="home-first-action-card"]', { timeout: 15000 })

const firstClickAt = Date.now()
await page.locator('[data-testid="home-first-action-card"]').click({ force: true })
await page.waitForFunction(() => window.location.hash !== '#/mobile/home', { timeout: 12000 })
const landedHash = await page.evaluate(() => window.location.hash)
const completedAt = Date.now()

await page.screenshot({ path: join(outDir, 'home-action-first.png'), fullPage: true })

const report = {
  baseUrl,
  firstAction: {
    startFromHomeMs: completedAt - startedAt,
    clickToNavigationMs: completedAt - firstClickAt,
    startFromHomeSec: Number(((completedAt - startedAt) / 1000).toFixed(2)),
    clickToNavigationSec: Number(((completedAt - firstClickAt) / 1000).toFixed(2)),
    landedHash,
  },
  screenshot: 'test-artifacts/sprint6-1/home-action-first.png',
  timestamp: new Date().toISOString(),
}

writeFileSync(join(process.cwd(), 'test-artifacts', 'sprint6-1-first-action.json'), JSON.stringify(report, null, 2), 'utf8')
console.log(JSON.stringify(report, null, 2))

await browser.close()
