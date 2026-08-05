const { chromium } = require('playwright');

(async () => {
  const base = 'http://192.168.1.5:5173';
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  await page.goto(base, { waitUntil: 'domcontentloaded' });
  if (await page.locator('.login-page').count()) {
    await page.fill('input[type="email"]', 'admin@mobilya.local');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button.login-submit');
    await page.waitForSelector('.mos-sidebar', { timeout: 30000 });
  }

  await page.goto(base + '/#/supply-incoming?tab=operasyon', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);

  const title = await page.locator('h1').first().textContent().catch(() => 'NO_H1');
  const buttons = await page.locator('button').allTextContents();
  console.log('TITLE=', title);
  console.log('BUTTONS=', JSON.stringify(buttons.slice(0, 80), null, 2));

  const incomingCandidates = page.locator('button', { hasText: 'Gelen ürün kaydı' });
  console.log('INCOMING_COUNT=', await incomingCandidates.count());
  if (await incomingCandidates.count()) {
    await incomingCandidates.first().click();
    await page.waitForTimeout(1500);
    const dialogs = await page.locator('[role="dialog"]').count();
    const bodies = await page.locator('.mos-modal,.catalog-picker-modal,.mobile-wizard,.supplier-ops-mobile-wizard').count();
    console.log('DIALOG_COUNT_AFTER_CLICK=', dialogs);
    console.log('MODALISH_COUNT_AFTER_CLICK=', bodies);
    const bodyText = await page.locator('body').innerText();
    console.log('HAS_KATALOGDAN_SEC=', bodyText.includes('Katalogdan seç'));
    console.log('HAS_GELEN_URUN_KAYDI=', bodyText.includes('Gelen ürün kaydı'));
  }

  await browser.close();
})();
