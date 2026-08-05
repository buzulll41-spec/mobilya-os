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
  await wizard.locator('button.now-btn--primary', { hasText: /Devam/i }).first().click();

  const catalog = page.locator('.catalog-picker-dialog');
  await catalog.waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('.catalog-picker-mobile-card').first().click();
  await sleep(250);
  await page.locator('.catalog-picker-footer__confirm').first().click();

  await wizard.waitFor({ state: 'visible', timeout: 10000 });
  await wizard.locator('button.now-btn--primary', { hasText: /Devam/i }).first().click();

  const dueDateInput = wizard.locator('input[type="date"].mos-mobile-date-field__input').first();
  await dueDateInput.fill('2026-12-15');
  await wizard.locator('button.now-btn--primary', { hasText: /Devam/i }).first().click();

  const submitBtn = wizard.locator('button.now-btn--submit').first();
  const submitLabelBefore = ((await submitBtn.textContent()) || '').trim();
  const submitInitiallyDisabled = await submitBtn.isDisabled();

  await submitBtn.click();
  await sleep(120);
  const submitDisabledAfterClick = await submitBtn.isDisabled().catch(() => true);

  const contract = page.locator('.scp-overlay');
  await contract.waitFor({ state: 'visible', timeout: 20000 });
  await sleep(500);

  const successText = ((await page.locator('.scp-toolbar-hint--success').first().textContent().catch(() => '')) || '').trim();
  const title = ((await page.locator('.scp-toolbar-title').first().textContent()) || '').trim();
  const contractNoText = ((await page.locator('.scp-doc-meta', { hasText: /Sipariş No/i }).first().textContent()) || '').trim();

  const totals = await page.evaluate(() => {
    const financeRows = Array.from(document.querySelectorAll('.scp-table--finance tr')).map((tr) =>
      Array.from(tr.querySelectorAll('td')).map((td) => td.textContent?.trim() || '').filter(Boolean),
    )
    return financeRows
  });

  const hasPrint = await page.locator('button', { hasText: /^Yazdır$/ }).count() > 0;
  const hasPdf = await page.locator('button', { hasText: /PDF Olarak Kaydet/i }).count() > 0;
  const hasShare = await page.locator('button', { hasText: /WhatsApp ile Paylaş/i }).count() > 0;
  const hasDetail = await page.locator('button', { hasText: /Sipariş Detayına Git/i }).count() > 0;

  const printTriggered = await page.evaluate(() => {
    let called = false;
    const oldPrint = window.print;
    window.print = () => { called = true; };
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Yazdır');
    btn?.click();
    window.print = oldPrint;
    return called;
  });

  if (hasDetail) {
    await page.locator('button', { hasText: /Sipariş Detayına Git/i }).first().click();
    await sleep(800);
  }

  const detailOpen = await page.locator('.oop-panel').count() > 0;
  const detailContract = detailOpen ? await page.locator('button', { hasText: /^Sözleşme$/ }).count() : 0;
  const detailPrint = detailOpen ? await page.locator('button', { hasText: /^Yazdır$/ }).count() : 0;
  const detailShare = detailOpen ? await page.locator('button', { hasText: /^PDF \/ Paylaş$/ }).count() : 0;

  console.log(JSON.stringify({
    mobileFlow: {
      submitLabelBefore,
      submitInitiallyDisabled,
      submitDisabledAfterClick,
      successText,
      title,
      contractNoText,
      hasPrint,
      hasPdf,
      hasShare,
      hasDetail,
      printTriggered,
      totals,
    },
    orderDetail: {
      detailOpen,
      detailContract,
      detailPrint,
      detailShare,
    },
  }, null, 2));

  await browser.close();
})();
