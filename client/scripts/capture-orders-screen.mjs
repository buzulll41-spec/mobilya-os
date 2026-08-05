import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const outDir = join(process.cwd(), 'screenshots', 'orders-v2')
mkdirSync(outDir, { recursive: true })
const baseUrl = process.env.CAPTURE_BASE_URL ?? 'http://127.0.0.1:5173'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })

async function loginIfNeeded() {
  const loginButton = page.getByRole('button', { name: /giriş yap|giris yap|login/i }).first()
  if (!(await loginButton.isVisible())) return
  await page.getByRole('textbox', { name: /e-?posta|email/i }).fill('sales@mobilya.local')
  await page.getByRole('textbox', { name: /şifre|sifre|password/i }).fill('sales123')
  await loginButton.click()
  await page.getByRole('button', { name: /çıkış|cikis/i }).first().waitFor({ state: 'visible' })
}

async function openOrdersPage() {
  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
  await page.goto(`${baseUrl}/#/orders`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.locator('body').waitFor({ state: 'visible' })
  await loginIfNeeded()
  await page.goto(`${baseUrl}/#/orders`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.getByRole('button', { name: /Sipariş ekle|Siparis ekle/i }).first().waitFor({ state: 'visible' })
}

async function openWizard() {
  const addOrderBtn = page.getByRole('button', { name: /Sipariş ekle|Siparis ekle/i }).first()
  await addOrderBtn.click()
  const wizard = page.getByRole('dialog', { name: 'Yeni Sipariş' })
  await wizard.waitFor({ state: 'visible' })
  return wizard
}

async function fillCustomerStep(wizard) {
  await wizard.getByPlaceholder('Ad soyad veya firma ara…').fill(`Smoke Musteri ${Date.now()}`)
  const salesPerson = wizard.getByLabel(/Satış danışmanı|Satis danismani/i)
  if ((await salesPerson.count()) > 0) {
    const value = await salesPerson.inputValue()
    if (!value) {
      await salesPerson.selectOption({ index: 1 })
    }
  }
  await wizard.getByRole('button', { name: 'Devam' }).click()
  const catalogDialog = page.getByRole('heading', { name: /Katalogdan Ürün Seç|Katalogdan Urun Sec/i })
  const manualAddButton = wizard.getByRole('button', { name: 'Katalog dışı ürün ekle' }).first()
  await Promise.race([
    catalogDialog.waitFor({ state: 'visible' }),
    manualAddButton.waitFor({ state: 'visible' }),
  ])
}

async function fillProductStep(wizard) {
  const catalogHeading = page.getByRole('heading', { name: /Katalogdan Ürün Seç|Katalogdan Urun Sec/i })
  if (!(await catalogHeading.isVisible())) {
    await wizard.getByRole('button', { name: 'Katalogdan ürün ekle' }).first().click()
    await catalogHeading.waitFor({ state: 'visible' })
  }

  await page.getByRole('button', { name: 'Seç' }).first().click()
  await page.getByRole('button', { name: /Seçilenleri Siparişe Ekle|Secilenleri Siparise Ekle/i }).click()

  await wizard.getByRole('button', { name: 'Devam' }).click()
  await wizard.getByRole('textbox', { name: 'Tahmini teslim tarihi' }).waitFor({ state: 'visible' })
}

async function fillPaymentStep(wizard) {
  await wizard.getByRole('textbox', { name: 'Tahmini teslim tarihi' }).fill('2026-12-31')
  await wizard.getByRole('button', { name: 'Devam' }).click()
  await wizard.getByRole('heading', { name: 'Müşteri' }).waitFor({ state: 'visible' })
  await wizard.getByRole('heading', { name: 'Finans' }).waitFor({ state: 'visible' })
}

async function submitAndAssertDetailOpen(wizard) {
  const submit = wizard.locator('button[type="submit"]')
  await submit.waitFor({ state: 'visible' })

  const orderDetail = page.getByRole('dialog', { name: 'Sipariş operasyon paneli' })
  const submitLoading = wizard.getByRole('button', { name: /Oluşturuluyor|Olusturuluyor/i })
  const wizardError = wizard.getByRole('alert')

  if (await submit.isEnabled()) {
    await submit.click()
  }

  await Promise.race([
    orderDetail.waitFor({ state: 'visible' }),
    submitLoading.waitFor({ state: 'visible' }),
    wizardError.waitFor({ state: 'visible' }),
  ])
}

async function runPhoneOperationScenario() {
  const panel = page.getByRole('dialog', { name: 'Sipariş operasyon paneli' })
  await panel.waitFor({ state: 'visible' })

  for (let step = 0; step < 12; step++) {
    if (!(await panel.isVisible())) break
    const flowButton = panel.locator('[aria-label="Operasyon tek akış"] button').first()
    if (!(await flowButton.isVisible())) break
    await flowButton.click()
    if (!(await panel.isVisible())) break
  }

  if (await panel.isVisible()) {
    const closeTextButton = panel.getByRole('button', { name: /^Kapat$/i }).first()
    if (await closeTextButton.isVisible()) {
      await closeTextButton.click()
    }
  }

  await panel.waitFor({ state: 'hidden' })
  await page.waitForFunction(() => window.location.hash === '#/operation-map')
}

try {
  await openOrdersPage()
  await page.screenshot({ path: join(outDir, '01-orders-mobile.png') })

  const wizard = await openWizard()
  await page.screenshot({ path: join(outDir, '02-wizard-customer.png') })

  await fillCustomerStep(wizard)
  await page.screenshot({ path: join(outDir, '03-wizard-product.png') })

  await fillProductStep(wizard)
  await page.screenshot({ path: join(outDir, '04-wizard-payment.png') })

  await fillPaymentStep(wizard)
  await page.screenshot({ path: join(outDir, '05-wizard-confirm.png') })

  await submitAndAssertDetailOpen(wizard)
  await page.screenshot({ path: join(outDir, '06-order-detail-opened.png') })

  await runPhoneOperationScenario()
  await page.screenshot({ path: join(outDir, '07-operation-closed.png') })

  console.log('OK:', outDir)
} catch (err) {
  await page.screenshot({ path: join(outDir, 'error-state.png'), fullPage: true })
  console.error(err)
  process.exit(1)
} finally {
  await browser.close()
}
