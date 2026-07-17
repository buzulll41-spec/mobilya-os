const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const base = 'http://192.168.1.5:5173';

  await page.goto(base, { waitUntil: 'domcontentloaded' });
  if (await page.locator('.login-page').count()) {
    await page.fill('input[type="email"]', 'admin@mobilya.local');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button.login-submit');
    await page.waitForSelector('.mos-sidebar', { timeout: 30000 });
  }

  await page.goto(base + '/#/orders', { waitUntil: 'networkidle' });
  const firstRow = page.locator('[data-order-id], .mos-order-row, .orders-table tbody tr').first();
  if (await firstRow.count()) {
    await firstRow.click({ timeout: 5000 }).catch(() => {});
  }

  const contractBtn = page.locator('button', { hasText: /Sözleşme Yazdır|Sözleşme/i }).first();
  if (await contractBtn.count()) {
    await contractBtn.click();
    await page.waitForSelector('.scp-overlay', { timeout: 15000 });
  }

  const desktopPrintTriggered = await page.evaluate(() => {
    const overlay = document.querySelector('.scp-overlay');
    if (!overlay) return false;
    let called = false;
    const oldPrint = window.print;
    window.print = () => { called = true; };
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Yazdır');
    btn?.click();
    window.print = oldPrint;
    return called;
  });

  const toolbarHiddenInPrintCss = await page.evaluate(() => {
    const styleSheets = Array.from(document.styleSheets);
    const txt = styleSheets.flatMap((s) => {
      try { return Array.from(s.cssRules).map((r) => r.cssText); } catch { return []; }
    }).join('\n');
    return txt.includes('.sales-contract-print-toolbar') && txt.includes('display: none');
  });

  console.log(JSON.stringify({ desktopPrintTriggered, toolbarHiddenInPrintCss }, null, 2));
  await browser.close();
})();
