const { chromium } = require('playwright');
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const base='http://192.168.1.5:5173';
  await page.goto(base,{waitUntil:'domcontentloaded'});
  if(await page.locator('.login-page').count()){
    await page.fill('input[type="email"]','admin@mobilya.local');
    await page.fill('input[type="password"]','admin123');
    await page.click('button.login-submit');
    await page.waitForSelector('.mos-sidebar',{timeout:30000});
  }
  await page.goto(base+'/#/orders',{waitUntil:'networkidle'});
  await page.locator('button',{hasText:/Sipariş Oluştur|Yeni Sipariş|➕Yeni Sipariş/i}).first().click();
  const wizard=page.locator('.now-dialog');
  await wizard.waitFor({state:'visible',timeout:10000});
  await wizard.locator('.now-customer-picker input').first().fill('Kontrat Test Müşteri');
  await wizard.locator('button.now-btn--primary',{hasText:/Devam/i}).first().click();
  const catalog=page.locator('.catalog-picker-dialog');
  await catalog.waitFor({state:'visible',timeout:15000});
  await page.locator('.catalog-picker-mobile-card').first().click();
  await sleep(200);
  await page.locator('.catalog-picker-footer__confirm').first().click();
  await wizard.waitFor({state:'visible',timeout:10000});
  await wizard.locator('button.now-btn--primary',{hasText:/Devam/i}).first().click();
  await wizard.locator('input[type="date"]').first().fill('2026-12-15');
  await wizard.locator('button.now-btn--primary',{hasText:/Devam/i}).first().click();
  await page.waitForSelector('.scp-overlay',{timeout:22000});
  const goDetail=page.locator('button',{hasText:/Sipariş Detayına Git/i}).first();
  if(await goDetail.count()) await goDetail.click();
  await sleep(1000);
  const oopVisible=await page.locator('.oop-panel').count();
  const allButtons=await page.locator('button').allTextContents();
  console.log(JSON.stringify({oopVisible, buttons: allButtons.filter(Boolean).slice(0,200)},null,2));
  await browser.close();
})();
