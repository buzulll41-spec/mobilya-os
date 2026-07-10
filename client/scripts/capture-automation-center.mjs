import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const outDir = join(process.cwd(), 'screenshots')
mkdirSync(outDir, { recursive: true })
const outFile = join(outDir, 'otomasyon-merkezi-erp.png')

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 920 } })

try {
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(1500)

  if (await page.locator('.login-page').isVisible()) {
    await page.fill('input[type="email"]', 'admin@mobilya.local')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button.login-submit')
    await page.waitForSelector('.mos-sidebar', { timeout: 20000 })
    await page.waitForTimeout(2000)
  }

  await page.goto('http://localhost:5173/#/automation-center', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  })
  await page.waitForSelector('.mos-erp-ops--automation-center', { timeout: 20000 })
  await page.waitForSelector('.mos-erp-tbl--automation tbody tr', { timeout: 20000 })
  await page.waitForTimeout(1500)

  await page.screenshot({ path: outFile, fullPage: true })
  console.log('OK:', outFile)
} catch (err) {
  await page.screenshot({ path: join(outDir, 'otomasyon-merkezi-error.png'), fullPage: true })
  console.error(err)
  process.exit(1)
} finally {
  await browser.close()
}
