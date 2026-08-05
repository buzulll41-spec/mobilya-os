import { chromium } from 'playwright'

const hostBase = process.env.BASE_URL || 'http://127.0.0.1:5173'
const base = `${hostBase}/mobile#/mobile/home`
const routes = ['home', 'orders', 'collection', 'service', 'customers', 'menu']

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 } })
const page = await context.newPage()

const consoleErrors = []
const pageErrors = []
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text())
})
page.on('pageerror', (err) => pageErrors.push(String(err?.message || err)))

const results = []
for (const route of routes) {
  await page.goto(`${hostBase}/mobile#/mobile/${route}`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.mos-mobile-tabbar', { timeout: 12000 })
  const snap = await page.evaluate(() => {
    const html = document.documentElement
    const body = document.body
    const nav = document.querySelector('.mos-mobile-tabbar')
    const content = document.querySelector('.mos-content')
    const shell = document.querySelector('.mos-mobile-pwa, .evm-v2-home-shell, .evtrend-native-home-shell')
    const navStyle = nav ? window.getComputedStyle(nav) : null
    const contentStyle = content ? window.getComputedStyle(content) : null
    return {
      hash: window.location.hash,
      hasShell: Boolean(shell),
      hasBottomNav: Boolean(nav),
      navPosition: navStyle?.position || null,
      navDisplay: navStyle?.display || null,
      noHorizontalOverflow: html.scrollWidth <= window.innerWidth + 1 && body.scrollWidth <= window.innerWidth + 1,
      contentBottomPadding: contentStyle?.paddingBottom || null,
    }
  })
  results.push({ route, ...snap })
}

const summary = {
  base,
  results,
  consoleErrorCount: consoleErrors.length,
  pageErrorCount: pageErrors.length,
  consoleErrors,
  pageErrors,
  pass: results.every((item) => item.hasShell && item.hasBottomNav && item.navPosition === 'fixed' && item.noHorizontalOverflow),
}

console.log(JSON.stringify(summary, null, 2))
await browser.close()
if (!summary.pass) process.exitCode = 1
