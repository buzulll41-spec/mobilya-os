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
  const btns=await page.locator('button').allTextContents();
  const hits=btns.filter(t=>/sipariş|yeni|oluştur|contract|sözleşme|yazdır/i.test((t||''))).slice(0,80);
  console.log(JSON.stringify(hits,null,2));
  await browser.close();
})();
