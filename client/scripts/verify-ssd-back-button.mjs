import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', 'test-artifacts')
const baseUrl = 'http://localhost:5173'

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

async function openShipmentModalFromOrders(page) {
  await page.locator('.mos-nav-item').filter({ hasText: 'Siparişler' }).first().click({ force: true })
  await page.waitForSelector('.mos-order-op-card', { timeout: 20000 })
  const firstCard = page.locator('.mos-order-op-card').first()
  await firstCard.locator('.mos-order-op-card__menu-trigger').click()
  await page.getByRole('menuitem', { name: 'Sevk Planla' }).click()
  await page.locator('.som-modal').waitFor({ state: 'visible', timeout: 15000 })
}

async function verifyModalBackButton(page) {
  const back = page.locator('.som-back')
  await back.waitFor({ state: 'visible', timeout: 10000 })
  const text = await back.innerText()
  await page.screenshot({
    path: path.join(outDir, 'shipment-modal-back-button.png'),
    fullPage: false,
  })
  await back.click()
  await page.locator('.som-modal').waitFor({ state: 'hidden', timeout: 5000 })
  return { text, visible: true }
}

async function getAgendaCount(page) {
  const countEl = page.locator('.sops-v3-main__count')
  const text = await countEl.innerText().catch(() => '0 kayıt')
  const match = text.match(/(\d+)\s*kayıt/)
  return match ? Number(match[1]) : 0
}

async function findDateWithAgendaItems(page, maxSteps = 21) {
  await page.locator('.mos-nav-item').filter({ hasText: 'Sevk Operasyonu' }).first().click({ force: true })
  await page.waitForSelector('h1.mos-page-title', { timeout: 15000 })

  let count = await getAgendaCount(page)
  if (count > 0) return { count, steps: 0 }

  for (let step = 1; step <= maxSteps; step += 1) {
    await page.locator('.sops-v3-sidebar__nav-btn[aria-label="Sonraki gün"]').click()
    await page.waitForTimeout(250)
    count = await getAgendaCount(page)
    if (count > 0) return { count, steps: step }
  }

  return { count: 0, steps: maxSteps }
}

async function verifyStopDetailIfAvailable(page) {
  const scan = await findDateWithAgendaItems(page)
  if (scan.count === 0) {
    return { skipped: true, reason: `No agenda items after scanning ${scan.steps} days forward` }
  }

  const card = page.locator('.sops-v3-agenda-card__open').first()
  await card.waitFor({ state: 'visible', timeout: 10000 })
  await card.click()

  const back = page.locator('.ssd-back')
  await back.waitFor({ state: 'visible', timeout: 10000 })

  const box = await back.boundingBox()
  const styles = await back.evaluate((el) => {
    const cs = getComputedStyle(el)
    return {
      display: cs.display,
      visibility: cs.visibility,
      opacity: cs.opacity,
      color: cs.color,
      backgroundColor: cs.backgroundColor,
    }
  })

  const text = (await back.innerText()).trim()
  await page.screenshot({
    path: path.join(outDir, 'ssd-stop-detail-back-button.png'),
    fullPage: false,
  })
  await back.click()
  await page.locator('.ssd-overlay').waitFor({ state: 'detached', timeout: 5000 })

  return {
    text,
    visible: true,
    skipped: false,
    agendaCount: scan.count,
    dateScanSteps: scan.steps,
    boundingBox: box,
    computedStyles: styles,
  }
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

try {
  await mkdir(outDir, { recursive: true })
  await loginIfNeeded(page)
  const modalResult = await openShipmentModalFromOrders(page).then(() => verifyModalBackButton(page))
  const stopResult = await verifyStopDetailIfAvailable(page)

  const report = {
    modal: modalResult,
    stopDetail: stopResult,
    screenshots: [
      'client/test-artifacts/shipment-modal-back-button.png',
      stopResult.skipped ? null : 'client/test-artifacts/ssd-stop-detail-back-button.png',
    ].filter(Boolean),
    passed:
      modalResult.visible &&
      modalResult.text.includes('Sevk Operasyonuna Dön') &&
      (stopResult.skipped || (stopResult.visible && stopResult.text.includes('Sevk Operasyonuna Dön'))),
  }

  await writeFile(path.join(outDir, 'ssd-back-button-report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  if (!report.passed) process.exitCode = 1
} finally {
  await browser.close()
}
