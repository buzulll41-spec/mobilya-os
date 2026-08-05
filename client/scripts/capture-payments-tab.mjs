import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', 'screenshots')
const outFile = path.join(outDir, 'payments-tab-erp.png')

const BASES = ['http://localhost:5173', 'http://localhost:5174']
const TEST_ORDER = 'S-1780920523345'

async function main() {
  await mkdir(outDir, { recursive: true })
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

  let base = null
  for (const b of BASES) {
    try {
      await page.goto(b, { waitUntil: 'domcontentloaded', timeout: 15_000 })
      if (await page.locator('body').count()) {
        base = b
        break
      }
    } catch {
      /* try next port */
    }
  }

  if (!base) {
    console.error('SCREENSHOT_FAIL: dev server not reachable on 5173/5174')
    await browser.close()
    process.exit(1)
  }

  if ((await page.locator('.login-card').count()) > 0) {
    await page.fill('input[type="email"]', 'admin@mobilya.local')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button.login-submit')
    await page.waitForSelector('.mos', { timeout: 45_000 }).catch(() => null)
  }

  if ((await page.locator('.mos').count()) === 0) {
    console.error('SCREENSHOT_FAIL: app shell not loaded (check API/CORS)')
    await browser.close()
    process.exit(1)
  }

  // Try orders page with specific order first
  let opened = false
  await page.click('nav >> text=Siparişler')
  await page.waitForTimeout(800)
  const search = page.locator('input[type="search"], input[placeholder*="ara" i]').first()
  if ((await search.count()) > 0) {
    await search.fill(TEST_ORDER)
    await page.waitForTimeout(500)
    const orderRow = page.locator('.mos-erp-tbl-row, tr').filter({ hasText: TEST_ORDER }).first()
    if ((await orderRow.count()) > 0) {
      await orderRow.click()
      opened = true
    }
  }

  if (!opened) {
    await page.click('nav >> text=Tahsilat')
    await page.waitForSelector('.coll-ops-tbl-row', { timeout: 15_000 })
    await page.locator('.coll-ops-tbl-row').first().click()
    await page.locator('.coll-ops-tbl-op--pay').first().click({ timeout: 10_000 })
  }

  await page.waitForSelector('.oop-panel', { timeout: 10_000 })
  const paymentsTab = page.locator('.oop-tab', { hasText: 'Ödemeler' })
  if ((await paymentsTab.count()) > 0) {
    await paymentsTab.click()
  }
  await page.waitForSelector('.oop-payments', { timeout: 10_000 })
  await page.waitForTimeout(400)

  const panel = page.locator('.oop-payments')
  await panel.screenshot({ path: outFile })
  console.log('SCREENSHOT_OK', outFile)

  await browser.close()
}

main().catch((e) => {
  console.error('SCREENSHOT_FAIL', e.message)
  process.exit(1)
})
