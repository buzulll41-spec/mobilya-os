const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto('http://192.168.1.5:5173', { waitUntil: 'domcontentloaded' });

  if (await page.locator('.login-page').count()) {
    await page.fill('input[type="email"]', 'admin@mobilya.local');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button.login-submit');
    await page.waitForSelector('.mos-sidebar', { timeout: 30000 });
  }

  await page.goto('http://192.168.1.5:5173/#/orders', { waitUntil: 'networkidle' });
  await page.locator('button', { hasText: /Sipariş Oluştur|Yeni Sipariş|➕Yeni Sipariş/i }).first().click();
  const wizard = page.locator('.now-dialog');
  await wizard.waitFor({ state: 'visible', timeout: 10000 });
  await wizard.locator('input').first().fill('Mobil Test Müşteri');
  await wizard.locator('button.now-btn--primary', { hasText: /Devam/i }).first().click();

  const picker = page.locator('.catalog-picker-dialog, .catalog-picker-modal');
  await picker.first().waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(1000);

  const dialogHtml = await picker.first().evaluate((el) => el.outerHTML.slice(0, 7000));
  const buttonTexts = await picker.first().locator('button').allTextContents();
  const classNames = await picker.first().evaluate((el) => {
    const set = new Set();
    el.querySelectorAll('*').forEach((n) => {
      (n.className || '').toString().split(/\s+/).filter(Boolean).forEach((c) => {
        if (c.includes('catalog-picker')) set.add(c);
      });
    });
    return Array.from(set).sort();
  });

  console.log('CLASSNAMES=', JSON.stringify(classNames, null, 2));
  console.log('BUTTONS=', JSON.stringify(buttonTexts, null, 2));
  console.log('DIALOG_HTML_SNIPPET=', dialogHtml);

  await browser.close();
})();
