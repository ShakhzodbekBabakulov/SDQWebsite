import { expect, test } from '@playwright/test';
import { pages, canonicalPaths, absolute } from '../../src/content/site';
import { readFileSync, mkdirSync } from 'node:fs';

test('all canonical documents, assets, metadata, headings, links and translations are valid without JavaScript', async ({ browser, browserName, baseURL, request }) => {
  test.skip(browserName !== 'chromium', 'Complete crawl once; interaction tests cover every browser.');
  test.setTimeout(180_000);
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  const assets = new Set<string>();
  const failures: string[] = [];
  page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
  for (const entry of pages) {
    expect((await page.goto(entry.path))?.status(), entry.path).toBe(200);
    await expect(page).toHaveTitle(entry.title);
    await expect(page.locator('html')).toHaveAttribute('lang', entry.language);
    await expect(page.locator('h1')).toHaveCount(1);
    expect((await page.locator('main').innerText()).length, entry.path+' server-rendered content').toBeGreaterThan(150);
    expect(await page.locator('meta[name="description"]').getAttribute('content')).toBe(entry.description);
    expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toBe(absolute(entry.path));
    expect(await page.locator('meta[property="og:url"]').getAttribute('content')).toBe(absolute(entry.path));
    const alternates = await page.locator('link[hreflang]').evaluateAll(links => links.map(link => ({lang:link.getAttribute('hreflang'), href:link.getAttribute('href')})));
    expect(alternates).toHaveLength(entry.counterpart ? 2 : 0);
    if (entry.counterpart) expect(alternates.some(link=>link.href===absolute(entry.counterpart!))).toBe(true);
    const headings = await page.locator('h1,h2,h3,h4,h5,h6').evaluateAll(elements=>elements.map(el=>({level:Number(el.tagName.slice(1)), text:el.textContent?.trim()})));
    for (let i=0;i<headings.length;i++) {
      expect(headings[i].text, entry.path+' empty heading').toBeTruthy();
      if (i) expect(headings[i].level, entry.path+' heading order').toBeLessThanOrEqual(headings[i-1].level+1);
    }
    const graph = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
    expect(graph['@graph'].some((node: Record<string,string>)=>node['@type']==='Organization' && node['@id']==='https://sdq-sfb.com/#organization')).toBe(true);
    const links = await page.locator('a[href]').evaluateAll(elements=>elements.map(el=>el.getAttribute('href')!));
    for(const href of links.filter(href=>href.startsWith('/'))) expect(canonicalPaths,entry.path+' links to '+href).toContain(href);
    const references = await page.locator('[src],link[rel="stylesheet"]').evaluateAll(elements=>elements.map(el=>el.getAttribute('src') || el.getAttribute('href')!).filter(Boolean));
    references.forEach(src=>assets.add(src));
    const images = await page.locator('img').evaluateAll(elements=>elements.map(el=>({src:el.getAttribute('src'),alt:el.getAttribute('alt')})));
    for(const image of images) expect(image.alt, entry.path+' '+image.src).toBeTruthy();
    expect(await page.locator('main').innerText()).not.toMatch(/Оставьте заявку|Заполните форму|Leave your application|Fill out the form/);
    await expect(page.locator('form')).toHaveCount(0);
  }
  for(const asset of assets) {
    expect(asset).toMatch(/^\//);
    const response=await request.get(asset);expect(response.status(),asset).toBe(200);
    expect(response.headers()['content-type'],asset).not.toContain('text/html');
  }
  expect(failures).toEqual([]);
  await context.close();
});

test('every company page fits all requested viewport widths and landscape', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Layout matrix once, navigation separately cross-browser.');
  test.setTimeout(300_000);
  mkdirSync('.cache/design/after', {recursive:true});
  for(const entry of pages) {
    await page.goto(entry.path);
    for(const width of [320,390,768,1024,1280,1440]) {
      await page.setViewportSize({width,height:width===768?390:900});
      const errors=await page.evaluate(()=>{
        const root=document.documentElement;
        const failed=[];
        if(root.scrollWidth>innerWidth+1) failed.push('Horizontal page overflow');
        for(const el of document.querySelectorAll('h1,h2,h3,main p,main img,header a,header button')) {
          if(!(el instanceof HTMLElement) || !el.getClientRects().length) continue;
          const r=el.getBoundingClientRect();
          if(r.width>0 && (r.left < -1 || r.right>innerWidth+1)) failed.push(`${el.tagName}: ${el.textContent?.slice(0,60)}`);
        }
        return failed;
      });
      expect(errors,entry.path+' at '+width).toEqual([]);
      if(width===390) {
        const smallTargets=await page.locator('a,button').evaluateAll(elements=>elements.filter(el=>el.getClientRects().length && el.getBoundingClientRect().height>0 && el.getBoundingClientRect().height<43.9).map(el=>({text:el.textContent?.trim(),height:el.getBoundingClientRect().height})));
        expect(smallTargets,entry.path+' touch target height').toEqual([]);
      }
      if(width===390 || width===1440) await page.screenshot({path:'.cache/design/after/'+(entry.path.slice(6).replaceAll('/','_')||'home')+width+'.png',fullPage:true});
    }
    // Browser zoom changes the effective CSS viewport: 1280x900 at 200% is 640x450.
    await page.setViewportSize({width:640,height:450});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),entry.path+' at 200% reflow').toBe(true);
  }
});

test('company scrolling and return to train keep independent layouts',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/more/');
  await page.mouse.wheel(0,600);
  await expect.poll(()=>page.evaluate(()=>scrollY)).toBeGreaterThan(0);
  await page.locator('.company-footer a[href="/"]').click();
  await expect(page).toHaveURL('/');
  await expect(page.locator('.company-header')).toHaveCount(0);
  await expect(page.locator('.train-story')).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('position','fixed');
  await page.goBack();
  await expect(page.locator('.company-header')).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('position','static');
});

test('Cloudflare redirects and published sitemap contain canonical pages only', async ({request,browserName})=>{
  test.skip(browserName!=='chromium');
  test.setTimeout(120_000);
  const xml=await (await request.get('/sitemap.xml')).text();
  expect(xml).toBe(readFileSync('docs/seo/sitemap.xml','utf8'));
  const locations=[...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match=>match[1]);
  expect(locations).toEqual(canonicalPaths.map(absolute));
  for(const path of canonicalPaths) expect((await request.get(path)).status(),path).toBe(200);
  const lines=readFileSync('public/_redirects','utf8').split('\n').filter(line=>line && !line.startsWith('#'));
  for(const line of lines){
    const [from,to]=line.split(' ');
    const response=await request.get(from,{maxRedirects:0});
    expect(response.status(),from).toBe(301);
    expect(new URL(response.headers().location, 'https://sdq-sfb.com').pathname,from).toBe(to);
  }
  const robots=await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Sitemap: https://sdq-sfb.com/sitemap.xml');
  expect(robots).not.toMatch(/Disallow: \/\s*$/m);
});

test('mobile drawer traps focus, dismisses and restores scroll',async({page,browserName})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/more/');
  await page.evaluate(()=>scrollTo(0,500));
  const scroll=await page.evaluate(()=>scrollY);
  const trigger=page.getByRole('button',{name:'Меню',exact:true});
  // A physical pointer click avoids Playwright's own scrollIntoView on a sticky header.
  const triggerBox=await trigger.boundingBox();
  await page.mouse.click(triggerBox!.x+triggerBox!.width/2,triggerBox!.y+triggerBox!.height/2);
  const dialog=page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  mkdirSync('.cache/design', {recursive:true});
  await page.screenshot({path:`.cache/design/menu-${browserName}.png`});
  await expect(page.getByRole('button',{name:'Закрыть меню'})).toBeFocused();
  for(let i=0;i<15;i++){
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true);
  }
  for(const link of await dialog.locator('a').all()){
    const box=await link.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.height).toBeGreaterThanOrEqual(44);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();await expect(trigger).toBeFocused();
  expect(await page.evaluate(()=>scrollY)).toBe(scroll);
  expect(await page.evaluate(()=>document.documentElement.style.overflow)).toBe('');
  await trigger.click();await page.mouse.click(5,400);await expect(dialog).not.toBeVisible();
  await trigger.click();await page.setViewportSize({width:1440,height:900});await expect(dialog).not.toBeVisible();
  await expect(page.locator('.desktop-nav')).toBeVisible();
});
