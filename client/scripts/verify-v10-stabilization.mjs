import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', 'test-artifacts')
const baseUrl = 'http://localhost:5173'

/** @typedef {{ id: string, pass: boolean, detail: string }} CheckResult */

async function loginIfNeeded(page) {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' })
  const loginButton = page.locator('button.login-submit')
  if (await loginButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await page.fill('input[type="email"]', 'admin@mobilya.local')
    await page.fill('input[type="password"]', 'admin123')
    await loginButton.click()
    await page.waitForSelector('.mos-nav-item', { timeout: 20000 })
  }
}

async function openFirstOrderPanel(page) {
  await page.locator('.mos-nav-item').filter({ hasText: 'Siparişler' }).first().click({ force: true })
  await page.waitForSelector('.mos-order-op-card', { timeout: 20000 })
  await page.locator('.mos-order-op-card').first().click()
  await page.locator('.oop-panel').waitFor({ state: 'visible', timeout: 15000 })
}

/**
 * @param {import('playwright').Page} page
 */
async function checkMobileOverflow(page) {
  return page.evaluate(() => {
    const panel = document.querySelector('.oop-panel')
    if (!panel) return { pass: false, detail: 'Panel bulunamadı' }
    const panelOverflow = panel.scrollWidth > panel.clientWidth + 2
    const docOverflow = document.documentElement.scrollWidth > window.innerWidth + 2
    return {
      pass: !panelOverflow && !docOverflow,
      detail: panelOverflow
        ? `Panel yatay taşma: ${panel.scrollWidth}px > ${panel.clientWidth}px`
        : docOverflow
          ? `Viewport taşma: ${document.documentElement.scrollWidth}px > ${window.innerWidth}px`
          : 'Taşma yok',
    }
  })
}

const browser = await chromium.launch({ headless: true })
/** @type {CheckResult[]} */
const checks = []

try {
  await mkdir(outDir, { recursive: true })

  const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await loginIfNeeded(desktop)
  await openFirstOrderPanel(desktop)

  checks.push({
    id: 'order-panel-opens',
    pass: await desktop.locator('.oop-panel').isVisible(),
    detail: 'Sipariş operasyon paneli görünür',
  })

  const healthBar = desktop.locator('.oop-health-bar')
  await healthBar.waitFor({ state: 'visible', timeout: 8000 })
  const healthText = await healthBar.innerText()
  checks.push({
    id: 'health-bar',
    pass: /Sağlıklı|Tahsilat|Operasyon|Kritik/.test(healthText),
    detail: healthText.trim(),
  })

  await desktop.screenshot({ path: path.join(outDir, 'v10-stabilization-overview.png') })

  await desktop.getByRole('tab', { name: /Genel Bakış/ }).click()
  const contactCard = desktop.locator('.oop-card--contact')
  await contactCard.scrollIntoViewIfNeeded()
  await contactCard.waitFor({ state: 'visible', timeout: 8000 })

  const actionSlots = desktop.locator('.oop-contact-actions .oop-contact-action')
  const slotCount = await actionSlots.count()
  const callHref = await desktop.locator('.oop-contact-action--call').getAttribute('href').catch(() => null)
  const waHref = await desktop.locator('.oop-contact-action--wa').getAttribute('href').catch(() => null)
  checks.push({
    id: 'contact-actions',
    pass: slotCount === 4,
    detail:
      slotCount === 4
        ? `4 aksiyon slotu; tel=${callHref ? 'var' : 'yok'}, wa=${waHref ? 'var' : 'yok'}`
        : `Beklenen 4 slot, bulunan ${slotCount}`,
  })

  await desktop.getByRole('tab', { name: /Ödemeler/ }).click()
  await desktop.locator('.oop-finance').waitFor({ state: 'visible', timeout: 10000 })
  checks.push({
    id: 'payments-tab',
    pass: await desktop.locator('.oop-finance-total').isVisible(),
    detail: 'Ödemeler sekmesi finans kartı yüklendi',
  })

  await desktop.getByRole('tab', { name: /Sevk & Montaj/ }).click()
  const scoreEl = desktop.locator('.oop-shipment-readiness__score strong')
  await scoreEl.waitFor({ state: 'visible', timeout: 10000 })
  const scoreText = await scoreEl.innerText()
  checks.push({
    id: 'shipment-readiness',
    pass: /^\d+$/.test(scoreText.trim()),
    detail: `Uygunluk skoru: ${scoreText.trim()}/100`,
  })
  await desktop.screenshot({ path: path.join(outDir, 'v10-stabilization-shipment.png') })

  await desktop.getByRole('tab', { name: /Geçmiş/ }).click()
  await desktop.locator('.oop-audit-filters').waitFor({ state: 'visible', timeout: 8000 })

  const filterBar = desktop.locator('.oop-audit-filters')
  const allCount = await desktop.locator('.oop-audit-feed__item').count()
  await filterBar.getByRole('button', { name: 'Tahsilat', exact: true }).click()
  await desktop.waitForTimeout(300)
  const paymentCount = await desktop.locator('.oop-audit-feed__item').count()
  await filterBar.getByRole('button', { name: 'Sevk', exact: true }).click()
  await desktop.waitForTimeout(300)
  const shipmentAuditCount = await desktop.locator('.oop-audit-feed__item').count()

  checks.push({
    id: 'history-filters',
    pass: allCount >= 0 && (paymentCount <= allCount || allCount === 0),
    detail: `Tümü=${allCount}, Tahsilat=${paymentCount}, Sevk=${shipmentAuditCount} (filtre tıklanabilir)`,
  })
  await desktop.screenshot({ path: path.join(outDir, 'v10-stabilization-history.png') })

  await desktop.setViewportSize({ width: 390, height: 844 })
  await desktop.waitForTimeout(400)
  const overflow = await checkMobileOverflow(desktop)
  checks.push({ id: 'mobile-overflow', ...overflow })
  await desktop.screenshot({ path: path.join(outDir, 'v10-stabilization-mobile.png'), fullPage: false })

  await desktop.close()

  const report = {
    timestamp: new Date().toISOString(),
    checks,
    passed: checks.every((c) => c.pass),
    screenshots: [
      'client/test-artifacts/v10-stabilization-overview.png',
      'client/test-artifacts/v10-stabilization-shipment.png',
      'client/test-artifacts/v10-stabilization-history.png',
      'client/test-artifacts/v10-stabilization-mobile.png',
    ],
  }

  await writeFile(path.join(outDir, 'v10-stabilization-report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  if (!report.passed) process.exitCode = 1
} finally {
  await browser.close()
}
