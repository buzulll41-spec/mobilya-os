const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const base = 'http://192.168.1.5:5173';
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  if (await page.locator('.login-page').count()) {
    await page.fill('input[type="email"]', 'admin@mobilya.local');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button.login-submit');
    await page.waitForSelector('.mos-sidebar', { timeout: 30000 });
  }
  await page.goto(base + '/#/orders', { waitUntil: 'networkidle' });
  await page.locator('button', { hasText: /Sipariş Oluştur|Yeni Sipariş|➕Yeni Sipariş/i }).first().click();
  const wizard = page.locator('.now-dialog');
  await wizard.waitFor({ state: 'visible', timeout: 10000 });

  const continueBtn = wizard.locator('button.now-btn--primary', { hasText: /Devam/i }).first();
  const initialDisabled = await continueBtn.isDisabled();

  await wizard.locator('.now-customer-picker input').first().fill('Kontrat Test Müşteri');
  await page.waitForTimeout(250);
  const afterNameDisabled = await continueBtn.isDisabled();

  const salesValue = await wizard.locator('select.now-select').first().inputValue().catch(() => 'NO_SELECT');
  const phoneValue = await wizard.locator('input.now-phone-local').first().inputValue().catch(() => 'NO_PHONE');
  const errText = await wizard.locator('.now-error').allTextContents().catch(() => []);

  console.log(JSON.stringify({ initialDisabled, afterNameDisabled, salesValue, phoneValue, errText }, null, 2));
  await browser.close();
})();
