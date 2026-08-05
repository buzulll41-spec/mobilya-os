import { chromium } from 'playwright'

const baseUrl = process.env.CAPTURE_BASE_URL ?? 'http://localhost:5173'

/** @type {{ hash: string, selector: string, label: string }[]} */
const routes = [
  { hash: '#/product-master-center', selector: '.mos-erp-ops--product-master-center', label: 'Ürün Master Merkezi' },
  { hash: '#/ceo-control-center', selector: '.mos-erp-ops--ceo-control-center', label: 'CEO Kontrol Merkezi' },
  { hash: '#/executive-war-room', selector: '.mos-erp-ops--executive-war-room', label: 'Yönetim Savaş Odası' },
  { hash: '#/cash-radar', selector: '.mos-erp-ops--cash-radar', label: 'Nakit Radarı' },
  { hash: '#/automation-center', selector: '.mos-erp-ops--automation-center', label: 'Otomasyon Merkezi' },
  { hash: '#/operation-cases', selector: '.mos-erp-ops--case-center', label: 'Operasyon Vakaları' },
  { hash: '#/products', selector: '.mos-erp-ops--products', label: 'Ürün Kartları' },
  { hash: '#/manager-cockpit', selector: 'h1.mos-erp-ops__title', label: 'Yönetici Kokpiti' },
]

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 920 } })

const results = []

try {
  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(1500)

  if (await page.locator('.login-page').isVisible()) {
    await page.fill('input[type="email"]', 'admin@mobilya.local')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button.login-submit')
    await page.waitForSelector('.mos-sidebar', { timeout: 30000 })
    await page.waitForTimeout(2000)
  }

  const onLogin = await page.locator('.login-page').isVisible()
  if (onLogin) {
    console.error('FAIL: Login ekranında takılı kaldı')
    process.exit(1)
  }

  for (const route of routes) {
    await page.goto(`${baseUrl}/${route.hash}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    let ok = false
    try {
      await page.waitForSelector(route.selector, { timeout: 20000 })
      ok = true
    } catch {
      ok = false
    }
    results.push({ ...route, ok })
    console.log(`${ok ? 'OK' : 'FAIL'}: ${route.label} (${route.hash})`)
  }

  const failed = results.filter((r) => !r.ok)
  if (failed.length > 0) process.exit(1)
  console.log('ALL_ROUTES_OK')
} catch (err) {
  console.error(err)
  process.exit(1)
} finally {
  await browser.close()
}
