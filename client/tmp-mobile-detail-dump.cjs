const { chromium } = require('playwright');
(async()=>{
  const browser=await chromium.launch({headless:true});
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto('http://192.168.1.5:5173',{waitUntil:'domcontentloaded'});
  if(await page.locator('.login-page').count()){
    await page.fill('input[type="email"]','admin@mobilya.local');
    await page.fill('input[type="password"]','admin123');
    await page.click('button.login-submit');
    await page.waitForTimeout(2500);
  }
  await page.goto('http://192.168.1.5:5173/#/orders',{waitUntil:'networkidle'});
  await page.waitForTimeout(2500);
  await page.locator('[data-order-row-id]').first().click();
  await page.waitForTimeout(1500);
  const out = await page.evaluate(()=>({
    url: location.href,
    panel: !!document.querySelector('.oop-panel'),
    headButtons: Array.from(document.querySelectorAll('.oop-head__actions button')).map((b)=>b.textContent?.trim()),
    mobileButtons: Array.from(document.querySelectorAll('.oop-mobile-actions button')).map((b)=>b.textContent?.trim()),
    text: document.body.innerText.slice(0,1200),
  }));
  console.log(JSON.stringify(out,null,2));
  await browser.close();
})();
