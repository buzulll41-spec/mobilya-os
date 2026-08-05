const { chromium } = require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage();
 page.on('console',m=>console.log('CONSOLE',m.type(),m.text()));
 page.on('response',r=>{if(r.url().includes('/auth')||r.url().includes('/login')) console.log('RESP',r.status(),r.url())});
 await page.goto('http://192.168.1.5:5173',{waitUntil:'domcontentloaded'});
 await page.fill('input[type="email"]','admin@mobilya.local');
 await page.fill('input[type="password"]','admin123');
 const vals=await page.evaluate(()=>({email:document.querySelector('input[type="email"]').value,pw:document.querySelector('input[type="password"]').value,btnDisabled:document.querySelector('button.login-submit')?.disabled}));
 console.log('vals',JSON.stringify(vals));
 await page.locator('button.login-submit').click({force:true});
 await page.waitForTimeout(4000);
 const out=await page.evaluate(()=>({isLogin:!!document.querySelector('.login-page'),session:localStorage.getItem('mobilya-auth-session')||localStorage.getItem('authSession')||null,cookies:document.cookie}));
 const err=await page.locator('.login-error').allTextContents();
 console.log(JSON.stringify({out,err},null,2));
 await browser.close();
})();
