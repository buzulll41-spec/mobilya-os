const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const base='http://192.168.1.5:5173';
  await page.goto(base, { waitUntil:'domcontentloaded' });
  if (await page.locator('.login-page').count()) {
    await page.fill('input[type="email"]','admin@mobilya.local');
    await page.fill('input[type="password"]','admin123');
    await page.click('button.login-submit');
    await page.waitForSelector('.mos-sidebar', { timeout: 30000 });
  }
  await page.goto(base + '/#/orders', { waitUntil:'networkidle' });
  const card = page.locator('.orders-grid button, .mos-order-card, [data-order-id]').first();
  if (await card.count()) await card.click().catch(()=>{});
  await page.waitForTimeout(800);
  const buttons = await page.locator('.oop-panel button').allTextContents().catch(()=>[]);
  console.log(JSON.stringify(buttons.filter(Boolean), null, 2));
  await browser.close();
})();
