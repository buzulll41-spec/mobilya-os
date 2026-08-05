const { chromium } = require('playwright');

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

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

  await page.goto(base + '/#/orders', { waitUntil: 'networkidle' });
  await page.locator('button', { hasText: /Sipariş Oluştur|Yeni Sipariş|➕Yeni Sipariş/i }).first().click();
  const wizard = page.locator('.now-dialog');
  await wizard.waitFor({ state: 'visible', timeout: 10000 });

  await wizard.locator('.now-customer-picker input').first().fill('Kontrat Test Müşteri');

  async function clickContinueWhenEnabled() {
    for (let i = 0; i < 60; i++) {
      const btn = wizard.locator('button.now-btn--primary', { hasText: /Devam/i }).first();
      if (await btn.count()) {
        const disabled = await btn.isDisabled().catch(() => true);
        if (!disabled) {
          await btn.click();
          return true;
        }
      }
      await sleep(120);
    }
    return false;
  }

  const continued1 = await clickContinueWhenEnabled();
  const catalog = page.locator('.catalog-picker-dialog');
  await catalog.waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('.catalog-picker-mobile-card').first().click();
  await sleep(180);
  await page.locator('.catalog-picker-footer__confirm').first().click();

  await wizard.waitFor({ state: 'visible', timeout: 10000 });
  const continued2 = await clickContinueWhenEnabled();

  const dueDateInput = wizard.locator('input[type="date"].mos-mobile-date-field__input').first();
  if (await dueDateInput.count()) {
    await dueDateInput.fill('2026-12-15');
  }
  const continued3 = await clickContinueWhenEnabled();

  let submitClickable = false;
  const submitBtn = wizard.locator('button.now-btn--submit').first();
  for (let i = 0; i < 80; i++) {
    if (await submitBtn.count()) {
      const disabled = await submitBtn.isDisabled().catch(() => true);
      if (!disabled) {
        submitClickable = true;
        break;
      }
    }
    await sleep(120);
  }

  const submitLabel = await submitBtn.count() ? (((await submitBtn.textContent()) || '').trim()) : null;
  if (submitClickable) await submitBtn.click();

  const contract = page.locator('.scp-overlay');
  const openedContract = await contract.waitFor({ state: 'visible', timeout: 22000 }).then(() => true).catch(() => false);

  let result = {
    continued1,
    continued2,
    continued3,
    submitLabel,
    submitClickable,
    openedContract,
  };

  if (openedContract) {
    const successText = ((await page.locator('.scp-toolbar-hint--success').first().textContent().catch(() => '')) || '').trim();
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
      await sleep(700);
    }

    const detailOpen = await page.locator('.oop-panel').count() > 0;
    const detailContract = detailOpen ? await page.locator('button', { hasText: /^Sözleşme$/ }).count() : 0;
    const detailPrint = detailOpen ? await page.locator('button', { hasText: /^Yazdır$/ }).count() : 0;
    const detailShare = detailOpen ? await page.locator('button', { hasText: /^PDF \/ Paylaş$/ }).count() : 0;

    result = {
      ...result,
      successText,
      hasPrint,
      hasPdf,
      hasShare,
      hasDetail,
      printTriggered,
      detailOpen,
      detailContract,
      detailPrint,
      detailShare,
    };
  }

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
