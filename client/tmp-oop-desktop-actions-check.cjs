const { chromium } = require('playwright');
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
  const row = page.locator('.mos-order-card, .orders-table tbody tr, [data-order-id]').first();
  if(await row.count()) await row.click().catch(()=>{});
  await page.waitForTimeout(1200);
  const actions = await page.evaluate(()=>Array.from(document.querySelectorAll('.oop-head__actions .oop-btn')).map(b=>b.textContent?.replace(/\s+/g,' ').trim()));
  const hasContract = actions.some(t=>t==='Sözleşme');
  const hasPrint = actions.some(t=>t==='Yazdır');
  const hasShare = actions.some(t=>t==='PDF / Paylaş');
  console.log(JSON.stringify({actions,hasContract,hasPrint,hasShare},null,2));
  await browser.close();
})();
