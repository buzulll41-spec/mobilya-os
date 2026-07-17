const { chromium } = require('playwright');

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

(async () => {
  const base = 'http://192.168.1.5:5173';
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();

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

  await wizard.locator('.now-customer-picker input').first().fill('Kontrat Test Müşteri');
  const phoneInput = wizard.locator('input[placeholder*="05XX"], input.now-phone-local').first();
  if (await phoneInput.count()) await phoneInput.fill('05551234567');

  await wizard.locator('button.now-btn--primary', { hasText: /Devam/i }).first().click();

  const catalog = page.locator('.catalog-picker-dialog');
  await catalog.waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('.catalog-picker-mobile-card').first().click();
  await sleep(220);
  await page.locator('.catalog-picker-footer__confirm').first().click();

  await wizard.waitFor({ state: 'visible', timeout: 10000 });
  await wizard.locator('button.now-btn--primary', { hasText: /Devam/i }).first().click();
  await sleep(200);
  await wizard.locator('button.now-btn--primary', { hasText: /Devam/i }).first().click();

  const submitBtn = wizard.locator('button.now-btn--submit').first();
  const submitLabel = ((await submitBtn.textContent()) || '').trim();
  await submitBtn.click();

  const contract = page.locator('.scp-overlay');
  await contract.waitFor({ state: 'visible', timeout: 20000 });
  await sleep(400);

  const title = ((await page.locator('.scp-toolbar-title').first().textContent()) || '').trim();
  const success = ((await page.locator('.scp-toolbar-hint--success').first().textContent().catch(() => '')) || '').trim();
  const hasPrint = (await page.locator('button', { hasText: /^Yazdır$/ }).count()) > 0;
  const hasPdf = (await page.locator('button', { hasText: /PDF Olarak Kaydet/i }).count()) > 0;
  const hasShare = (await page.locator('button', { hasText: /WhatsApp ile Paylaş/i }).count()) > 0;
  const hasDetail = (await page.locator('button', { hasText: /Sipariş Detayına Git/i }).count()) > 0;

  const contractNoText = ((await page.locator('.scp-doc-meta', { hasText: /Sipariş No/i }).first().textContent()) || '').trim();

  const printTriggered = await page.evaluate(() => {
    let called = false;
    const original = window.print;
    window.print = () => { called = true; };
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Yazdır');
    btn?.click();
    window.print = original;
    return called;
  });

  if (hasDetail) {
    await page.locator('button', { hasText: /Sipariş Detayına Git/i }).first().click();
    await sleep(700);
  }

  const orderPanelOpen = await page.locator('.oop-panel').count() > 0;
  const detailContract = orderPanelOpen ? await page.locator('button', { hasText: /^Sözleşme$/ }).count() : 0;
  const detailPrint = orderPanelOpen ? await page.locator('button', { hasText: /^Yazdır$/ }).count() : 0;
  const detailShare = orderPanelOpen ? await page.locator('button', { hasText: /^PDF \/ Paylaş$/ }).count() : 0;

  console.log(JSON.stringify({
    submitLabel,
    successScreen: {
      title,
      success,
      hasPrint,
      hasPdf,
      hasShare,
      hasDetail,
      contractNoText,
      printTriggered,
    },
    orderDetail: {
      open: orderPanelOpen,
      detailContract,
      detailPrint,
      detailShare,
    },
  }, null, 2));

  await browser.close();
})();
