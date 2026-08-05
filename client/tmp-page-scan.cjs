const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto('http://192.168.1.5:5173', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const text = await page.locator('body').innerText();
  console.log(text.slice(0, 1200));
  await browser.close();
})();
