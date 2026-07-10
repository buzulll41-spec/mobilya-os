import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const outDir = join(process.cwd(), 'screenshots', 'orders-v2')
mkdirSync(outDir, { recursive: true })

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

  await page.locator('.mos-nav-item', { hasText: 'Siparişler' }).click()
  await page.waitForSelector('.mos-orders-page', { timeout: 20000 })
  await page.waitForSelector('.mos-order-op-card', { timeout: 20000 })
  await page.waitForTimeout(1200)

  await page.screenshot({ path: join(outDir, '01-orders-full.png') })

  const statusBar = page.locator('.mos-order-status-bar')
  await statusBar.screenshot({ path: join(outDir, '02-status-filters.png') })

  const firstCard = page.locator('.mos-order-op-card').first()
  await firstCard.screenshot({ path: join(outDir, '03-operation-card-stripe.png') })

  const menuTrigger = page.locator('.mos-order-op-card__menu-trigger').first()
  await menuTrigger.click()
  await page.waitForSelector('.mos-order-op-card__menu-panel')
  await page.screenshot({ path: join(outDir, '04-quick-menu.png') })
  await page.keyboard.press('Escape')

  const delayed = page.locator('.mos-order-op-card--delayed').first()
  if (await delayed.count()) {
    await delayed.screenshot({ path: join(outDir, '05-delay-alarm.png') })
  }

  await page.locator('.mos-order-op-card__progress').first().screenshot({
    path: join(outDir, '06-tahsilat-progress.png'),
  })

  console.log('OK:', outDir)
} catch (err) {
  await page.screenshot({ path: join(outDir, 'error-state.png'), fullPage: true })
  console.error(err)
  process.exit(1)
} finally {
  await browser.close()
}
