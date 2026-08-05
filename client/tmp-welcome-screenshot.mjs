import { chromium, devices } from 'playwright'

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({
  ...devices['iPhone 13'],
  colorScheme: 'light',
})
const page = await context.newPage()
await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(700)
await page.screenshot({
  path: 'test-artifacts/m-01-welcome-screen.png',
  fullPage: true,
})
await browser.close()
