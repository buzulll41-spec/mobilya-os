import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const baseUrl = process.env.CAPTURE_BASE_URL ?? 'http://localhost:5173/'
const outDir = join(process.cwd(), 'screenshots')
mkdirSync(outDir, { recursive: true })
const outFile = join(outDir, 'menu-simplified-erp.png')

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 920 } })

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(1500)

  if (await page.locator('.login-page').isVisible()) {
    await page.fill('input[type="email"]', 'admin@mobilya.local')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button.login-submit')
    await page.waitForSelector('.mos-sidebar', { timeout: 20000 })
    await page.waitForTimeout(2000)
  }

  await page.waitForSelector('.mos-sidebar .mos-nav-item', { timeout: 30000 })
  await page.waitForTimeout(1000)

  const navCount = await page.locator('.mos-sidebar .mos-nav-item').count()
  console.log('Sidebar nav items:', navCount)

  await page.screenshot({ path: outFile, fullPage: false })
  console.log('OK:', outFile)
} catch (err) {
  await page.screenshot({ path: join(outDir, 'menu-simplified-error.png'), fullPage: true })
  console.error(err)
  process.exit(1)
} finally {
  await browser.close()
}
