const { chromium } = require('playwright');
(async()=>{
 const browser = await chromium.launch({headless:true});
 const page = await browser.newPage();
 await page.goto('http://192.168.1.5:5173',{waitUntil:'domcontentloaded'});
 const isLogin = await page.locator('.login-page').count();
 const inputs = await page.locator('input').evaluateAll((els)=>els.map(e=>({type:e.type,name:e.name,placeholder:e.placeholder,id:e.id,className:e.className}))); 
 const btns = await page.locator('button').allTextContents();
 const errs = await page.locator('.login-error, .error, [role="alert"]').allTextContents();
 console.log(JSON.stringify({url:page.url(),isLogin,inputs,buttons:btns.map(s=>s.trim()).filter(Boolean),errs},null,2));
 await browser.close();
})();
