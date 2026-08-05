const { chromium } = require('playwright');
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:1366,height:900}});
  const base='http://192.168.1.5:5173';
  await page.goto(base,{waitUntil:'domcontentloaded'});
  if(await page.locator('.login-page').count()){
    await page.fill('input[type="email"]','admin@mobilya.local');
    await page.fill('input[type="password"]','admin123');
    await page.click('button.login-submit');
    await page.waitForSelector('.mos-sidebar',{timeout:30000});
  }
  await page.goto(base+'/#/orders',{waitUntil:'networkidle'});
  await page.locator('button',{hasText:/Yeni Sipariş|Sipariş Oluştur|➕Yeni Sipariş/i}).first().click();
  const wizard=page.locator('.now-dialog');
  await wizard.waitFor({state:'visible',timeout:10000});
  await wizard.locator('.now-customer-picker input').first().fill('Desktop Kontrat Test');
  await wizard.locator('button.now-btn--primary',{hasText:/Devam/i}).first().click();
  await page.waitForSelector('.catalog-picker-dialog',{timeout:15000});
  // desktop table row click
  const row = page.locator('.catalog-picker-table tbody tr').first();
  if(await row.count()) await row.click();
  await sleep(160);
  await page.locator('.catalog-picker-footer__confirm').first().click();
  await wizard.waitFor({state:'visible',timeout:10000});
  await wizard.locator('button.now-btn--primary',{hasText:/Devam/i}).first().click();
  await wizard.locator('input[type="date"]').first().fill('2026-12-20');
  await wizard.locator('button.now-btn--primary',{hasText:/Devam/i}).first().click();
  // desktop final step has submit
  const submit=wizard.locator('button.now-btn--submit').first();
  if(await submit.count() && !(await submit.isDisabled().catch(()=>true))) await submit.click();
  await page.waitForSelector('.scp-overlay',{timeout:22000});
  const printTriggered = await page.evaluate(() => {
    let called = false;
    const old = window.print;
    window.print = () => { called = true; };
    const btn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Yazdır');
    btn?.click();
    window.print = old;
    return called;
  });
  const hasToolbar = await page.locator('.sales-contract-print-toolbar').count() > 0;
  console.log(JSON.stringify({printTriggered,hasToolbar},null,2));
  await browser.close();
})();
