const { chromium } = require('playwright');
const fs = require('fs');
const http = require('http');
const path = require('path');
(async () => {
  const server = http.createServer((req, res) => {
    const requested = path.resolve('.', '.' + decodeURIComponent(req.url.split('?')[0]));
    if (!requested.startsWith(process.cwd() + path.sep)) { res.writeHead(403).end(); return; }
    const type = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.png':'image/png','.svg':'image/svg+xml','.wav':'audio/wav'}[path.extname(requested)];
    try { res.setHeader('Content-Type', type || 'application/octet-stream'); res.end(fs.readFileSync(requested)); }
    catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({headless:true, channel:'chrome'});
    const context = await browser.newContext();
    // This check covers our responsive layout, not third-party video playback.
    await context.route('**/*youtube*/**', route => route.abort());
    const page = await context.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    const results = [];
    fs.mkdirSync('.site-package/qa', {recursive:true});
    for (const name of ['introduce','article','image','video','final','index']) {
      await page.goto(`http://127.0.0.1:${server.address().port}/${name}.html`, {waitUntil:'domcontentloaded'});
      await page.evaluate(() => Promise.race([document.fonts.ready, new Promise(r=>setTimeout(r,5000))]));
      for (const width of [320,390,640,768,1024,1440,2560]) {
        await page.setViewportSize({width,height:900});
        const result = await page.evaluate(() => {
          const overflow = [...document.querySelectorAll('body *')].filter(el => {
            if (el.tagName === 'CANVAS' || !el.getClientRects().length) return false;
            const rect = el.getBoundingClientRect();
            return rect.right > innerWidth + 1 || rect.left < -1;
          }).map(el => el.tagName + '.' + el.className);
          const image = document.querySelector('.about-art img');
          let imageContained = true;
          if (image) {
            const i=image.getBoundingClientRect(), f=image.parentElement.getBoundingClientRect();
            imageContained=i.left>=f.left-1&&i.top>=f.top-1&&i.right<=f.right+1&&i.bottom<=f.bottom+1;
          }
          return {overflow, imageContained, documentWidth:document.documentElement.scrollWidth, viewport:innerWidth};
        });
        results.push({name,width,...result});
        if (name==='introduce' && [390,1440].includes(width)) await page.screenshot({path:`.site-package/qa/introduce-${width}.png`,fullPage:true});
      }
      if (name === 'article') {
        await page.setViewportSize({width:320,height:700});
        await page.getByRole('link', {name:'기사 읽기'}).click();
        if (!await page.locator('dialog').isVisible()) throw Error('Article modal did not open');
        const size = await page.locator('dialog').boundingBox();
        if (size.x < 0 || size.x + size.width > 320) throw Error('Article modal overflows');
        await page.getByRole('button',{name:'닫기',exact:true}).click();
      }
    }
    await page.route('**/introduce.css*', route => route.abort());
    await page.goto(`http://127.0.0.1:${server.address().port}/introduce.html`, {waitUntil:'domcontentloaded'});
    const fallbackContained = await page.evaluate(() => {
      const frame=document.querySelector('.about-art').getBoundingClientRect();
      const image=document.querySelector('.about-art img').getBoundingClientRect();
      return image.left>=frame.left-1&&image.top>=frame.top-1&&image.right<=frame.right+1&&image.bottom<=frame.bottom+1;
    });
    if (!fallbackContained) throw Error('Image escapes container when introduction stylesheet is unavailable');
    const failed = results.filter(r=>r.overflow.length || !r.imageContained || r.documentWidth>r.viewport);
    console.log(JSON.stringify({checks:results.length,failed,errors,fallbackContained},null,2));
    if (failed.length || errors.length) process.exitCode=1;
  } finally { if(browser) await browser.close(); server.close(); }
})();
