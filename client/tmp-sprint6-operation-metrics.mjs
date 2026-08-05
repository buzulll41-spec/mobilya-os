import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:5180'
const outDir = join(process.cwd(), 'test-artifacts', 'sprint6')
mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
const page = await context.newPage()

const consoleErrors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text())
})

function nowMs() {
  return Date.now()
}

async function gotoMobile(path = 'home') {
  await page.goto(`${baseUrl}/mobile#/mobile/${path}`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.mos-mobile-tabbar', { timeout: 12000 })
}

async function shot(name) {
  await page.screenshot({ path: join(outDir, name), fullPage: true })
}

async function clickAndWaitForHash(selector, hashPrefix, timeout = 12000) {
  const start = nowMs()
  await page.locator(selector).first().click({ force: true })
  let matched = true
  try {
    await page.waitForFunction((prefix) => window.location.hash.startsWith(prefix), hashPrefix, { timeout })
  } catch {
    matched = false
  }
  const hash = await page.evaluate(() => window.location.hash)
  return { elapsedMs: nowMs() - start, matched, hash }
}

async function openFirstDetailIfExists() {
  const selectors = [
    '.evm-order-list-v1__card-row',
    '.evm-v2-primary-row',
    '.mos-mobile-order-card',
    '.mos-erp-tbl tbody tr',
  ]

  for (const selector of selectors) {
    const row = page.locator(selector).first()
    if ((await row.count()) > 0) {
      await row.click({ force: true })
      try {
        await page.waitForSelector('.oop-panel--mobile', { timeout: 4500 })
        return { opened: true, selector }
      } catch {
        return { opened: false, selector }
      }
    }
  }

  return { opened: false, selector: null }
}

async function clickActionIfExists(textRegex) {
  const target = page.getByRole('button', { name: textRegex }).first()
  if ((await target.count()) === 0) return false
  await target.click({ force: true })
  return true
}

async function closeWizardIfOpen() {
  const closeBtn = page.getByRole('button', { name: /Kapat|Iptal|Cancel/i }).first()
  if ((await closeBtn.count()) > 0) {
    await closeBtn.click({ force: true })
    await page.waitForTimeout(300)
  }
  await page.keyboard.press('Escape').catch(() => {})
}

const metrics = {
  baseUrl,
  timestamps: {
    startedAt: new Date().toISOString(),
  },
  flows: {},
  touchMetrics: {},
  timeMetricsSec: {},
  removedSteps: [],
  blockers: [],
  screenshots: [],
  consoleErrorCount: 0,
  consoleErrors: [],
}

await gotoMobile('home')
await shot('flow-home.png')
metrics.screenshots.push('test-artifacts/sprint6/flow-home.png')

// Home -> Orders -> Detail -> Action
const orderOpen = await clickAndWaitForHash('[data-testid="home-brief-order"]', '#/mobile/orders')
await shot('flow-home-orders-list.png')
metrics.screenshots.push('test-artifacts/sprint6/flow-home-orders-list.png')
const orderDetail = await openFirstDetailIfExists()
let orderAction = false
if (orderDetail.opened) {
  await shot('flow-home-orders-detail.png')
  metrics.screenshots.push('test-artifacts/sprint6/flow-home-orders-detail.png')
  orderAction =
    (await clickActionIfExists(/Tahsilat Al|Teslimati ac|SSH takibini ac|Detaya git|Sevki planla/i)) ||
    (await clickActionIfExists(/Ara/i))
  await shot('flow-home-orders-action.png')
  metrics.screenshots.push('test-artifacts/sprint6/flow-home-orders-action.png')
}

metrics.flows.homeOrders = {
  listOpenMs: orderOpen.elapsedMs,
  expectedRouteMatched: orderOpen.matched,
  landedHash: orderOpen.hash,
  detailOpened: orderDetail.opened,
  detailSelector: orderDetail.selector,
  actionTriggered: orderAction,
}

if (!orderDetail.opened) {
  metrics.blockers.push('Home->Siparis akisinda detay acilamadi: siparis listesi bos veya tiklanabilir satir yok.')
}

// Home -> Collection -> Detail -> Collect
await gotoMobile('home')
const collectionOpen = await clickAndWaitForHash('[data-testid="home-brief-collection"]', '#/mobile/collection')
await shot('flow-home-collection-list.png')
metrics.screenshots.push('test-artifacts/sprint6/flow-home-collection-list.png')
const collectionDetail = await openFirstDetailIfExists()
const collectionAction = await clickActionIfExists(/Tahsilat Al/i)
if (collectionAction) {
  await shot('flow-home-collection-action.png')
  metrics.screenshots.push('test-artifacts/sprint6/flow-home-collection-action.png')
}
metrics.flows.homeCollection = {
  listOpenMs: collectionOpen.elapsedMs,
  expectedRouteMatched: collectionOpen.matched,
  landedHash: collectionOpen.hash,
  detailOpened: collectionDetail.opened,
  actionTriggered: collectionAction,
}
if (!collectionAction) {
  metrics.blockers.push('Home->Tahsilat akisinda Tahsilat Al aksiyonu tetiklenemedi: kayit/veri yok.')
}

// Home -> Service -> Detail -> Complete
await gotoMobile('home')
const serviceOpen = await clickAndWaitForHash('[data-testid="home-brief-service"]', '#/mobile/service')
await shot('flow-home-service-list.png')
metrics.screenshots.push('test-artifacts/sprint6/flow-home-service-list.png')
const serviceDetail = await openFirstDetailIfExists()
const serviceAction = await clickActionIfExists(/Tamamla/i)
if (serviceAction) {
  await shot('flow-home-service-action.png')
  metrics.screenshots.push('test-artifacts/sprint6/flow-home-service-action.png')
}
metrics.flows.homeService = {
  listOpenMs: serviceOpen.elapsedMs,
  expectedRouteMatched: serviceOpen.matched,
  landedHash: serviceOpen.hash,
  detailOpened: serviceDetail.opened,
  actionTriggered: serviceAction,
}
if (!serviceAction) {
  metrics.blockers.push('Home->Servis akisinda Tamamla aksiyonu tetiklenemedi: kayit/veri yok.')
}

// Quick actions touch metrics
await gotoMobile('home')
const tOrderStart = nowMs()
await page.locator('.mos-mobile-tabbar__btn[aria-label="Create"]').click({ force: true })
await page.waitForSelector('[data-testid="qa-new-order"]', { timeout: 6000 })
await page.locator('[data-testid="qa-new-order"]').click({ force: true })
let newOrderOpened = false
try {
  await page.waitForSelector('.now-dialog, .now-modal, [aria-label="Yeni Siparis"]', { timeout: 6000 })
  newOrderOpened = true
} catch {
  newOrderOpened = false
}
const newOrderMs = nowMs() - tOrderStart
if (!newOrderOpened) {
  metrics.blockers.push('Yeni Siparis 2 dokunus akisinda wizard gorunmedi.')
}
await closeWizardIfOpen()

await gotoMobile('home')
const tShipmentStart = nowMs()
await page.locator('.mos-mobile-tabbar__btn[aria-label="Create"]').click({ force: true })
await page.waitForSelector('[data-testid="qa-new-shipment"]', { timeout: 6000 })
await page.locator('[data-testid="qa-new-shipment"]').click({ force: true })
await page.waitForFunction(() => window.location.hash.startsWith('#/mobile/shipments'), { timeout: 8000 })
const newShipmentMs = nowMs() - tShipmentStart

await gotoMobile('home')
const tWhatsappStart = nowMs()
await page.locator('.mos-mobile-tabbar__btn[aria-label="Create"]').click({ force: true })
await page.waitForSelector('[data-testid="qa-whatsapp"]', { timeout: 6000 })
await page.locator('[data-testid="qa-whatsapp"]').click({ force: true })
await page.waitForTimeout(700)
const afterWhatsApp = await page.evaluate(() => ({ href: String(window.location.href), hash: String(window.location.hash) }))
const whatsappMs = nowMs() - tWhatsappStart

metrics.touchMetrics = {
  newOrderTouches: 2,
  whatsappTouches: 2,
  shipmentPlanTouches: 2,
}

metrics.timeMetricsSec = {
  orderFindSec: Number((orderOpen.elapsedMs / 1000).toFixed(2)),
  collectionOpenSec: Number((collectionOpen.elapsedMs / 1000).toFixed(2)),
  serviceOpenSec: Number((serviceOpen.elapsedMs / 1000).toFixed(2)),
  newOrderStartSec: Number((newOrderMs / 1000).toFixed(2)),
  whatsappStartSec: Number((whatsappMs / 1000).toFixed(2)),
  shipmentPlanStartSec: Number((newShipmentMs / 1000).toFixed(2)),
}

metrics.flows.quickActions = {
  newOrderOpened,
  whatsappTarget: afterWhatsApp,
}

metrics.removedSteps = [
  'Hizli islem merkezi ile Yeni Siparis/Tahsilat/Sevkiyat/Servis/Musteri islemleri menuye girmeden aciliyor.',
  'Home brief satirlari ile kullanici filtre secmeden dogrudan ilgili operasyona yonleniyor.',
  'Operasyon onerileri ilk ekranda verildigi icin ara dashboard ekran gecisi kaldirildi.',
]

metrics.consoleErrorCount = consoleErrors.length
metrics.consoleErrors = consoleErrors
metrics.timestamps.finishedAt = new Date().toISOString()

const outFile = join(process.cwd(), 'test-artifacts', 'sprint6-operation-metrics.json')
writeFileSync(outFile, JSON.stringify(metrics, null, 2), 'utf8')
console.log(JSON.stringify(metrics, null, 2))

await browser.close()
